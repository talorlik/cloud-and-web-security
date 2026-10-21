# AGENTS.md — cloud-and-web-security (public, generated)

Instructions for any AI agent or model working with this repository. Read them before changing anything.

## 1. What this repo is

This repo holds the **general (public) edition** of a security strategy for a public alerting-system website and its AWS account. The strategy is aligned to CIS Controls v8.1, CIS Benchmarks, ISO/IEC 27001:2022, the AWS Well-Architected Security Pillar, and the GDPR (with ISO/IEC 27701:2025) as the privacy baseline.

GitHub Pages serves it from the `main` branch, root directory (`/`): https://talorlik.github.io/cloud-and-web-security/

## 2. This repo is generated. Do not edit it here

- A CI workflow in a separate **private** source repository produces every file in this repo. That workflow builds the content, verifies all links, runs a leak check, and then pushes here.
- **On each publish, the workflow deletes everything here except `.git` and replaces it.** Direct commits, PRs or edits here will be overwritten and lost.
- Commits here are made by `github-actions[bot]` with the message `Publish public edition (build N)`. History was reset to a clean start on 2026-10-21. Don't rewrite it.
- **To change content:** make the change in the private source repo (owner access needed), then push there. If you only have access to this repo, describe the change for the owner instead of editing files.

## 3. Hard rules

1. **Never add real identifiers or specifics.** That includes real account IDs, CIDR ranges, GitHub org or repo IDs, organization or vendor names, the real system type, or a country-specific legal regime. This edition is deliberately general.
2. **Placeholders are intentional.** Don't "fix" them:

   | Placeholder | Meaning |
   | --- | --- |
   | `ACCOUNT_ID` | The AWS account ID |
   | `PRD_VPC_CIDR`, `DEV_VPC_CIDR` | The VPC address ranges for prd and dev |
   | `ORG_ID`, `REPO_ID` | GitHub numeric IDs used in the OIDC `sub` claim |
   | `us-east-1` | Representative Region |
   | "platform team" | The organization operating the platform |
   | `CPA` | Civil protection authority (the client) |
   | `EMS` | Emergency medical services |

3. **Don't remove `.nojekyll`.** Without it, Pages runs Jekyll and serves `security-strategy.md` as a rendered page instead of the raw file the Export Markdown button downloads.
4. **Don't change the Pages source** (it must stay `main`, `/`), the deploy keys, or the repo visibility.

## 4. Files

| File | What it is |
| --- | --- |
| `index.html` | Single-page site with 13 sections: summary, scope, frameworks, threats, risks, principles, domains, changes, matrix, roadmap, metrics, decisions, references |
| `data.js` | `window.CONTROLS`: 35 strategic controls (`SC-01`..`SC-35`), each mapped to its WA area, CIS Controls v8.1, CIS Benchmark and ISO 27001 Annex A |
| `app.js` | Sidebar TOC with scrollspy, search palette (Ctrl K or `/`), table filters, risk heat map, go-live gate checklist, light/dark theme, and the export buttons |
| `styles.css` | Design tokens, layout and components, plus `@media print` rules used to make the PDF |
| `security-strategy.pdf` | Full document: A4, bookmarks, and working internal links (contents, risk, change and control IDs) |
| `security-strategy.md` | Full document in GitHub-flavoured Markdown: explicit `<a id>` anchors for internal links, a GFM table for each data table, a task list for gates, and a Mermaid diagram |
| `README.md` | Short human-facing overview |
| `.nojekyll` | Turns off Jekyll on Pages |

The site is static, with no build step and no dependencies apart from web fonts loaded from Fontshare and Google Fonts. `index.html` loads its assets with a `?v=N` cache-busting query.

## 5. Reading and using the content

- **Stable ids** you can link to (they are kept the same between publishes):
  - Sections: `#summary`, `#scope`, `#frameworks`, `#threats`, `#risks`, `#principles`, `#domains`, `#changes`, `#matrix`, `#roadmap`, `#metrics`, `#decisions`, `#references`
  - Risks: `#r01`–`#r20`
  - Required changes: `#ch-01`–`#ch-14`
  - Controls: `#sc-01`–`#sc-35`
  - Go-live gates: `#g01`–`#g12`
  - Principles: `#p1`–`#p7`
  - Decisions: `#dec-b3a`, `#dec-b3b`, `#dec-b6`, `#dec-b11`, `#dec-b12`, `#dec-b22`, `#dec-b25`, `#dec-c21`, `#dec-c17`, `#dec-gates`
- **Reference codes** in the text come from the project's own documents:
  - D-xx: accepted decisions.
  - B-xx: open decisions.
  - C-xx and F-xx: application findings.
  - 9.1.x and 12.x.x: project task numbers.
- **Machine-readable data:** use `security-strategy.md` for text, and `data.js` (a JSON-like array) for the control mapping. The Markdown is the easiest source to parse. Each table row starts with `<a id="..."></a>ID`.
- **Citations:** external claims link inline to their source, and `#references` lists every source with its full URL.

## 6. Previewing locally

```bash
python3 -m http.server 8000   # then open http://localhost:8000/
```

The export buttons fetch `security-strategy.pdf` and `security-strategy.md` over HTTP. Opened from `file://`, they fall back: the PDF button opens the print dialog, and the Markdown button opens the file in a new tab.

## 7. If you find a problem

Report it as a GitHub issue on this repo, or tell the owner. Include the section id or row id (for example `#ch-03` or `#sc-21`), what is wrong, and a suggested fix. Don't commit fixes here, because the next publish overwrites them.
