# Cloud and Web Security Strategy

An interactive security strategy for a public alerting-system website and its AWS account. It is aligned to CIS Controls v8.1, CIS Benchmarks, ISO/IEC 27001:2022 and the AWS Well-Architected Security Pillar.

**Live site:** https://talorlik.github.io/cloud-and-web-security/

## Contents

- `index.html`: the interactive site, with sidebar navigation, search (Ctrl K), filterable risk and control tables, and a go-live checklist
- `security-strategy.pdf`: the full document as a PDF, with bookmarks and working internal links
- `security-strategy.md`: the full document as Markdown, with anchored internal links and a Mermaid diagram
- `styles.css`, `app.js`, `data.js`: the site's assets (static, with no build step)

## Public edition

This is a generalized edition, generated from a private specific edition. Account, network and repository identifiers are placeholders (`ACCOUNT_ID`, `PRD_VPC_CIDR`, `DEV_VPC_CIDR`, `ORG_ID`, `REPO_ID`). Organization names are generic ("platform team", `CPA` for civil protection authority, `EMS`). The system is described as an alerting system, the Region is shown as `us-east-1`, and privacy requirements use the GDPR as the global baseline.

## Hosting

GitHub Pages serves the site from the `main` branch, root directory (`/`). `.nojekyll` turns off Jekyll processing so the Markdown export is served as a raw file.
