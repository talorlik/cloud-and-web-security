<a id="top"></a><a id="cover"></a>

# Security strategy for the alerting system website and its AWS account

Security strategy · Version 1.0 · 2026-10-21 · Public edition · identifiers redacted

The plan to make the national population-guidance system trustworthy during an evacuation: always reachable, giving guidance no one can tamper with, and protecting location and medical data. It is built on CIS Controls v8.1, CIS Benchmarks, ISO/IEC 27001:2022 and the AWS Well-Architected Security Pillar.

- **500,000** concurrent public users at peak
- **1 of 5** Terraform layers applied (account_infra)
- **4** critical application findings open (F5, C21)
- **12** go-live security gates defined

**Frameworks applied:** CIS Controls v8.1 · IG2 → IG3 · CIS AWS Foundations 7.1.0 · CIS EKS 2.0.0 · CIS Ubuntu L1 · CIS PostgreSQL 17 · CIS NGINX · ISO/IEC 27001:2022 + Amd 1 · AWS WA Security Pillar · OWASP ASVS 5.0 L2 · GDPR & ISO/IEC 27701:2025

<a id="pdf-contents"></a>

## Contents

1. [Executive summary](#summary)
    - [Ten moves that matter most](#sum-top-actions)
2. [Scope and system context](#scope)
    - [Trust zones and data flows](#scope-diagram)
    - [Assets and data classification](#scope-assets)
    - [Shared responsibility](#scope-responsibility)
3. [Framework baseline](#frameworks)
    - [Version gaps you need to manage](#fw-gaps)
4. [Threat model](#threats)
    - [STRIDE view of the critical flows](#threat-stride)
5. [Risk register](#risks)
6. [Strategic principles](#principles)
7. [Control domains](#domains)
    - [7.1 Security foundations and governance](#d-foundations-h)
    - [7.2 Identity and access management](#d-iam-h)
    - [7.3 Detection and logging](#d-detect-h)
    - [7.4 Infrastructure protection](#d-infra-h)
    - [7.5 Data protection and privacy](#d-data-h)
    - [7.6 Application security](#d-app-h)
    - [7.7 Software supply chain and change](#d-supply-h)
    - [7.8 Incident response and resilience](#d-ir-h)
    - [7.9 People and operations](#d-people-h)
8. [Design deep dives](#deepdives)
    - [8.1 WAF rules for common attacks and location enforcement](#dd-waf-h)
    - [8.2 Security alerting without a staffed SOC](#dd-alerts-h)
    - [8.3 Separate database users for public and admin](#dd-db-h)
    - [8.4 Separate Kubernetes service accounts for public and admin](#dd-sa-h)
    - [8.5 A separate hostname for admin](#dd-admin-h)
    - [8.6 Hardened container images](#dd-images-h)
    - [8.7 Admin access without Client VPN: three lower-cost options](#dd-access-h)
9. [Required changes to the current setup](#changes)
10. [Control mapping matrix](#matrix)
11. [Roadmap and go-live gates](#roadmap)
    - [11.1 Phases](#phases)
    - [11.2 Go-live security gates](#gates)
12. [Metrics and reporting](#metrics)
13. [Decisions needed](#decisions)
14. [References](#references)

---

<a id="summary"></a>

## 01 · Executive summary

**The platform is well designed, but the application is not yet safe to expose**

The AWS platform design is unusually mature for this stage: GitHub OIDC, SHA-pinned actions, signed images, a private EKS cluster, an Imperva edge and an admin plane behind a VPN with MFA. The application inside it is not ready. It has no working authentication or authorization, and its device endpoints are open to the internet. This strategy closes that gap first, then removes the structural risks that sit in the current decisions.

### <a id="sum-top-actions"></a>Ten moves that matter most

1. **Close the public device read surface now, at the platform.** Change the public HTTPRoutes and Imperva rules so only exact public paths and methods (position post, geo lookups) pass. This needs no change to `app/`. See [CH-01](#ch-01).
2. **Make admin login and authorization (F5, C21) a hard go-live gate.** Use OIDC against the chosen identity provider, with per-authority RBAC, and remove the seed `admin/admin` account and `NoOpPasswordEncoder`. See [SC-05](#sc-05).
3. **Decide the identity provider (B3a).** The recommendation is client Entra ID with phishing-resistant MFA, federated to Client VPN, IAM Identity Center, Argo CD and the console. See [B3a](#dec-b3a).
4. **Strip debug and outdated parts from images.** Remove JDWP on 8787, run as non-root, replace `openjdk:17.0.1` and turn off Swagger in prd. See [CH-06](#ch-06).
5. **Move logs to immutable storage with tiered retention, replacing 30-days-and-delete (D35).** Keep security logs at least 1 year, in an Object Lock archive. See [CH-03](#ch-03).
6. **Limit how long location data is kept (D34) and drop device emails (C15).** Permanent retention of personal location data is the largest legal and breach exposure. See [CH-04](#ch-04).
7. **Split prd into its own account, inside AWS Organizations (B25).** Add log-archive and security-tooling accounts and SCP guardrails. See [CH-02](#ch-02).
8. **Switch WAF to BLOCK and Kyverno to Enforce with evidence, before go-live** (9.1.7, 9.1.5). Make Imperva origin mTLS mandatory. See [SC-11](#sc-11).
9. **De-privilege the database user (D47).** Split owner/migration and runtime roles, and replace `ddl-auto: update` with versioned migrations. See [CH-05](#ch-05).
10. **Commission an independent penetration test (B11)** after the Phase 12 fixes and before go-live. Retest, then repeat at least yearly. See [B11](#dec-b11).

**Posture by Well-Architected area (today)**

| Area | Score |
| --- | --- |
| Security foundations | 45% |
| Identity & access | 30% |
| Detection | 65% |
| Infrastructure protection | 60% |
| Data protection | 45% |
| Incident response | 20% |
| Application security | 15% |

This is a judgment score, not a measurement. It weighs each area's live controls against its design. Designed but unapplied controls count for half. Re-score at each phase gate.

> **Bottom line**
>
> Go-live must wait for 12 gates ([section 11.2](#gates)). Seven can be done by the platform team alone. Five depend on the application team or the client.

[Back to contents](#pdf-contents)

---

<a id="scope"></a>

## 02 · Scope and system context

**What we are protecting, and from whom it is reachable**

This strategy covers both faces of the system (the public navigation site and the admin console), the AWS account ACCOUNT_ID in us-east-1 with its `dev` and `prd` environments, the delivery chain (GitHub, CodeBuild, ECR, Argo CD) and the third parties in the path (Imperva, the identity provider).

### <a id="scope-diagram"></a>Trust zones and data flows

```mermaid
flowchart LR
  subgraph Internet
    U[Public users<br/>CB link / QR]
    A[Administrators]
    G[GitHub Actions<br/>OIDC]
  end
  subgraph Edge["Edge / third party"]
    I[Imperva<br/>CDN · DDoS · WAF]
    IDP[Identity provider<br/>Entra ID or IdC - B3a]
  end
  subgraph AWS["AWS ACCOUNT_ID · us-east-1"]
    subgraph Public["Public plane"]
      ALB[Origin ALB<br/>Imperva prefix list<br/>AWS WAF COUNT]
      ENV[Envoy Gateway]
      NG[nginx<br/>React · emergency page]
      PG[Public gateway<br/>/api]
      DEV[devices<br/>no auth - R02]
      GEO[geometry + OSRM]
    end
    subgraph Admin["Admin plane - private DNS"]
      VPN[Client VPN<br/>SAML + MFA]
      AALB[Admin ALB + WAF<br/>admin Envoy]
      CON[Console + admin gateway<br/>no login - R01]
      BE[backend<br/>permitAll - R01]
    end
    subgraph Data["Data tier"]
      CB[CodeBuild · deploy roles]
      ECR[ECR + cosign]
      RDS[(RDS Proxy → PostgreSQL 17)]
      S3[S3 · Secrets Manager]
    end
  end
  OSM[Public OSM tiles - R15]
  U --> I --> ALB --> ENV --> NG
  ENV --> PG --> DEV
  PG --> GEO
  NG -.-> OSM
  A --> IDP --> VPN --> AALB --> CON --> BE
  G -.-> CB -.-> ECR
  DEV --> RDS
  BE --> RDS
  BE --> S3
```

_Blue lines show public traffic, amber shows admin traffic, dashed shows delivery. Red markers show where the top risks sit ([section 05](#risks)). The dev VPC (DEV_VPC_CIDR) has the same shape in the same account today._

### <a id="scope-assets"></a>Assets and data classification

| Asset | Class | Why it matters | Today |
| --- | --- | --- | --- |
| **Guidance content** <br>assembly areas, routes, instructions, emergency page | Safety-critical integrity | If an attacker changes it, people are sent the wrong way during an evacuation. This is the top impact in the whole system. | Console has no login (F5) |
| **Device location samples** | Restricted · personal | Continuous tracks of up to 500,000 people are personal data under privacy law (GDPR and equivalent laws). They show where people live, work and shelter. | Kept permanently (D34) |
| **Medical-need flag and counts** | Restricted · sensitive | Health-related. Must stay as counts per area and never be tied to a device. | Counts per area |
| **Device email** (`ds_account`) | Restricted · personal | An identifier that links location tracks to a person. It goes against the stated policy (C15). | Stored; can be looked up from the internet |
| **Occupancy and movement map** | Confidential · operational | Shows where crowds are during an emergency. Its integrity drives decisions by Police, Fire and EMS. | No rate limiting, open check-in |
| **Admin accounts and credentials** | Secret | Whoever holds them controls the guidance. | Plain text, seed `admin/admin` |
| **Platform credentials and keys** <br>KMS, cosign, Secrets Manager, deployment roles | Secret | Control of the supply chain and the data. | Designed well |
| **Authority polygons, photos, logs** | Internal | Logs are also evidence and can contain IP addresses and locations. | Logs 30 days (D35) |

### <a id="scope-responsibility"></a>Shared responsibility

#### Platform operator — AWS account, network, EKS, data services, CI/CD, detection, NOC

Owns the platform controls in this strategy. Never edits `app/`, but can limit what reaches it through routes, WAF and policy.

#### Application team — Code in app/, its authentication, authorization and APIs

Owns Phase 12 fixes (F5 = 12.1.5). Each fix starts only after the developer approves in writing.

#### Client & partners — Steering Committee, CPA, Imperva, IdP owner, AWS

The Steering Committee owns risk acceptance and residency (B6). Civil Protection Authority (CPA) owns the Cell Broadcast. Imperva owns the edge, and AWS owns security of the cloud.

[Back to contents](#pdf-contents)

---

<a id="frameworks"></a>

## 03 · Framework baseline

**How the four frameworks fit together**

Each framework does a different job. ISO 27001 is the management system that owns risk and evidence. The CIS Controls set the order of work. The CIS Benchmarks define the exact configuration. The Well-Architected Security Pillar provides the AWS-native design patterns. Every strategic control in [section 10](#matrix) maps to all four.

#### <a id="fw-iso"></a>Management system — ISO/IEC 27001:2022 (+ Amd 1:2024)

Clauses 4 to 10 define the ISMS: scope, risk assessment and treatment, a Statement of Applicability, internal audit and management review. Annex A has 93 controls in four themes: organizational (37), people (8), physical (14) and technological (34) ([Modulos summary of Annex A](https://docs.modulos.ai/frameworks/iso-27001/annex-a)). Amendment 1 (2024) adds climate-change considerations to the context clauses ([ISO](https://www.iso.org/standard/27001)). Physical controls A.7 are mostly inherited from AWS and Imperva, and are covered through supplier evidence.

#### <a id="fw-cisc"></a>Prioritization — CIS Critical Security Controls v8.1

18 controls, from asset inventory to penetration testing ([CIS](https://www.cisecurity.org/controls/cis-controls-list)). They are grouped into Implementation Groups IG1 to IG3. IG3 is meant for organizations handling sensitive data or critical infrastructure ([Cisco CIS v8.1 brief](https://www.cisco.com/c/en/us/products/collateral/security/cis-controls-sb.html)). **Target:** all IG2 safeguards at go-live, then the IG3 safeguards that apply to this system (application-layer filtering, RBAC, code-level checks, application pen testing) within 12 months.

#### <a id="fw-cisb"></a>Configuration — CIS Benchmarks

Current versions: AWS Foundations 7.1.0 ([CIS AWS](https://www.cisecurity.org/benchmark/amazon_web_services)), EKS 2.0.0, which covers Kubernetes 1.34 and 1.35 ([CIS June 2026 update](https://www.cisecurity.org/insights/blog/cis-benchmarks-june-2026-update)), PostgreSQL 17 1.1.0 ([CIS PostgreSQL](https://www.cisecurity.org/benchmark/postgresql)), and NGINX 3.1.0 ([CIS NGINX](https://www.cisecurity.org/benchmark/nginx)). Add the CIS Ubuntu benchmark (nodes, already L1) and the CIS Docker benchmark (images).

#### <a id="fw-wa"></a>AWS design — Well-Architected Security Pillar

Seven best-practice areas: security foundations, identity and access management, detection, infrastructure protection, data protection, incident response and application security ([AWS Well-Architected](https://docs.aws.amazon.com/wellarchitected/latest/framework/a-security.html)). Its design principles include a strong identity foundation, traceability, security at all layers and keeping people away from data ([Security Pillar](https://docs.aws.amazon.com/wellarchitected/latest/security-pillar/security.html)). Section 07 is organized by these seven areas.

### <a id="fw-gaps"></a>Version gaps you need to manage

> **Security Hub automates CIS AWS Foundations only up to v5.0.0**
>
> Security Hub CSPM supports CIS AWS Foundations v5.0.0, 3.0.0, 1.4.0 and 1.2.0, and does not cover every requirement automatically ([AWS Security Hub documentation](https://docs.aws.amazon.com/securityhub/latest/userguide/cis-aws-foundations-benchmark.html)). CIS has since published v7.0.0 and v7.1.0 ([CIS April 2026 update](https://www.cisecurity.org/insights/blog/cis-benchmarks-april-2026-update)). **Strategy:** enable the v5.0.0 standard in Security Hub as the automated baseline. Cover the manual and newer v7.1.0 items with AWS Config custom rules or a quarterly CIS-CAT/Prowler run, and record the results as ISMS evidence.

> **EKS 1.36 is newer than the CIS EKS benchmark**
>
> CIS EKS 2.0.0 targets Kubernetes 1.34 and 1.35. Apply it to the 1.36 cluster, record any differences as justified deviations in the Statement of Applicability, and re-baseline when CIS publishes a release that covers 1.36.

> **Privacy law is a binding overlay, not optional**
>
> Use the EU GDPR as the global privacy baseline. Most modern privacy laws follow its model. Article 5 requires data minimisation, storage limitation, and integrity and confidentiality of personal data ([GDPR Article 5](https://www.gdpr.org/regulation/article-5.html)). Under Article 35, a Data Protection Impact Assessment is mandatory for large-scale systematic monitoring, and supervisory authorities list tracking people's location as a trigger ([EDPB-published DPIA guidance](https://www.edpb.europa.eu/system/files/decisions/ie_dpc_data-protection-impact-assessment.pdf)). Continuous location samples from up to 500,000 devices clearly meet that bar. Run privacy management with ISO/IEC 27701:2025, which is now a stand-alone privacy information management system standard ([ISO/IEC 27701:2025](https://cdn.standards.iteh.ai/samples/iso/iso-iec-27701-2025/999f0b4e27d84804be12758c821cc34e/iso-iec-27701-2025.pdf)). Map the local law of each jurisdiction you operate in onto this baseline, and appoint a DPO.

[Back to contents](#pdf-contents)

---

<a id="threats"></a>

## 04 · Threat model

**Who attacks an emergency system, and when**

The attack that matters most comes during a real event or drill, when the site's value and public attention are at their peak. Plan for availability and integrity attacks on the day, and for quiet data theft in between.

#### <a id="ta-state"></a>TA-1 · State-sponsored — Disruption or disinformation during a real event

DDoS timed to an alert, tampering with guidance content, a fake guidance site, and pre-positioned access through the supply chain or admin accounts. Targets integrity and availability.

#### <a id="ta-hack"></a>TA-2 · Hacktivists — Defacement and volumetric DDoS

Opportunistic. Uses public findings like Swagger UI, open device endpoints and default credentials. Will publish any data leak.

#### <a id="ta-crime"></a>TA-3 · Data harvesters — Bulk extraction of location and contact data

Enumerates `GET /device?all=true` and email lookups. Re-identification and resale. Highest legal impact under GDPR-style privacy law.

#### <a id="ta-insider"></a>TA-4 · Insider or compromised partner — Misuse of legitimate access

Wide authority user base (Police, Fire, EMS, local authorities, CPA). Shared or leftover accounts, and social engineering of the NOC to scale capacity down.

#### <a id="ta-physical"></a>TA-5 · Physical / local — QR sticker replacement on signs

A cheap way to send people to a lookalike site. It bypasses every cloud control, so it needs physical and domain-trust countermeasures.

#### <a id="ta-abuse"></a>TA-6 · Abuse of public flows — Fake check-ins and location floods

Bots post fake arrivals or medical flags to distort occupancy, which misleads first responders. There is no rate limiting today (C14).

### <a id="threat-stride"></a>STRIDE view of the critical flows

| Flow | Main threats | Primary controls |
| --- | --- | --- |
| Public user → Imperva → origin → devices/geo | DoS, Tampering (fake check-ins), Information disclosure (device enumeration) | [SC-11](#sc-11), [SC-12](#sc-12), [SC-13](#sc-13), [SC-26](#sc-26), [SC-33](#sc-33) |
| Administrator → VPN → console → backend | Spoofing (no app login), Elevation (no RBAC), Repudiation (no per-user audit) | [SC-04](#sc-04), [SC-05](#sc-05), [SC-08](#sc-08) |
| Service → service (plain HTTP) | Spoofing, Tampering inside the cluster after one pod is compromised | [SC-14](#sc-14), [SC-17](#sc-17) |
| GitHub → OIDC → AWS roles → ECR → Argo CD | Tampering (malicious image), Elevation (role trust abuse) | [SC-06](#sc-06), [SC-24](#sc-24), [SC-15](#sc-15) |
| App → RDS Proxy → PostgreSQL | Elevation (superuser app role), Information disclosure | [SC-07](#sc-07), [SC-18](#sc-18), [SC-19](#sc-19) |
| Citizen → sign → QR → domain | Spoofing (lookalike site) | [SC-31](#sc-31) |

[Back to contents](#pdf-contents)

---

<a id="risks"></a>

## 05 · Risk register

**Twenty risks, ranked by likelihood and impact**

This is the ISO 27001 clause 6.1.2 risk assessment. Likelihood and impact use a 1 to 5 scale, and impact puts life-safety first. Every risk links to the controls and changes that treat it. Click a code in the heat map to jump to that row.

**Risk heat map (likelihood × impact)**

| Likelihood \ Impact | 1 | 2 | 3 | 4 | 5 |
| --- | --- | --- | --- | --- | --- |
| **5** |  |  |  |  | [R01](#r01) [R02](#r02) |
| **4** |  |  |  | [R06](#r06) [R09](#r09) | [R03](#r03) [R04](#r04) [R05](#r05) |
| **3** |  | [R19](#r19) | [R15](#r15) [R17](#r17) | [R11](#r11) [R12](#r12) [R13](#r13) [R14](#r14) | [R07](#r07) [R08](#r08) [R10](#r10) |
| **2** |  |  |  | [R16](#r16) [R18](#r18) |  |
| **1** |  |  |  |  | [R20](#r20) |

**Reading the map.** Rows show likelihood (5 at the top) and columns show impact. Risks rated Critical (score 20 or more) must be closed or mitigated before go-live. High risks (12 to 19) need a dated treatment plan that the Steering Committee owns.

**Risk appetite (proposed for client approval).** No tolerance for risks to the integrity of guidance or bulk exposure of personal data. Low tolerance for availability risk during an event. Moderate tolerance for confidentiality risk on operational data.

| ID | Risk | L | I | Rating | Source | Treated by |
| --- | --- | --- | --- | --- | --- | --- |
| <a id="r01"></a>R01 | **Admin console and API without authentication** <br>`permitAll()`, plain-text passwords, seed `admin/admin`, no RBAC. Anyone on the VPN can change guidance, and anyone who reaches the gateway can too. | 5 | 5 | Critical | F5, C21 | [SC-05](#sc-05), [SC-04](#sc-04), [CH-01](#ch-01) |
| <a id="r02"></a>R02 | **Device data can be read from the internet** <br>Through `GET /device?all=true`, lookup by email, count and check-in. Bulk exposure of personal location data. | 5 | 5 | Critical | F5, C21 | [SC-13](#sc-13), [CH-01](#ch-01), [SC-18](#sc-18) |
| <a id="r03"></a>R03 | **JDWP debug agent on 8787 as root, on a 2021 JDK base** <br>JDWP gives remote code execution to anything that can reach the port. Old base image has known CVEs. | 4 | 5 | Critical | C20 | [SC-23](#sc-23), [CH-06](#ch-06) |
| <a id="r04"></a>R04 | **Guidance spoofing: lookalike domain or swapped QR codes** <br>Citizens are sent to an attacker's page during an evacuation. | 4 | 5 | Critical | Threat model | [SC-31](#sc-31), [SC-27](#sc-27) |
| <a id="r05"></a>R05 | **Outage under DDoS or surge during a real event** <br>Imperva is a single edge, scaling is manual (NOC), and there is a hard cap of four m7g.8xlarge nodes. | 4 | 5 | Critical | Brief, B22 | [SC-11](#sc-11), [SC-33](#sc-33), [SC-26](#sc-26) |
| <a id="r06"></a>R06 | **Permanent retention of location samples, plus device emails** <br>Goes against data minimization. A breach would expose the full history. Legal exposure under GDPR storage limitation. | 4 | 4 | High | D34, C15 | [CH-04](#ch-04), [SC-18](#sc-18) |
| <a id="r07"></a>R07 | **Fake check-ins and medical flags distort occupancy** <br>No rate limiting and no device binding. Responders act on false data. | 3 | 5 | High | C14 | [SC-26](#sc-26), [SC-11](#sc-11) |
| <a id="r08"></a>R08 | **dev and prd share one account** <br>A dev compromise or a mistake can reach prd. Permission boundaries and tags are weaker isolation than separate accounts. | 3 | 5 | High | D44, B25 | [CH-02](#ch-02), [SC-02](#sc-02) |
| <a id="r09"></a>R09 | **Preventive controls in observe-only mode** <br>AWS WAF is in COUNT, Kyverno is in Audit and origin mTLS is optional. Attacks are logged, not stopped. | 4 | 4 | High | 9.1.7, 9.1.5, B22 | [SC-12](#sc-12), [SC-15](#sc-15), [SC-11](#sc-11) |
| <a id="r10"></a>R10 | **Application database user is `rds_superuser` and owner** <br>Any SQL injection or app compromise has full control of the database. | 3 | 5 | High | D47 | [CH-05](#ch-05), [SC-07](#sc-07) |
| <a id="r11"></a>R11 | **No identity provider and no admin inventory yet** <br>No joiner-mover-leaver process for many partner organizations. | 3 | 4 | High | B3a, B3b | [SC-04](#sc-04), [B3a](#dec-b3a) |
| <a id="r12"></a>R12 | **Lateral movement inside the cluster** <br>Plain HTTP and no authentication between services. NetworkPolicies are the only barrier (C9). | 3 | 4 | High | C9 | [SC-17](#sc-17), [SC-14](#sc-14) |
| <a id="r13"></a>R13 | **Not enough evidence for forensics** <br>All logs kept 30 days with no archive. Investigations and legal requests usually come later than that. | 3 | 4 | High | D35 | [CH-03](#ch-03), [SC-08](#sc-08) |
| <a id="r14"></a>R14 | **NOC tricked into scaling down** <br>Manual scaling with no caller verification (B12). | 3 | 4 | High | B12 | [SC-30](#sc-30), [B12](#dec-b12) |
| <a id="r15"></a>R15 | **Third-party map tiles** <br>Public OSM tiles send user locations to a third party and can be throttled during a surge. | 3 | 3 | Medium | C13 | [SC-34](#sc-34) |
| <a id="r16"></a>R16 | **Supply-chain compromise** <br>GitHub org takeover, a poisoned dependency or base image. Mitigated by OIDC pinning, SHA-pinned actions and cosign, but signature enforcement is still in Audit. | 2 | 4 | Medium | Brief | [SC-24](#sc-24), [SC-15](#sc-15) |
| <a id="r17"></a>R17 | **Uncontrolled schema changes** <br>`ddl-auto: update` with no migrations. A drifting schema can cause data loss. | 3 | 3 | Medium | C23 | [SC-35](#sc-35), [CH-05](#ch-05) |
| <a id="r18"></a>R18 | **Residency drift** <br>Imperva logs, PoPs or IdP data stored outside the approved jurisdiction before B6 is confirmed. | 2 | 4 | Medium | B6, B22 | [SC-29](#sc-29), [B6](#dec-b6) |
| <a id="r19"></a>R19 | **Posture blind spots** <br>CIS standard INCOMPLETE, FSBP unscored, default VPC still present. | 3 | 2 | Medium | Live state | [SC-10](#sc-10), [CH-08](#ch-08) |
| <a id="r20"></a>R20 | **Root or break-glass misuse** <br>Account root and the cluster break-glass role are the only unlimited identities. | 1 | 5 | Medium | Baseline | [SC-03](#sc-03) |

[Back to contents](#pdf-contents)

---

<a id="principles"></a>

## 06 · Strategic principles

**Seven rules that decide trade-offs**

When two good controls conflict, such as caching against freshness, or strict blocking against reachability during a surge, apply these principles in order.

1. <a id="p1"></a>**Life-safety first: integrity, then availability, then confidentiality.** Guidance must be correct before it is fast, and fast before it is private. A cached, signed emergency page is better than a live page that may have been tampered with.
2. <a id="p2"></a>**Fail to a known-good degraded mode, never to open.** If the cluster is down or overloaded, the edge serves the static emergency page. If authentication fails, admin writes are denied.
3. <a id="p3"></a>**Public plane is read-mostly and explicitly allow-listed.** Only named paths and methods are routed. Everything else returns 404 at the edge.
4. <a id="p4"></a>**Every human is named, federated and phishing-resistant.** No shared accounts, no local passwords in the app, and MFA everywhere a person authenticates.
5. <a id="p5"></a>**Collect less, keep less.** Store the minimum needed for the evacuation purpose, for a set time, then aggregate or delete. Retention is set per data class, not as one rule for everything.
6. <a id="p6"></a>**Platform compensates, app remediates.** The platform team contains application weaknesses with routing, WAF, policy and network controls, but never treats that as permanent. Each compensating control has an expiry tied to a Phase 12 task.
7. <a id="p7"></a>**Everything as code, everything evidenced.** Controls live in Terraform, Argo CD and Kyverno. Their state is measured continuously in Security Hub and Config, and the results feed the ISO 27001 evidence pack.

[Back to contents](#pdf-contents)

---

<a id="domains"></a>

## 07 · Control domains

**The strategy by Well-Architected area**

For each area: where it stands today, the target state, and the specific work. The tags show the main CIS Controls (CIS n), ISO Annex A controls (A.x.y) and CIS Benchmarks that apply.

<a id="d-foundations"></a>

### <a id="d-foundations-h"></a>7.1 Security foundations and governance

`ISO Cl. 4–10` `A.5.1–5.4` `A.5.19–5.23` `CIS 15` `WA SEC01`

**Today**

- Strong decision log (D-, B-, C- items) and ADRs
- One account, dev and prd separated by tags and boundaries
- No ISMS scope, policy set or Statement of Applicability
- Supplier security (Imperva, IdP, app team) not formalized

**Target**

- ISMS scoped to "the alerting system service and its AWS platform", with the Steering Committee as owner
- AWS Organizations: management, security tooling, log archive, prd and dev accounts
- SoA covering all 93 Annex A controls, with justification for each exclusion
- Supplier register with security clauses, DPAs and residency commitments

**Work items**

- Write a one-page information security policy plus topic policies: access control, cryptography, logging, retention, supplier, secure development, incident response, acceptable use (A.5.1, A.5.37).
- Set up a RACI covering the platform team, the application team, the Steering Committee, CPA and Imperva (A.5.2, A.5.3 segregation of duties). The prd approver must not be the author.
- Adopt the risk method in [section 05](#risks). Review it quarterly and after every drill (Cl. 6.1, 8.2).
- Create a separate prd account ([CH-02](#ch-02)) with SCPs that deny leaving the org, deny disabling CloudTrail, Config, GuardDuty or Security Hub, deny Regions other than us-east-1 (residency), and deny creating IAM users or access keys.
- Run internal audit and management review twice a year, aiming for ISO 27001 certification readiness within 12 months of go-live.

<a id="d-iam"></a>

### <a id="d-iam-h"></a>7.2 Identity and access management

`CIS 5, 6` `A.5.15–5.18` `A.8.2, A.8.5` `CIS AWS §IAM` `WA SEC02–03`

**Today**

- GitHub OIDC with pinned `sub`, ExternalId, permission boundaries
- EKS access entries and Pod Identity, break-glass as the only cluster-admin
- Client VPN with SAML and MFA, but the IdP is undecided (B3a)
- Application: no working login and no authorization model (F5)

**Target**

- One workforce IdP for all human access, with phishing-resistant MFA (FIDO2 or passkeys) for super admins
- IAM Identity Center for AWS console and CLI. No IAM users.
- App uses OIDC with role and scope claims: authority, area and screen
- Quarterly access reviews and automatic deprovisioning

**Work items**

- **Humans (AWS):** federate Identity Center to the chosen IdP. Use permission sets for Viewer, Operator, Deployer (break-glass) and Auditor. Enforce MFA. Allow console sessions of 8 hours at most, and 1 hour for admin permission sets.
- **Humans (app):** the admin gateway validates OIDC tokens. The backend enforces `@PreAuthorize` on every endpoint. A data model links users to groups, screens and locations, matching the PRD's two user types (CIS 6.8 RBAC, A.5.15).
- **Root:** hardware MFA, no access keys, root-usage alarm, contact details current. Once the Organization exists, use centralized root access management (CIS AWS Foundations IAM section).
- **Break-glass:** two named sealed identities. Each use triggers a page to the security owner and a mandatory post-use review (A.8.2).
- **Workloads:** keep Pod Identity, with one role per service account, scoped to the exact secret ARN and KMS key. Turn on IAM Access Analyzer unused-access findings.
- **CI:** keep OIDC with immutable `sub`. Add `job_workflow_ref` conditions so only named workflows can assume the deploy roles.

<a id="d-detect"></a>

### <a id="d-detect-h"></a>7.3 Detection and logging

`CIS 8, 13` `A.8.15, A.8.16` `A.5.28` `CIS AWS §Logging/Monitoring` `WA SEC04`

**Today (live)**

- CloudTrail multi-Region with validation, Config with a conformance pack
- GuardDuty with S3, EKS audit, malware and runtime monitoring; Security Hub; Access Analyzer; Inspector
- CIS standard INCOMPLETE, FSBP unscored
- All logs 30 days, no archive (D35)

**Target**

- Log-archive account with S3 Object Lock (compliance mode), KMS, us-east-1
- Tiered retention: security logs 1 year hot plus 6 years cold, operational logs 30 to 90 days
- Security Hub FSBP and CIS v5.0.0 at 95% or more passing, with tracked exceptions
- 24/7 alert routing with runbooks for the 15 top detections

**Work items**

- Fix the CIS standard: disable it and re-enable CIS v5.0.0 now that Config is recording, then confirm READY. AWS re:Post notes that Security Hub retries INCOMPLETE standards about every 12 hours ([AWS re:Post](https://repost.aws/knowledge-center/security-hub-empty-score-status)).
- Ship ALB, Envoy, Imperva, VPC Flow, EKS audit, pgaudit and Client VPN connection logs to the archive. Keep at least 90 days hot to meet CIS 8.10.
- Add app-level audit events: who changed which guidance object, from where and when. This removes the repudiation risk.
- Detection use cases: guidance changed outside a change window, admin login from a new country, a spike in reads of the device list, high error rates at the Envoy proxy, a GuardDuty runtime finding on any node, a disabled security service, root usage, a break-glass assumption, a cosign verification failure, a WAF block-rate anomaly, a scale-down request outside the procedure.
- Time sync: confirm nodes use the Amazon Time Sync Service and that Imperva log timestamps are UTC (A.8.17).

<a id="d-infra"></a>

### <a id="d-infra-h"></a>7.4 Infrastructure protection

`CIS 4, 12, 13` `A.8.20–8.22` `A.8.9` `CIS EKS 2.0.0` `CIS Ubuntu L1` `CIS NGINX` `WA SEC05–06`

**Today (designed)**

- Imperva → origin ALB limited to an Imperva prefix list. AWS WAF in COUNT, optional mTLS.
- Private EKS endpoint, CIS L1 Ubuntu nodes, IMDSv2 with hop limit 1, SSM only
- PSA restricted, Kyverno in Audit, default-deny NetworkPolicies
- The whole `/api` prefix is proxied, and the default VPC still exists

**Target**

- Imperva with mandatory origin mTLS and a trusted client-IP header. The origin rejects anything else.
- AWS WAF in BLOCK with managed rules, rate rules and route allow-lists
- Kyverno Enforce: non-root, signed images, registry allow-list, no privileged pods
- Egress allow-list. No route to the internet except named destinations.

**Work items**

- **Edge:** make origin mTLS mandatory (a client certificate from Imperva, validated by an ALB trust store). Keep the prefix list as a second layer. Use only the Imperva client-IP header for rate limiting and logs, and strip it at the edge if it arrives from outside.
- **Routes:** public Envoy HTTPRoutes match exact paths and methods ([CH-01](#ch-01)). nginx must not proxy `/api` as a prefix. Block `/swagger-ui`, `/v3/api-docs` and `/actuator` at Imperva and at AWS WAF.
- **EKS:** score against CIS EKS 2.0.0. Enable control-plane logging for audit and authenticator, KMS envelope encryption of Kubernetes Secrets, and pin the Envoy Gateway and Kyverno charts by digest.
- **Nodes:** keep CIS Ubuntu L1. Adopt the L2 items that don't break workloads (auditd rules, kernel module blacklist) and record the rest as deviations.
- **nginx:** apply CIS NGINX items: run as non-root, `server_tokens off`, security headers (CSP, HSTS, X-Content-Type-Options, frame-ancestors), TLS settings handled at Imperva and the ALB.
- **Network:** delete the default VPC in every Region, add VPC endpoints for S3, ECR, STS, Secrets Manager, KMS and logs, and route remaining egress through AWS Network Firewall with an FQDN allow-list.

<a id="d-data"></a>

### <a id="d-data-h"></a>7.5 Data protection and privacy

`CIS 3, 11` `A.5.12, A.5.33, A.5.34` `A.8.10–8.13, A.8.24` `CIS PostgreSQL 17` `WA SEC07–09`

**Today**

- KMS customer keys per env, Secrets Manager, CSI-mounted secrets
- RDS Multi-AZ, deletion protection, pgaudit, IAM tokens for DBAs
- Location kept permanently (D34), email per device (C15)
- App user is `rds_superuser` (D47). No backup vault policy defined.

**Target**

- Classification scheme from [2.2](#scope-assets), applied through tags
- Raw location samples kept 30 days after an event closes (proposed), then aggregated to area and time
- Least-privilege DB roles, TLS required to RDS, encrypted backups in a separate account with vault lock
- Encryption in transit everywhere, including between services

**Work items**

- **Minimization ([CH-04](#ch-04)):** replace D34 with a retention rule per class. Remove `ds_account.email`. Use a random device identifier that rotates for each event.
- **Database ([CH-05](#ch-05)):** roles `alerting_owner` (migrations only, through CI), `alerting_app` (DML on named tables), `alerting_ro` (reporting). Set `rds.force_ssl=1`. Apply the CIS PostgreSQL 17 items that apply to RDS: logging parameters, `pgaudit.log` classes, `log_connections`.
- **Backups:** AWS Backup plan with PITR at least 7 days and daily snapshots for 35 days, copied to a backup vault in a separate account in us-east-1 with Vault Lock. Run a restore test every quarter (CIS 11.4, A.8.13).
- **Keys:** separate key policies for administrators and users of keys, yearly rotation, deny `kms:ScheduleKeyDeletion` through SCP except for break-glass.
- **Photos ([C17](#dec-c17)):** uploaded only through the admin plane with presigned PUT URLs, scanned by GuardDuty Malware Protection for S3, served through the edge with no public bucket.
- **Privacy:** run a DPIA, publish a privacy notice on the public site (purpose, retention, rights), and notify or register with the supervisory authority where the local law requires it.

<a id="d-app"></a>

### <a id="d-app-h"></a>7.6 Application security

`CIS 16, 18` `A.8.25–8.29, A.8.32` `OWASP ASVS 5.0 L2` `CIS Docker` `WA SEC11`

**Today**

- Strong supply chain: single build, SBOM, provenance, Trivy and Inspector gates, cosign, immutable tags
- No authentication or authorization, open device endpoints, Swagger served
- JDWP on 8787, root user, `openjdk:17.0.1`, tests skipped
- No rate limiting, `ddl-auto: update`

**Target**

- OWASP ASVS 5.0 Level 2 as the acceptance standard for Phase 12 ([OWASP ASVS](https://github.com/owasp/asvs))
- Distroless or slim supported JRE base, non-root, no debug agents in any image
- Separate public and admin APIs, built from separate controllers
- SAST, SCA, secret scanning and DAST in the pipeline, with blocking thresholds

**Work items (Phase 12, need written developer approval)**

- **12.1.5 / F5:** remove `permitAll()`, HTTP basic and `NoOpPasswordEncoder`. Validate resource-server JWTs from the IdP. Delete the seed in `data.sql`. Remove the `/auth/**` route to the missing service.
- **C21:** split the devices controller into a public part (position post, arrival, medical flag, own device only) and an admin part (list, lookup, count) that is reachable only through the admin gateway.
- **Device binding:** issue a short-lived signed device token on first visit. Each post must carry it. Rate-limit per token and per IP ([SC-26](#sc-26)).
- **C20:** new Dockerfiles. Multi-stage, supported JRE 17 or 21 base, `USER 10001`, no JDWP, tests run in CI. Swagger turned off in prd by profile.
- **C23:** set `ddl-auto: validate` and use Flyway or Liquibase migrations run as a Kubernetes Job with the owner role.
- **Pipeline:** add CodeQL or Semgrep SAST, dependency review, gitleaks, and an OWASP ZAP baseline scan against dev in workflow 05. Block on High and Critical findings.

<a id="d-supply"></a>

### <a id="d-supply-h"></a>7.7 Software supply chain and change

`CIS 2, 7, 16` `A.8.4, A.8.8, A.8.30–8.32` `WA SEC11`

This is the strongest area today. The strategy keeps it and closes the enforcement loop. Signature verification moves to Enforce, the GitHub org is hardened and vulnerability handling gets SLAs.

**Work items**

- Kyverno `verifyImages` in Enforce for `alias/alerting-prd-cosign` with digest pinning, plus a registry allow-list limited to the prd ECR and the pull-through cache.
- GitHub org: SSO and MFA required, branch protection with signed commits, CODEOWNERS on `infra/` and workflow files, required reviewers for `prd` environments, and no self-approval.
- Vulnerability SLAs (CIS 7): Critical 7 days, High 30 days, Medium 90 days, measured from the first Inspector or Trivy finding. Rebuild nodes monthly (already planned), and rebuild images weekly from the base.
- Keep the console CodeBuild fallback, but run it only from the same signed source and the same role chain, and log every manual use.

<a id="d-ir"></a>

### <a id="d-ir-h"></a>7.8 Incident response and resilience

`CIS 17, 11` `A.5.24–5.30` `A.6.8` `WA SEC10`

**Today**

- Findings SNS topic and weekly digest
- NOC scales by hand, with no caller verification
- No IR plan, playbooks, or forensics account

**Target**

- IR plan with named roles: incident commander, comms (with CPA), legal or DPO
- Eight playbooks, each exercised once a year, and DDoS plus surge drills before each national exercise
- Forensics role and isolated account, pre-approved isolation actions

**Playbooks**

1. DDoS or surge during a live event: Imperva escalation, AWS Shield, scale-up order and emergency page fallback.
2. Unauthorized guidance change: freeze writes, restore from the audit trail, notify CPA.
3. Admin account compromise: disable the user at the IdP, revoke sessions, review audit events.
4. Personal data exposure: contain, assess, notify the supervisory authority and affected people as the law requires.
5. Malicious or unsigned image: Kyverno blocks it, Argo CD rolls back, the signing key is rotated.
6. Compromised node or pod: GuardDuty runtime finding, cordon and isolate, EBS snapshot, rebuild.
7. Lookalike site or swapped QR codes: takedown requests, public messaging through CPA, sign sweep.
8. Social engineering of the NOC: verification failed, escalate, keep current capacity.

<a id="d-people"></a>

### <a id="d-people-h"></a>7.9 People and operations

`CIS 14` `A.6.1–6.8` `A.5.37`

#### Role-based training

Administrators at each authority get yearly training on phishing, MFA fatigue and how to report. Platform engineers get secure Terraform and Kubernetes training. The app team gets ASVS-based secure coding.

#### NOC procedure

A capacity change needs a ticket ID and a callback to a registered number. Scale-down also needs a second approver ([B12](#dec-b12)).

#### Screening & offboarding

Screening for super admins in line with client policy. When a person leaves, IdP deprovisioning is the single off-switch, checked in the quarterly access review.

[Back to contents](#pdf-contents)

---

<a id="deepdives"></a>

## 08 · Design deep dives

**Seven design questions, answered in detail**

This section covers WAF rules and location enforcement, alerting without a staffed SOC, database users, Kubernetes service accounts, the admin hostname, hardened container images, and lower-cost alternatives to Client VPN for admin access. Each topic opens with a direct answer, then gives the concrete rules, roles or options, and links back to the risks, changes and controls they support.

<a id="dd-waf"></a>

### <a id="dd-waf-h"></a>8.1 WAF rules for common attacks and location enforcement

`CIS 13.10` `A.8.20, A.8.23` `WA SEC05` `ASVS V4`

> **Short answer: some protection is on by default, but most of what this system needs is manual**
>
> **Imperva** applies its default account WAF Rules policy to every new site automatically. In that policy, SQL injection, cross-site scripting, illegal resource access and remote file inclusion are all set to Block Request ([Imperva policies](https://docs-cybersec.thalesgroup.com/bundle/cloud-application-security/page/policies.htm)). Backdoor protection defaults to Auto-Quarantine ([Imperva WAF settings](https://docs-cybersec.thalesgroup.com/bundle/cloud-application-security/page/settings/waf-settings.htm)). Bad bots are denied and good bots allowed by default ([Imperva security settings](https://docs-cybersec.thalesgroup.com/bundle/cloud-application-security/page/settings/security-settings.htm)).
> **AWS WAF** has no protection until you add rules. A web ACL with no matching rule just applies its default action, normally Allow ([AWS WAF default action](https://docs.aws.amazon.com/waf/latest/developerguide/web-acl-default-action.html)). Every managed rule group has to be added and tuned.
> **Manual in both layers:** the public path allow-list, rate limits, country rules, and anything specific to this API.

#### How the two layers share the work

- **Imperva (edge, primary):** sees the real client IP, absorbs DDoS, filters bots and reputation, and applies the OWASP rules. It is the only layer that can do IP reputation and anonymizer filtering correctly for the public plane.
- **AWS WAF on the origin ALB (second layer):** applies AWS managed rules for Java and PostgreSQL attacks, enforces the exact public route allow-list, and adds per-client rate limits. It also guards against anything that slips past Imperva.
- **AWS WAF on the admin ALB:** applies managed rules plus a short allow-list of admin routes. It reaches only VPN users, so it doesn't need bot or geo rules.

| ID | Rule | Layer | Default or manual | Action and notes |
| --- | --- | --- | --- | --- |
| <a id="waf-01"></a>WAF-01 | **OWASP rules policy** <br>SQLi, XSS, illegal resource access, RFI | Imperva | Default, applied automatically | Block Request. Confirm that no site or rule has been switched to Alert Only, and that the account policy is attached to the public site. |
| <a id="waf-02"></a>WAF-02 | **Backdoor protection** | Imperva | Default | Auto-Quarantine. Keep it. |
| <a id="waf-03"></a>WAF-03 | **Bot access control** | Imperva | Default (bad bots denied, good bots allowed) | Keep it. Don't put a CAPTCHA on public pages, because people must not hit a puzzle during an evacuation. Use a JavaScript challenge only on the position write path, and only while under attack. |
| <a id="waf-04"></a>WAF-04 | **DDoS protection** settings | Imperva | On, but the threshold needs tuning | Set the detection threshold for peak load (500,000 concurrent users), so a real event doesn't look like an attack. Depends on the Imperva tier (B22). |
| <a id="waf-05"></a>WAF-05 | **Public route allow-list** <br>positive security | Imperva ACL + AWS WAF | Manual | Block anything that isn't a listed method and path: site assets, the emergency page, the position POST and the geo routes. Explicitly deny `/api/backend-service/**`, `/api/v1/swagger-ui`, `/actuator/**`, `GET /device?all=true`, lookup by email, and count. This puts [CH-01](#ch-01) into practice and contains [R02](#r02). |
| <a id="waf-06"></a>WAF-06 | **Rate limits per client** | Imperva rules + AWS WAF rate-based | Manual | Use separate limits for the position POST, geo and OSRM routing, and site assets. Set thresholds high, because carrier-grade NAT puts many phones behind one IP. Prefer Challenge over Block on read paths. Imperva rules support rate criteria ([Imperva rules](https://docs.imperva.com/bundle/cloud-application-security/page/rules/rules.htm)). In AWS WAF, aggregate on the forwarded client IP ([AWS WAF rate-based rules](https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-statement-type-rate-based-aggregation-options.html)). Addresses C14, [R05](#r05) and [R07](#r07). |
| <a id="waf-07"></a>WAF-07 | **Core rule set** `AWSManagedRulesCommonRuleSet` | AWS WAF | Manual (add it) | Block. It covers a wide range of vulnerabilities from the OWASP Top 10 ([AWS baseline rule groups](https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-baseline.html)). If the COUNT period shows false positives on the position body, override the size-restriction rules. |
| <a id="waf-08"></a>WAF-08 | **Known bad inputs** `AWSManagedRulesKnownBadInputsRuleSet` | AWS WAF | Manual | Block. It includes Log4j and Java deserialization RCE rules ([AWS changelog](https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-changelog.html)), which matter for a Spring and Java stack. |
| <a id="waf-09"></a>WAF-09 | **SQL database** `AWSManagedRulesSQLiRuleSet` | AWS WAF | Manual | Block. It covers SQL injection patterns ([AWS use-case rule groups](https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-use-case.html)), which matters with PostgreSQL behind every service. |
| <a id="waf-10"></a>WAF-10 | **Linux OS** `AWSManagedRulesLinuxRuleSet` | AWS WAF | Manual | Block. Catches local-file-inclusion attempts against Linux paths. |
| <a id="waf-11"></a>WAF-11 | **Admin protection** `AWSManagedRulesAdminProtectionRuleSet` | AWS WAF (public ACL only) | Manual | Block. Admin paths must never be served on the public plane. Leave it off the admin ALB. |
| <a id="waf-12"></a>WAF-12 | **IP reputation and anonymous IP lists** | Imperva, not AWS WAF | Manual choice | The AWS groups use the source IP of the request, which behind a proxy is the proxy's address ([AWS IP reputation groups](https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-ip-rep.html)). Behind Imperva they would only see Imperva's own IPs. Use Imperva's reputation features instead. Block anonymizers and hosting providers on the write path only. |
| <a id="waf-13"></a>WAF-13 | **Origin guard** | ALB SG + AWS WAF | Manual | Keep the Imperva-only prefix list. Add mandatory origin mTLS or a secret header that AWS WAF checks, so the origin can't be reached without going through Imperva ([CH-07](#ch-07)). |
| <a id="waf-14"></a>WAF-14 | **Bot Control, account takeover protection** | AWS WAF | Optional (paid) | Not needed in release one: Imperva handles bots, and admin login is VPN-only. Reconsider if a public account feature is ever added. |

#### Location enforcement

Location means three different things here, and each needs a different control.

- **Admins: enforce it at the identity provider, not the WAF.** Admin traffic arrives over the VPN, so the WAF never sees the admin's real location. If the IdP is Entra ID (B3a), use a Conditional Access location policy to block sign-in from outside the service country ([Microsoft Entra](https://learn.microsoft.com/en-us/entra/identity/conditional-access/policy-block-by-location)). Alert on any VPN connection from an unexpected country ([AL-17](#al-17)).
- **Public reading: don't geo-block.** With home-routed roaming, the most common setup, a visitor's traffic leaves the internet through their home operator. A tourist in the service area therefore shows up with a foreign IP ([ipregistry](https://ipregistry.co/blog/travel-esim-ip-geolocation-home-routing)). A country block would turn away exactly the visitors who most need guidance. Label requests by country instead (rule action Count), and apply stricter rate limits to traffic from outside the service country.
- **Public writes (position samples): enforce it in the application, with WAF help.** An IP address can't tell you where a device is. The real control is server-side: reject any coordinate outside the service-area polygon (PostGIS `ST_Within`), any implausible speed between samples, and any timestamp out of range ([R07](#r07)). At the edge, block anonymizers and hosting providers on this path, and apply the tightest rate limit.
- **Make AWS WAF see the real client.** Geo match and rate-based rules can read the client address from a forwarded IP header instead of the request origin ([AWS forwarded IP](https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-statement-forwarded-ip-address.html)). Configure them to read Imperva's client IP header (B22). That header can only be trusted because the origin accepts nothing but Imperva (WAF-13).
- **Hard country blocking, if the client wants it anyway:** apply it only to the write path, with Imperva's ACL Block Countries ([Imperva policies](https://docs-cybersec.thalesgroup.com/bundle/cloud-application-security/page/policies.htm)), and record the accepted impact on roaming visitors.

<a id="dd-alerts"></a>

### <a id="dd-alerts-h"></a>8.2 Security alerting without a staffed SOC

`CIS 8.11, 13.1, 17` `A.5.24–5.26, A.8.16` `WA SEC04, SEC10`

> **Short answer: yes, use an alert-only model with three tiers and no dashboards**
>
> AWS services already do most of the correlation. Since December 2025, Security Hub correlates and enriches signals from GuardDuty, Inspector and Security Hub CSPM to surface critical risks ([AWS Security Hub GA](https://aws.amazon.com/about-aws/whats-new/2025/12/security-hub-near-real-time-risk-analytics/)). GuardDuty Extended Threat Detection raises a single Critical attack-sequence finding for a likely compromised EKS cluster ([GuardDuty attack sequences](https://docs.aws.amazon.com/guardduty/latest/ug/guardduty-attack-sequence-finding-types.html)).
> Your job is routing: send the few findings that matter to people, and roll everything else into a weekly digest. A full SIEM can come later, if a client SOC wants the feed.

#### Pipeline

1. **Sources:** Security Hub (findings from GuardDuty, Inspector and CSPM), CloudTrail management events, AWS WAF and Imperva events, Client VPN connection logs, pgaudit, Kyverno, synthetic canaries, and app audit events.
2. **Noise control first:** Security Hub automation rules suppress findings or change their severity before EventBridge sees them ([Security Hub automations](https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-v2-automations.html)). Use them to tag prd resources as higher severity, and to suppress accepted exceptions that have an expiry date.
3. **Routing:** EventBridge rules and CloudWatch alarms send to one SNS topic per tier, replacing the single findings topic.
4. **Delivery:**
  - P1 goes to an on-call paging tool (phone and SMS).
  - P2 goes to a chat channel through Amazon Q Developer in chat applications, which forwards SNS notifications to Slack or Teams ([Amazon Q Developer in chat](https://docs.aws.amazon.com/chatbot/latest/adminguide/what-is.html)), plus email.
  - P3 goes into the weekly digest.
5. **Runbook link in every alert:** each alert carries the alert ID and the first three actions to take.
6. **Testing:** monthly, generate GuardDuty sample findings and fire one synthetic event per P1 rule, then confirm that the page arrived and was acknowledged.

| Tier | Meaning | Delivery | Target response |
| --- | --- | --- | --- |
| P1 | Likely compromise, or loss of integrity or availability of guidance | Page 24/7 (phone and SMS), plus chat | Acknowledge in 15 minutes, start containment in 1 hour |
| P2 | Serious misconfiguration or suspicious activity, with no sign of compromise yet | Chat plus email, during working hours. During an event or drill, P2 becomes P1. | Triage the same working day |
| P3 | Hygiene and posture | Weekly digest | Review weekly, fix by priority |

| ID | Alert rule | Source | Tier | First response |
| --- | --- | --- | --- | --- |
| <a id="al-01"></a>AL-01 | **Any GuardDuty attack sequence** <br>`AttackSequence:*` | GuardDuty via Security Hub | P1 | Isolate the affected workload or role, preserve evidence, follow the incident playbook |
| <a id="al-02"></a>AL-02 | **GuardDuty finding of High severity or above** <br>runtime, EKS audit, IAM credential misuse, malware | GuardDuty | P1 | Cordon the node and quarantine the pod. Rotate the credential. |
| <a id="al-03"></a>AL-03 | **Root user activity** | CloudTrail via EventBridge (CIS CloudWatch.1) | P1 | Confirm with the root custodian. If not expected, treat as compromise. |
| <a id="al-04"></a>AL-04 | **Break-glass role assumed** | CloudTrail | P1 | Confirm the incident ticket. Start the post-use review. |
| <a id="al-05"></a>AL-05 | **Security control disabled or weakened** <br>CloudTrail stopped, GuardDuty, Security Hub or Config off, WAF ACL detached or set to Count, Kyverno policy deleted | CloudTrail, Kubernetes audit | P1 | Re-enable the control. Identify who made the change. |
| <a id="al-06"></a>AL-06 | **KMS key disabled or scheduled for deletion** | CloudTrail | P1 | Cancel the deletion. Review the key policy. |
| <a id="al-07"></a>AL-07 | **Guidance content changed outside a change window, or by an unexpected identity** | App audit events ([7.3](#d-detect)) | P1 | Freeze publishing. Verify with the content owner. Roll back if not approved. See [R01](#r01). |
| <a id="al-08"></a>AL-08 | **Public site or emergency page unavailable from outside** | Synthetic canaries in two or more locations | P1 | Fail over to the static emergency page ([CH-12](#ch-12)). Engage Imperva. |
| <a id="al-09"></a>AL-09 | **Internet request reached a blocked admin or device-list path at the origin** <br>should be zero | Envoy and ALB logs (metric filter) | P1 | Find the bypass. Block at the edge. Check what was read ([R02](#r02)). |
| <a id="al-10"></a>AL-10 | **Imperva DDoS mitigation or attack alert** | Imperva notifications | P2 (P1 during an event) | Check site health and the emergency page. Coordinate with Imperva. |
| <a id="al-11"></a>AL-11 | **WAF block-rate anomaly or rate rule firing** <br>more than 5 times baseline for 15 minutes | AWS WAF metrics, Imperva events | P2 | Check for false positives against real attack traffic. Tune or escalate. |
| <a id="al-12"></a>AL-12 | **IAM and organization changes** <br>new IAM user or access key, admin policy attached, SCP or permission boundary changed | CloudTrail | P2 (P1 in prd) | Verify against an approved change. Revert if none exists. |
| <a id="al-13"></a>AL-13 | **New public exposure** <br>SG or NACL open to 0.0.0.0/0, public S3, new internet-facing LB or listener, exposure finding | Security Hub CSPM and exposure findings, CloudTrail | P2 | Close the exposure. Run a change review. |
| <a id="al-14"></a>AL-14 | **Critical CVE in a running prd image** | Inspector | P2 (P1 if a public exploit exists) | Patch or rebuild within the SLA ([8.6](#dd-images)) |
| <a id="al-15"></a>AL-15 | **Admission denied in prd** <br>Kyverno Enforce violation, cosign verification failure | Kyverno events, Kubernetes audit | P2 | Find the source of the image or manifest. A cosign failure in prd means a P1 investigation. |
| <a id="al-16"></a>AL-16 | **Database anomaly** <br>GuardDuty RDS anomalous login, DDL in prd outside the migration job, login as the owner or superuser role | GuardDuty RDS Protection ([GuardDuty RDS](https://docs.aws.amazon.com/guardduty/latest/ug/findings-rds-protection.html)), pgaudit | P2 | Identify the session. Rotate the role's credentials if not expected ([8.3](#dd-db)). |
| <a id="al-17"></a>AL-17 | **Admin access anomaly** <br>VPN connection from an unexpected country or at an unusual hour, repeated admin sign-in failures, IdP risk detection | Client VPN connection logs, IdP | P2 | Contact the admin through a known channel. Revoke the session if not confirmed. |
| <a id="al-18"></a>AL-18 | **Secret read by an unexpected principal** <br>a prd DB secret read by anything other than its own pod role | CloudTrail `GetSecretValue` | P2 | Rotate the secret. Review the role trust. |
| <a id="al-19"></a>AL-19 | **Console sign-in without MFA** | CloudTrail (CIS CloudWatch.3) ([Security Hub CloudWatch controls](https://docs.aws.amazon.com/securityhub/latest/userguide/cloudwatch-controls.html)) | P2 | Disable the identity. Investigate. |
| <a id="al-20"></a>AL-20 | **Posture drift** <br>new failed High or Critical CSPM control, overdue exception, coverage gap | Security Hub CSPM | P3 | Weekly digest. The owner fixes it by priority. |

<a id="dd-db"></a>

### <a id="dd-db-h"></a>8.3 Separate database users for public and admin

`CIS 3.3, 5.4, 6.8` `A.8.2, A.8.3` `CIS PostgreSQL` `WA SEC03`

> **Short answer: yes, and go one step further, with one login per service**
>
> Every service connects today as `alertingdb`, which is `rds_superuser` and owns the database (D47). An SQL injection in the public devices service would therefore control the whole database: admin users, guidance content and every location sample. Splitting public from admin is the minimum.
> One login per service, each with only the privileges that service needs, costs little more. Secrets already sit under `/alerting/<env>/<component>/`, and the bootstrap Lambda already creates roles (D46). This extends [CH-05](#ch-05) and addresses [R10](#r10) and [R17](#r17).

| Role | Login | Used by | Privileges | Limits |
| --- | --- | --- | --- | --- |
| `alerting_owner` | No (NOLOGIN) | Nobody connects as it | Owns the schemas and tables. Migrations act through it with `SET ROLE`. | N/A |
| `alerting_migrate` | Yes | Flyway Job during deploys only | Member of the owner role. Can run DDL. | Connection limit 2. Secret readable only by the migrate pod role. |
| `devices_app` | Yes | Public devices service | `INSERT` on position samples. Registration and check-in run through `SECURITY DEFINER` functions. No `SELECT` on device lists, accounts or any admin table. | Its own connection limit and `statement_timeout` |
| `geo_app` | Yes | Public geometry service | `SELECT` on area and geometry tables only | Its own connection limit |
| `admin_app` | Yes | Admin backend (admin plane) | DML on guidance and admin tables. `SELECT` on aggregated device views, not raw samples. No DDL. | A separate connection pool, so a public flood can't starve the admin plane |
| Named DBA roles | IAM token | Humans over the VPN (existing) | Read-only by default. Elevation through break-glass. | Session timeout. pgaudit logs everything they do. |
| `rds_superuser` (master) | Break-glass only | Bootstrap Lambda, emergencies | Full | Alert on every login ([AL-16](#al-16)) |

- **RDS Proxy:** give each database user its own Secrets Manager secret. That is how RDS Proxy is designed to work ([RDS Proxy credentials](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy-secrets-arns.html)). Each pod's Pod Identity role may read only its own secret ([8.4](#dd-sa)).
- **Connection limits:** set them per role with `CONNECTION LIMIT` ([PostgreSQL CREATE ROLE](https://www.postgresql.org/docs/17/sql-createrole.html)). Add per-role `statement_timeout` and `idle_in_transaction_session_timeout` with `ALTER ROLE … SET`.
- **Hardening defaults:** revoke `CREATE` on the `public` schema, set default privileges, and grant on views instead of base tables where you can. Row-level security on device rows is optional, as defense in depth.
- **Ordering constraint:** `ddl-auto: update` (C23) needs DDL rights at runtime. The runtime roles can become DML-only only after Flyway takes over schema changes ([CH-05](#ch-05)). Until then, at least split public from admin and remove superuser from both.
- **Who changes what:** the platform team does the bootstrap Lambda, secrets and Proxy auth entries. The app team changes only the datasource username or secret path for each service and runs tests. That is a configuration change, not a code change.

<a id="dd-sa"></a>

### <a id="dd-sa-h"></a>8.4 Separate Kubernetes service accounts for public and admin

`CIS 5.4, 6.8` `A.8.2, A.8.22` `CIS EKS §RBAC` `WA SEC03`

> **Short answer: yes, with one service account per workload, in separate public and admin namespaces**
>
> Pod Identity is already in the design. Make each service account map to its own IAM role. An association links one service account to one role, with no annotations in the cluster ([EKS Pod Identity](https://docs.aws.amazon.com/eks/latest/userguide/pod-id-association.html)). Pod Identity also tags each session with the namespace and service account name, so policies can be keyed on them ([Pod Identity ABAC](https://docs.aws.amazon.com/eks/latest/userguide/pod-id-abac.html)).

| Namespace | Workload | Service account | AWS access (Pod Identity) | Kubernetes API |
| --- | --- | --- | --- | --- |
| `public` | nginx (React client, emergency page) | `web` | None (later: read-only on the tiles bucket, [CH-10](#ch-10)) | None |
| `public` | Public Spring gateway | `gateway-public` | None | None |
| `public` | devices | `devices` | Read `/alerting/<env>/devices/*`, plus decrypt with that environment's KMS key | None |
| `public` | geometry, OSRM | `geometry`, `osrm` | Its own DB secret (geometry). None for OSRM. | None |
| `admin` | Angular console | `console` | None | None |
| `admin` | Admin gateway | `gateway-admin` | None | None |
| `admin` | backend | `backend` | Its own DB secret. Photo bucket put and get once C17 is decided. | None |
| `jobs` | Flyway migration | `migrate` | Migration secret only | None |

- **Token mounting:** set `automountServiceAccountToken: false` on every application service account, because no app pod calls the Kubernetes API ([Kubernetes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/)). No application service account gets a Role or RoleBinding.
- **Kyverno rules** (Audit now, Enforce at 9.1.5): deny the `default` service account, require automount off, and deny cross-namespace service account references.
- **Trust policies:** limit each role's trust to its cluster, namespace and service account. Scope IAM to the exact secret ARN and KMS key. Turn on Access Analyzer unused-access findings.
- **Network separation:** NetworkPolicies deny all traffic between `public` and `admin`, in both directions. Only the gateways may receive traffic from their own Envoy. Security groups for pods can also limit which pods reach RDS Proxy. This is optional, but it adds a network-layer check behind the database roles.
- **Separate node group for admin:** optional for later. The four-node cap makes it expensive now, and namespaces with PSA `restricted` and NetworkPolicies already cover release one.

<a id="dd-admin"></a>

### <a id="dd-admin-h"></a>8.5 A separate hostname for admin

`CIS 12.2, 12.8` `A.8.20, A.8.22` `WA SEC05`

> **Short answer: you already have something stronger than a subdomain, so keep it**
>
> Admin lives at `admin.alerting.internal`. That name exists only in private DNS, behind its own internal ALB, WAF and Envoy, and is reachable only over the VPN. `.internal` is reserved by ICANN for private use and will never be delegated in the public DNS ([ICANNWiki](https://icannwiki.org/.internal)).
> Moving admin to a public subdomain such as `admin.<public-domain>` would make it less secure, not more.

| Option | Exposure | Verdict |
| --- | --- | --- |
| **Path on the public host** (`/admin`) | Shares the public WAF, origin, cookies and routes with the public site. One routing mistake exposes admin, which is exactly [R01](#r01) today. | Reject |
| **Public subdomain** behind Imperva | The login page is reachable from the internet. A public TLS certificate publishes the name in Certificate Transparency logs, where anyone can list your subdomains ([packet.guru](https://packet.guru/blog/certificate-transparency-subdomains)). There is also a cookie-scope risk if anything sets cookies on the parent domain. | Avoid |
| **Private name, internal ALB, VPN only** (current design) | No public DNS record, no public certificate, no internet path. The attacker needs a VPN session with MFA first. | Keep |

- **Certificates:** the internal ALB needs a certificate from a private CA, such as AWS Private CA, because public CAs don't issue for `.internal`. That also keeps the name out of Certificate Transparency logs.
- **Real-domain naming, if wanted:** use a private hosted zone (split-horizon) and still a private CA. Never publish the record publicly.
- **Separate session state:** give admin cookies their own names, and set them host-only with `Secure`, `HttpOnly` and `SameSite=Strict`. The public site never sets cookies the admin host could read.
- **If Client VPN is replaced** ([8.7](#dd-access)): options A and C (C is the recommended one) need a public admin name and certificate, so the name becomes visible. Pick one that doesn't advertise its purpose, and rely on the identity layer, not on the name staying secret.
- **Separate the public domain too:** keep the public site on its own short official domain, separate from any corporate domain ([CH-14](#ch-14)), so a corporate DNS or certificate incident can't affect it.

<a id="dd-images"></a>

### <a id="dd-images-h"></a>8.6 Hardened container images

`CIS 2.5, 4.1, 7.5` `A.8.8, A.8.9, A.8.19` `WA SEC06-BP02`

> **Short answer: AWS doesn't publish its own hardened application images, but it points to Docker's**
>
> The Well-Architected Security Pillar says to start from hardened images. For containers, it names Docker's hardened images in the ECR Public Gallery ([WA SEC06-BP02](https://docs.aws.amazon.com/wellarchitected/latest/framework/sec_protect_compute_hardened_images.html)). Docker Hardened Images have been free and open source under Apache 2.0 since December 2025 ([Docker](https://www.docker.com/press-release/docker-makes-hardened-images-free-open-and-transparent-for-everyone/)).
> The current base, `openjdk:17.0.1-jdk-slim`, is deprecated and at a 2021 patch level, and it runs JDWP as root (C20, [R03](#r03)). Replace it.

| Option | What it is | Fit for this Java 17 app | Verdict |
| --- | --- | --- | --- |
| **Docker Hardened Images**, Eclipse Temurin 17 JRE | Minimal, near-zero CVE images with SBOM and VEX. There are variants for CIS, FIPS and STIG, on amd64 and arm64 ([DHI Temurin](https://hub.docker.com/hardened-images/catalog/dhi/eclipse-temurin)). | Strong fit. Amazon Inspector supports Docker's hardened images ([Amazon Inspector](https://docs.amazonaws.cn/en_us/inspector/latest/user/supported.html)), so the existing Inspector gate keeps working. | Recommended |
| **Amazon Corretto** official images | An AWS-built OpenJDK. The default `amazoncorretto:17` images now run on Amazon Linux 2023 ([Corretto Docker](https://github.com/corretto/corretto-docker)). | Good fallback with AWS support behind it. It's larger, and ships a package manager and a shell. | Fallback |
| **AL2023 minimal** plus Corretto headless, built yourself | The AL2023 minimal image contains only what's needed to install other packages ([AL2023 minimal](https://docs.aws.amazon.com/linux/al2023/ug/minimal-container.html)). | Fully AWS-native, but you own the hardening and the rebuild cadence. | Possible |
| **Red Hat Hardened Images** | Supported in the Inspector scan API and ECR basic scanning ([Red Hat](https://www.redhat.com/en/blog/streamlining-container-security-red-hat-hardened-images-now-supported-aws-inspectorscan-api-and-ecr-basic-scanning)). An open AWS request reports that ECR enhanced scanning fails on them ([AWS containers roadmap](https://github.com/aws/containers-roadmap/issues/2887)). | Not yet, while enhanced scanning is the release gate. | Not now |
| **Bottlerocket** | A node operating system, not a container base image | Not relevant here. Nodes already run CIS L1 Ubuntu. | N/A |

#### Image standard for every service

- **Multi-stage build:** compile and test with the JDK image, and run on a JRE-only hardened image. Tests are no longer skipped (C20).
- **Runtime settings:** non-root numeric UID, `readOnlyRootFilesystem`, all capabilities dropped, no shell or package manager in the runtime image where the variant allows it.
- **No debug agent:** remove `-agentlib:jdwp` from every image. Kyverno and the NetworkPolicy keep denying port 8787 as a backstop ([CH-06](#ch-06)).
- **Pinning and mirroring:** pin the base image by digest, and mirror it into ECR with a pull-through cache rule ([ECR pull-through cache](https://docs.aws.amazon.com/AmazonECR/latest/userguide/pull-through-cache-working-pulling.md)). Nodes then pull only from ECR, and the Kyverno registry allow-list stays ECR-only.
- **Rebuild cadence:** rebuild weekly and whenever the base image publishes a fix. Patch Critical CVEs within 7 days, and within 48 hours when a public exploit exists ([AL-14](#al-14)). SBOM, provenance, cosign and immutable tags stay as they are.

<a id="dd-access"></a>

### <a id="dd-access-h"></a>8.7 Admin access without Client VPN: three lower-cost options

`CIS 6.3, 6.4, 6.5, 12.7` `A.5.15, A.8.5, A.8.20` `WA SEC02, SEC05`

> **Short answer: yes, there are cheaper paths, and every one keeps 2FA mandatory**
>
> Client VPN charges per subnet association per hour, plus per connected admin per hour. In the AWS example, one association is $0.10 an hour, and 10 connections for an hour cost $0.50, which is $0.05 each ([AWS VPN pricing](https://aws.amazon.com/vpn/pricing/)). Each connection also pays the standard public IPv4 charge. The bill therefore grows with every admin and every hour they stay connected, and it peaks during a real event, when admins stay on for long shifts.
> The three options below replace the VPN with identity-based access. Their costs are flat, or free up to a user count.
> 2FA is not optional in any of them. It is enforced at the identity provider (Entra ID Conditional Access, or IAM Identity Center MFA). Super admins need phishing-resistant MFA (FIDO2 or passkeys), and the application's own login sits behind the access layer, not instead of it.

#### What has to be covered

- **Browser access for all three admin groups** (location, governing organization, super admins) to the Angular console and the admin gateway, which today sit behind the internal admin ALB.
- **Engineering access for super admins only:** the private EKS API endpoint, Argo CD, and the DBA path to RDS Proxy. A private EKS endpoint can only be reached from inside the VPC or a connected network ([Amazon EKS](https://docs.aws.amazon.com/eks/latest/userguide/cluster-endpoint.html)), so each option needs a path into the VPC for these.

#### Shared building block: Session Manager for engineering access

Options A and C use it, and B can use it too. Run one small EC2 instance in a private subnet as a jump node: no inbound rules, no SSH, SSM Agent only, IMDSv2, rebuilt monthly like the nodes. Super admins sign in through IAM Identity Center with MFA, and open a Session Manager port-forwarding session to the EKS API, Argo CD or RDS Proxy. The remote host doesn't have to be managed by Systems Manager ([Session Manager port forwarding](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-sessions-start.html)).

- Access is controlled by IAM policy on the session document and the target. Session logs go to CloudWatch and S3.
- There is no extra Systems Manager charge for this use on EC2. The cost is the small instance itself.
- This replaces the VPN for the engineering path, and it holds up even if the browser path fails.

| ID | Option | Console access (all admins) | Engineering access (super admins) | How 2FA is enforced | Indicative monthly cost |
| --- | --- | --- | --- | --- | --- |
| <a id="acc-0"></a>Today | **Client VPN + SAML + MFA** <br>baseline | VPN tunnel to the internal ALB | Same VPN | IdP MFA at VPN sign-in | About $410 for 30 admins, about $1,030 for 100 admins, plus IPv4 per connection. It grows with connected hours. |
| <a id="acc-a"></a>A | **AWS Verified Access + Session Manager** <br>AWS-native zero trust | Clientless browser access. Verified Access checks every request against the IdP and device policy, then forwards it to the existing internal admin ALB. | Session Manager jump node. Optionally, Verified Access non-HTTP endpoints for RDS Proxy and the EKS API. | IdP MFA through the IAM Identity Center or OIDC (Entra ID) trust provider. The policy can also require specific claims, such as group or MFA method. | About $197 flat for one console app ([Verified Access pricing](https://aws.amazon.com/verified-access/pricing/)), plus one small EC2 instance. Adding two non-HTTP endpoints adds about $292. |
| <a id="acc-b"></a>B | **Cloudflare Zero Trust (Access + Tunnel)** <br>free for small teams | Clientless browser access through Cloudflare Access to a tunnel that runs outbound-only from inside the VPC. No public IP or inbound port at the origin ([Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/)). | Cloudflare One client with private-network routes to the EKS API, Argo CD and RDS Proxy ([Cloudflare private networks](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/private-net/)). Session Manager can be the fallback. | An Access policy can require the MFA method reported by Entra ID, or prompt for its own independent second factor, such as a security key ([Cloudflare MFA](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/mfa-requirements/)). | $0 for up to 50 users. Above that, $7 per user per month on pay-as-you-go ([Cloudflare pricing](https://www.cloudflare.com/plans/sase-zero-trust.md)). The connector runs as two small pods or instances. |
| <a id="acc-c"></a>C | **ALB sign-in with mandatory MFA + AWS WAF + Session Manager** <br>lowest cost | The admin ALB becomes internet-facing, on its own hostname. A listener rule with `authenticate-cognito` (or `authenticate-oidc` to Entra ID) signs every user in before any request reaches the console ([ALB authentication](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/listener-authenticate-users.html)). AWS WAF on the same ALB sees the real client IP, so country, anonymizer and reputation rules work. | Session Manager jump node | Cognito user pool with MFA set to required ([Cognito MFA](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-mfa.html)), using passkeys or security keys. Or Entra Conditional Access, if the client already has Entra ID P1. | Close to $0 extra. Cognito Essentials is free up to 10,000 monthly active users who sign in directly ([Cognito pricing](https://aws.amazon.com/cognito/pricing/)). The admin ALB and its web ACL already exist. One small EC2 instance. |

— Cost basis: us-east-1 list prices and 730 hours a month. Client VPN assumes two subnet associations (two AZs), with each admin connected 8 hours a day for 22 working days. Verified Access assumes one console application, with negligible data at $0.02 per GB. Cloudflare's page does not say clearly whether the first 50 users stay free once you pass 50. Confirm with Cloudflare before budgeting. Estimates exclude tax and data transfer.

**A · Verified Access: pros and cons**

- Stays inside AWS, with no new vendor. Logs go to the log archive like everything else, and residency stays the same (B6).
- Every request is checked, not just the connection. It can add device posture through a device trust provider.
- Keeps the internal admin ALB, which Verified Access requires for load balancer endpoints.
- Cost is flat per application, not per admin. It beats the VPN once about six or more admins are connected full-time.
- **Con:** the console needs a public domain name and a public certificate ([Verified Access endpoints](https://docs.aws.amazon.com/verified-access/latest/ug/create-load-balancer-endpoint.html)). The admin name therefore shows up in Certificate Transparency logs (see [8.5](#dd-admin)). Use a name that doesn't advertise what it is.
- **Con:** AWS can't test every OIDC provider, so validate Entra ID in dev first ([Verified Access trust providers](https://docs.aws.amazon.com/verified-access/latest/ug/user-trust.html)).

**B · Cloudflare Zero Trust: pros and cons**

- Free while the admin team stays at 50 people or fewer, which is the cheapest secure option at that size.
- The origin has no inbound path at all. Admin traffic leaves the VPC only as an outbound tunnel.
- Covers both browser and engineering access with one policy model, and can enforce its own security-key MFA on top of the IdP.
- **Con:** adds a second edge vendor alongside Imperva. Admin traffic, identity data and access logs pass through Cloudflare, which needs a residency decision (B6) and a DPA.
- **Con:** published hostnames need a zone on Cloudflare ([Cloudflare routing](https://developers.cloudflare.com/tunnel/concepts/routing/)). Use a separate admin domain, so the public domain stays on Imperva.
- **Con:** engineering access needs the Cloudflare One client on super admin devices, which is lighter than a VPN but still a client.

**C · ALB sign-in with MFA: pros and cons**

- Lowest cost. It reuses the admin ALB, its web ACL and the Session Manager node. Cognito, IAM Identity Center and Session Manager add no licence or per-user charge at 100 admins.
- No client software for admins. Nothing reaches the console until sign-in and MFA succeed at the ALB.
- Without Imperva in front, AWS WAF sees the real client IP. The country rule, the anonymous IP list and the IP reputation list all work on the admin plane (compare [WAF-12](#waf-12)).
- **Con:** the admin entry point is internet-reachable, which is the exposure [8.5](#dd-admin) advises against. The mandatory controls below exist to offset that.
- **Con:** no device posture check unless Entra Conditional Access, with P1, requires compliant devices.
- **Con:** with a Cognito user pool, admin accounts live outside the client's directory. Joiners, movers and leavers need a written process and a quarterly review.

**Applies to all three options**

- Remove the Client VPN endpoint only after the new path has run in dev and stg for two weeks, with a written rollback.
- Keep the break-glass path independent of the IdP ([7.2](#d-iam)).
- Point [AL-17](#al-17) at the new access logs (Verified Access, Cloudflare Access or ALB) and at Session Manager session logs.
- Keep the three admin groups as IdP groups, and map them to access policies: location and governing-organization admins get the console only, super admins get the console plus engineering access.
- The application's own authentication and RBAC ([R01](#r01)) are still required. The access layer is an outer gate, not a substitute.

#### <a id="dd-access-rec"></a>Recommended for this programme: hardened Option C

There will be at most 100 admins, and budget is the deciding factor. On that basis, the recommendation is **Option C with every control in the table below**. Option C costs roughly nothing extra per month, against about $1,030 for Client VPN.

Its weak point, an internet-reachable sign-in page, is offset by four layers before anything reaches the console: mandatory MFA (security keys or passkeys for super admins and governing-organization admins), a country allow-list, a short session, and the application's own RBAC.

Option A stays the step-up path if the penetration test ([B11](#dec-b11)) or the client's risk owner rejects an internet-reachable admin entry point. It costs about $197 a month more.

| Option at 100 admins | Access layer | Identity and 2FA | Indicative monthly total |
| --- | --- | --- | --- |
| Today: Client VPN | ~$1,030, plus IPv4 per connection, rising during events | Depends on the IdP | ~$1,030 or more |
| **C, hardened (recommended)** | ~$0. The ALB and web ACL exist already. | $0: Cognito Essentials and IAM Identity Center ([no extra charge](https://aws.amazon.com/iam/identity-center/faqs/)) | **One small EC2 instance, plus a few WAF rules** |
| A: Verified Access | ~$197 | $0 with IAM Identity Center as the trust provider | ~$197 plus one small EC2 instance |
| B: Cloudflare Zero Trust | $350–$700, depending on whether the first 50 users stay free | $0 with Cloudflare's own MFA | $350–$700 |

> **Watch the identity licence: it can cost more than the access layer**
>
> Entra Conditional Access needs an Entra ID P1 licence. It is included in Microsoft 365 E3, E5 and Business Premium ([Microsoft Entra licensing](https://learn.microsoft.com/en-us/entra/fundamentals/licensing)). Standalone, it costs $7.00 per user per month ([Microsoft Entra pricing](https://www.microsoft.com/en-us/security/business/microsoft-entra-pricing)), which is up to $700 a month for 100 admins.
> - **If the client already has P1:** point the ALB's `authenticate-oidc` directly at Entra, and enforce MFA through Conditional Access with a phishing-resistant authentication strength ([authentication strengths](https://learn.microsoft.com/en-us/Entra/identity/authentication/concept-authentication-strengths)).
> - **If it doesn't:** use a Cognito user pool for the console and IAM Identity Center for AWS access. Both enforce MFA at no licence cost.
> - **Don't federate Cognito to Entra just for this.** Federated users get only 50 free monthly active users ([Cognito pricing](https://aws.amazon.com/cognito/pricing/)), and the MFA would still depend on Entra's licence.

| ID | Mandatory control for Option C | Detail |
| --- | --- | --- |
| <a id="hc-01"></a>HC-01 | **MFA required, never optional** | Cognito user pool MFA set to `required`, on the Essentials tier, with passkeys or security keys (WebAuthn). Super admins and governing-organization admins must use a security key or passkey. Location admins may use TOTP as a fallback. SMS and email codes are off. |
| <a id="hc-02"></a>HC-02 | **No self sign-up** | Admins are created only by the admin-inventory owner ([B3b](#dec-b3b)), with group membership set at creation. Disable an account after 45 days without sign-in. Review all accounts every quarter. |
| <a id="hc-03"></a>HC-03 | **Country allow-list at AWS WAF** | On the admin ALB, allow only the service country (geo match). AWS WAF sees the real client IP here. Travel abroad goes through a time-boxed exception ticket that adds one IP, with the change alerted under [AL-12](#al-12). |
| <a id="hc-04"></a>HC-04 | **Block anonymizers and bad reputation** | Add `AWSManagedRulesAnonymousIpList` and `AWSManagedRulesAmazonIpReputationList` on the admin ACL, where they work properly because there is no proxy in front ([AWS IP reputation groups](https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-ip-rep.html)). |
| <a id="hc-05"></a>HC-05 | **Rate limits and an admin route allow-list** | Tight per-IP rate limits on `/oauth2/*` and the Cognito sign-in domain. Add the core rule set and known bad inputs. Only the console and admin-gateway routes are allowed, and everything else is blocked. |
| <a id="hc-06"></a>HC-06 | **Protect the sign-in page itself** | Associate a web ACL with the Cognito user pool, with rate limits and the same country rule. Use a custom sign-in domain on the admin hostname's parent domain. |
| <a id="hc-07"></a>HC-07 | **Short sessions** | Set the ALB authentication `SessionTimeout` to 8 hours, not the 7-day default. Use a unique cookie name. Cognito refresh tokens last no longer than 8 hours. Sign-out clears both the ALB and Cognito sessions. |
| <a id="hc-08"></a>HC-08 | **The application verifies identity, not just the network** | The admin gateway verifies the ALB-signed `x-amzn-oidc-data` token (signature, signer ARN, expiry) and maps Cognito groups to roles. It rejects any request without the token. App RBAC is still required ([R01](#r01)). |
| <a id="hc-09"></a>HC-09 | **Low-visibility name, separate domain** | Use a non-descriptive admin hostname on a domain separate from the public site, with a public ACM certificate. The name will appear in Certificate Transparency logs, so security comes from the controls above, not from secrecy ([8.5](#dd-admin)). |
| <a id="hc-10"></a>HC-10 | **Engineering access never goes through the console** | The EKS API, Argo CD and RDS Proxy stay private. Reach them only through Session Manager with IAM Identity Center and a security key. The admin ALB has no route to them. |
| <a id="hc-11"></a>HC-11 | **Alerts** | Re-point [AL-17](#al-17) at Cognito sign-in events, WAF country and anonymizer blocks, and Session Manager starts. Add P1 alerts for any MFA reset or disable, any new user outside the inventory process, and any change to the admin web ACL. |
| <a id="hc-12"></a>HC-12 | **A fallback path during an event** | If the admin ALB is under attack, super admins can still reach the console through a Session Manager port forward to the internal target. Guidance can always be published. Rehearse this in the yearly exercise. |

This is decision [B3c](#dec-access), and change [CH-15](#ch-15).

[Back to contents](#pdf-contents)

---

<a id="changes"></a>

## 09 · Required changes to the current setup

**What has to change in the current setup**

These items change an accepted decision, a design or live state. Each change shows the decision it revises, who owns it, and whether the platform team can do it without touching `app/`.

| ID | Current | Change to | Why | Owner | Pri |
| --- | --- | --- | --- | --- | --- |
| <a id="ch-01"></a>CH-01 | Public nginx proxies the whole `/api`. The devices route carries the whole controller. | Exact-match HTTPRoutes for public methods and paths only. Imperva and AWS WAF rules deny everything else, including Swagger and actuator. | Contains [R02](#r02) now, without editing `app/` | Platform team | P0 |
| <a id="ch-02"></a>CH-02 | D44: one account for dev and prd | AWS Organizations with prd, dev, log-archive, security-tooling and backup accounts. SCP guardrails. Move prd before go-live if possible, otherwise within 90 days. | [R08](#r08), residency SCP, cost tags (payer) | Platform team + client (B25) | P1 |
| <a id="ch-03"></a>CH-03 | D35: all logs 30 days, no archive | Security and audit logs: 1 year hot plus 6 years in Glacier, Object Lock. Operational logs: 30 to 90 days. Access logs: 1 year. | [R13](#r13), CIS 8.10 (at least 90 days), A.8.15, legal holds | Platform team + client | P0 |
| <a id="ch-04"></a>CH-04 | D34: location samples kept permanently. C15: email per device. | Raw samples deleted 30 days after the event closes (proposed, for legal review). Aggregates by area and time kept for planning. Email removed. | [R06](#r06), GDPR Art. 5, data minimization | Client + app team | P0 |
| <a id="ch-05"></a>CH-05 | D47: `alertingdb` is `rds_superuser` and owner. `ddl-auto: update`. | Owner, app and read-only roles created by the bootstrap Lambda. Migrations through Flyway as a Job. Runtime gets DML only. | [R10](#r10), [R17](#r17), CIS PostgreSQL | Platform team + app team | P1 |
| <a id="ch-06"></a>CH-06 | Dockerfiles: JDWP 8787, root, `openjdk:17.0.1`, tests skipped | Hardened multi-stage images. In the meantime, a Kyverno rule denies container ports 8787 and runAsUser 0, and a NetworkPolicy denies 8787. | [R03](#r03) | App team, with platform-team interim controls | P0 |
| <a id="ch-07"></a>CH-07 | AWS WAF COUNT, Kyverno Audit, origin mTLS optional | BLOCK, Enforce and mandatory mTLS, each with a 7-day clean COUNT/Audit report as evidence | [R09](#r09) | Platform team | P0 |
| <a id="ch-08"></a>CH-08 | CIS standard INCOMPLETE, default VPC present | Re-enable CIS v5.0.0 after Config, delete default VPCs in all Regions, and record v7.1.0 deltas | [R19](#r19) | Platform team | P0 |
| <a id="ch-09"></a>CH-09 | Plain HTTP between services (C9) | Short term: tighter NetworkPolicies per port. Medium term: mTLS between services through Envoy or a mesh (for example Istio ambient) with SPIFFE identities. | [R12](#r12) | Platform team | P1 |
| <a id="ch-10"></a>CH-10 | Public OpenStreetMap tiles (C13) | Self-host vector tiles for the service area, served from S3 through the edge | [R15](#r15), privacy, surge | Platform team + app team | P2 |
| <a id="ch-11"></a>CH-11 | Manual NOC scaling with no verification | A pre-approved "event mode" scale profile triggered from a signed runbook, with caller verification and two-person scale-down | [R05](#r05), [R14](#r14) | Platform team + CPA | P1 |
| <a id="ch-12"></a>CH-12 | Emergency page served by nginx in the cluster | Also publish a signed static emergency page to S3 and cache it at Imperva as the origin-failover target | [R05](#r05), principle [2](#p2) | Platform team | P0 |
| <a id="ch-13"></a>CH-13 | No egress control described | VPC endpoints plus Network Firewall with an FQDN allow-list | Data exfiltration, C2 | Platform team | P1 |
| <a id="ch-14"></a>CH-14 | Public domain trust not defined | One short official domain, DNSSEC, CAA, HSTS preload, tamper-evident QR plates, lookalike-domain monitoring | [R04](#r04) | Client + Platform team | P1 |
| <a id="ch-15"></a>CH-15 | Client VPN for all admin access (cost grows per admin-hour) | Internet-facing admin ALB with Cognito or Entra sign-in and required MFA, AWS WAF country, anonymizer and reputation rules, 8-hour sessions, and Session Manager for engineering access. Remove the VPN after two weeks of parallel running. | [R01](#r01), cost, [8.7](#dd-access-rec) | Platform team + client (B3c) | P1 |

[Back to contents](#pdf-contents)

---

<a id="matrix"></a>

## 10 · Control mapping matrix

**35 strategic controls mapped to all four frameworks**

This is the basis for the Statement of Applicability. Filter by Well-Architected area, status or priority, or type a framework reference such as `A.8.15` or `CIS 16`. In the PDF, all rows are shown.

| ID | Strategic control | WA area | CIS Controls v8.1 | CIS Benchmark | ISO 27001 Annex A | Status | Pri |
| --- | --- | --- | --- | --- | --- | --- | --- |
| <a id="sc-01"></a>SC-01 | ISMS: scope, policy set, risk method, Statement of Applicability, internal audit, management review<br>Risks: [R08](#r08) | Foundations | — | — | Cl. 4–10, A.5.1, A.5.2, A.5.35 | Gap | P1 |
| <a id="sc-02"></a>SC-02 | Multi-account landing zone: Organizations, prd / dev / log-archive / security / backup accounts, SCP guardrails<br>Risks: [R08](#r08) | Foundations | CIS 3.12, 12.2 | CIS AWS Foundations | A.8.22, A.8.31, A.5.23 | Change | P1 |
| <a id="sc-03"></a>SC-03 | Root and break-glass protection: hardware MFA, no keys, centralized root access, usage alarms, post-use review<br>Risks: [R20](#r20) | IAM | CIS 5.4, 6.5 | CIS AWS Foundations · IAM | A.8.2, A.8.5 | Designed | P0 |
| <a id="sc-04"></a>SC-04 | Single workforce IdP, phishing-resistant MFA for VPN, AWS, Argo CD and console; JML process; quarterly reviews<br>Risks: [R01](#r01), [R11](#r11) | IAM | CIS 5.3, 6.1–6.3, 6.5, 6.7 | CIS AWS Foundations · IAM | A.5.16, A.5.17, A.5.18, A.8.5 | Gap | P0 |
| <a id="sc-05"></a>SC-05 | Admin console OIDC authentication and RBAC by authority, area and screen; seed account removed; BCrypt only<br>Risks: [R01](#r01) | Application security | CIS 4.7, 6.8, 16.1 | OWASP ASVS L2 | A.5.15, A.8.3, A.8.5, A.8.26 | Gap | P0 |
| <a id="sc-06"></a>SC-06 | Workload identity: Pod Identity per service account, GitHub OIDC with pinned sub and workflow ref, no long-lived keys<br>Risks: [R16](#r16) | IAM | CIS 6.1, 6.7 | CIS EKS · IAM | A.8.2, A.8.5 | Live | P1 |
| <a id="sc-07"></a>SC-07 | Least-privilege database roles: owner / app / read-only; IAM auth for DBAs; force TLS<br>Risks: [R10](#r10) | Data | CIS 3.3, 5.4, 6.8 | CIS PostgreSQL 17 | A.8.2, A.8.3 | Change | P1 |
| <a id="sc-08"></a>SC-08 | Centralized, immutable logging with tiered retention (≥ 1 year security); application audit trail<br>Risks: [R13](#r13), [R01](#r01) | Detection | CIS 8.2, 8.5, 8.9, 8.10, 8.11 | CIS AWS Foundations · Logging | A.8.15, A.8.17, A.5.28 | Change | P0 |
| <a id="sc-09"></a>SC-09 | Threat detection and alert routing: GuardDuty (all protections), Security Hub, 24/7 paging, runbooks<br>Risks: [R05](#r05), [R16](#r16) | Detection | CIS 8.11, 13.1, 13.3 | CIS AWS Foundations · Monitoring | A.8.16, A.5.25, A.6.8 | Live | P1 |
| <a id="sc-10"></a>SC-10 | Posture management: Security Hub FSBP + CIS v5.0.0, Config conformance packs, v7.1.0 deltas via custom rules<br>Risks: [R19](#r19) | Detection | CIS 4.1 | CIS AWS Foundations 5.0.0 → 7.1.0 | A.8.9, A.5.36 | Live | P0 |
| <a id="sc-11"></a>SC-11 | Edge protection: Imperva WAF, DDoS and bot management, mandatory origin mTLS, Imperva-only origin<br>Risks: [R05](#r05), [R07](#r07), [R09](#r09) | Infrastructure | CIS 12.2, 13.10 | CIS NGINX (headers, TLS) | A.8.20, A.8.21 | Designed | P0 |
| <a id="sc-12"></a>SC-12 | AWS WAF in BLOCK on origin and admin ALBs: managed rule groups, rate-based rules, path deny lists<br>Risks: [R09](#r09), [R02](#r02) | Infrastructure | CIS 13.10 | CIS AWS Foundations · Networking | A.8.20 | Designed | P0 |
| <a id="sc-13"></a>SC-13 | Public route allow-list at Envoy and nginx: exact paths and methods; Swagger and actuator denied<br>Risks: [R02](#r02) | Infrastructure | CIS 4.4, 4.8, 12.2 | CIS NGINX | A.8.20, A.8.27 | Change | P0 |
| <a id="sc-14"></a>SC-14 | Network segmentation and egress control: default-deny NetworkPolicies, SGs, VPC endpoints, FQDN egress allow-list, no default VPC<br>Risks: [R12](#r12), [R19](#r19) | Infrastructure | CIS 4.4, 12.2, 13.4 | CIS AWS Foundations · Networking; CIS EKS | A.8.20, A.8.22 | Designed | P1 |
| <a id="sc-15"></a>SC-15 | EKS hardening to CIS EKS 2.0.0: private endpoint, access entries, audit logs, Secrets envelope encryption, PSA restricted, Kyverno Enforce<br>Risks: [R09](#r09), [R16](#r16) | Infrastructure | CIS 4.1, 2.5 | CIS EKS 2.0.0 | A.8.9, A.8.19 | Designed | P0 |
| <a id="sc-16"></a>SC-16 | Node OS hardening: CIS Ubuntu L1 (+ selected L2), IMDSv2 hop 1, SSM only, monthly rebuild, AMI pinning<br>Risks: [R16](#r16) | Infrastructure | CIS 4.1, 4.8, 7.3 | CIS Ubuntu Linux L1 | A.8.8, A.8.9 | Designed | P1 |
| <a id="sc-17"></a>SC-17 | Service-to-service authentication: mTLS with workload identities (Envoy or ambient mesh)<br>Risks: [R12](#r12) | Infrastructure | CIS 3.10, 12.2 | CIS EKS · Network | A.8.20, A.8.24 | Gap | P1 |
| <a id="sc-18"></a>SC-18 | Data classification and minimization: retention per class, aggregation, remove device email, rotating device IDs<br>Risks: [R06](#r06), [R02](#r02) | Data | CIS 3.1, 3.2, 3.4, 3.7 | — | A.5.12, A.5.34, A.8.10, A.8.11 | Change | P0 |
| <a id="sc-19"></a>SC-19 | Encryption and key management: KMS CMKs per env, split key policies, rotation, TLS 1.2+ in transit everywhere<br>Risks: [R10](#r10) | Data | CIS 3.10, 3.11 | CIS AWS Foundations · Storage | A.8.24 | Designed | P1 |
| <a id="sc-20"></a>SC-20 | Secrets management: Secrets Manager under /alerting/<env>/, CSI-mounted files, rotation, Terraform shells only<br>Risks: [R10](#r10) | Data | CIS 3.11 | CIS EKS · Secrets | A.5.17, A.8.24 | Designed | P1 |
| <a id="sc-21"></a>SC-21 | Backup and recovery: AWS Backup, PITR, cross-account vault with Vault Lock in us-east-1, quarterly restore tests<br>Risks: [R05](#r05) | Data | CIS 11.1–11.5 | CIS AWS Foundations · Storage | A.8.13, A.8.14, A.5.30 | Gap | P1 |
| <a id="sc-22"></a>SC-22 | Secure SDLC and Phase 12 remediation to OWASP ASVS 5.0 Level 2<br>Risks: [R01](#r01), [R02](#r02) | Application security | CIS 16.1, 16.2, 16.10 | OWASP ASVS L2 | A.8.25, A.8.26, A.8.28, A.8.29 | Gap | P0 |
| <a id="sc-23"></a>SC-23 | Container image hardening: supported JRE base, non-root, no JDWP, minimal image, tests in CI<br>Risks: [R03](#r03) | Application security | CIS 2.2, 4.1, 16.4 | CIS Docker | A.8.8, A.8.9 | Gap | P0 |
| <a id="sc-24"></a>SC-24 | Supply-chain integrity: SHA-pinned actions, SBOM, provenance, cosign verify in Kyverno, signed commits, CODEOWNERS<br>Risks: [R16](#r16) | Application security | CIS 2.5, 16.4, 16.5 | CIS EKS · Images | A.8.4, A.8.30, A.8.32 | Live | P1 |
| <a id="sc-25"></a>SC-25 | Vulnerability management: Inspector, Trivy, ECR scanning, SLAs 7/30/90 days, weekly image rebuild<br>Risks: [R03](#r03), [R16](#r16) | Detection | CIS 7.1–7.7 | CIS EKS · Images | A.8.8 | Live | P1 |
| <a id="sc-26"></a>SC-26 | Public-flow abuse protection: device tokens, per-token and per-IP rate limits, check-in anomaly detection<br>Risks: [R07](#r07), [R05](#r05) | Application security | CIS 13.10, 16.1 | OWASP ASVS L2 | A.8.26, A.8.16 | Gap | P0 |
| <a id="sc-27"></a>SC-27 | Incident response program: plan, roles, 8 playbooks, forensics role, exercises<br>Risks: [R04](#r04), [R05](#r05) | Incident response | CIS 17.1–17.9 | — | A.5.24–A.5.28, A.6.8 | Gap | P1 |
| <a id="sc-28"></a>SC-28 | Independent penetration testing before go-live and at least yearly; retest of findings<br>Risks: [R01](#r01), [R02](#r02) | Incident response | CIS 18.1–18.5, 16.13 | — | A.8.29, A.5.35 | Gap | P0 |
| <a id="sc-29"></a>SC-29 | Supplier security: Imperva, IdP, app team, GitHub — contract clauses, DPAs, residency, evidence collection<br>Risks: [R18](#r18) | Foundations | CIS 15.1–15.7 | — | A.5.19–A.5.23 | Gap | P1 |
| <a id="sc-30"></a>SC-30 | Security awareness and NOC procedures: role training, caller verification, two-person scale-down<br>Risks: [R14](#r14) | Foundations | CIS 14.1–14.9 | — | A.6.3, A.5.37 | Gap | P1 |
| <a id="sc-31"></a>SC-31 | Public trust and anti-spoofing: one official domain, DNSSEC, CAA, HSTS preload, tamper-evident QR, lookalike monitoring<br>Risks: [R04](#r04) | Infrastructure | CIS 12.2, 17.4 | CIS NGINX (HSTS) | A.5.7, A.8.20 | Gap | P1 |
| <a id="sc-32"></a>SC-32 | Asset and software inventory: Config resource inventory, mandatory tags, ECR and SBOM catalog<br>Risks: [R19](#r19) | Foundations | CIS 1.1, 2.1 | CIS AWS Foundations | A.5.9 | Live | P2 |
| <a id="sc-33"></a>SC-33 | Surge availability: event-mode scale profile, static signed emergency page at the edge as origin failover<br>Risks: [R05](#r05) | Infrastructure | CIS 11, 12.2 | — | A.5.29, A.5.30, A.8.6, A.8.14 | Designed | P0 |
| <a id="sc-34"></a>SC-34 | Self-hosted map tiles for the service area, served from S3 through the edge<br>Risks: [R15](#r15) | Data | CIS 3.1, 15.4 | — | A.5.23, A.8.14 | Change | P2 |
| <a id="sc-35"></a>SC-35 | Versioned schema migrations (Flyway or Liquibase), ddl-auto validate, migration role separate from runtime<br>Risks: [R17](#r17) | Application security | CIS 16.1 | CIS PostgreSQL 17 | A.8.32, A.8.31 | Change | P1 |

[Back to contents](#pdf-contents)

---

<a id="roadmap"></a>

## 11 · Roadmap and go-live gates

**Four phases, gated by evidence rather than dates**

Phase A can start this week and needs only the platform team. Phase B is the go-live gate. Phases C and D build toward ISO 27001 certification readiness and CIS IG3.

### <a id="phases"></a>11.1 Phases

#### Phase A · next 2–3 weeks — Contain

- [CH-01](#ch-01) route allow-list and WAF deny rules
- [CH-06](#ch-06) interim Kyverno and NetworkPolicy for JDWP and root
- [CH-08](#ch-08) Security Hub CIS fix, default VPC
- Decide [B3a](#dec-b3a), [B25](#dec-b25), [B11](#dec-b11)
- Draft the ISMS policy and risk appetite

#### Phase B · before go-live — Gate

- Phase 12 auth, RBAC and devices split (F5, C21)
- [CH-07](#ch-07) WAF BLOCK, Kyverno Enforce, mTLS
- [CH-03](#ch-03) log archive, [CH-12](#ch-12) static failover
- Pen test and retest. DDoS and surge drill.
- [CH-04](#ch-04) retention decision signed

#### Phase C · go-live + 90 days — Segment

- [CH-02](#ch-02) multi-account and SCPs
- [CH-05](#ch-05) DB roles and migrations
- [CH-09](#ch-09) service-to-service mTLS
- [CH-13](#ch-13) egress allow-list
- IR playbooks exercised

#### Phase D · go-live + 12 months — Certify

- SoA complete, internal audit, management review
- ISO 27001 Stage 1 and Stage 2 readiness
- CIS IG3 safeguards that apply
- Yearly pen test and red-team exercise
- [CH-10](#ch-10) self-hosted tiles

### <a id="gates"></a>11.2 Go-live security gates

- [ ] <a id="g01"></a>**G1 · Admin authentication and RBAC live**. OIDC against the IdP, MFA, seed account removed, every endpoint authorized ([SC-05](#sc-05)). Evidence: ASVS L2 V6 to V8 test report.
- [ ] <a id="g02"></a>**G2 · Public API surface reduced to an allow-list**. Device list, lookup and count are unreachable from the internet. Evidence: an external scan returns 404 or 403.
- [ ] <a id="g03"></a>**G3 · No debug agents, no root containers**. Kyverno Enforce report is clean.
- [ ] <a id="g04"></a>**G4 · AWS WAF in BLOCK (9.1.7)** on the origin and admin ALBs, after a 7-day clean COUNT period.
- [ ] <a id="g05"></a>**G5 · Kyverno Enforce (9.1.5)** including cosign verification for prd images.
- [ ] <a id="g06"></a>**G6 · Origin accepts only Imperva**, through mandatory mTLS plus the prefix list. Evidence: a direct connection to the origin is refused.
- [ ] <a id="g07"></a>**G7 · Rate limiting and device tokens** on all public write endpoints ([SC-26](#sc-26)).
- [ ] <a id="g08"></a>**G8 · Security logs immutable, kept at least 1 year** ([CH-03](#ch-03)). App audit trail of guidance changes in place.
- [ ] <a id="g09"></a>**G9 · Security Hub FSBP and CIS v5.0.0 at 95% or more**, with every failure an approved exception. GuardDuty runtime coverage at 100% (D40).
- [ ] <a id="g10"></a>**G10 · Independent pen test passed**. No open Critical or High findings after retest ([B11](#dec-b11)).
- [ ] <a id="g11"></a>**G11 · Surge and DDoS drill passed**. 500,000 simulated users, failover to the emergency page proven ([CH-12](#ch-12)).
- [ ] <a id="g12"></a>**G12 · Data retention and residency signed off** ([CH-04](#ch-04), [B6](#dec-b6)). DPIA approved.

[Back to contents](#pdf-contents)

---

<a id="metrics"></a>

## 12 · Metrics and reporting

**How we will know it is working**

Reported monthly to the Steering Committee, and as ISO 27001 clause 9.1 monitoring evidence. Most metrics come straight from Security Hub, Config, Inspector and GuardDuty.

| Metric | Target | Source | Framework |
| --- | --- | --- | --- |
| Security Hub score, FSBP and CIS v5.0.0 | ≥ 95% | Security Hub | CIS 4, A.8.9 |
| Critical and High vulnerabilities past SLA | 0 | Inspector, Trivy | CIS 7, A.8.8 |
| Human identities with phishing-resistant MFA | 100% super admins, 100% MFA overall | IdP | CIS 6.5, A.8.5 |
| Access review completed on time | Quarterly, 100% | IdP and Identity Center | CIS 5, A.5.18 |
| prd images running signed and verified | 100% | Kyverno reports | CIS 2, A.8.32 |
| GuardDuty runtime coverage of nodes | 100% (D40 gate) | GuardDuty | CIS 10, A.8.7 |
| Mean time to acknowledge a High finding | < 30 min (event), < 4 h (normal) | Alarms topic | CIS 17, A.5.25 |
| Backup restore test success | Quarterly, 100% | AWS Backup | CIS 11, A.8.13 |
| Location data older than the retention limit | 0 rows | DB job report | CIS 3.4, A.8.10 |
| Emergency page availability during drills | ≥ 99.95% | Imperva and synthetics | A.5.30, A.8.14 |

[Back to contents](#pdf-contents)

---

<a id="decisions"></a>

## 13 · Decisions needed

**Open decisions, with a recommendation for each**

These come from the brief's list of decisions the strategy needs. Each has a recommended option, so the Steering Committee can approve or reject rather than start from scratch.

#### <a id="dec-b3a"></a>B3a · Identity provider — Recommend: client Entra ID

Federated to Client VPN (SAML), IAM Identity Center and the app (OIDC). Use Conditional Access and FIDO2 for super admins. Partner organizations join through B2B guests or their own federation. If the client cannot provide Entra, use IAM Identity Center as the IdP, but plan a manual joiner-mover-leaver process.

#### <a id="dec-access"></a>B3c · Admin access path — Recommend: hardened ALB sign-in with mandatory MFA

At up to 100 admins with budget as the deciding factor, replace Client VPN with an internet-facing admin ALB. It signs users in through Cognito (or Entra, if P1 is already licensed) with required MFA, uses AWS WAF with a country allow-list, and leaves engineering access to Session Manager. That saves about $1,000 a month against Client VPN. All twelve controls HC-01 to HC-12 are mandatory. Step up to Verified Access (about $197 a month) if the pen test or the risk owner rejects an internet-reachable admin entry point. See [8.7](#dd-access-rec).

#### <a id="dec-b3b"></a>B3b · Admin inventory — Recommend: named inventory per authority

Each authority names a sponsor who approves its users. There are three VPN groups mapped to app roles. Quarterly recertification. No shared accounts.

#### <a id="dec-b6"></a>B6 · Residency — Recommend: single-Region residency, enforced by SCP

Deny Regions other than us-east-1. Imperva logs and IdP data stay in the same jurisdiction, or move only with explicit approval. Without a second Region there is no cross-Region DR, so record that as an accepted risk, mitigated by Multi-AZ, a cross-account backup and edge failover.

#### <a id="dec-b11"></a>B11 · Penetration test — Recommend: independent firm in Phase 9

Scope: public site, admin console through the VPN, AWS configuration and the Kubernetes cluster. Schedule it after the Phase 12 fixes, then retest. Repeat yearly, and after major changes, as the DPIA's risk treatment plan requires.

#### <a id="dec-b12"></a>B12 · NOC caller verification — Recommend: ticket plus callback plus two-person rule

Scale-up can be done by one verified caller. Scale-down needs a second approver from a different organization. All requests are logged.

#### <a id="dec-b22"></a>B22 · Imperva — Recommend: tier with bot management and a DDoS SLA

Mandatory origin mTLS. Use only the Imperva client-IP header. Push logs to S3 in us-east-1, and confirm the push before go-live.

#### <a id="dec-b25"></a>B25 · Prd account — Recommend: yes, as part of an Organization

Create it before go-live if the timeline allows, because migrating prd later is harder. Also needed for cost-allocation tags (payer account).

#### <a id="dec-c21"></a>C21 · App login timeline — Recommend: hard go-live gate

The platform can contain the devices endpoints ([CH-01](#ch-01)) but cannot make up for having no admin login. G1 and G2 are not negotiable.

#### <a id="dec-c17"></a>C17 · Photo path — Recommend: presigned upload through the admin plane

Upload to S3 with a presigned PUT URL. Scan with GuardDuty Malware Protection for S3. Serve through the edge. The bucket is never public.

#### <a id="dec-gates"></a>9.1.7 · 9.1.5 — Recommend: both before go-live

WAF BLOCK and Kyverno Enforce, each after a 7-day clean observation window, with the reports kept as evidence.

[Back to contents](#pdf-contents)

---

<a id="references"></a>

## 14 · References

**Sources**

Framework versions were checked on 2026-10-21. Internal references (D-, B-, C- and F- items) point to the project documents listed in the Security Brief.

1. CIS — The 18 CIS Critical Security Controls (v8.1). [https://www.cisecurity.org/controls/cis-controls-list](https://www.cisecurity.org/controls/cis-controls-list)
2. Cisco — Framework Foundations: CIS Controls v8.1 Solution Brief (Implementation Groups). [https://www.cisco.com/c/en/us/products/collateral/security/cis-controls-sb.html](https://www.cisco.com/c/en/us/products/collateral/security/cis-controls-sb.html)
3. CIS — CIS Benchmarks list. [https://www.cisecurity.org/cis-benchmarks](https://www.cisecurity.org/cis-benchmarks)
4. CIS — Amazon Web Services Benchmarks (Foundations 7.1.0). [https://www.cisecurity.org/benchmark/amazon_web_services](https://www.cisecurity.org/benchmark/amazon_web_services)
5. CIS — CIS Benchmarks April 2026 Update (AWS Foundations v7.0.0). [https://www.cisecurity.org/insights/blog/cis-benchmarks-april-2026-update](https://www.cisecurity.org/insights/blog/cis-benchmarks-april-2026-update)
6. CIS — CIS Benchmarks June 2026 Update (EKS v2.0.0). [https://www.cisecurity.org/insights/blog/cis-benchmarks-june-2026-update](https://www.cisecurity.org/insights/blog/cis-benchmarks-june-2026-update)
7. CIS — PostgreSQL Benchmarks. [https://www.cisecurity.org/benchmark/postgresql](https://www.cisecurity.org/benchmark/postgresql)
8. CIS — NGINX Benchmarks. [https://www.cisecurity.org/benchmark/nginx](https://www.cisecurity.org/benchmark/nginx)
9. AWS — CIS AWS Foundations Benchmark in Security Hub CSPM. [https://docs.aws.amazon.com/securityhub/latest/userguide/cis-aws-foundations-benchmark.html](https://docs.aws.amazon.com/securityhub/latest/userguide/cis-aws-foundations-benchmark.html)
10. AWS re:Post — Resolve a security score or compliance status in Security Hub. [https://repost.aws/knowledge-center/security-hub-empty-score-status](https://repost.aws/knowledge-center/security-hub-empty-score-status)
11. AWS — Well-Architected Framework, Security pillar best practice areas. [https://docs.aws.amazon.com/wellarchitected/latest/framework/a-security.html](https://docs.aws.amazon.com/wellarchitected/latest/framework/a-security.html)
12. AWS — Security Pillar: Security foundations and design principles. [https://docs.aws.amazon.com/wellarchitected/latest/security-pillar/security.html](https://docs.aws.amazon.com/wellarchitected/latest/security-pillar/security.html)
13. ISO — ISO/IEC 27001:2022 and Amendment 1:2024. [https://www.iso.org/standard/27001](https://www.iso.org/standard/27001)
14. Modulos — ISO/IEC 27001:2022 Annex A, 93 controls in four themes. [https://docs.modulos.ai/frameworks/iso-27001/annex-a](https://docs.modulos.ai/frameworks/iso-27001/annex-a)
15. OWASP — Application Security Verification Standard 5.0.0. [https://github.com/owasp/asvs](https://github.com/owasp/asvs)
16. GDPR — Article 5: Principles relating to processing of personal data. [https://www.gdpr.org/regulation/article-5.html](https://www.gdpr.org/regulation/article-5.html)
17. EDPB (Irish DPC list) — Data Protection Impact Assessment requirements. [https://www.edpb.europa.eu/system/files/decisions/ie_dpc_data-protection-impact-assessment.pdf](https://www.edpb.europa.eu/system/files/decisions/ie_dpc_data-protection-impact-assessment.pdf)
18. ISO/IEC 27701:2025 — Privacy information management systems (preview). [https://cdn.standards.iteh.ai/samples/iso/iso-iec-27701-2025/999f0b4e27d84804be12758c821cc34e/iso-iec-27701-2025.pdf](https://cdn.standards.iteh.ai/samples/iso/iso-iec-27701-2025/999f0b4e27d84804be12758c821cc34e/iso-iec-27701-2025.pdf)
19. AWS — AWS WAF baseline rule groups. [https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-baseline.html](https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-baseline.html)
20. AWS — AWS WAF use-case specific rule groups. [https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-use-case.html](https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-use-case.html)
21. AWS — AWS WAF IP reputation rule groups. [https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-ip-rep.html](https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-ip-rep.html)
22. AWS — AWS Managed Rules changelog. [https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-changelog.html](https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-changelog.html)
23. AWS — Using forwarded IP addresses in AWS WAF. [https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-statement-forwarded-ip-address.html](https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-statement-forwarded-ip-address.html)
24. AWS — Aggregating rate-based rules in AWS WAF. [https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-statement-type-rate-based-aggregation-options.html](https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-statement-type-rate-based-aggregation-options.html)
25. AWS — Setting the web ACL default action. [https://docs.aws.amazon.com/waf/latest/developerguide/web-acl-default-action.html](https://docs.aws.amazon.com/waf/latest/developerguide/web-acl-default-action.html)
26. Imperva — Create and manage policies (WAF Rules, ACL). [https://docs-cybersec.thalesgroup.com/bundle/cloud-application-security/page/policies.htm](https://docs-cybersec.thalesgroup.com/bundle/cloud-application-security/page/policies.htm)
27. Imperva — Web Protection: WAF settings. [https://docs-cybersec.thalesgroup.com/bundle/cloud-application-security/page/settings/waf-settings.htm](https://docs-cybersec.thalesgroup.com/bundle/cloud-application-security/page/settings/waf-settings.htm)
28. Imperva — Web Protection: security settings. [https://docs-cybersec.thalesgroup.com/bundle/cloud-application-security/page/settings/security-settings.htm](https://docs-cybersec.thalesgroup.com/bundle/cloud-application-security/page/settings/security-settings.htm)
29. Imperva — Rules. [https://docs.imperva.com/bundle/cloud-application-security/page/rules/rules.htm](https://docs.imperva.com/bundle/cloud-application-security/page/rules/rules.htm)
30. ipregistry — Travel eSIMs, home routing and IP geolocation. [https://ipregistry.co/blog/travel-esim-ip-geolocation-home-routing](https://ipregistry.co/blog/travel-esim-ip-geolocation-home-routing)
31. Microsoft — Conditional Access: block access by location. [https://learn.microsoft.com/en-us/entra/identity/conditional-access/policy-block-by-location](https://learn.microsoft.com/en-us/entra/identity/conditional-access/policy-block-by-location)
32. AWS — Security Hub generally available with near real-time risk analytics (Dec 2025). [https://aws.amazon.com/about-aws/whats-new/2025/12/security-hub-near-real-time-risk-analytics/](https://aws.amazon.com/about-aws/whats-new/2025/12/security-hub-near-real-time-risk-analytics/)
33. AWS — Automations in Security Hub. [https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-v2-automations.html](https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-v2-automations.html)
34. AWS — GuardDuty attack sequence finding types. [https://docs.aws.amazon.com/guardduty/latest/ug/guardduty-attack-sequence-finding-types.html](https://docs.aws.amazon.com/guardduty/latest/ug/guardduty-attack-sequence-finding-types.html)
35. AWS — GuardDuty RDS Protection finding types. [https://docs.aws.amazon.com/guardduty/latest/ug/findings-rds-protection.html](https://docs.aws.amazon.com/guardduty/latest/ug/findings-rds-protection.html)
36. AWS — Security Hub controls for CloudWatch. [https://docs.aws.amazon.com/securityhub/latest/userguide/cloudwatch-controls.html](https://docs.aws.amazon.com/securityhub/latest/userguide/cloudwatch-controls.html)
37. AWS — Amazon Q Developer in chat applications. [https://docs.aws.amazon.com/chatbot/latest/adminguide/what-is.html](https://docs.aws.amazon.com/chatbot/latest/adminguide/what-is.html)
38. AWS — Setting up database credentials for RDS Proxy. [https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy-secrets-arns.html](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy-secrets-arns.html)
39. PostgreSQL — CREATE ROLE (17). [https://www.postgresql.org/docs/17/sql-createrole.html](https://www.postgresql.org/docs/17/sql-createrole.html)
40. AWS — Assign an IAM role to a Kubernetes service account (Pod Identity). [https://docs.aws.amazon.com/eks/latest/userguide/pod-id-association.html](https://docs.aws.amazon.com/eks/latest/userguide/pod-id-association.html)
41. AWS — Grant Pods access to AWS resources based on tags. [https://docs.aws.amazon.com/eks/latest/userguide/pod-id-abac.html](https://docs.aws.amazon.com/eks/latest/userguide/pod-id-abac.html)
42. Kubernetes — Configure service accounts for Pods. [https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/](https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/)
43. ICANNWiki —.internal. [https://icannwiki.org/.internal](https://icannwiki.org/.internal)
44. packet.guru — Certificate Transparency: anyone can list your subdomains. [https://packet.guru/blog/certificate-transparency-subdomains](https://packet.guru/blog/certificate-transparency-subdomains)
45. AWS — SEC06-BP02 Provision compute from hardened images. [https://docs.aws.amazon.com/wellarchitected/latest/framework/sec_protect_compute_hardened_images.html](https://docs.aws.amazon.com/wellarchitected/latest/framework/sec_protect_compute_hardened_images.html)
46. Docker — Docker makes hardened images free, open and transparent (Dec 2025). [https://www.docker.com/press-release/docker-makes-hardened-images-free-open-and-transparent-for-everyone/](https://www.docker.com/press-release/docker-makes-hardened-images-free-open-and-transparent-for-everyone/)
47. Docker Hub — Hardened Images: Eclipse Temurin. [https://hub.docker.com/hardened-images/catalog/dhi/eclipse-temurin](https://hub.docker.com/hardened-images/catalog/dhi/eclipse-temurin)
48. AWS — Amazon Inspector supported operating systems and hardened images. [https://docs.amazonaws.cn/en_us/inspector/latest/user/supported.html](https://docs.amazonaws.cn/en_us/inspector/latest/user/supported.html)
49. Amazon Corretto — corretto-docker. [https://github.com/corretto/corretto-docker](https://github.com/corretto/corretto-docker)
50. AWS — AL2023 minimal container image. [https://docs.aws.amazon.com/linux/al2023/ug/minimal-container.html](https://docs.aws.amazon.com/linux/al2023/ug/minimal-container.html)
51. Red Hat — Red Hat Hardened Images supported in AWS InspectorScan API and ECR basic scanning. [https://www.redhat.com/en/blog/streamlining-container-security-red-hat-hardened-images-now-supported-aws-inspectorscan-api-and-ecr-basic-scanning](https://www.redhat.com/en/blog/streamlining-container-security-red-hat-hardened-images-now-supported-aws-inspectorscan-api-and-ecr-basic-scanning)
52. AWS containers roadmap — ECR enhanced scanning support for Red Hat Hardened Images (#2887). [https://github.com/aws/containers-roadmap/issues/2887](https://github.com/aws/containers-roadmap/issues/2887)
53. AWS — ECR pull through cache: pulling an image. [https://docs.aws.amazon.com/AmazonECR/latest/userguide/pull-through-cache-working-pulling.md](https://docs.aws.amazon.com/AmazonECR/latest/userguide/pull-through-cache-working-pulling.md)
54. AWS — AWS VPN pricing (Client VPN). [https://aws.amazon.com/vpn/pricing/](https://aws.amazon.com/vpn/pricing/)
55. AWS — AWS Verified Access pricing. [https://aws.amazon.com/verified-access/pricing/](https://aws.amazon.com/verified-access/pricing/)
56. AWS — Verified Access load balancer endpoints. [https://docs.aws.amazon.com/verified-access/latest/ug/create-load-balancer-endpoint.html](https://docs.aws.amazon.com/verified-access/latest/ug/create-load-balancer-endpoint.html)
57. AWS — Verified Access user-identity trust providers. [https://docs.aws.amazon.com/verified-access/latest/ug/user-trust.html](https://docs.aws.amazon.com/verified-access/latest/ug/user-trust.html)
58. AWS — Authenticate users using an Application Load Balancer. [https://docs.aws.amazon.com/elasticloadbalancing/latest/application/listener-authenticate-users.html](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/listener-authenticate-users.html)
59. AWS — Start a Session Manager session (port forwarding). [https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-sessions-start.html](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-sessions-start.html)
60. AWS — Amazon EKS cluster API endpoint access. [https://docs.aws.amazon.com/eks/latest/userguide/cluster-endpoint.html](https://docs.aws.amazon.com/eks/latest/userguide/cluster-endpoint.html)
61. Cloudflare — Cloudflare Tunnel. [https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/)
62. Cloudflare — Connect private networks. [https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/private-net/](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/private-net/)
63. Cloudflare — Tunnel routing and published applications. [https://developers.cloudflare.com/tunnel/concepts/routing/](https://developers.cloudflare.com/tunnel/concepts/routing/)
64. Cloudflare — Enforce MFA in Access. [https://developers.cloudflare.com/cloudflare-one/access-controls/policies/mfa-requirements/](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/mfa-requirements/)
65. Cloudflare — SASE / Zero Trust pricing. [https://www.cloudflare.com/plans/sase-zero-trust.md](https://www.cloudflare.com/plans/sase-zero-trust.md)
66. Microsoft — Microsoft Entra licensing. [https://learn.microsoft.com/en-us/entra/fundamentals/licensing](https://learn.microsoft.com/en-us/entra/fundamentals/licensing)
67. Microsoft — Microsoft Entra plans and pricing. [https://www.microsoft.com/en-us/security/business/microsoft-entra-pricing](https://www.microsoft.com/en-us/security/business/microsoft-entra-pricing)
68. Microsoft — Conditional Access authentication strengths. [https://learn.microsoft.com/en-us/Entra/identity/authentication/concept-authentication-strengths](https://learn.microsoft.com/en-us/Entra/identity/authentication/concept-authentication-strengths)
69. AWS — Amazon Cognito pricing. [https://aws.amazon.com/cognito/pricing/](https://aws.amazon.com/cognito/pricing/)
70. AWS — Adding MFA to a Cognito user pool. [https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-mfa.html](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-mfa.html)
71. AWS — IAM Identity Center FAQs (pricing). [https://aws.amazon.com/iam/identity-center/faqs/](https://aws.amazon.com/iam/identity-center/faqs/)

[Back to contents](#pdf-contents)

---

_Security strategy v1.0 · 2026-10-21 · Prepared from the Security Brief for the alerting system (AWS ACCOUNT_ID, us-east-1). Re-check against docs 02, 07, 11, 31 and 32 whenever they change. Public edition: identifiers are placeholders (ACCOUNT_ID, PRD_VPC_CIDR, DEV_VPC_CIDR, ORG_ID, REPO_ID), and organization names are generic (platform team, CPA, EMS)._
