<a id="top"></a>

# Security proposal for management

One shared foundation. Three complete protection packages.

General edition. Choose the common foundation plus one proposal. Maximum 100 administrators; mandatory 2FA; no additional servers to operate. This is a design proposal, not an implementation or complete cost quotation.

## Contents

- [Common foundation](#common)
- [Proposal 1 · Lean AWS](#proposal-1)
- [Proposal 2 · AWS edge](#proposal-2)
- [Proposal 3 · Existing edge](#proposal-3)

- [Budget worksheet](#budget)

- [Q&A worksheet](#questions)

<a id="common"></a>

## Common foundation

<a id="common-decision"></a>

**Named owners, segregation of duties and a control register**

- Name owners for AWS administration, security incidents, billing and the application in a RACI that covers the platform team, the application team, the steering committee, the emergency authority and the edge vendor. ([Strategy: Ownership and approvals](https://talorlik.github.io/cloud-and-web-security/index.html#d-foundations))
- The production approver is never the author of the change. ([Strategy: Ownership and approvals](https://talorlik.github.io/cloud-and-web-security/index.html#d-foundations))
- Keep a control register as the basis for the ISO 27001 Statement of Applicability, with evidence that each control works. ([Strategy: Ownership and approvals](https://talorlik.github.io/cloud-and-web-security/index.html#d-foundations))
- Give every accepted exception an approver and an expiry date, and review the risk register quarterly and after every drill. ([Strategy: Platform compensates](https://talorlik.github.io/cloud-and-web-security/index.html#p6))
- Report monthly to the steering committee with the strategy’s metrics, most of which come straight from Security Hub, AWS Config, Inspector and GuardDuty. ([Strategy: Metrics and reporting](https://talorlik.github.io/cloud-and-web-security/index.html#metrics))

<a id="common-accounts"></a>

**One AWS Organization with purpose-built accounts**

- Create an AWS Organization whose management account holds only Organizations, consolidated billing and IAM Identity Center, never workloads. ([Strategy: Account security](https://talorlik.github.io/cloud-and-web-security/index.html#dd-org))
- Put the security-tooling, log-archive and backup accounts in a Security organizational unit, and separate production and development accounts in a Workloads unit. ([AWS multi-account guidance](https://docs.aws.amazon.com/whitepapers/latest/organizing-your-aws-environment/recommended-ous-and-accounts.html))
- Delegate GuardDuty, Security Hub, Inspector, AWS Config aggregation, IAM Access Analyzer and Macie to the security-tooling account. ([Strategy: Account security](https://talorlik.github.io/cloud-and-web-security/index.html#dd-org))
- Build the structure with Terraform in a separate organization pipeline that requires two-person approval. ([Strategy: Account security](https://talorlik.github.io/cloud-and-web-security/index.html#dd-org))
- Move production into its own account before go-live if the timeline allows, because migrating it later is harder. ([Strategy: Production account decision](https://talorlik.github.io/cloud-and-web-security/index.html#dec-b25))

<a id="common-guardrails"></a>

**Service control policies that no administrator can bypass**

- Deny leaving the organization and deny every Region except the home Region, exempting only global services such as IAM, Route 53, CloudFront and Shield. ([Strategy: Guardrail policies](https://talorlik.github.io/cloud-and-web-security/index.html#orgPolicyTable))
- Deny disabling CloudTrail, AWS Config, GuardDuty, Security Hub, Inspector, Macie or Access Analyzer, except for the security automation role. ([Strategy: Security services locked](https://talorlik.github.io/cloud-and-web-security/index.html#gp-03))
- Deny creating IAM users, access keys or console passwords, and deny all root-user actions in member accounts. ([Strategy: No permanent keys](https://talorlik.github.io/cloud-and-web-security/index.html#gp-04))
- Protect the platform roles and the log-archive buckets and keys, and stop anyone weakening EBS encryption by default or S3 Block Public Access. ([Strategy: Encryption locked](https://talorlik.github.io/cloud-and-web-security/index.html#gp-08))
- Allow internet gateway, peering, route table and NACL changes only through the platform pipeline role, and make human roles read-only in production. ([Strategy: Read-only humans in production](https://talorlik.github.io/cloud-and-web-security/index.html#gp-10))
- Test every policy in development for a week with IAM policy simulation before attaching it to production, and alert on any policy change. ([Strategy: Account security](https://talorlik.github.io/cloud-and-web-security/index.html#dd-org))

<a id="common-perimeter"></a>

**Resource control policies: a data perimeter around the organization**

- Attach RCPs at the root that deny access to S3, KMS, Secrets Manager, SQS, STS and CloudWatch Logs from identities outside our organization, unless the caller is an AWS service. ([Strategy: Data boundaries](https://talorlik.github.io/cloud-and-web-security/index.html#gp-12))
- Deny requests to S3, KMS, Secrets Manager and SQS that are not encrypted in transit. ([Strategy: TLS only](https://talorlik.github.io/cloud-and-web-security/index.html#gp-13))
- Deny AWS services acting on our resources on behalf of another organization, which blocks confused-deputy abuse. ([Strategy: Confused-deputy protection](https://talorlik.github.io/cloud-and-web-security/index.html#gp-14))
- Inventory external access with IAM Access Analyzer first, and list each legitimate integration, such as an edge vendor’s log-delivery role, as an explicit exception. ([Strategy: Vulnerability and access analysis](https://talorlik.github.io/cloud-and-web-security/index.html#ab-05))

<a id="common-defaults"></a>

**Secure defaults enforced by declarative policies and account baselines**

- Turn on all four S3 Block Public Access settings in every account and lock them with an SCP. ([Strategy: Storage protection](https://talorlik.github.io/cloud-and-web-security/index.html#ab-06))
- Turn on EBS encryption by default with a customer managed KMS key, also locked by SCP. ([Strategy: Disk encryption](https://talorlik.github.io/cloud-and-web-security/index.html#ab-07))
- Block public AMIs and snapshots with a declarative policy at the root. ([Strategy: Secure defaults](https://talorlik.github.io/cloud-and-web-security/index.html#gp-15))
- Enable VPC Block Public Access everywhere except the production public load balancer and NAT subnets. ([Strategy: VPC public-access block](https://talorlik.github.io/cloud-and-web-security/index.html#gp-16))
- Require IMDSv2 with a hop limit of one, disable serial console access, and allow machine images only from Amazon, the CIS publisher and our own accounts. ([Strategy: Instance safeguards](https://talorlik.github.io/cloud-and-web-security/index.html#gp-17))
- Add the AI services opt-out policy, a tag-driven organization backup policy and a tag policy for environment, owner, data-class and component, applied by one Terraform module and checked by Security Hub. ([Strategy: Required tags](https://talorlik.github.io/cloud-and-web-security/index.html#gp-20))

<a id="common-identity"></a>

**Named identities through IAM Identity Center with mandatory MFA**

- Every person gets a named login through IAM Identity Center federated to the client’s identity provider, with Microsoft Entra ID recommended. ([Strategy: Identity provider decision](https://talorlik.github.io/cloud-and-web-security/index.html#dec-b3a))
- If Entra ID is unavailable, Identity Center’s own directory is the fallback with a manual joiner-mover-leaver process. ([Strategy: Identity provider decision](https://talorlik.github.io/cloud-and-web-security/index.html#dec-b3a))
- MFA is required on every sign-in, enforced in Identity Center when it holds the users or by an Entra ID authentication strength when federated. ([Strategy: Mandatory 2FA](https://talorlik.github.io/cloud-and-web-security/index.html#hc-01))
- Super administrators and governing-organization administrators use FIDO2 security keys or passkeys, and SMS and email codes are off. ([Strategy: Mandatory 2FA](https://talorlik.github.io/cloud-and-web-security/index.html#hc-01))
- Permission sets for Viewer, Operator, Deployer and Auditor replace IAM users, with console sessions capped at eight hours and administrator sets at one hour. ([Strategy: Identity controls](https://talorlik.github.io/cloud-and-web-security/index.html#d-iam))
- Accounts are disabled after 45 days without sign-in, and all access is recertified every quarter. ([Strategy: Administrator inventory](https://talorlik.github.io/cloud-and-web-security/index.html#hc-02))

<a id="common-root"></a>

**Management account, root users and break-glass**

- SCPs and RCPs never apply to the management account, so it holds no workloads and is protected by process and detection. ([AWS management account guidance](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_best-practices_mgmt-acct.html))
- At most two named administrators enter it, through Identity Center with security keys, and any sign-in raises a P1 alert. ([Strategy: Account security](https://talorlik.github.io/cloud-and-web-security/index.html#dd-org))
- Its root user has two hardware MFA keys in separate safes under a sealed-envelope custodian process, no access keys and a root-usage alarm. ([Strategy: Identity controls](https://talorlik.github.io/cloud-and-web-security/index.html#d-iam))
- Centralized root access deletes root credentials from every member account, and new accounts are created without them. ([Strategy: Root protection](https://talorlik.github.io/cloud-and-web-security/index.html#ab-12))
- Two named, sealed break-glass identities exist; every use pages the security owner and triggers a post-use review. ([Strategy: Identity controls](https://talorlik.github.io/cloud-and-web-security/index.html#d-iam))

<a id="common-records"></a>

**An immutable, organization-wide audit trail**

- One organization CloudTrail covers all accounts and Regions with log file validation and KMS encryption, delivered to the log-archive account. ([Strategy: Audit trail](https://talorlik.github.io/cloud-and-web-security/index.html#ab-01))
- AWS Config records every resource type, with an organization aggregator in the security-tooling account. ([Strategy: Configuration recording](https://talorlik.github.io/cloud-and-web-security/index.html#ab-02))
- Security and audit logs sit in S3 with Object Lock in compliance mode: one year readily available plus six years in Glacier, with no human write access. ([Strategy: Log retention](https://talorlik.github.io/cloud-and-web-security/index.html#ch-03))
- Operational logs are kept 30 to 90 days and access logs one year. ([Strategy: Log retention](https://talorlik.github.io/cloud-and-web-security/index.html#ch-03))
- Load balancer, Envoy, edge, VPC Flow, EKS audit, pgaudit and administrator-access logs all go to the same archive. ([Strategy: Logging](https://talorlik.github.io/cloud-and-web-security/index.html#d-detect))
- Application audit events record who changed which guidance object, from where and when. ([Strategy: Logging](https://talorlik.github.io/cloud-and-web-security/index.html#d-detect))

<a id="common-detection"></a>

**Managed detection with alert-only routing**

- GuardDuty runs organization-wide with the S3, EKS audit and runtime, RDS and Malware Protection plans. ([Strategy: Threat detection](https://talorlik.github.io/cloud-and-web-security/index.html#ab-03))
- Security Hub central configuration applies the CIS AWS Foundations and Foundational Security Best Practices standards to every account. ([Strategy: Security Hub standards](https://talorlik.github.io/cloud-and-web-security/index.html#ab-04))
- Inspector scans EC2, ECR and Lambda, and IAM Access Analyzer reports external and unused access. ([Strategy: Vulnerability and access analysis](https://talorlik.github.io/cloud-and-web-security/index.html#ab-05))
- Security Hub automation rules suppress accepted exceptions and raise production severity before EventBridge routes findings to one SNS topic per tier. ([Security Hub automation rules](https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-v2-automations.html))
- P1 pages an on-call phone 24/7, P2 goes to chat through Amazon Q Developer in chat applications plus email, and P3 goes into a weekly digest. ([Strategy: Incident alerts](https://talorlik.github.io/cloud-and-web-security/index.html#dd-alerts))
- P1 targets acknowledgement in 15 minutes and containment in one hour, every alert carries a runbook link, and the pipeline is tested monthly with GuardDuty sample findings. ([Strategy: Incident alerts](https://talorlik.github.io/cloud-and-web-security/index.html#dd-alerts))

<a id="common-recovery"></a>

**Backups that an attacker or administrator cannot delete**

- An AWS Backup plan gives the production PostgreSQL database point-in-time recovery of at least seven days and daily snapshots kept for 35 days. ([Strategy: Data protection](https://talorlik.github.io/cloud-and-web-security/index.html#d-data))
- Copies go to a vault in the separate backup account. ([Strategy: Data protection](https://talorlik.github.io/cloud-and-web-security/index.html#d-data))
- AWS Backup Vault Lock in compliance mode means not even an administrator can delete those copies early. ([AWS backup protection](https://docs.aws.amazon.com/aws-backup/latest/devguide/vault-lock.html))
- An organization backup policy applies the plan by tag, so new databases are covered automatically. ([Strategy: Backup policy](https://talorlik.github.io/cloud-and-web-security/index.html#gp-19))
- A restore from the backup account runs every quarter, recording recovery time and data loss for the business to confirm. ([Strategy: Metrics and reporting](https://talorlik.github.io/cloud-and-web-security/index.html#metrics))

<a id="common-delivery"></a>

**Changes only through reviewed code and keyless pipelines**

- Account, network and cluster changes come only from reviewed Terraform and Argo CD configuration. ([Strategy: Secure delivery](https://talorlik.github.io/cloud-and-web-security/index.html#d-supply))
- GitHub Actions assumes AWS roles through an IAM OIDC provider whose trust is pinned to repository, branch, environment and workflow, with no stored access keys. ([Strategy: Deployment identity](https://talorlik.github.io/cloud-and-web-security/index.html#ab-11))
- Every role the pipeline creates carries a permission boundary. ([Strategy: Deployment identity](https://talorlik.github.io/cloud-and-web-security/index.html#ab-11))
- The GitHub organization requires SSO and MFA, branch protection with signed commits, CODEOWNERS on infrastructure and workflow files, required reviewers for production and no self-approval. ([Strategy: Secure delivery](https://talorlik.github.io/cloud-and-web-security/index.html#d-supply))
- Any IAM user, access key, administrator policy, SCP or permission boundary changed outside the pipeline alerts at P2, or P1 in production. ([Strategy: Identity-change alerts](https://talorlik.github.io/cloud-and-web-security/index.html#al-12))

<a id="common-budget"></a>

**Cost alarms as a security signal**

- AWS Budgets in every account and Cost Anomaly Detection notify the billing and security owners as P2 alerts. ([Cost Anomaly Detection](https://docs.aws.amazon.com/cost-management/latest/userguide/manage-ad.html))
- A sudden compute spike is often the first sign of crypto-mining after a credential leak. ([Strategy: Cost alerts](https://talorlik.github.io/cloud-and-web-security/index.html#ab-10))
- Review actual monthly spend against the worksheet in this proposal, including detection, logs, backups, licences and staff time. ([Strategy: Cost alerts](https://talorlik.github.io/cloud-and-web-security/index.html#ab-10))
- Budget alerts warn people but do not cap spending. ([Cost Anomaly Detection](https://docs.aws.amazon.com/cost-management/latest/userguide/manage-ad.html))

<a id="common-approval"></a>

**Twelve go-live gates with evidence, not dates**

- Launch waits for twelve security gates, each with evidence rather than a date. ([Strategy: Launch tests](https://talorlik.github.io/cloud-and-web-security/index.html#gates))
- Gates include working administrator login and role-based authorization, a public API reduced to an allow-list, and signed images enforced in the cluster. ([Strategy: Gate: administrator login](https://talorlik.github.io/cloud-and-web-security/index.html#g01))
- AWS WAF must be in BLOCK after a clean seven-day COUNT period, logs must be immutable, and Security Hub must score 95 percent or better. ([Strategy: Gate: WAF blocking](https://talorlik.github.io/cloud-and-web-security/index.html#g04))
- An independent penetration test must pass with no open Critical or High findings after retest. ([Strategy: Gate: penetration test](https://talorlik.github.io/cloud-and-web-security/index.html#g10))
- A surge and DDoS drill with 500,000 simulated users must prove failover to the emergency page. ([Strategy: Gate: surge drill](https://talorlik.github.io/cloud-and-web-security/index.html#g11))
- Data retention, residency and the DPIA must be signed off, and the steering committee sees the evidence for every gate. ([Strategy: Gate: retention and residency](https://talorlik.github.io/cloud-and-web-security/index.html#g12))

[Back to contents](#top)

<a id="proposal-1"></a>

## Proposal 1 · Lean AWS

<a id="p1-fit"></a>

**Best fit and trade-off**

- Choose this package when the public load balancer, with AWS WAF and the included Shield Standard protection, passes the 500,000-user surge and DDoS drill on its own. ([AWS DDoS protection](https://docs.aws.amazon.com/waf/latest/developerguide/shield-chapter.html))
- It has the fewest moving parts and the lowest fixed cost, but every public request reaches the AWS Region directly. ([Strategy: Outage under surge](https://talorlik.github.io/cloud-and-web-security/index.html#r05))
- There is no edge cache and no edge-served failover page, so the fallback depends on DNS failover. ([Route 53 DNS failover](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-failover.html))
- The strategy rates outage under surge as a Critical risk, so this package must disprove it in testing before approval. ([Strategy: Outage under surge](https://talorlik.github.io/cloud-and-web-security/index.html#r05))

<a id="p1-edge"></a>

**Public entry: Application Load Balancer, AWS WAF and Shield Standard**

- An AWS WAF web ACL runs in BLOCK on the internet-facing Application Load Balancer. ([Strategy: Web attack protection](https://talorlik.github.io/cloud-and-web-security/index.html#dd-waf))
- It uses the AWS managed Core, Known Bad Inputs, SQL database, Linux and Admin Protection rule groups. ([Strategy: Core rule set](https://talorlik.github.io/cloud-and-web-security/index.html#waf-07))
- The IP reputation and Anonymous IP lists work here because no proxy sits in front of the load balancer. ([AWS WAF IP reputation groups](https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-ip-rep.html))
- Rate-based rules use separate thresholds for the position write path, geo and routing lookups and site assets, set high for carrier-grade NAT and preferring Challenge over Block on reads. ([Strategy: Rate limits](https://talorlik.github.io/cloud-and-web-security/index.html#waf-06))
- A positive allow-list returns 404 for everything except the listed public methods and paths. ([Strategy: Public route allow-list](https://talorlik.github.io/cloud-and-web-security/index.html#waf-05))
- Shield Standard covers common network and transport floods at no charge; Shield Advanced at USD 3,000 per month is not assumed. ([AWS Shield pricing](https://aws.amazon.com/shield/pricing/))

<a id="p1-location"></a>

**Location checks without blocking emergency readers**

- Public reads are never geo-blocked, because home-routed roaming makes visitors inside the service area appear with foreign IP addresses. ([Strategy: Web attack protection](https://talorlik.github.io/cloud-and-web-security/index.html#dd-waf))
- Requests are labelled by country with a Count rule, and traffic from outside the service country gets stricter rate limits. ([Strategy: Web attack protection](https://talorlik.github.io/cloud-and-web-security/index.html#dd-waf))
- Position writes are validated in the application with PostGIS: coordinates outside the service-area polygon, implausible speeds and out-of-range timestamps are rejected. ([Strategy: Fake check-ins](https://talorlik.github.io/cloud-and-web-security/index.html#r07))
- AWS WAF blocks anonymizers and hosting providers on the write path only. ([Strategy: Visitor reputation](https://talorlik.github.io/cloud-and-web-security/index.html#waf-12))
- Administrator location is enforced at the identity provider and in the Verified Access policy, never at the public WAF. ([Strategy: Location controls](https://talorlik.github.io/cloud-and-web-security/index.html#hc-04))

<a id="p1-admin"></a>

**Administrator console: Verified Access, Identity Center and application RBAC**

- One AWS Verified Access HTTP endpoint fronts the existing internal administrator load balancer that serves the Angular console and the admin gateway. ([Strategy: Administrator access](https://talorlik.github.io/cloud-and-web-security/index.html#dd-access-rec))
- It uses a non-descriptive hostname on a domain separate from the public site, with a public ACM certificate. ([Strategy: Low-visibility name](https://talorlik.github.io/cloud-and-web-security/index.html#hc-09))
- IAM Identity Center with mandatory MFA is the trust provider, and the AWS WAF web ACL is attached to the Verified Access instance. ([Strategy: Administrator web firewall](https://talorlik.github.io/cloud-and-web-security/index.html#hc-05))
- Group-based Cedar policies grant the console and deny everything not listed, and client IP addresses are restricted to the service country with a time-boxed exception process. ([Strategy: Group access policies](https://talorlik.github.io/cloud-and-web-security/index.html#hc-03))
- Sessions last eight hours, and a user disabled at the identity provider loses access when the session ends. ([Strategy: Short sessions](https://talorlik.github.io/cloud-and-web-security/index.html#hc-07))
- The admin gateway verifies the signed user-context token on every request, and the application still enforces its own OIDC login and role-based authorization. ([Strategy: Application identity](https://talorlik.github.io/cloud-and-web-security/index.html#hc-08))

<a id="p1-engineering"></a>

**Engineering access: two TCP endpoints and CloudShell, no jump server**

- Super administrators use two Verified Access TCP endpoints through the Connectivity Client. ([Strategy: Administrator access](https://talorlik.github.io/cloud-and-web-security/index.html#dd-access-rec))
- A network CIDR endpoint covers only the subnets holding the EKS control-plane interfaces on port 443, and Argo CD is reached by kubectl port-forward. ([Strategy: Least-privilege endpoints](https://talorlik.github.io/cloud-and-web-security/index.html#hc-10))
- An RDS endpoint targets RDS Proxy, never the database instance, and security groups admit only the Verified Access endpoint. ([Strategy: Least-privilege endpoints](https://talorlik.github.io/cloud-and-web-security/index.html#hc-10))
- CloudShell VPC environments, at no additional charge, are the break-glass and Linux path, because the Connectivity Client runs only on Windows and macOS. ([Strategy: Serverless break-glass](https://talorlik.github.io/cloud-and-web-security/index.html#hc-12))
- CloudShell sessions end after 20 to 30 minutes idle, so it is a recovery path, not a daily tool. ([CloudShell limits](https://docs.aws.amazon.com/cloudshell/latest/userguide/limits.html))
- The new path runs in parallel with the Client VPN for two weeks with a written rollback before the VPN endpoint is removed. ([Strategy: Access without VPN](https://talorlik.github.io/cloud-and-web-security/index.html#ch-15))

<a id="p1-internal"></a>

**Inside the VPC: private EKS, segmented namespaces and controlled egress**

- The EKS API endpoint stays private, reachable only from inside the VPC or through the Verified Access endpoint. ([Strategy: Access options](https://talorlik.github.io/cloud-and-web-security/index.html#dd-access))
- Public and administrative workloads run in separate namespaces under Pod Security Admission restricted. ([Strategy: Workload identities](https://talorlik.github.io/cloud-and-web-security/index.html#dd-sa))
- Default-deny NetworkPolicies block all traffic between the public and admin namespaces in both directions, and each gateway accepts traffic only from its own Envoy. ([Strategy: Workload identities](https://talorlik.github.io/cloud-and-web-security/index.html#dd-sa))
- Exact-match HTTPRoutes replace the broad proxied API prefix, and the Swagger, API-docs and actuator paths are denied at the WAF. ([Strategy: Public route allow-list](https://talorlik.github.io/cloud-and-web-security/index.html#ch-01))
- The default VPC is deleted, and VPC endpoints for S3, ECR, STS, Secrets Manager, KMS and CloudWatch Logs keep traffic inside AWS. ([Strategy: No default networks](https://talorlik.github.io/cloud-and-web-security/index.html#ab-09))
- Remaining egress passes through AWS Network Firewall with a domain allow-list, and service-to-service traffic moves to mutual TLS through Envoy or an ambient mesh. ([Strategy: Outbound restrictions](https://talorlik.github.io/cloud-and-web-security/index.html#ch-13))

<a id="p1-permissions"></a>

**One identity per workload, one login per service**

- EKS Pod Identity maps each Kubernetes service account to its own IAM role: web, public gateway, devices, geometry, routing, console, admin gateway, backend and migration. ([Strategy: Workload identities](https://talorlik.github.io/cloud-and-web-security/index.html#dd-sa))
- Each role is scoped to its own Secrets Manager secret and KMS key, and automatic token mounting is off. ([Strategy: Workload identities](https://talorlik.github.io/cloud-and-web-security/index.html#dd-sa))
- The single superuser database login is replaced by a non-login owner role and a migration role used only by the Flyway job. ([Strategy: Database permissions](https://talorlik.github.io/cloud-and-web-security/index.html#dd-db))
- The public devices service, the public geometry service and the admin backend each get their own login with only the table rights they need. ([Strategy: Database permissions](https://talorlik.github.io/cloud-and-web-security/index.html#dd-db))
- Named DBA roles use IAM authentication, and the master account is reserved for break-glass. ([Strategy: Database permissions](https://talorlik.github.io/cloud-and-web-security/index.html#dd-db))
- Each database user has its own Secrets Manager secret behind RDS Proxy, with connection limits, statement timeouts, forced TLS, and an alert on any owner or master login. ([Strategy: Database anomaly alert](https://talorlik.github.io/cloud-and-web-security/index.html#al-16))

<a id="p1-data"></a>

**Data protection and minimization**

- Customer managed KMS keys per environment use split key policies and yearly rotation, and an SCP denies key deletion except through break-glass. ([Strategy: Data protection](https://talorlik.github.io/cloud-and-web-security/index.html#d-data))
- RDS stays Multi-AZ with deletion protection and pgaudit, and secrets are mounted from Secrets Manager through the CSI driver. ([Strategy: Data protection](https://talorlik.github.io/cloud-and-web-security/index.html#d-data))
- Raw location samples are deleted 30 days after an event closes, and only aggregates by area and time are kept. ([Strategy: Data retention](https://talorlik.github.io/cloud-and-web-security/index.html#ch-04))
- The device email field is removed and device identifiers rotate for each event. ([Strategy: Data retention](https://talorlik.github.io/cloud-and-web-security/index.html#ch-04))
- A DPIA is run and a privacy notice published before launch. ([Strategy: Data protection](https://talorlik.github.io/cloud-and-web-security/index.html#d-data))
- Photos enter only through the admin plane with presigned S3 upload URLs, are scanned by GuardDuty Malware Protection for S3, and are served from a bucket that is never public. ([Strategy: Photo upload decision](https://talorlik.github.io/cloud-and-web-security/index.html#dec-c17))

<a id="p1-software"></a>

**Hardened images, signed releases and admission control**

- Every Java service is a multi-stage image on a hardened Eclipse Temurin 17 JRE base from Docker Hardened Images, with Amazon Corretto as the fallback. ([Strategy: Container protection](https://talorlik.github.io/cloud-and-web-security/index.html#dd-images))
- Base images are pinned by digest and mirrored into ECR through a pull-through cache, so nodes pull only from ECR. ([Strategy: Container protection](https://talorlik.github.io/cloud-and-web-security/index.html#dd-images))
- Containers run as a non-root numeric user with a read-only root filesystem, all capabilities dropped and no debug agent. ([Strategy: Container protection](https://talorlik.github.io/cloud-and-web-security/index.html#dd-images))
- SBOM, provenance, Trivy and Inspector gates, cosign signing and immutable tags stay as they are. ([Strategy: Secure delivery](https://talorlik.github.io/cloud-and-web-security/index.html#d-supply))
- Kyverno moves to Enforce: only signed images from the production ECR registry, no privileged pods, no root user, and the debug port denied. ([Strategy: Secure delivery](https://talorlik.github.io/cloud-and-web-security/index.html#d-supply))
- Images are rebuilt weekly, Critical vulnerabilities are patched within seven days or 48 hours with a public exploit, and SAST, dependency review, secret scanning and DAST block the pipeline. ([Strategy: Application security](https://talorlik.github.io/cloud-and-web-security/index.html#d-app))

<a id="p1-response"></a>

**Detection, response and the emergency fallback in this package**

- P1 detections page the on-call responder: guidance changed outside a change window, the site or emergency page unreachable, a blocked path reached at the origin, or a GuardDuty attack sequence. ([Strategy: Incident alerts](https://talorlik.github.io/cloud-and-web-security/index.html#dd-alerts))
- Synthetic canaries in two or more locations watch the public site and the emergency page. ([Strategy: Availability alert](https://talorlik.github.io/cloud-and-web-security/index.html#al-08))
- The signed static emergency page is published to S3 as the strategy requires. ([Strategy: Emergency fallback](https://talorlik.github.io/cloud-and-web-security/index.html#ch-12))
- With no edge cache, the switch to that page uses Route 53 health checks and DNS failover. ([Route 53 DNS failover](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-failover.html))
- S3 website endpoints do not support HTTPS, so the drill must prove the fallback over HTTPS: either a minimal CloudFront distribution for the emergency page or a written acceptance of the gap. ([S3 website endpoints](https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteEndpoints.html))

<a id="p1-cost"></a>

**Cost checkpoint, not a complete quote**

- One Verified Access web application at USD 0.27 per hour plus two TCP endpoints at USD 0.20 per hour cost about USD 489 per month at 730 hours. ([Verified Access pricing](https://aws.amazon.com/verified-access/pricing/))
- An AWS WAF example of one web ACL and ten billable rule entries adds USD 15 per month plus USD 0.60 per million inspected requests. ([AWS WAF pricing](https://aws.amazon.com/waf/pricing/))
- The administrator web ACL is priced separately, while Shield Standard and IAM Identity Center add no charge. ([Identity Center pricing](https://aws.amazon.com/iam/identity-center/faqs/))
- Confirm deployment-Region rates and Verified Access availability in the console before approval. ([Strategy: Access options](https://talorlik.github.io/cloud-and-web-security/index.html#dd-access))
- The common detection, logging, backup and labour allowances in the worksheet are planning estimates, not quotes. ([Strategy: Access options](https://talorlik.github.io/cloud-and-web-security/index.html#dd-access))

<a id="p1-work"></a>

**What the team still owns**

- No jump server, proxy, connector or monitoring server is added. ([Strategy: Access options](https://talorlik.github.io/cloud-and-web-security/index.html#dd-access))
- The platform team still operates the EKS cluster, the CIS Ubuntu nodes rebuilt monthly, the Terraform layers, Kyverno and Argo CD. ([Strategy: Shared responsibility](https://talorlik.github.io/cloud-and-web-security/index.html#scope-responsibility))
- The application team still owns the Phase 12 fixes, including login, authorization and the devices split. ([Strategy: Shared responsibility](https://talorlik.github.io/cloud-and-web-security/index.html#scope-responsibility))
- The team tunes WAF rules after the COUNT period, maintains Cedar policies and Connectivity Client updates, and runs the incident playbooks. ([Strategy: Responsibilities](https://talorlik.github.io/cloud-and-web-security/index.html#d-people))
- The staged migration away from the current edge vendor and the Client VPN is also the team’s work. ([Strategy: Access without VPN](https://talorlik.github.io/cloud-and-web-security/index.html#ch-15))

<a id="p1-gate"></a>

**Management approval condition**

- Approve only if the drill with 500,000 simulated users keeps the public application and the HTTPS emergency fallback usable with the load balancer exposed directly. ([Strategy: Gate: surge drill](https://talorlik.github.io/cloud-and-web-security/index.html#g11))
- An external scan must confirm the admin and device-list paths return 404 or 403. ([Strategy: Gate: public allow-list](https://talorlik.github.io/cloud-and-web-security/index.html#g02))
- If the drill fails, or caching in Proposal 2 is cheaper than scaling the cluster beyond its four-node cap, choose Proposal 2 rather than removing security controls. ([Strategy: Outage under surge](https://talorlik.github.io/cloud-and-web-security/index.html#r05))

[Back to contents](#top)

<a id="proposal-2"></a>

## Proposal 2 · AWS edge

<a id="p2-fit"></a>

**Best fit and trade-off**

- Choose this package when absorbing the surge at a global edge is worth a managed delivery layer. ([CloudFront pricing](https://aws.amazon.com/cloudfront/pricing/))
- Amazon CloudFront sits in front of the public load balancer, AWS WAF is evaluated at the edge, Shield Standard is included, and administrators use the same Verified Access path as Proposal 1. ([Strategy: Administrator access](https://talorlik.github.io/cloud-and-web-security/index.html#dd-access-rec))
- It stays AWS-only with no server to run and adds the edge-served emergency page the strategy calls for. ([Strategy: Emergency fallback](https://talorlik.github.io/cloud-and-web-security/index.html#ch-12))
- Its value depends on measured traffic and on what can safely be cached. ([CloudFront pricing](https://aws.amazon.com/cloudfront/pricing/))
- The residency decision must accept that public content is served from edge locations worldwide. ([Strategy: Residency](https://talorlik.github.io/cloud-and-web-security/index.html#dec-b6))

<a id="p2-edge"></a>

**Public entry: CloudFront, AWS WAF at the edge and a locked origin**

- An AWS WAF web ACL on the CloudFront distribution applies the Core, Known Bad Inputs, SQL database, Linux and Admin Protection managed rule groups. ([Strategy: Web attack protection](https://talorlik.github.io/cloud-and-web-security/index.html#dd-waf))
- The IP reputation and Anonymous IP lists work at the edge because CloudFront sees the real client. ([AWS WAF IP reputation groups](https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-ip-rep.html))
- Rate-based rules per path and the public route allow-list are enforced at the edge. ([Strategy: Rate limits](https://talorlik.github.io/cloud-and-web-security/index.html#waf-06))
- The load balancer security group admits only the AWS-managed prefix list for CloudFront origin-facing servers. ([AWS origin protection](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/restrict-access-to-load-balancer.html))
- A secret origin custom header, checked by a listener rule or the origin web ACL, stops anyone bypassing the edge. ([AWS origin protection](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/restrict-access-to-load-balancer.html))
- The origin web ACL stays in BLOCK as a second layer, reads the client address from the forwarded IP header, and any blocked path reached at the origin alerts at P1. ([Strategy: Origin bypass alert](https://talorlik.github.io/cloud-and-web-security/index.html#al-09))

<a id="p2-cache"></a>

**Cache public content, never private responses**

- CloudFront caches site assets, the self-hosted map tiles once adopted, and the signed emergency page using custom caching rules. ([CloudFront cache keys](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-the-cache-key.html))
- The position write path, administrator traffic and anything carrying personal data are excluded from the cache key and the cache. ([CloudFront cache keys](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-the-cache-key.html))
- The publishing procedure defines how fast changed guidance must appear and uses CloudFront invalidations to enforce it. ([CloudFront invalidation](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Invalidation.html))
- An emergency update is rehearsed so the cache can never serve dangerously outdated instructions. ([Strategy: Guidance integrity](https://talorlik.github.io/cloud-and-web-security/index.html#r01))
- An origin group makes the application primary and the S3 emergency page secondary, so GET requests fail over at the edge when the origin errors or times out. ([CloudFront origin failover](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/high_availability_origin_failover.html))

<a id="p2-location"></a>

**Location checks with the real client visible at the edge**

- CloudFront geographic restrictions are not used on public reads, because they block whole countries and roaming visitors inside the service area appear foreign. ([CloudFront geographic restrictions](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/georestrictions.html))
- The edge web ACL labels requests by country and applies stricter rate limits outside the service country. ([Strategy: Web attack protection](https://talorlik.github.io/cloud-and-web-security/index.html#dd-waf))
- Position writes are validated in the application with the PostGIS polygon, speed and timestamp checks. ([Strategy: Fake check-ins](https://talorlik.github.io/cloud-and-web-security/index.html#r07))
- Anonymizers and hosting providers are blocked on the write path at the edge, where AWS WAF sees the real client address. ([Strategy: Visitor reputation](https://talorlik.github.io/cloud-and-web-security/index.html#waf-12))
- Administrator location is enforced at the identity provider and in the Verified Access Cedar policy, with MFA as the primary control. ([Strategy: Location controls](https://talorlik.github.io/cloud-and-web-security/index.html#hc-04))

<a id="p2-admin"></a>

**Administrator console: Verified Access, Identity Center and application RBAC**

- The administrator console stays entirely off the CloudFront distribution. ([Strategy: Administrator hostname](https://talorlik.github.io/cloud-and-web-security/index.html#dd-admin))
- One Verified Access HTTP endpoint fronts the internal administrator load balancer on its own low-visibility domain with a public ACM certificate. ([Strategy: Low-visibility name](https://talorlik.github.io/cloud-and-web-security/index.html#hc-09))
- IAM Identity Center with mandatory MFA is the trust provider, and the AWS WAF web ACL is attached to the Verified Access instance. ([Strategy: Administrator web firewall](https://talorlik.github.io/cloud-and-web-security/index.html#hc-05))
- Group-based Cedar policies grant the console to the location, governing-organization and super administrator groups, with eight-hour sessions. ([Strategy: Group access policies](https://talorlik.github.io/cloud-and-web-security/index.html#hc-03))
- The admin gateway verifies the signed user-context token on every request. ([Strategy: Application identity](https://talorlik.github.io/cloud-and-web-security/index.html#hc-08))
- Sign-ins from unexpected countries or hours alert at P2; changes to policies, trust providers or the web ACL, MFA resets, and administrators created outside the inventory alert at P1. ([Strategy: Access logging](https://talorlik.github.io/cloud-and-web-security/index.html#hc-11))

<a id="p2-engineering"></a>

**Engineering access: two TCP endpoints and CloudShell**

- Super administrators reach the private EKS API through a Verified Access network CIDR endpoint on port 443 and RDS Proxy through a Verified Access RDS endpoint. ([Strategy: Least-privilege endpoints](https://talorlik.github.io/cloud-and-web-security/index.html#hc-10))
- Both use the Connectivity Client, and security groups admit only the Verified Access endpoint. ([Strategy: Least-privilege endpoints](https://talorlik.github.io/cloud-and-web-security/index.html#hc-10))
- CloudShell VPC environments are the break-glass path when Verified Access or the identity provider fails during an event, reaching the EKS API, RDS Proxy and the admin gateway from inside the VPC. ([Strategy: Serverless break-glass](https://talorlik.github.io/cloud-and-web-security/index.html#hc-12))
- Confirm that Verified Access and CloudShell VPC environments are offered in the deployment Region. ([Strategy: Administrator access](https://talorlik.github.io/cloud-and-web-security/index.html#dd-access-rec))
- The Client VPN stays until two weeks of parallel running are complete. ([Strategy: Access without VPN](https://talorlik.github.io/cloud-and-web-security/index.html#ch-15))

<a id="p2-internal"></a>

**Inside the VPC: the same segmentation as Proposal 1, plus origin isolation**

- The private EKS endpoint, separate public and admin namespaces under Pod Security Admission restricted, and default-deny NetworkPolicies apply exactly as in Proposal 1. ([Strategy: Workload identities](https://talorlik.github.io/cloud-and-web-security/index.html#dd-sa))
- Exact-match public HTTPRoutes, VPC endpoints, a Network Firewall domain allow-list and mutual TLS between services apply as well. ([Strategy: Network protection](https://talorlik.github.io/cloud-and-web-security/index.html#d-infra))
- VPC Block Public Access excludes only the public load balancer and NAT subnets. ([Strategy: VPC public-access block](https://talorlik.github.io/cloud-and-web-security/index.html#gp-16))
- That load balancer accepts traffic only from the CloudFront prefix list, so the origin has no internet path except through the edge. ([AWS origin protection](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/restrict-access-to-load-balancer.html))

<a id="p2-permissions"></a>

**One identity per workload, one login per service**

- EKS Pod Identity maps each service account to its own IAM role scoped to one Secrets Manager secret and KMS key. ([Strategy: Workload identities](https://talorlik.github.io/cloud-and-web-security/index.html#dd-sa))
- Service account tokens are not mounted, and no application has a Role or RoleBinding in the cluster. ([Strategy: Workload identities](https://talorlik.github.io/cloud-and-web-security/index.html#dd-sa))
- The database uses a non-login owner, a Flyway migration role, and separate logins for the public devices service, the geometry service and the admin backend. ([Strategy: Database permissions](https://talorlik.github.io/cloud-and-web-security/index.html#dd-db))
- Named DBA roles use IAM authentication, and every database user sits behind RDS Proxy with its own secret and connection limit. ([Strategy: Database permissions](https://talorlik.github.io/cloud-and-web-security/index.html#dd-db))
- Separate connection pools stop a public flood from starving the administrator plane, and any owner or master login raises an alert. ([Strategy: Database anomaly alert](https://talorlik.github.io/cloud-and-web-security/index.html#al-16))

<a id="p2-data"></a>

**Data protection, minimization and what the edge may hold**

- The KMS, Secrets Manager, RDS and backup controls are the same as Proposal 1. ([Strategy: Data protection](https://talorlik.github.io/cloud-and-web-security/index.html#d-data))
- Raw location samples are deleted 30 days after an event closes, the device email is removed, device identifiers rotate, and a DPIA and privacy notice are completed. ([Strategy: Data retention](https://talorlik.github.io/cloud-and-web-security/index.html#ch-04))
- CloudFront caches and standard logs are checked to hold no personal data, and access logs are delivered to the log-archive bucket in the home Region. ([CloudFront access logs](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/AccessLogs.html))
- The residency decision records that cached public content is served from edge locations worldwide. ([Strategy: Residency](https://talorlik.github.io/cloud-and-web-security/index.html#dec-b6))
- CloudFront is a global service whose control-plane calls are made in us-east-1, so the Region guardrail lists it as an explicit exemption. ([Strategy: Region safeguards](https://talorlik.github.io/cloud-and-web-security/index.html#gp-02))

<a id="p2-software"></a>

**Hardened images, signed releases and admission control**

- Identical to Proposal 1: hardened Temurin JRE images pinned by digest and mirrored through an ECR pull-through cache. ([Strategy: Container protection](https://talorlik.github.io/cloud-and-web-security/index.html#dd-images))
- Containers run non-root with a read-only filesystem and no debug agent. ([Strategy: Container protection](https://talorlik.github.io/cloud-and-web-security/index.html#dd-images))
- Kyverno in Enforce verifies cosign signatures and allows only the production ECR registry. ([Strategy: Secure delivery](https://talorlik.github.io/cloud-and-web-security/index.html#d-supply))
- Weekly rebuilds, seven-day Critical patching, and SAST, dependency review, secret scanning and DAST gates stay in the pipeline. ([Strategy: Application security](https://talorlik.github.io/cloud-and-web-security/index.html#d-app))
- Argo CD rollback remains the tested recovery for a bad release. ([Strategy: Recovery](https://talorlik.github.io/cloud-and-web-security/index.html#d-ir))

<a id="p2-response"></a>

**Detection, response and the edge-served fallback**

- The same P1 and P2 detections as Proposal 1 go to the on-call responder. ([Strategy: Incident alerts](https://talorlik.github.io/cloud-and-web-security/index.html#dd-alerts))
- CloudWatch Synthetics canaries in two or more locations watch the public site and the emergency page through CloudFront. ([CloudWatch Synthetics canaries](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Canaries.html))
- The emergency page lives in S3 behind the CloudFront origin group, so GET requests fail over at the edge without a DNS change. ([Strategy: Emergency fallback](https://talorlik.github.io/cloud-and-web-security/index.html#ch-12))
- The DDoS playbook adds AWS Shield engagement and the pre-approved event-mode scale profile. ([Strategy: Recovery](https://talorlik.github.io/cloud-and-web-security/index.html#d-ir))
- The surge drill rehearses the failover and an emergency guidance update, because CloudFront fails over only after a request to the primary origin fails and never for POST requests. ([CloudFront origin failover](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/high_availability_origin_failover.html))

<a id="p2-cost"></a>

**Compare total edge cost before buying**

- Budget about USD 489 per month for the Verified Access configuration, as in Proposal 1. ([Verified Access pricing](https://aws.amazon.com/verified-access/pricing/))
- CloudFront is priced pay-as-you-go or on a flat-rate plan, and the Business and Premium plans bundle the edge web ACL. ([CloudFront pricing](https://aws.amazon.com/cloudfront/pricing/))
- The edge-served emergency page needs origin failover, which CloudFront lists only from the Premium plan at USD 1,000 per month, so the worksheet starts there. ([CloudFront pricing](https://aws.amazon.com/cloudfront/pricing/))
- Premium also bundles advanced DDoS protection, JavaScript challenge, custom caching rules, logging and 500 million requests, while pay-as-you-go bills requests, data transfer and each WAF feature per use. ([CloudFront pricing](https://aws.amazon.com/cloudfront/pricing/))
- The origin web ACL behind CloudFront is a separate Regional AWS WAF charge, priced in the worksheet as if every public request were a cache miss. ([AWS WAF pricing](https://aws.amazon.com/waf/pricing/))
- Price with normal and emergency traffic forecasts, check what each plan bundles so WAF is not counted twice, and confirm all rates before approval. ([CloudFront pricing](https://aws.amazon.com/cloudfront/pricing/))

<a id="p2-work"></a>

**What the team still owns and the approval condition**

- AWS operates CloudFront, WAF, Shield and Verified Access. ([Strategy: Access options](https://talorlik.github.io/cloud-and-web-security/index.html#dd-access))
- The team still maintains the application, the cluster and its policies, the caching and invalidation rules, the origin header secret and the administrator devices. ([Strategy: Responsibilities](https://talorlik.github.io/cloud-and-web-security/index.html#d-people))
- Approve only after the traffic model, an origin-bypass test proving that a direct connection to the load balancer is refused, and a cache-update test. ([Strategy: Gate: origin accepts only the edge](https://talorlik.github.io/cloud-and-web-security/index.html#g06))
- The surge drill with edge failover and the residency review must also justify the cost over Proposal 1. ([Strategy: Gate: surge drill](https://talorlik.github.io/cloud-and-web-security/index.html#g11))

[Back to contents](#top)

<a id="proposal-3"></a>

## Proposal 3 · Existing edge

<a id="p3-fit"></a>

**Best fit and trade-off**

- Choose this package when the existing Imperva cloud WAF, on a tier with bot management and a DDoS service-level agreement, avoids a costly migration or brings contractually valuable incident support. ([Strategy: Imperva decision](https://talorlik.github.io/cloud-and-web-security/index.html#dec-b22))
- AWS WAF at the origin and Verified Access for administrators apply exactly as in the other packages. ([Strategy: Web attack protection](https://talorlik.github.io/cloud-and-web-security/index.html#dd-waf))
- It is the architecture the strategy was written against. ([Strategy: Network protection](https://talorlik.github.io/cloud-and-web-security/index.html#d-infra))
- It is the only package where IP reputation and anonymizer filtering for the public plane happen at a layer that sees the real client. ([Strategy: Visitor reputation](https://talorlik.github.io/cloud-and-web-security/index.html#waf-12))
- Do not assume it is cheaper or more secure because it uses two vendors; obtain a written price and scope confirmation. ([Strategy: Imperva decision](https://talorlik.github.io/cloud-and-web-security/index.html#dec-b22))

<a id="p3-edge"></a>

**Public entry: Imperva as the first filter**

- Imperva’s default WAF Rules policy blocks SQL injection, cross-site scripting, illegal resource access and remote file inclusion; confirm nothing is set to Alert Only. ([Strategy: Edge attack rules](https://talorlik.github.io/cloud-and-web-security/index.html#waf-01))
- Backdoor protection stays on Auto-Quarantine, and bot access control denies bad bots while allowing good ones. ([Strategy: Backdoor protection](https://talorlik.github.io/cloud-and-web-security/index.html#waf-02))
- The DDoS detection threshold is tuned for 500,000 concurrent users so a real event does not look like an attack. ([Strategy: DDoS threshold](https://talorlik.github.io/cloud-and-web-security/index.html#waf-04))
- An Imperva ACL allow-list permits only the public methods and paths, with rate rules per path. ([Strategy: Public route allow-list](https://talorlik.github.io/cloud-and-web-security/index.html#waf-05))
- No CAPTCHA on public pages; a JavaScript challenge is used only on the position write path and only while under attack. ([Strategy: Bot control](https://talorlik.github.io/cloud-and-web-security/index.html#waf-03))
- Confirm which rules, support, traffic allowances and emergency commitments the contract actually includes. ([Strategy: Imperva decision](https://talorlik.github.io/cloud-and-web-security/index.html#dec-b22))

<a id="p3-origin"></a>

**Do not let attackers go around Imperva**

- The origin load balancer security group admits only the Imperva prefix list. ([Strategy: Origin guard](https://talorlik.github.io/cloud-and-web-security/index.html#waf-13))
- Origin mutual TLS is mandatory: the load balancer validates Imperva’s client certificate against an ALB trust store, so a direct connection is refused. ([ALB mutual TLS](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/mutual-authentication.html))
- An AWS WAF web ACL in BLOCK on the origin applies the Core, Known Bad Inputs, SQL database, Linux and Admin Protection rule groups and the exact public route allow-list. ([Strategy: Core rule set](https://talorlik.github.io/cloud-and-web-security/index.html#waf-07))
- The AWS IP reputation groups stay off at the origin, because they would only see Imperva’s addresses. ([Strategy: Visitor reputation](https://talorlik.github.io/cloud-and-web-security/index.html#waf-12))
- Origin rate-based and geo rules read Imperva’s client IP header, which is stripped if it arrives from anywhere else. ([AWS WAF forwarded IP](https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-statement-forwarded-ip-address.html))
- Any request reaching a blocked admin or device-list path at the origin alerts at P1. ([Strategy: Origin bypass alert](https://talorlik.github.io/cloud-and-web-security/index.html#al-09))

<a id="p3-location"></a>

**Visitor checks where the real visitor is visible**

- IP reputation, anonymizer and country checks happen at Imperva, because the origin sees only the proxy address. ([Strategy: Visitor reputation](https://talorlik.github.io/cloud-and-web-security/index.html#waf-12))
- Public reads are labelled by country, not blocked, so roaming visitors inside the service area still receive guidance. ([Strategy: Web attack protection](https://talorlik.github.io/cloud-and-web-security/index.html#dd-waf))
- If hard country blocking is wanted anyway, it applies only to the write path through Imperva’s ACL Block Countries, with the impact on roaming visitors recorded. ([Imperva policies](https://docs-cybersec.thalesgroup.com/bundle/cloud-application-security/page/policies.htm))
- The application validates every submitted coordinate against the service-area polygon. ([Strategy: Fake check-ins](https://talorlik.github.io/cloud-and-web-security/index.html#r07))
- Administrator location is enforced at the identity provider and in Verified Access, not at the public edge. ([Strategy: Location controls](https://talorlik.github.io/cloud-and-web-security/index.html#hc-04))

<a id="p3-admin"></a>

**Administration stays off the public edge**

- Administrators never pass through Imperva. ([Strategy: Administrator hostname](https://talorlik.github.io/cloud-and-web-security/index.html#dd-admin))
- One Verified Access HTTP endpoint fronts the internal administrator load balancer on a separate low-visibility domain. ([Strategy: Low-visibility name](https://talorlik.github.io/cloud-and-web-security/index.html#hc-09))
- The AWS WAF web ACL on the Verified Access instance uses the IP reputation and Anonymous IP lists, which work there because no proxy is in front. ([Strategy: Administrator web firewall](https://talorlik.github.io/cloud-and-web-security/index.html#hc-05))
- IAM Identity Center with mandatory MFA is the trust provider, Cedar policies grant the console per group, and sessions last eight hours. ([Strategy: Mandatory 2FA](https://talorlik.github.io/cloud-and-web-security/index.html#hc-01))
- The admin gateway verifies the signed user-context token, and the application keeps its own OIDC login and role-based authorization. ([Strategy: Application identity](https://talorlik.github.io/cloud-and-web-security/index.html#hc-08))

<a id="p3-engineering"></a>

**Engineering access without a server to maintain**

- Two Verified Access TCP endpoints serve super administrators through the Connectivity Client: a network CIDR endpoint for the EKS API on port 443 and an RDS endpoint targeting RDS Proxy. ([Strategy: Administrator access](https://talorlik.github.io/cloud-and-web-security/index.html#dd-access-rec))
- Argo CD is reached by kubectl port-forward over the EKS API. ([Strategy: Administrator access](https://talorlik.github.io/cloud-and-web-security/index.html#dd-access-rec))
- CloudShell VPC environments cover break-glass and Linux users at no additional charge. ([Strategy: Serverless break-glass](https://talorlik.github.io/cloud-and-web-security/index.html#hc-12))
- The Client VPN is removed only after two weeks of parallel running with a written rollback. ([Strategy: Access without VPN](https://talorlik.github.io/cloud-and-web-security/index.html#ch-15))

<a id="p3-internal"></a>

**Contain attacks after the public boundary**

- The private EKS endpoint, public and admin namespaces under Pod Security Admission restricted, and default-deny NetworkPolicies apply as in Proposal 1. ([Strategy: Workload identities](https://talorlik.github.io/cloud-and-web-security/index.html#dd-sa))
- Exact-match HTTPRoutes and CIS-hardened NGINX apply as well. ([Strategy: Public route allow-list](https://talorlik.github.io/cloud-and-web-security/index.html#ch-01))
- VPC endpoints for S3, ECR, STS, Secrets Manager, KMS and CloudWatch Logs plus AWS Network Firewall with a domain allow-list remove every internet path except named destinations. ([Strategy: Outbound restrictions](https://talorlik.github.io/cloud-and-web-security/index.html#ch-13))
- Mutual TLS between services through Envoy or an ambient mesh closes the plain-HTTP gap inside the cluster. ([Strategy: Internal encryption](https://talorlik.github.io/cloud-and-web-security/index.html#ch-09))

<a id="p3-permissions"></a>

**Avoid shared powerful accounts**

- One Kubernetes service account per workload maps to one IAM role through EKS Pod Identity, scoped to its own secret and key. ([Strategy: Workload identities](https://talorlik.github.io/cloud-and-web-security/index.html#dd-sa))
- No application has a Role or RoleBinding, and token mounting is off. ([Strategy: Workload identities](https://talorlik.github.io/cloud-and-web-security/index.html#dd-sa))
- Separate database logins serve the public devices service, the geometry service, the admin backend and the Flyway migration job, with a non-login owner role. ([Strategy: Database permissions](https://talorlik.github.io/cloud-and-web-security/index.html#dd-db))
- Named DBA roles use IAM authentication, and per-user secrets sit behind RDS Proxy. ([Strategy: Database permissions](https://talorlik.github.io/cloud-and-web-security/index.html#dd-db))
- The master account is reserved for break-glass, with an alert on every login. ([Strategy: Database anomaly alert](https://talorlik.github.io/cloud-and-web-security/index.html#al-16))

<a id="p3-data"></a>

**Protect personal data across both providers**

- The KMS, Secrets Manager, RDS, backup and retention controls are the same as the other packages. ([Strategy: Data protection](https://talorlik.github.io/cloud-and-web-security/index.html#d-data))
- Raw location samples are deleted 30 days after an event closes, and the device email field is removed. ([Strategy: Data retention](https://talorlik.github.io/cloud-and-web-security/index.html#ch-04))
- Imperva must deliver logs to an S3 bucket in the home Region, confirmed before go-live. ([Strategy: Imperva decision](https://talorlik.github.io/cloud-and-web-security/index.html#dec-b22))
- The supplier register records the data processing agreement, residency commitment and security clauses the contract provides. ([Strategy: Ownership and approvals](https://talorlik.github.io/cloud-and-web-security/index.html#d-foundations))
- Any Imperva log or point-of-presence data held outside the approved territory is the residency drift risk the strategy lists, and needs explicit steering committee approval. ([Strategy: Residency drift](https://talorlik.github.io/cloud-and-web-security/index.html#r18))

<a id="p3-software"></a>

**Enforce safe releases internally**

- Hardened Temurin JRE images pinned by digest through an ECR pull-through cache, non-root with no debug agent, exactly as in Proposal 1. ([Strategy: Container protection](https://talorlik.github.io/cloud-and-web-security/index.html#dd-images))
- Kyverno enforces cosign verification and a registry allow-list, and the SBOM, provenance, Trivy and Inspector gates stay. ([Strategy: Secure delivery](https://talorlik.github.io/cloud-and-web-security/index.html#d-supply))
- Weekly rebuilds and vulnerability SLAs of 7, 30 and 90 days apply. ([Strategy: Secure delivery](https://talorlik.github.io/cloud-and-web-security/index.html#d-supply))
- Pipeline SAST, dependency review, secret scanning and DAST, plus a tested Argo CD rollback, complete the release controls. ([Strategy: Application security](https://talorlik.github.io/cloud-and-web-security/index.html#d-app))

<a id="p3-response"></a>

**One response process across two vendors**

- Imperva DDoS and attack notifications, AWS findings and application audit alerts share the same tiered SNS routing. ([Strategy: Incident alerts](https://talorlik.github.io/cloud-and-web-security/index.html#dd-alerts))
- Imperva alerts are P2 and become P1 during an event or drill. ([Strategy: Edge DDoS alert](https://talorlik.github.io/cloud-and-web-security/index.html#al-10))
- Each runbook states how to contact each provider. ([Strategy: Incident alerts](https://talorlik.github.io/cloud-and-web-security/index.html#dd-alerts))
- The signed static emergency page is cached at Imperva as the origin-failover target. ([Strategy: Emergency fallback](https://talorlik.github.io/cloud-and-web-security/index.html#ch-12))
- The DDoS playbook includes Imperva escalation, AWS Shield and the event-mode scale profile, and a joint exercise with Imperva runs before each national exercise. ([Strategy: Recovery](https://talorlik.github.io/cloud-and-web-security/index.html#d-ir))

<a id="p3-cost"></a>

**Price the contract and the duplicate inspection**

- Add the quoted Imperva service and support cost to about USD 489 per month for Verified Access. ([Verified Access pricing](https://aws.amazon.com/verified-access/pricing/))
- Add the AWS WAF web ACL at the origin, which inspects every request that passes Imperva, and the common detection, logging and backup allowances. ([AWS WAF pricing](https://aws.amazon.com/waf/pricing/))
- Add the mandatory load balancer trust store for origin mutual TLS, billed at USD 0.005 per hour, about USD 3.65 per month. ([AWS documentation](https://aws.amazon.com/elasticloadbalancing/pricing/))
- Compare that total and the migration avoided against Proposals 1 and 2, including traffic overages, contract commitments and incident support. ([Strategy: Imperva decision](https://talorlik.github.io/cloud-and-web-security/index.html#dec-b22))
- Replace the worksheet’s placeholder with the actual contract figure before approval. ([Strategy: Imperva decision](https://talorlik.github.io/cloud-and-web-security/index.html#dec-b22))

<a id="p3-work"></a>

**What management must accept**

- No new connector or jump server is required. ([Strategy: Access options](https://talorlik.github.io/cloud-and-web-security/index.html#dd-access))
- The team operates the existing workloads and coordinates WAF rules, log delivery, residency evidence and incidents across AWS and Imperva. ([Strategy: Responsibilities](https://talorlik.github.io/cloud-and-web-security/index.html#d-people))
- The edge vendor sits in the supplier register with contract clauses and collected evidence. ([Strategy: Ownership and approvals](https://talorlik.github.io/cloud-and-web-security/index.html#d-foundations))
- Approve only when the contract, the tested protection including mandatory origin mutual TLS, and the migration savings justify the extra cost and coordination. ([Strategy: Gate: origin accepts only the edge](https://talorlik.github.io/cloud-and-web-security/index.html#g06))

[Back to contents](#top)

<a id="budget"></a>

## Budget worksheet

Common + one option, not all three options added together. USD; 730 hours per month; maximum 100 administrators. Rates checked 29 October 2026; confirm deployment-region prices. All fields start with editable planning estimates, not approved budgets or vendor quotes; clearing a field means not priced, not zero.

Public requests: 10 million per month (illustrative input, not a traffic forecast). WAF example: one ACL and ten billable rule entries per inspected layer, plus one million administrator requests.

<a id="budget-common"></a>

### Common

| Cost item | Monthly USD |
|---|---:|
| Account safeguards | USD 0.00 ([AWS Organizations](https://docs.aws.amazon.com/organizations/latest/userguide/pricing.html)) |
| Threat detection and security checks | USD 300.00 |
| Logs, backups and other security usage | USD 250.00 |
| Ongoing security operations | USD 1,200.00 |
| Additional identity licences | USD 300.00 ([IAM Identity Center](https://aws.amazon.com/iam/identity-center/faqs/)) |

Starting-estimate basis (these notes do not change when fields are edited):

- **Threat detection and security checks:** Planning allowance: GuardDuty 100 + Security Hub 100 + Inspector 50 + Config 50 per month; validate against actual account and workload usage.
- **Logs, backups and other security usage:** Planning allowance: logs and retention 75 + backups 125 + keys, secrets and access usage 50 per month; validate storage growth and restore costs.
- **Ongoing security operations:** Planning allowance: 12 hours per month × USD 100 for reviews, patching and routine response; assumes an existing on-call team, not new 24/7 staffing.
- **Additional identity licences:** Planning allowance: 100 administrators × USD 3 per month for any additional identity licences; not a vendor price, and removable if existing licences suffice.

Common priced subtotal: USD 2,050.00 (estimate) per month.

Shared setup and assessment, one-time: USD 8,000.00.

Planning allowance: 40 hours × USD 100 for shared controls, plus USD 4,000 for penetration testing and retesting; replace with scoped estimates.

<a id="budget-1"></a>

### Proposal 1 · Lean AWS

| Cost item | Monthly USD |
|---|---:|
| Verified Access web application | USD 197.10 ([AWS pricing](https://aws.amazon.com/verified-access/pricing/)) |
| Two technical access endpoints | USD 292.00 ([AWS pricing](https://aws.amazon.com/verified-access/pricing/)) |
| Administrator web firewall | USD 15.60 ([WAF pricing](https://aws.amazon.com/waf/pricing/)) |
| Public web firewall | USD 21.00 ([WAF pricing](https://aws.amazon.com/waf/pricing/)) |

Option-only priced subtotal: USD 525.70 (estimate) per month, before Common.

Implementation and testing, one-time: USD 2,000.00.

Planning allowance: 20 hours × USD 100 for access, firewall configuration and testing.

<a id="budget-2"></a>

### Proposal 2 · AWS edge

| Cost item | Monthly USD |
|---|---:|
| Verified Access web application | USD 197.10 ([AWS pricing](https://aws.amazon.com/verified-access/pricing/)) |
| Two technical access endpoints | USD 292.00 ([AWS pricing](https://aws.amazon.com/verified-access/pricing/)) |
| Administrator web firewall | USD 15.60 ([WAF pricing](https://aws.amazon.com/waf/pricing/)) |
| CloudFront including the edge WAF | USD 1,000.00 ([CloudFront pricing](https://aws.amazon.com/cloudfront/pricing/)) |
| AWS firewall at the origin behind CloudFront | USD 21.00 ([WAF pricing](https://aws.amazon.com/waf/pricing/)) |

Option-only priced subtotal: USD 1,525.70 (estimate) per month, before Common.

Implementation and testing, one-time: USD 3,000.00.

Planning allowance: 30 hours × USD 100 for access, edge configuration and testing.

<a id="budget-3"></a>

### Proposal 3 · Existing edge

| Cost item | Monthly USD |
|---|---:|
| Verified Access web application | USD 197.10 ([AWS pricing](https://aws.amazon.com/verified-access/pricing/)) |
| Two technical access endpoints | USD 292.00 ([AWS pricing](https://aws.amazon.com/verified-access/pricing/)) |
| Administrator web firewall | USD 15.60 ([WAF pricing](https://aws.amazon.com/waf/pricing/)) |
| AWS firewall at the public origin | USD 21.00 ([WAF pricing](https://aws.amazon.com/waf/pricing/)) |
| Origin mutual TLS trust store | USD 3.65 ([ELB pricing](https://aws.amazon.com/elasticloadbalancing/pricing/)) |
| Imperva service and support | USD 1,000.00 |

Option-only priced subtotal: USD 1,529.35 (estimate) per month, before Common.

Implementation and testing, one-time: USD 3,000.00.

Planning allowance: 30 hours × USD 100 for access, vendor integration and testing.

Planning placeholder: USD 1,000 per month for service and support, not an Imperva quote; replace with the actual contract cost.

CloudFront starts at the illustrative Premium plan, USD 1,000, because it is the lowest flat-rate plan that lists origin failover, which the edge-served emergency page needs; the USD 200 Business plan does not list it, and neither value is a confirmed fit for emergency traffic. If using pay-as-you-go, enter CDN plus edge WAF together without double counting; the origin web ACL behind CloudFront is a separate AWS WAF charge, priced as if every public request were a cache miss. Proposal 3 adds the mandatory load balancer trust store for origin mutual TLS. Data transfer out of the load balancer is excluded from every option; in Proposal 3 it covers every byte sent to Imperva, billed per gigabyte, whereas CloudFront origin fetches are free. Replace the Imperva placeholder with a contract quote before approval.

<a id="budget-total"></a>

### Decision total

Selected: Proposal 1. Monthly: USD 2,575.70 (estimate); yearly recurring: USD 30,908.40 (estimate); one-time: USD 10,000.00 (estimate).

| Common + option | Monthly | Yearly recurring | One-time |
|---|---:|---:|---:|
| Proposal 1 | USD 2,575.70 (estimate) | USD 30,908.40 (estimate) | USD 10,000.00 (estimate) |
| Proposal 2 | USD 3,575.70 (estimate) | USD 42,908.40 (estimate) | USD 11,000.00 (estimate) |
| Proposal 3 | USD 3,579.35 (estimate) | USD 42,952.20 (estimate) | USD 11,000.00 (estimate) |

First year, including Common and option setup costs:

- **Proposal 1:** USD 40,908.40 (estimate).
- **Proposal 2:** USD 53,908.40 (estimate).
- **Proposal 3:** USD 53,952.20 (estimate).

Labour uses a USD 100 hourly planning rate; routine operations assume existing on-call coverage. No contingency or separately purchased 24/7 response service is included.

Include detection, logging, backups, keys, secrets, access usage and operations in the Common allowances. Existing hosting, load balancers, cluster/database capacity, taxes and general internet delivery are excluded unless explicitly included; confirm licence, support, peak-traffic and migration costs before approval.

Prices: [Verified Access](https://aws.amazon.com/verified-access/pricing/), [AWS WAF](https://aws.amazon.com/waf/pricing/), [CloudFront](https://aws.amazon.com/cloudfront/pricing/), [Elastic Load Balancing](https://aws.amazon.com/elasticloadbalancing/pricing/), [EC2 data transfer](https://aws.amazon.com/ec2/pricing/on-demand/), [IAM Identity Center](https://aws.amazon.com/iam/identity-center/faqs/), [Organizations](https://docs.aws.amazon.com/organizations/latest/userguide/pricing.html), [GuardDuty](https://aws.amazon.com/guardduty/pricing/), [CloudWatch](https://aws.amazon.com/cloudwatch/pricing/).

[Back to contents](#top)

<a id="questions"></a>

## Questions and answers worksheet

A separate worksheet contains 50 detailed Q&As on Common controls, administrator access, the three options, internal protection and cost assumptions. Its cost answers use the saved starting estimates, not unsaved browser edits.

- [Open the worksheet](https://talorlik.github.io/cloud-and-web-security/proposal/questions.html)
- [Download the standalone Q&A Markdown](https://talorlik.github.io/cloud-and-web-security/proposal/management-qa.md)
- [Download the standalone Q&A PDF](https://talorlik.github.io/cloud-and-web-security/proposal/management-qa.pdf)
