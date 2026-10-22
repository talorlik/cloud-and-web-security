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

<a id="common"></a>

## Common foundation

<a id="common-decision"></a>

- **Decision and scope:** Approve the common foundation plus one of the three complete proposals below for a system with at most 100 administrators. ([Strategy: Administrator access](https://talorlik.github.io/cloud-and-web-security/#dd-access-rec)) Choose the lowest total cost that passes the security and emergency-load tests, without adding a server for the team to operate. ([Strategy: Launch tests](https://talorlik.github.io/cloud-and-web-security/#gates))

<a id="common-accounts"></a>

- **Separate production from experiments:** Use separate AWS accounts for production, development, security tools, logs and backups so a development mistake cannot easily damage the live service. ([Strategy: Account security](https://talorlik.github.io/cloud-and-web-security/#dd-org)) Keep the organization management account free of application workloads and restrict it to a very small administration team. ([Strategy: Account security](https://talorlik.github.io/cloud-and-web-security/#dd-org))

<a id="common-guardrails"></a>

- **Rules nobody can casually switch off:** Use AWS Organizations service control policies to block leaving the organization, disabling security checks and using unapproved regions. ([AWS account safeguards](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html)) Test exceptions for essential AWS services and recovery access in development before applying these restrictions to production. ([Strategy: Region safeguards](https://talorlik.github.io/cloud-and-web-security/#gp-02))

<a id="common-perimeter"></a>

- **Keep company data inside approved boundaries:** Use resource control policies to limit outside access to supported storage, encryption and secret-management services. ([AWS resource policies](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_rcps.html)) List approved partners and AWS service exceptions explicitly so the protection does not interrupt legitimate work. ([Strategy: Data boundaries](https://talorlik.github.io/cloud-and-web-security/#gp-12))

<a id="common-defaults"></a>

- **Secure settings from the start:** Block public storage, turn on disk encryption and permit only approved machine images when new resources are created. ([Strategy: Secure defaults](https://talorlik.github.io/cloud-and-web-security/#gp-15)) Use organization policies and repeatable configuration to keep these settings consistent, with reviewed exceptions for the public website. ([Strategy: Storage protection](https://talorlik.github.io/cloud-and-web-security/#ab-06))

<a id="common-identity"></a>

- **One identity per person, with two-factor sign-in:** Give every administrator a named account, require two-factor authentication and reserve security keys or passkeys for the most powerful roles. ([Strategy: Identity controls](https://talorlik.github.io/cloud-and-web-security/#d-iam)) Use short-lived access, review permissions quarterly and remove access promptly when someone leaves. ([Strategy: Mandatory 2FA](https://talorlik.github.io/cloud-and-web-security/#hc-01))

<a id="common-root"></a>

- **Protect the master keys:** Protect the management account root user with hardware authentication and remove ordinary root credentials from member accounts where centralized root management is enabled. ([AWS root guidance](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_root-user.html)) Keep an independently authenticated emergency route and test that the organization policies do not block authorized recovery tasks. ([Strategy: Root protection](https://talorlik.github.io/cloud-and-web-security/#ab-12))

<a id="common-records"></a>

- **Keep evidence that an attacker cannot quietly erase:** Send account activity and configuration history into a separate log account, with encryption and protected retention. ([Strategy: Audit trail](https://talorlik.github.io/cloud-and-web-security/#ab-01)) Record who changed security settings or sensitive guidance while keeping passwords, tokens and unnecessary personal data out of logs. ([Strategy: Logging](https://talorlik.github.io/cloud-and-web-security/#d-detect))

<a id="common-detection"></a>

- **Alerts instead of a staffed monitoring room:** Use GuardDuty and Security Hub to collect security findings, with Inspector checking vulnerable software and Config checking account settings. ([Strategy: Incident alerts](https://talorlik.github.io/cloud-and-web-security/#dd-alerts)) Page an assigned responder for likely compromise, send less urgent problems to a work queue and review routine findings weekly. ([Strategy: Threat detection](https://talorlik.github.io/cloud-and-web-security/#ab-03))

<a id="common-recovery"></a>

- **Backups that survive an account incident:** Keep protected backup copies in a separate account and limit who can delete or change them. ([Strategy: Recovery](https://talorlik.github.io/cloud-and-web-security/#d-ir)) Test restoration and approve the acceptable recovery time and data loss before launch rather than assuming a backup guarantees recovery. ([AWS backup protection](https://docs.aws.amazon.com/aws-backup/latest/devguide/vault-lock.html))

<a id="common-delivery"></a>

- **Approved changes, without stored cloud passwords:** Use reviewed infrastructure code and deployment pipelines with temporary AWS credentials rather than permanent access keys. ([Strategy: Deployment identity](https://talorlik.github.io/cloud-and-web-security/#ab-11)) Require a second person to approve high-risk account changes and alert when security controls are altered outside that process. ([Strategy: Control-change alerts](https://talorlik.github.io/cloud-and-web-security/#al-05))

<a id="common-budget"></a>

- **Make the full bill visible:** Include security-service usage, log storage, identity licences, support and implementation time in each proposal budget instead of treating the access-service price as the total. ([Strategy: Cost alerts](https://talorlik.github.io/cloud-and-web-security/#ab-10)) Set cost alerts and named owners, noting that a budget notification does not itself stop spending. ([AWS WAF pricing](https://aws.amazon.com/waf/pricing/))

<a id="common-approval"></a>

- **Evidence before approval:** Use the CIS controls and benchmarks, ISO 27001 and AWS security guidance as checklists for ownership, testing and evidence rather than as a claim of certification. ([Strategy: Security frameworks](https://talorlik.github.io/cloud-and-web-security/#frameworks)) Management should approve an option only after a penetration test, recovery exercise and peak-traffic test resolve the launch-blocking risks. ([Strategy: Launch tests](https://talorlik.github.io/cloud-and-web-security/#gates))

[Back to contents](#top)

<a id="proposal-1"></a>

## Proposal 1 · Lean AWS

<a id="p1-fit"></a>

- **Best fit and trade-off:** Choose this as the budget-first candidate when direct access through the public AWS load balancer passes the peak-traffic and security tests. ([Strategy: Network protection](https://talorlik.github.io/cloud-and-web-security/#d-infra)) It avoids an additional public edge vendor, but gives up the extra caching layer in Proposal 2 and the vendor support arrangement in Proposal 3. ([Strategy: Emergency fallback](https://talorlik.github.io/cloud-and-web-security/#ch-12))

<a id="p1-edge"></a>

- **Filter attacks at the public entrance:** Put AWS WAF on the public load balancer with managed attack rules, allowed website paths and carefully tested request limits. ([Strategy: Web attack protection](https://talorlik.github.io/cloud-and-web-security/#dd-waf)) Use the included AWS network-attack protection as a baseline, without presenting it as a guarantee against every outage or application attack. ([AWS DDoS protection](https://docs.aws.amazon.com/waf/latest/developerguide/shield-chapter.html))

<a id="p1-location"></a>

- **Keep emergency information reachable:** Do not block public guidance just because the visitor appears to be in another country, because legitimate roaming users can appear abroad. ([Strategy: Web attack protection](https://talorlik.github.io/cloud-and-web-security/#dd-waf)) Check submitted locations in the application and use stricter limits for suspicious writes rather than placing puzzles in front of emergency reading. ([Strategy: Web attack protection](https://talorlik.github.io/cloud-and-web-security/#dd-waf))

<a id="p1-admin"></a>

- **Private administrator access with two factors:** Use AWS Verified Access in front of the internal administrator load balancer and require two-factor sign-in through the chosen identity provider. ([Strategy: Mandatory 2FA](https://talorlik.github.io/cloud-and-web-security/#hc-01)) Give each administrator only the permitted application actions and validate the signed identity rather than assuming a successful sign-in grants full authority. ([Strategy: Application identity](https://talorlik.github.io/cloud-and-web-security/#hc-08))

<a id="p1-engineering"></a>

- **Technical access without a jump server:** Budget for two managed Verified Access connections for the cluster and database, with local client software only for technical administrators. ([Strategy: Administrator access](https://talorlik.github.io/cloud-and-web-security/#dd-access-rec)) Use CloudShell inside the private network as a tested alternative where browser-based command-line work is sufficient, and verify region, identity and workstation compatibility before purchase. ([AWS access client](https://docs.aws.amazon.com/verified-access/latest/ug/connectivity-client.html))

<a id="p1-internal"></a>

- **Separate public and administrative workloads:** Keep application servers and databases on private networks and allow communication only between components that actually need it. ([Strategy: Network protection](https://talorlik.github.io/cloud-and-web-security/#d-infra)) Use separate public and administrative workload groups, encrypted connections and default-deny network rules to limit the damage from a compromised component. ([Strategy: Workload identities](https://talorlik.github.io/cloud-and-web-security/#dd-sa))

<a id="p1-permissions"></a>

- **Small permissions for every component:** Give each workload its own Kubernetes service identity and AWS permissions instead of sharing a powerful account. ([Strategy: Workload identities](https://talorlik.github.io/cloud-and-web-security/#dd-sa)) Give public services, administrative services and database migrations separate database logins with only the required reading or writing rights. ([Strategy: Database permissions](https://talorlik.github.io/cloud-and-web-security/#dd-db))

<a id="p1-data"></a>

- **Protect sensitive information:** Encrypt stored data and connections, keep passwords in Secrets Manager and rotate them through an approved process. ([Strategy: Data protection](https://talorlik.github.io/cloud-and-web-security/#d-data)) Collect only the personal information needed for the service and delete or aggregate it after the approved retention period. ([Strategy: Data retention](https://talorlik.github.io/cloud-and-web-security/#ch-04))

<a id="p1-software"></a>

- **Deploy only checked software:** Use maintained minimal container images, scan them for vulnerabilities and verify the signature of each released image. ([Strategy: Container protection](https://talorlik.github.io/cloud-and-web-security/#dd-images)) Remove debugging access and privileged execution, enforce admission rules in the existing cluster and retain a tested rollback. ([Strategy: Secure delivery](https://talorlik.github.io/cloud-and-web-security/#d-supply))

<a id="p1-response"></a>

- **Detect and recover inside the application:** Send suspicious sign-ins, unexpected guidance changes and workload threats into the common alerting process, with a named responder and a short playbook. ([Strategy: Incident alerts](https://talorlik.github.io/cloud-and-web-security/#dd-alerts)) Keep a separately hosted emergency information page and test switching to it when the normal application is unavailable. ([Strategy: Emergency fallback](https://talorlik.github.io/cloud-and-web-security/#ch-12))

<a id="p1-cost"></a>

- **Cost checkpoint, not a complete quote:** At the cited example rates and 730 hours, one Verified Access web application plus two technical endpoints costs about USD 489 per month before usage and other services. ([Verified Access pricing](https://aws.amazon.com/verified-access/pricing/)) A standard WAF example with one web ACL and ten billable rule entries adds USD 15 per month plus USD 0.60 per million inspected requests, with extra features and the administrator ACL priced separately. ([AWS WAF pricing](https://aws.amazon.com/waf/pricing/))

<a id="p1-work"></a>

- **What the team still owns:** This package adds no jump server, proxy server or separate monitoring server, but the existing application and Kubernetes workloads still need maintenance. ([Strategy: Responsibilities](https://talorlik.github.io/cloud-and-web-security/#d-people)) The team remains responsible for access policies, firewall tuning, client updates, incident response and a staged migration away from the existing edge arrangement. ([Strategy: Access options](https://talorlik.github.io/cloud-and-web-security/#dd-access))

<a id="p1-gate"></a>

- **Management approval condition:** Approve this package only if the production-like traffic test shows that the public application and emergency fallback remain usable without an extra caching layer. ([Strategy: Launch tests](https://talorlik.github.io/cloud-and-web-security/#gates)) If that test fails or the overall cost model favours caching, select Proposal 2 rather than removing essential security controls to stay within budget. ([CloudFront pricing](https://aws.amazon.com/cloudfront/pricing/))

[Back to contents](#top)

<a id="proposal-2"></a>

## Proposal 2 · AWS edge

<a id="p2-fit"></a>

- **Best fit and trade-off:** Choose this when reducing public traffic reaching the application is worth an additional managed delivery layer. ([CloudFront pricing](https://aws.amazon.com/cloudfront/pricing/)) It combines CloudFront, AWS WAF and Verified Access without a self-managed proxy, but its value depends on measured traffic and what can safely be cached. ([Strategy: Access options](https://talorlik.github.io/cloud-and-web-security/#dd-access))

<a id="p2-edge"></a>

- **Stop unwanted traffic before it reaches the application:** Put CloudFront and AWS WAF in front of the public load balancer, using managed attack rules, approved routes and tested request limits. ([Strategy: Web attack protection](https://talorlik.github.io/cloud-and-web-security/#dd-waf)) Restrict the load balancer to CloudFront traffic and require a protected origin header so attackers cannot simply bypass the edge. ([AWS origin protection](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/restrict-access-to-load-balancer.md))

<a id="p2-cache"></a>

- **Cache public content, never private responses:** Cache public images, scripts and approved guidance content while keeping private responses, administration and personal location submissions out of shared caches. ([CloudFront pricing](https://aws.amazon.com/cloudfront/pricing/)) Define how quickly changed guidance becomes visible and rehearse emergency updates so caching cannot serve dangerously outdated instructions. ([Strategy: Guidance integrity](https://talorlik.github.io/cloud-and-web-security/#r01))

<a id="p2-location"></a>

- **Protect visitors without blocking legitimate help:** Keep public guidance available to roaming visitors and validate reported locations inside the application. ([Strategy: Web attack protection](https://talorlik.github.io/cloud-and-web-security/#dd-waf)) Apply stronger controls to suspicious submissions while using administrator location restrictions only as an extra check alongside mandatory two-factor authentication. ([Strategy: Location controls](https://talorlik.github.io/cloud-and-web-security/#hc-04))

<a id="p2-admin"></a>

- **Private administrator access with two factors:** Use Verified Access for the internal administrator application, with mandatory two-factor sign-in and separate permissions for each administrator group. ([Strategy: Mandatory 2FA](https://talorlik.github.io/cloud-and-web-security/#hc-01)) Verify the application identity and signed claims, keep sessions short and alert on unusual sign-ins or changes to published guidance. ([Strategy: Application identity](https://talorlik.github.io/cloud-and-web-security/#hc-08))

<a id="p2-engineering"></a>

- **No additional server for technical access:** Use managed Verified Access endpoints for the private cluster and database and install the client only on technical administrators’ supported devices. ([Strategy: Administrator access](https://talorlik.github.io/cloud-and-web-security/#dd-access-rec)) Test the chosen identity provider and retain a separately authenticated CloudShell recovery path where region availability and the required commands have been confirmed. ([AWS access client](https://docs.aws.amazon.com/verified-access/latest/ug/connectivity-client.html))

<a id="p2-internal"></a>

- **Contain an internal compromise:** Keep application workloads and databases private, separating public services from administrative services with default-deny network rules. ([Strategy: Network protection](https://talorlik.github.io/cloud-and-web-security/#d-infra)) Encrypt internal connections and allow each component to contact only its approved dependencies. ([Strategy: Internal encryption](https://talorlik.github.io/cloud-and-web-security/#ch-09))

<a id="p2-permissions"></a>

- **Separate workload and database identities:** Give each workload its own service account and narrow AWS permissions. ([Strategy: Workload identities](https://talorlik.github.io/cloud-and-web-security/#dd-sa)) Use separate database users for public services, administrators and migrations so a public-service weakness cannot inherit database-owner powers. ([Strategy: Database permissions](https://talorlik.github.io/cloud-and-web-security/#dd-db))

<a id="p2-data"></a>

- **Reduce the information at risk:** Encrypt data, keep credentials in Secrets Manager and limit access to personal information. ([Strategy: Data protection](https://talorlik.github.io/cloud-and-web-security/#d-data)) Apply approved retention and deletion rules, and verify that logs and CloudFront caches do not retain information they should not contain. ([Strategy: Data retention](https://talorlik.github.io/cloud-and-web-security/#ch-04))

<a id="p2-software"></a>

- **Keep unsafe software out:** Build from maintained minimal images, scan releases and accept only approved signed images in the existing cluster. ([Strategy: Container protection](https://talorlik.github.io/cloud-and-web-security/#dd-images)) Run applications without unnecessary privileges, remove debugging ports and preserve a tested deployment rollback. ([Strategy: Secure delivery](https://talorlik.github.io/cloud-and-web-security/#d-supply))

<a id="p2-response"></a>

- **Managed detection and a separate fallback:** Feed edge, administrator and workload incidents into the common alert-only response process instead of building a staffed monitoring room. ([Strategy: Incident alerts](https://talorlik.github.io/cloud-and-web-security/#dd-alerts)) Host the emergency page independently of the application cluster and rehearse how it stays reachable and current during an incident. ([Strategy: Emergency fallback](https://talorlik.github.io/cloud-and-web-security/#ch-12))

<a id="p2-cost"></a>

- **Compare total edge cost before buying:** Budget about USD 489 per month for the example Verified Access configuration, then compare CloudFront pay-as-you-go with eligible flat-rate plans using normal and emergency traffic forecasts. ([Verified Access pricing](https://aws.amazon.com/verified-access/pricing/)) Check which firewall features, logs and usage are included so the budget neither double-counts bundled protection nor treats the smallest plan as adequate for an emergency surge. ([CloudFront pricing](https://aws.amazon.com/cloudfront/pricing/))

<a id="p2-work"></a>

- **What the team still owns:** AWS operates the delivery and access services, but the team still maintains the existing application, cluster policies, caching rules and administrator devices. ([Strategy: Launch tests](https://talorlik.github.io/cloud-and-web-security/#gates)) Approve this package only after the traffic model, origin-bypass test, cache-update test and residency review justify its cost over Proposal 1. ([AWS origin protection](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/restrict-access-to-load-balancer.md))

[Back to contents](#top)

<a id="proposal-3"></a>

## Proposal 3 · Existing edge

<a id="p3-fit"></a>

- **Best fit and trade-off:** Choose this when retaining the existing Imperva arrangement avoids a costly migration or provides contractually valuable incident support. ([Strategy: Imperva decision](https://talorlik.github.io/cloud-and-web-security/#dec-b22)) Do not assume it is cheaper or more secure merely because it uses two vendors, and obtain a written price and service-scope confirmation. ([Strategy: Web attack protection](https://talorlik.github.io/cloud-and-web-security/#dd-waf))

<a id="p3-edge"></a>

- **Use the existing edge as the first filter:** Keep Imperva as the public entry point for web attacks, unwanted bots and traffic-flood protection under the selected service contract. ([Strategy: Web attack protection](https://talorlik.github.io/cloud-and-web-security/#dd-waf)) Confirm which rules, support services, traffic allowances and emergency response commitments are actually included rather than relying on product names or defaults. ([Strategy: Imperva decision](https://talorlik.github.io/cloud-and-web-security/#dec-b22))

<a id="p3-origin"></a>

- **Do not let attackers go around Imperva:** Restrict the public AWS load balancer to the approved Imperva paths and verify the origin connection with an approved protected mechanism. ([Strategy: Origin protection](https://talorlik.github.io/cloud-and-web-security/#ch-07)) Keep AWS WAF at the origin for application-specific routes and attack rules, but do not blindly duplicate all filtering at both layers. ([Strategy: Web attack protection](https://talorlik.github.io/cloud-and-web-security/#dd-waf))

<a id="p3-location"></a>

- **Apply visitor checks where the real visitor is visible:** Use Imperva for public client reputation and location checks because the origin otherwise sees the proxy address. ([Strategy: Visitor reputation](https://talorlik.github.io/cloud-and-web-security/#waf-12)) Keep public emergency reading open to legitimate roaming users and validate submitted locations inside the application. ([Strategy: Web attack protection](https://talorlik.github.io/cloud-and-web-security/#dd-waf))

<a id="p3-admin"></a>

- **Keep administration separate from the public edge:** Use Verified Access with mandatory two-factor authentication in front of the internal administrator application rather than exposing the console through the public website. ([Strategy: Mandatory 2FA](https://talorlik.github.io/cloud-and-web-security/#hc-01)) Give each administrator group only its own actions and validate signed identity claims in the application. ([Strategy: Application identity](https://talorlik.github.io/cloud-and-web-security/#hc-08))

<a id="p3-engineering"></a>

- **Technical access without a server to maintain:** Use two managed Verified Access endpoints for cluster and database access, with client software only for the technical administrators who need it. ([Strategy: Administrator access](https://talorlik.github.io/cloud-and-web-security/#dd-access-rec)) Validate identity-provider and workstation compatibility, and rehearse CloudShell recovery with independently protected emergency credentials. ([AWS access client](https://docs.aws.amazon.com/verified-access/latest/ug/connectivity-client.html))

<a id="p3-internal"></a>

- **Contain attacks after the public boundary:** Keep workloads and databases private and separate public services from administrative services with narrow network permissions. ([Strategy: Network protection](https://talorlik.github.io/cloud-and-web-security/#d-infra)) Encrypt internal traffic and block unnecessary outbound communication so an infected component has fewer places to reach. ([Strategy: Outbound restrictions](https://talorlik.github.io/cloud-and-web-security/#ch-13))

<a id="p3-permissions"></a>

- **Avoid shared powerful accounts:** Use one Kubernetes identity and narrow AWS permissions per workload. ([Strategy: Workload identities](https://talorlik.github.io/cloud-and-web-security/#dd-sa)) Use different database logins for public services, administration and migrations, with the database-owner account kept out of normal application use. ([Strategy: Database permissions](https://talorlik.github.io/cloud-and-web-security/#dd-db))

<a id="p3-data"></a>

- **Protect personal data across both providers:** Encrypt data, store credentials securely and apply approved retention limits to the application and its logs. ([Strategy: Data protection](https://talorlik.github.io/cloud-and-web-security/#d-data)) Review where Imperva processes traffic and stores logs, and approve the required privacy terms and regional exceptions before deployment. ([Strategy: Residency](https://talorlik.github.io/cloud-and-web-security/#dec-b6))

<a id="p3-software"></a>

- **Enforce safe releases internally:** Use maintained minimal images, vulnerability checks, signed releases and admission rules in the existing cluster. ([Strategy: Container protection](https://talorlik.github.io/cloud-and-web-security/#dd-images)) Remove privileged execution and debugging access while retaining a tested rollback for application changes. ([Strategy: Secure delivery](https://talorlik.github.io/cloud-and-web-security/#d-supply))

<a id="p3-response"></a>

- **One response process across two vendors:** Send Imperva, AWS and application alerts to the same assigned responders with clear instructions for contacting each provider. ([Strategy: Incident alerts](https://talorlik.github.io/cloud-and-web-security/#dd-alerts)) Test a separately hosted emergency page and a joint incident exercise so a provider hand-off does not delay recovery. ([Strategy: Emergency fallback](https://talorlik.github.io/cloud-and-web-security/#ch-12))

<a id="p3-cost"></a>

- **Price the contract and the duplicate inspection:** Add the quoted Imperva service and support costs to the example USD 489 monthly Verified Access configuration and the selected AWS firewall, logging and detection charges. ([Strategy: Imperva decision](https://talorlik.github.io/cloud-and-web-security/#dec-b22)) Compare that total and the migration avoided against Proposals 1 and 2, including traffic overages, contract commitments and incident support. ([Verified Access pricing](https://aws.amazon.com/verified-access/pricing/))

<a id="p3-work"></a>

- **What management must accept:** No new self-managed connector or jump server is required, but the team still operates the existing workloads and coordinates policies and incidents across AWS and Imperva. ([Strategy: Web attack protection](https://talorlik.github.io/cloud-and-web-security/#dd-waf)) Approve this package only when the contract, tested protection and migration savings justify that additional cost and coordination. ([Strategy: Responsibilities](https://talorlik.github.io/cloud-and-web-security/#d-people))

[Back to contents](#top)

<a id="budget"></a>

## Budget worksheet

Common + one option, not all three options added together. USD; 730 hours per month; maximum 100 administrators. Rates checked 22 October 2026; confirm deployment-region prices. Blank amounts mean not priced, not zero.

Public requests: 10 million per month (illustrative input, not a traffic forecast). WAF example: one ACL and ten billable rule entries per inspected layer, plus one million administrator requests.

<a id="budget-common"></a>

### Common

| Cost item | Monthly USD |
|---|---:|
| Account safeguards | USD 0.00 ([AWS Organizations](https://docs.aws.amazon.com/organizations/latest/userguide/pricing.html)) |
| Threat detection and security checks | Not priced |
| Logs, backups and other security usage | Not priced |
| Ongoing security operations | Not priced |
| Additional identity licences | USD 0.00 ([IAM Identity Center](https://aws.amazon.com/iam/identity-center/faqs/)) |

Common priced subtotal: USD 0.00 + unpriced items per month.

Shared setup and assessment, one-time: Not priced.

<a id="budget-1"></a>

### Proposal 1 · Lean AWS

| Cost item | Monthly USD |
|---|---:|
| Verified Access web application | USD 197.10 ([AWS pricing](https://aws.amazon.com/verified-access/pricing/)) |
| Two technical access endpoints | USD 292.00 ([AWS pricing](https://aws.amazon.com/verified-access/pricing/)) |
| Administrator web firewall | USD 15.60 ([WAF pricing](https://aws.amazon.com/waf/pricing/)) |
| Public web firewall | USD 21.00 ([WAF pricing](https://aws.amazon.com/waf/pricing/)) |

Option-only priced subtotal: USD 525.70 (estimate) per month, before Common.

Implementation and testing, one-time: Not priced.

<a id="budget-2"></a>

### Proposal 2 · AWS edge

| Cost item | Monthly USD |
|---|---:|
| Verified Access web application | USD 197.10 ([AWS pricing](https://aws.amazon.com/verified-access/pricing/)) |
| Two technical access endpoints | USD 292.00 ([AWS pricing](https://aws.amazon.com/verified-access/pricing/)) |
| Administrator web firewall | USD 15.60 ([WAF pricing](https://aws.amazon.com/waf/pricing/)) |
| CloudFront including public WAF | USD 200.00 ([CloudFront pricing](https://aws.amazon.com/cloudfront/pricing/)) |

Option-only priced subtotal: USD 704.70 (estimate) per month, before Common.

Implementation and testing, one-time: Not priced.

<a id="budget-3"></a>

### Proposal 3 · Existing edge

| Cost item | Monthly USD |
|---|---:|
| Verified Access web application | USD 197.10 ([AWS pricing](https://aws.amazon.com/verified-access/pricing/)) |
| Two technical access endpoints | USD 292.00 ([AWS pricing](https://aws.amazon.com/verified-access/pricing/)) |
| Administrator web firewall | USD 15.60 ([WAF pricing](https://aws.amazon.com/waf/pricing/)) |
| AWS firewall at the public origin | USD 21.00 ([WAF pricing](https://aws.amazon.com/waf/pricing/)) |
| Imperva service and support | Not priced |

Option-only priced subtotal: USD 525.70 + unpriced items per month, before Common.

Implementation and testing, one-time: Not priced.

CloudFront starts with an illustrative Business plan at USD 200, not a confirmed fit for emergency traffic; if using pay-as-you-go, enter CDN plus public WAF together without double counting. The Imperva price must come from a quote.

<a id="budget-total"></a>

### Decision total

Selected: Proposal 1. Monthly: USD 525.70 + unpriced items; yearly recurring: USD 6,308.40 + unpriced items; one-time: USD 0.00 + unpriced items.

| Common + option | Monthly | Yearly recurring | One-time |
|---|---:|---:|---:|
| Proposal 1 | USD 525.70 + unpriced items | USD 6,308.40 + unpriced items | USD 0.00 + unpriced items |
| Proposal 2 | USD 704.70 + unpriced items | USD 8,456.40 + unpriced items | USD 0.00 + unpriced items |
| Proposal 3 | USD 525.70 + unpriced items | USD 6,308.40 + unpriced items | USD 0.00 + unpriced items |

Include detection, logging, backups, keys, secrets, access usage and operations in the Common allowances. Existing hosting, load balancers, cluster/database capacity, taxes and general internet delivery are excluded unless explicitly included; confirm licence, support, peak-traffic and migration costs before approval.

Prices: [Verified Access](https://aws.amazon.com/verified-access/pricing/), [AWS WAF](https://aws.amazon.com/waf/pricing/), [CloudFront](https://aws.amazon.com/cloudfront/pricing/), [IAM Identity Center](https://aws.amazon.com/iam/identity-center/faqs/), [Organizations](https://docs.aws.amazon.com/organizations/latest/userguide/pricing.html), [GuardDuty](https://aws.amazon.com/guardduty/pricing/), [CloudWatch](https://aws.amazon.com/cloudwatch/pricing/).

[Back to contents](#top)
