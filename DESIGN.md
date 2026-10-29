# Security documents: design and theme specification

This document describes the shared visual language and the current implementation of the Security Strategy and Management Proposal. Both are document-first interfaces: readable content, clear evidence, restrained color and practical navigation, rather than an application dashboard.

## Common

### Scope and source of truth

- **Security Strategy:** `site/index.html`, `site/styles.css`, `site/app.js` and `site/data.js` define the detailed document, controls and interactions.
- **Management Proposal:** `proposal/content.mjs`, `proposal/styles.css`, `proposal/app.js` and `proposal/budget.js` define the short proposal and editable budget; `proposal-build/build.mjs` generates its HTML and exports.
- **Design specification:** This root `DESIGN.md` is the canonical downloadable document. Both interfaces follow the Security Strategy visual system; document-specific content layouts remain appropriate to their different reading tasks.
- **Shared toolbar:** `shared-ui/toolbar.mjs` and `shared-ui/toolbar.css` are the single source for header markup, icons and styling. Each builder outputs its own local copy, preventing the two headers from drifting apart.
- **Publishing:** Each security document retains its own build and exports. A separate design-only workflow publishes `DESIGN.md` without rebuilding either PDF, and both document toolbars download that same file.
- **Shared changes:** Editing `shared-ui/` intentionally rebuilds both documents because both consume it. Editing strategy-only or proposal-only content still runs only that document's workflow.

### Visual direction

- **Character:** Quiet, technical and editorial, with dark blue-green accents, serif display headings and sans-serif body text. Emphasize decisions and evidence rather than decoration.
- **Hierarchy:** Document identity, section label, section heading, item title, explanation, then supporting citations. Use small uppercase labels sparingly and keep descriptive text in sentence case.
- **Density:** Long-form prose receives comfortable line spacing and bounded reading widths. Tables are intentionally denser and scroll horizontally instead of shrinking beyond readability.
- **Geometry:** Use fine one-pixel dividers, small rounded controls and restrained panel backgrounds. Reserve pill shapes for labels and status badges, not every container.
- **Color semantics:** Blue-green identifies links, selection and primary actions; red, amber, green and purple are reserved for risk or control status. Status must also have a readable label, never color alone.

### Document structure

| Layer | Security Strategy | Management Proposal |
|---|---|---|
| Header | Sticky brand; mobile menu, Search, Theme, Design, Export Markdown and Export PDF | Same controls, icons, order, sizing, labels and theme styling |
| Navigation | Document switcher and nested, scroll-tracked contents | Document switcher, section contents and item search |
| Opening | Dark hero, concise summary, key metrics and framework labels | Editorial cover, short introduction and constraint badges |
| Body | Executive summary, scope, frameworks, threats, risks, principles, security domains, deep dives, changes, control matrix, roadmap, metrics, decisions and references | Common foundation, three complete proposals, then a budget worksheet |
| Components | Tables, cards, callouts, architecture diagram, risk heat map, filters, disclosure panels and launch checklist | Numbered two-sentence items, inline citations and editable budget tables |
| Footer | Document metadata and export information | Edition and pricing-assumption note |

- **Stable anchors:** Preserve section and item IDs so direct links, search results and citations continue to work. A strategy citation from the proposal carries a return link to its originating item.
- **External navigation:** External citations open a new tab with `noopener noreferrer`. Document-to-document navigation remains in the same tab.
- **Edition-aware internal sources:** Strategy, proposal, budget, Q&A and comparison source links must stay inside the preview when viewed in preview; only the GitHub-deployed edition uses the public GitHub Pages base URL. Q&A and comparison evidence may open a new tab, but it still uses the same edition.
- **Standalone proposal pages:** The Q&A worksheet and the Proposal 2 vs 3 comparison reuse the proposal shell: the same header, sidebar, cover, tokens and print rules, plus a page-specific stylesheet for their own components (Q&A cards; comparison tables, finding cards, status pills and inline SVG flow diagrams coloured from the status pairs below).
- **Separation:** Neither security document includes the other in its PDF or Markdown export. The design download is separate from both exports.

### Typography

| Role | Security Strategy | Management Proposal |
|---|---|---|
| Display | Zodiak, Georgia, serif | Same |
| Body and controls | General Sans, Inter, system-ui, sans-serif | Same |
| Code and identifiers | JetBrains Mono, ui-monospace, monospace | Same for item numbers and keyboard hints |
| Font loading | Zodiak and General Sans from Fontshare; JetBrains Mono from Google Fonts | Same providers and font weights |
| Body scale | Fluid 16–17px equivalent at a 16px root, line-height 1.62 | 16px base, line-height 1.62; item paragraphs use 1.75 |
| Document title | Fluid 36–64px equivalent; weight 500, line-height 1.05 | Fluid 30–48px; weight 400, line-height 1.23; 32px at the mobile breakpoint |
| Section heading | Fluid 24–34px equivalent, serif, weight 500 | 27px serif, line-height 1.4; 24px on mobile |
| Item/subheading | Fluid 18–22px equivalent, weight 600 | 18px, line-height 1.35; 17px on mobile |
| Supporting text | Fluid 12–14px and 14–16px scales | Usually 12–14px; section labels 12px, sidebar labels 11px |

- **Fallbacks:** Preserve the named fallback stacks so a blocked font provider does not make text disappear. Do not assume that identical font sizes create identical line breaks across fallback fonts.
- **Line length:** Strategy paragraphs are capped around 72 characters and list items around 70; its primary content width token is 880px. Proposal item paragraphs are capped at 880px, with narrower limits for titles and introductory text.
- **Weight and spacing:** Use 400 for normal copy, 500–600 for strategy emphasis, and 600–700 for proposal controls and labels. Strategy labels use about `0.08em` tracking; proposal section labels use `0.13em`.

### Layout and responsiveness

| Property | Security Strategy | Management Proposal |
|---|---|---|
| Desktop columns | 288px sidebar + flexible main | Same |
| Header | 64px high; translucent page-colored backdrop with 10px blur | Same, from the shared stylesheet |
| Sidebar | Sticky below header; independently scrollable | Same 64px offset and remaining viewport height |
| Main spacing | Horizontal padding fluid from 24px to 64px; sections 64px vertically | Main padding 42px 56px 72px; sections 45px top / 15px bottom |
| Intermediate width | At 1200px, search and download actions use compact icons; at 1100px, three-column cards become two columns and complex comparisons stack | Same toolbar breakpoint; at 1050px, main padding becomes 30px |
| Mobile navigation | At 900px, sidebar becomes a sliding drawer, maximum 320px / 86vw | At 900px, sidebar becomes a drawer with the same width and top offset |
| Small-screen layout | At 640px, card grids stack, brand text hides and header padding reduces | Same header breakpoint; at 760px, main padding becomes 25px 22px |
| Table overflow | Scroll within the table wrapper | Budget tables have a 590px minimum width and scroll within their wrapper |

- **Spacing scale:** Strategy uses 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80 and 96px-equivalent spacing tokens. Proposal uses explicit spacing values with the same broad rhythm, not the same variable names.
- **Radii:** Strategy uses 6px, 8px and 12px corners, plus fully rounded badges. Proposal uses mostly 3–7px corners, with 6px buttons and 7px budget panels.
- **Layering:** Both headers use z-index 40 and mobile navigation uses 50. Proposal status messages remain at 20.
- **Responsive controls:** Both headers hide search and download labels at 1200px and below while retaining accessible names. Both show the menu below 900px and hide brand text below 640px.
- **Narrow phones:** At 360px and below, toolbar gaps reduce to 4px and side padding to 8px so all controls remain available without horizontal scrolling.

### Components and interactions

- **Theme control:** An 18px inline SVG inside a 40px-high button, with a 24×24 viewBox and a 2px `currentColor` stroke. Show the moon in light mode and the sun in dark mode: the icon always indicates the theme the next click will activate.
- **Accessible theme name:** Use “Switch to dark theme” in light mode and “Switch to light theme” in dark mode, in both `aria-label` and tooltip. SVGs are decorative with `aria-hidden="true"` and `focusable="false"`; the button remains keyboard operable.
- **Theme lifetime:** Both documents open in light mode. The selection stays in the current page only; it is not persisted in browser storage and is not automatically inherited across document navigation.
- **Design download:** A document-outline icon with a “Design” label where space allows, an accessible name of “Download design theme document” and a `DESIGN.md` filename. Fetch the static file and download a Blob; show a visible status message if retrieval fails.
- **PDF download:** A folded document outline with vector “PDF” lettering, not a generic download arrow. The proposal retains this icon when edited budget values change the label to “Print PDF”; reset restores “Export PDF” without removing the icon.
- **Markdown download:** The same boxed Markdown mark and “Export Markdown” label in both headers. Search uses the same magnifier and focuses the relevant document search; on a small screen it opens that document's navigation.
- **Buttons:** Primary actions use the accent fill; secondary actions use a border and neutral surface. Hover changes border or text emphasis without moving the control or hiding its label.
- **Links and citations:** Accent-colored, with underlines offset by 3px. Proposal citation text is 12px on screen and wraps rather than being clipped.
- **Strategy panels:** Cards use a neutral surface, divider border and 12px radius; callouts use a 4px accent edge. Risk and control badges pair the semantic foreground with its matching tinted background.
- **Strategy tables:** Cells use 12px 16px padding, top alignment and row dividers. Headers are compact uppercase labels with sticky positioning; narrow identifier columns use monospace.
- **Proposal items:** Numbered independently per section with a leading-zero counter, an accent number, a top divider and a left text indent of 50px on desktop / 34px on mobile. A linked target receives a soft accent highlight.
- **Budget tables:** Three columns identify the item, editable monthly amount and pricing basis; comparison tables separate recurring and one-time amounts. Use 14px table text and 12px cell padding on screen.
- **Budget inputs:** Neutral backgrounds, visible borders and 4px corners; minimum numeric value zero. Initial values are planning estimates, clearing a value marks totals partial, and reset restores the estimates.
- **Feedback:** Search exposes a matching-item count or a zero-result state; budget totals recalculate visibly; downloads announce their status. Do not substitute an invisible console message for user feedback.

### Accessibility and motion

- **Keyboard use:** Keep semantic buttons, links, labels and table headers. Preserve navigation expansion state, Ctrl/Cmd+K search, Escape dismissal and visible keyboard focus.
- **Focus:** Strategy uses a 2px accent outline with 3px offset; proposal uses a 3px accent outline with 3px offset. Never remove the outline without an equally visible replacement.
- **Icon targets:** Both documents use 40×40px menu/theme controls, 18px menu/theme icons and 16px search/export icons. Keep sufficient gaps between neighboring controls.
- **Readability:** Use normal or muted text tokens for meaningful small text; faint tokens are decorative or low-priority, not a substitute for readable labels. Some legacy semantic colors require contrast review at small sizes: this document is not a blanket accessibility certification.
- **Motion:** Both documents use smooth anchor scrolling unless reduced motion is requested. Strategy adds short 180ms hover transitions and a 250ms drawer transition; reduced-motion rules disable animation and transitions.
- **Error styling:** Proposal invalid number fields use a `#b7392e` outline in addition to browser validity behavior. An error must still be understandable from the input and visible feedback, not color alone.

### Print and exports

- **Print theme:** Print/PDF uses the light palette and white paper regardless of the active screen theme. The pre-print screen theme is restored afterward.
- **Hidden controls:** Headers, sidebars, search/filter controls and status messages are excluded from print. Contents links and document anchors remain available.
- **Strategy PDF:** A4 with 16mm top, 14mm sides and 18mm bottom margins; the first-page hero has zero page margin and a full-page dark treatment. Subsequent sections use print-friendly layout, and the mapping matrix receives special narrow-column formatting.
- **Proposal PDF:** A4 with 16mm top, 15mm sides and 18mm bottom margins; a serif cover and contents lead into the sections. Items avoid page splits; budget inputs become printed values.
- **Proposal values:** Unchanged budgets download the prebuilt PDF; edited budgets use the browser print dialog to include the current values. Markdown exports also capture current worksheet values.
- **Markdown:** Retains hierarchy, tables, citations and explicit anchors, but does not embed the screen color theme. `DESIGN.md` is downloaded separately and is not appended to either security document.
- **Export source links:** Proposal, Q&A and comparison toolbar exports rebase internal Markdown links and PDF URI annotations to the current hosting environment. Preview downloads therefore retain preview source links and require access to that preview; General exports use GitHub Pages. Raw Specific files use sibling-relative links without embedding preview tokens or public-edition fallback URLs.

## Light

### Palette and roles

Light mode uses a warm gray-green page with dark blue-green text and white or near-white reading surfaces. It is the initial theme and the basis of the print presentation.

| Role | Strategy token | Strategy value | Proposal token | Proposal value |
|---|---|---|---|---|
| Page | `--color-bg` | `#f4f5f2` | `--bg` | `#f4f5f2` |
| Reading surface | `--color-surface` | `#fbfbf9` | `--surface` | `#fbfbf9` |
| Raised/input surface | `--color-surface-2` | `#ffffff` | Header `--ui-surface` | `#ffffff` |
| Offset surface | `--color-surface-offset` | `#eceee9` | No direct equivalent | Use surface or soft panel |
| Divider | `--color-divider` | `#dde0da` | `--line` | `#dde0da` |
| Control border | `--color-border` | `#cfd3cc` | Header `--ui-border` | `#cfd3cc` |
| Main text | `--color-text` | `#13222b` | `--text` | `#13222b` |
| Secondary text | `--color-text-muted` | `#56636b` | `--muted` | `#56636b` |
| Faint detail | `--color-text-faint` | `#8f9a9f` | No equivalent | Use muted text |
| Accent/link | `--color-primary` | `#0b5a73` | `--accent` | `#0b5a73` |
| Accent hover | `--color-primary-hover` | `#08465a` | Header `--ui-hover` | `#08465a` |
| Selected/soft panel | `--color-primary-highlight` | `#d4e5ea` | `--soft` | `#d4e5ea` |
| Primary-button text | `--color-text-inverse` | `#f4f7f6` | Header `--ui-inverse` | `#f4f7f6` |
| Deep hero | `--color-deep` | `#0c2633` | No equivalent | Cover remains page-colored |

### Risk and status colors

These semantic pairs are used by the strategy; the proposal does not define a separate status-token palette. Keep the status names visible alongside the colors.

| Meaning | Foreground | Background |
|---|---|---|
| Critical risk / Gap | `#b4321f` | `#f6dcd5` |
| High risk | `#b2620a` | `#f4e3cc` |
| Medium risk | `#8a7307` | `#efe8c8` |
| Low risk | `#4c6470` | `#dfe6e8` |
| Live control | `#2f6b2a` | `#dbe8d6` |
| Designed control | `#0b5a73` | `#d4e5ea` |
| Change required | `#7a3f9b` | `#e8dcef` |

### Surface treatment

- **Shadows:** Strategy small shadow is `0 1px 2px rgba(12,38,51,.06)`, medium is `0 6px 20px rgba(12,38,51,.08)` and large is `0 24px 60px rgba(12,38,51,.18)`. Proposal relies mainly on borders instead of an elevation scale.
- **Hero exception:** The strategy hero remains dark in light mode, using pale headline/body text (`#e8f0f1` / `#c1d3d8`) and a blue-green eyebrow (`#8fc6d6`). Do not recolor this region white simply because the page is light.
- **Theme icon:** Render a moon using the surrounding text color. Its label and tooltip invite the user to switch to dark mode.

## Dark

### Palette and roles

Dark mode uses near-black blue-green pages with lighter raised surfaces, pale text and brighter accents. Preserve all layout, typography, hierarchy and content; change the palette rather than creating a second layout.

| Role | Strategy token | Strategy value | Proposal token | Proposal value |
|---|---|---|---|---|
| Page | `--color-bg` | `#0b161c` | `--bg` | `#0b161c` |
| Reading surface | `--color-surface` | `#0f1d24` | `--surface` | `#0f1d24` |
| Raised/input surface | `--color-surface-2` | `#12232b` | Header `--ui-surface` | `#12232b` |
| Offset surface | `--color-surface-offset` | `#16282f` | No direct equivalent | Use surface or soft panel |
| Divider | `--color-divider` | `#1f343d` | `--line` | `#1f343d` |
| Control border | `--color-border` | `#2a424c` | Header `--ui-border` | `#2a424c` |
| Main text | `--color-text` | `#dbe5e7` | `--text` | `#dbe5e7` |
| Secondary text | `--color-text-muted` | `#94a6ad` | `--muted` | `#94a6ad` |
| Faint detail | `--color-text-faint` | `#5f7279` | No equivalent | Use muted text |
| Accent/link | `--color-primary` | `#5fb3cc` | `--accent` | `#5fb3cc` |
| Accent hover | `--color-primary-hover` | `#86c8db` | Header `--ui-hover` | `#86c8db` |
| Selected/soft panel | `--color-primary-highlight` | `#163a47` | `--soft` | `#163a47` |
| Primary-button text | `--color-text-inverse` | `#0b161c` | Header `--ui-inverse` | `#0b161c` |
| Deep hero | `--color-deep` | `#061015` | No equivalent | Cover remains page-colored |

### Risk and status colors

Use light semantic text against deep tinted backgrounds, not the saturated light-mode foreground values. The same risk and status words remain visible.

| Meaning | Foreground | Background |
|---|---|---|
| Critical risk / Gap | `#f08a76` | `#3b1d17` |
| High risk | `#e9a659` | `#36260f` |
| Medium risk | `#d6c25a` | `#302b0f` |
| Low risk | `#9fb6c0` | `#1c2a30` |
| Live control | `#8fcf86` | `#183018` |
| Designed control | `#5fb3cc` | `#163a47` |
| Change required | `#c9a2e0` | `#2c1d36` |

### Surface treatment and behavior

- **Shadows:** Strategy medium shadow becomes `0 6px 20px rgba(0,0,0,.35)` and large becomes `0 24px 60px rgba(0,0,0,.5)`; the small shadow token is inherited. Use borders as the primary separation for proposal panels and inputs.
- **Inputs and tables:** Keep background, border and text tied to the dark tokens; never leave a bright white input within a dark panel. Selected items receive a deep accent tint rather than a neon highlight.
- **Theme icon:** Render a sun using the surrounding text color. Its label and tooltip invite the user to switch to light mode.
- **Export consistency:** Downloading Markdown, PDF or the design document does not change the screen theme. Printing temporarily uses light mode and restores the user's prior screen selection afterward.
