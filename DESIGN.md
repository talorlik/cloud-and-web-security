# Security documents: design and theme specification

This document describes the shared visual language and the current implementation of the Security Strategy and Management Proposal. Both are document-first interfaces: readable content, clear evidence, restrained color and practical navigation, rather than an application dashboard.

## Common

### Scope and source of truth

- **Security Strategy:** `site/index.html`, `site/styles.css`, `site/app.js` and `site/data.js` define the detailed document, controls and interactions.
- **Management Proposal:** `proposal/content.mjs`, `proposal/styles.css`, `proposal/app.js` and `proposal/budget.js` define the short proposal and editable budget; `proposal-build/build.mjs` generates its HTML and exports.
- **Design specification:** This root `DESIGN.md` is the canonical downloadable document. It records the actual styles, including deliberate differences between the two interfaces; it is not a shared runtime stylesheet.
- **Publishing:** Each security document retains its own build and exports. A separate design-only workflow publishes `DESIGN.md` without rebuilding either PDF, and both document toolbars download that same file.

### Visual direction

- **Character:** Quiet, technical and editorial, with dark blue-green accents, serif display headings and sans-serif body text. Emphasize decisions and evidence rather than decoration.
- **Hierarchy:** Document identity, section label, section heading, item title, explanation, then supporting citations. Use small uppercase labels sparingly and keep descriptive text in sentence case.
- **Density:** Long-form prose receives comfortable line spacing and bounded reading widths. Tables are intentionally denser and scroll horizontally instead of shrinking beyond readability.
- **Geometry:** Use fine one-pixel dividers, small rounded controls and restrained panel backgrounds. Reserve pill shapes for labels and status badges, not every container.
- **Color semantics:** Blue-green identifies links, selection and primary actions; red, amber, green and purple are reserved for risk or control status. Status must also have a readable label, never color alone.

### Document structure

| Layer | Security Strategy | Management Proposal |
|---|---|---|
| Header | Sticky brand, search, theme, Design, Markdown and PDF controls | Sticky brand, mobile menu, theme, Design, Markdown and PDF controls |
| Navigation | Document switcher and nested, scroll-tracked contents | Document switcher, section contents and item search |
| Opening | Dark hero, concise summary, key metrics and framework labels | Editorial cover, short introduction and constraint badges |
| Body | Executive summary, scope, frameworks, threats, risks, principles, security domains, deep dives, changes, control matrix, roadmap, metrics, decisions and references | Common foundation, three complete proposals, then a budget worksheet |
| Components | Tables, cards, callouts, architecture diagram, risk heat map, filters, disclosure panels and launch checklist | Numbered two-sentence items, inline citations and editable budget tables |
| Footer | Document metadata and export information | Edition and pricing-assumption note |

- **Stable anchors:** Preserve section and item IDs so direct links, search results and citations continue to work. A strategy citation from the proposal carries a return link to its originating item.
- **External navigation:** External citations open a new tab with `noopener noreferrer`. Document-to-document navigation remains in the same tab.
- **Separation:** Neither security document includes the other in its PDF or Markdown export. The design download is separate from both exports.

### Typography

| Role | Security Strategy | Management Proposal |
|---|---|---|
| Display | Zodiak, Georgia, serif | Libre Baskerville, Georgia, serif |
| Body and controls | General Sans, Inter, system-ui, sans-serif | DM Sans, system-ui, sans-serif |
| Code and identifiers | JetBrains Mono, ui-monospace, monospace | Generic monospace for item numbers |
| Font loading | Zodiak and General Sans from Fontshare; JetBrains Mono from Google Fonts | DM Sans and Libre Baskerville from Google Fonts |
| Body scale | Fluid 16–17px equivalent at a 16px root, line-height 1.62 | 16px base, line-height 1.6; item paragraphs use 1.75 |
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
| Desktop columns | 288px sidebar + flexible main | 265px sidebar + flexible main; overall maximum 1550px |
| Header | 64px high; translucent page-colored backdrop with 10px blur | Content-sized toolbar; desktop padding 14px 26px |
| Sidebar | Sticky below header; independently scrollable | Sticky at 86px; independently scrollable |
| Main spacing | Horizontal padding fluid from 24px to 64px; sections 64px vertically | Main padding 42px 56px 72px; sections 45px top / 15px bottom |
| Intermediate width | At 1200px, search and download actions use compact icons; at 1100px, three-column cards become two columns and complex comparisons stack | At 1050px, sidebar becomes 230px and main padding becomes 30px |
| Mobile navigation | At 900px, sidebar becomes a sliding drawer, maximum 320px / 86vw | At 760px, sidebar becomes a full-width overlay below the header |
| Small-screen layout | At 640px, card grids stack, brand text hides and header padding reduces | At 760px, main padding becomes 25px 22px; toolbar uses six compact grid columns |
| Table overflow | Scroll within the table wrapper | Budget tables have a 590px minimum width and scroll within their wrapper |

- **Spacing scale:** Strategy uses 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80 and 96px-equivalent spacing tokens. Proposal uses explicit spacing values with the same broad rhythm, not the same variable names.
- **Radii:** Strategy uses 6px, 8px and 12px corners, plus fully rounded badges. Proposal uses mostly 3–7px corners, with 6px buttons and 7px budget panels.
- **Layering:** Strategy header is at z-index 40 and mobile drawer at 50. Proposal header is at 10, mobile navigation at 15 and status messages at 20.
- **Responsive controls:** Strategy search and download labels disappear at 1200px and below while their accessible names remain. Proposal keeps Markdown/PDF text, but its Design action becomes an icon below 760px.

### Components and interactions

- **Theme control:** An 18px inline SVG inside a 40px-high button, with a 24×24 viewBox and a 2px `currentColor` stroke. Show the moon in light mode and the sun in dark mode: the icon always indicates the theme the next click will activate.
- **Accessible theme name:** Use “Switch to dark theme” in light mode and “Switch to light theme” in dark mode, in both `aria-label` and tooltip. SVGs are decorative with `aria-hidden="true"` and `focusable="false"`; the button remains keyboard operable.
- **Theme lifetime:** Both documents open in light mode. The selection stays in the current page only; it is not persisted in browser storage and is not automatically inherited across document navigation.
- **Design download:** A document-outline icon with a “Design” label where space allows, an accessible name of “Download design theme document” and a `DESIGN.md` filename. Fetch the static file and download a Blob; show a visible status message if retrieval fails.
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
- **Icon targets:** Strategy theme controls are 40×40px; proposal theme controls are 40×40px on desktop and 36×40px on mobile. Keep sufficient gaps between neighboring controls.
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

## Light

### Palette and roles

Light mode uses a warm gray-green page with dark blue-green text and white or near-white reading surfaces. It is the initial theme and the basis of the print presentation.

| Role | Strategy token | Strategy value | Proposal token | Proposal value |
|---|---|---|---|---|
| Page | `--color-bg` | `#f4f5f2` | `--bg` | `#f4f5f2` |
| Reading surface | `--color-surface` | `#fbfbf9` | `--surface` | `#ffffff` |
| Raised/input surface | `--color-surface-2` | `#ffffff` | `--surface` | `#ffffff` |
| Offset surface | `--color-surface-offset` | `#eceee9` | No direct equivalent | Use surface or soft panel |
| Divider | `--color-divider` | `#dde0da` | `--line` | `#d4dddc` |
| Control border | `--color-border` | `#cfd3cc` | `--line` | `#d4dddc` |
| Main text | `--color-text` | `#13222b` | `--text` | `#142b35` |
| Secondary text | `--color-text-muted` | `#56636b` | `--muted` | `#556872` |
| Faint detail | `--color-text-faint` | `#8f9a9f` | No equivalent | Use muted text |
| Accent/link | `--color-primary` | `#0b5a73` | `--accent` | `#0b5a73` |
| Accent hover | `--color-primary-hover` | `#08465a` | No separate token | Accent border/text emphasis |
| Selected/soft panel | `--color-primary-highlight` | `#d4e5ea` | `--soft` | `#e0eef1` |
| Primary-button text | `--color-text-inverse` | `#f4f7f6` | `--surface` | `#ffffff` |
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
| Page | `--color-bg` | `#0b161c` | `--bg` | `#0c1b22` |
| Reading surface | `--color-surface` | `#0f1d24` | `--surface` | `#122932` |
| Raised/input surface | `--color-surface-2` | `#12232b` | `--surface` | `#122932` |
| Offset surface | `--color-surface-offset` | `#16282f` | No direct equivalent | Use surface or soft panel |
| Divider | `--color-divider` | `#1f343d` | `--line` | `#35515b` |
| Control border | `--color-border` | `#2a424c` | `--line` | `#35515b` |
| Main text | `--color-text` | `#dbe5e7` | `--text` | `#edf4f5` |
| Secondary text | `--color-text-muted` | `#94a6ad` | `--muted` | `#b0c2c8` |
| Faint detail | `--color-text-faint` | `#5f7279` | No equivalent | Use muted text |
| Accent/link | `--color-primary` | `#5fb3cc` | `--accent` | `#89d0e0` |
| Accent hover | `--color-primary-hover` | `#86c8db` | No separate token | Accent border/text emphasis |
| Selected/soft panel | `--color-primary-highlight` | `#163a47` | `--soft` | `#203e49` |
| Primary-button text | `--color-text-inverse` | `#0b161c` | `--surface` | `#122932` |
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
