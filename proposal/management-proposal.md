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

- **Named owners and time-limited exceptions:** Assign named owners for AWS administration, security incidents and billing, and require someone other than the author to approve production changes. ([Strategy: Ownership and approvals](https://talorlik.github.io/cloud-and-web-security/#d-foundations)) Keep a control register showing who is responsible, evidence that each control works, and an approver and expiry date for every exception. ([Strategy: Incident alerts](https://talorlik.github.io/cloud-and-web-security/#dd-alerts))

<a id="common-accounts"></a>

- **Separate accounts for production, security and recovery:** Create separate AWS accounts for management, production, development, security tools, logs and backups, keeping application workloads out of the management account. ([Strategy: Account security](https://talorlik.github.io/cloud-and-web-security/#dd-org)) Keep production data out of development and deny application roles permission to alter the separate log and backup stores, limiting the damage from a compromised application. ([Strategy: Account security](https://talorlik.github.io/cloud-and-web-security/#dd-org))

<a id="common-guardrails"></a>

- **Block dangerous account actions with SCPs:** Apply AWS Organizations service control policies (SCPs) to stop member-account administrators from disabling security monitoring, creating permanent access keys, leaving the organization or deploying outside approved regions. ([Strategy: Account security](https://talorlik.github.io/cloud-and-web-security/#dd-org)) Test narrowly defined exceptions for essential AWS services and approved security automation before enforcement, so these restrictions do not block normal operation or recovery. ([Strategy: Region safeguards](https://talorlik.github.io/cloud-and-web-security/#gp-02))

<a id="common-perimeter"></a>

- **Reject unauthorized access from outside the organization:** Use resource control policies (RCPs) to reject access to supported S3 storage, encryption keys and secrets from identities outside our AWS organization. ([Strategy: Data boundaries](https://talorlik.github.io/cloud-and-web-security/#gp-12)) Inventory external access first and explicitly allow approved partner and AWS service integrations, so legitimate log delivery and backups continue while unapproved outsiders are blocked. ([Strategy: Account security](https://talorlik.github.io/cloud-and-web-security/#dd-org))

<a id="common-defaults"></a>

- **Make storage private and encrypted by default:** Enable account-wide S3 Block Public Access and default disk encryption, and prohibit public sharing of machine images and disk snapshots. ([Strategy: Account security](https://talorlik.github.io/cloud-and-web-security/#dd-org)) Apply these settings through centrally controlled policies and repeatable Terraform configuration, so new resources receive the same protections without relying on someone remembering each setting. ([Strategy: Account security](https://talorlik.github.io/cloud-and-web-security/#dd-org))

<a id="common-identity"></a>

- **Named logins, mandatory 2FA and limited privileges:** Use IAM Identity Center for named AWS logins and require two-factor authentication for every administrator, with security keys or passkeys for the most powerful roles. ([Strategy: Identity controls](https://talorlik.github.io/cloud-and-web-security/#d-iam)) Make production access read-only by default, limit elevated AWS sessions to one hour, review permissions quarterly and remove access when someone leaves. ([Strategy: Account security](https://talorlik.github.io/cloud-and-web-security/#dd-org))

<a id="common-root"></a>

- **Protect the AWS owner accounts and emergency access:** Limit management-account access to two named administrators and protect its root user, the unrestricted account owner, with two hardware authentication keys stored separately. ([Strategy: Account security](https://talorlik.github.io/cloud-and-web-security/#dd-org)) Remove standing root credentials from member accounts through centralized root management, and maintain tested emergency identities that alert the security owner whenever used. ([Strategy: Identity controls](https://talorlik.github.io/cloud-and-web-security/#d-iam))

<a id="common-records"></a>

- **Keep a protected record of who changed what:** Use CloudTrail to record who changed AWS resources and AWS Config to record their settings, sending both to the separate log account. ([Strategy: Audit trail](https://talorlik.github.io/cloud-and-web-security/#ab-01)) Protect security logs against early deletion with S3 Object Lock, retain one year readily accessible plus six years archived, and exclude passwords and tokens. ([Strategy: Logging](https://talorlik.github.io/cloud-and-web-security/#d-detect))

<a id="common-detection"></a>

- **24/7 alerts with a 15-minute acknowledgement target:** Use GuardDuty to flag suspected attacks, Inspector to find vulnerable software, and Config with Security Hub to report unsafe settings across accounts. ([Strategy: Logging](https://talorlik.github.io/cloud-and-web-security/#d-detect)) Route suspected compromise to an on-call responder 24/7, with a 15-minute acknowledgement target and a named owner for lower-priority fixes. ([Strategy: Incident alerts](https://talorlik.github.io/cloud-and-web-security/#dd-alerts))

<a id="common-recovery"></a>

- **Keep 35 days of backups and test recovery quarterly:** Use AWS Backup for daily database snapshots retained for 35 days, with copies in the separate backup account protected against early deletion by Vault Lock. ([Strategy: Data protection](https://talorlik.github.io/cloud-and-web-security/#d-data)) Restore a backup every quarter, record the recovery time and potential data loss, and have the business approve whether those results meet the service requirements. ([Strategy: Recovery](https://talorlik.github.io/cloud-and-web-security/#d-ir))

<a id="common-delivery"></a>

- **Deploy reviewed changes without permanent access keys:** Deploy account and network changes from reviewed Terraform code through GitHub Actions, using temporary AWS credentials instead of stored access keys. ([Strategy: Deployment identity](https://talorlik.github.io/cloud-and-web-security/#ab-11)) Require a second approver for changes to account policies, network routes or administrative access, and alert security if these controls change outside the approved process. ([Strategy: Account security](https://talorlik.github.io/cloud-and-web-security/#dd-org))

<a id="common-budget"></a>

- **Alert on unexpected spending and review the full bill:** Set AWS Budgets for each account and use Cost Anomaly Detection to notify billing and security owners about unexpected spending, including possible misuse of stolen credentials. ([Strategy: Cost alerts](https://talorlik.github.io/cloud-and-web-security/#ab-10)) Review actual monthly costs against the worksheet, including logs, backups, licences and staff time; budget alerts warn people but do not automatically cap spending. ([Strategy: Cost alerts](https://talorlik.github.io/cloud-and-web-security/#ab-10))

<a id="common-approval"></a>

- **Require test results before approving launch:** Require a penetration test and retest of serious findings, a backup-restore exercise and a peak-traffic test that includes the emergency fallback page. ([Strategy: Launch tests](https://talorlik.github.io/cloud-and-web-security/#gates)) Reject launch if unauthorized users can change guidance, backups cannot be restored or the emergency fallback fails, and present management with the test evidence. ([Strategy: Launch tests](https://talorlik.github.io/cloud-and-web-security/#gates))

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

Common + one option, not all three options added together. USD; 730 hours per month; maximum 100 administrators. Rates checked 22 October 2026; confirm deployment-region prices. All fields start with editable planning estimates, not approved budgets or vendor quotes; clearing a field means not priced, not zero.

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
| CloudFront including public WAF | USD 200.00 ([CloudFront pricing](https://aws.amazon.com/cloudfront/pricing/)) |

Option-only priced subtotal: USD 704.70 (estimate) per month, before Common.

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
| Imperva service and support | USD 1,000.00 |

Option-only priced subtotal: USD 1,525.70 (estimate) per month, before Common.

Implementation and testing, one-time: USD 3,000.00.

Planning allowance: 30 hours × USD 100 for access, vendor integration and testing.

Planning placeholder: USD 1,000 per month for service and support, not an Imperva quote; replace with the actual contract cost.

CloudFront starts with an illustrative Business plan at USD 200, not a confirmed fit for emergency traffic; if using pay-as-you-go, enter CDN plus public WAF together without double counting. Replace the Imperva placeholder with a contract quote before approval.

<a id="budget-total"></a>

### Decision total

Selected: Proposal 1. Monthly: USD 2,575.70 (estimate); yearly recurring: USD 30,908.40 (estimate); one-time: USD 10,000.00 (estimate).

| Common + option | Monthly | Yearly recurring | One-time |
|---|---:|---:|---:|
| Proposal 1 | USD 2,575.70 (estimate) | USD 30,908.40 (estimate) | USD 10,000.00 (estimate) |
| Proposal 2 | USD 2,754.70 (estimate) | USD 33,056.40 (estimate) | USD 11,000.00 (estimate) |
| Proposal 3 | USD 3,575.70 (estimate) | USD 42,908.40 (estimate) | USD 11,000.00 (estimate) |

First year, including Common and option setup costs:

- **Proposal 1:** USD 40,908.40 (estimate).
- **Proposal 2:** USD 44,056.40 (estimate).
- **Proposal 3:** USD 53,908.40 (estimate).

Labour uses a USD 100 hourly planning rate; routine operations assume existing on-call coverage. No contingency or separately purchased 24/7 response service is included.

Include detection, logging, backups, keys, secrets, access usage and operations in the Common allowances. Existing hosting, load balancers, cluster/database capacity, taxes and general internet delivery are excluded unless explicitly included; confirm licence, support, peak-traffic and migration costs before approval.

Prices: [Verified Access](https://aws.amazon.com/verified-access/pricing/), [AWS WAF](https://aws.amazon.com/waf/pricing/), [CloudFront](https://aws.amazon.com/cloudfront/pricing/), [IAM Identity Center](https://aws.amazon.com/iam/identity-center/faqs/), [Organizations](https://docs.aws.amazon.com/organizations/latest/userguide/pricing.html), [GuardDuty](https://aws.amazon.com/guardduty/pricing/), [CloudWatch](https://aws.amazon.com/cloudwatch/pricing/).

[Back to contents](#top)
