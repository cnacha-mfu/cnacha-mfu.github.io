# MFU Curriculum Landscape — UI prototype v1

A static, clickable prototype. It does not touch the real app, and every figure, name and account in it is mock data.

## The direction in ten lines

1. **A field register.** Each programme is a surveyed plot: measured with the same instruments every season, labelled like a specimen, and hatched where nothing was measured.
2. **Draw the score, don't print it** (kept from v4). One *growth-ring* figure shows the composite at the centre and the five dimensions as concentric arcs. Arc length is the score and colour is the band.
3. **Hatched means not measured.** A null is a hatched track plus `—`. It is never a zero bar, and it is left out of every mean.
4. **Every figure is a button.** Tap, click or keyboard opens one provenance sheet showing drivers, source, fetch date, method version, confidence, fallback tier and withheld reason. It is a side sheet on a laptop and a bottom sheet on a phone.
5. **Survey scales, not tiles.** Dimension rows are 0–100 rules with ticks at the band thresholds 40 · 55 · 70.
6. **Risk is dot size.** Five dots on a fixed ramp of growing diameter, filled up to the tier. The same mark is used on every screen.
7. **Hairlines, not cards.** 1px rules and whitespace carry the structure. Only three things are raised: the specimen label, the review pane, and the sheets.
8. **Palette law.** Green, amber, rust and red are reserved for the four bands. The one accent, aniline-pencil violet, marks actions, the active tab, focus, and the neutral lifecycle ramp.
9. **Type.** Inter for UI and numerals (tabular). Noto Sans Thai Looped for Thai at 1.62 leading. 13px is the floor.
10. **The phone is first-class.** A bottom dock (Cockpit, Programmes, Verify, Review, More) with live badges. Every page is checked at 400px with no sideways scroll.

## Tokens

| token | light | dark | use |
|---|---|---|---|
| `--bg` | `#f4f5f0` | `#0f1311` | field-paper ground / forest night |
| `--surface` | `#fbfbf7` | `#141916` | specimen label, sheets |
| `--sunk` | `#eaece4` | `#1a201c` | hover rows, notices |
| `--line` / `--line-strong` | `#d6d9ce` / `#b3b8aa` | `#29312c` / `#3e4841` | hairlines |
| `--track` | `#e1e4d9` | `#232a25` | empty ring or scale |
| `--text` / `--muted` / `--faint` | `#15171a` / `#44484f` / `#5d6168` | `#eef0ea` / `#b6bbb2` / `#949a90` | text |
| `--accent` / `--accent-ink` | `#4a3db0` / `#3d31a0` | `#b1aaff` / `#c3bdff` | the single accent |
| `--color-good-ink` … `--color-critical-ink` | `#0b6b33` `#7a5200` `#93401a` `#a3201f` | `#7fdc9e` `#f0cd8d` `#f3b494` `#f5a2a2` | band **text** |
| `--dot-good` … `--dot-critical` | `#12894a` `#c98a05` `#c2622f` `#c02b2b` | `#46c46e` `#e3ae4e` `#e08e63` `#e46a6a` | band **marks** (arcs, bars, dots) |
| bands | ≥70 good · 55–69 watch · 40–54 concern · <40 critical · null hatch | | |
| type | hero 56 · num 44 · ring 40/30 · h1 26 · h2 18 · name 17 · body 16 · sm 14 · xs 13 | | |
| space | 4 · 8 · 14 · 20 · 28 · 40 · 60 · 88 | | |
| radius | 10 (label, pane), 8 (controls), pill (chips) | | |

## What changed on each screen, and why

- **Navigation.** The 14-item left rail becomes six register tabs, each with a Thai hint underneath. On a phone they become a bottom dock with Verify and Review badges. Scope is shown as URL-state crumbs. *Why:* the lead mostly uses five places, and the rail took a third of a phone screen.
- **Programme report** (`programme.html`). A specimen label and one growth-ring figure replace the tile grid, the composite ring and the five separate gauges. A ledger of five survey scales sits under the ring. Four facts sit in one hairline row: lifecycle stage scale, risk dots, completeness, below-gate count. "Withheld, and why" is its own list, with counts and reason codes. The freshness line with **Rescore now** sits directly under the label. The nine anchor sections become four tabs: Health · Curriculum · Outlook & risk · Runs & documents. *Why:* the first viewport answers "how healthy, and how sure are we?" without scrolling.
- **Cockpit** (`cockpit.html`). The heatmap and the risk list share the first screen; the four icon tabs are gone. Stale count, not-analysed and **Rescore stale** sit in one survey line (no KPI tiles). Heatmap cells are band tints with band-ink numerals, which keeps contrast accessible. Lifecycle and completeness are side by side below. *Why:* "where do I look?" should never need a tab switch.
- **Programmes** (`programmes.html`). Each row leads with a small composite ring and ends with the single action its status asks for. The four status chips are unchanged. Out-of-scope rows show "aggregate only".
- **Verification** (`verify.html`). The seven queues become a register index with a load bar each; on a phone it is a select. **Accept selected** / **Accept all pending** open a confirm step. The run then advances row by row in place, with a progress bar and **Stop**. Failed rows stay selected and show their reason, and **Next page** follows. AI notes sit under each row. "How this queue works" folds out.
- **Review** (`review.html`). Confidence is drawn against the gate ("0.72 · 0.13 short"), with recent calls as dots. Source page and payload sit side by side. **Approve**, **Edit & approve** (enabled only once something changed) and **Reject** (reason required). J/K/A/R shortcuts work.
- **Admin**. One sub-nav joins three pages. **AI providers** shows per-kind confidence as dot strips against the 0.85 gate, with % sent to review and F1. **Programme register** makes archive versus delete legible: delete is disabled, with the reason, when history is attached. **Users & roles** puts role, school and department scope in one row, and flags external domains.
- **Council pack** (`council.html`). The brief is shown as the six A4 sheets it will print. A reason is required before export. The documents table carries DRAFT / SIGNED, Sign off, and Regenerate PDF.

## Open points for the lead

- **Band thresholds disagree in the live app.** The v4 direction uses 70/55/40; the live cockpit legend uses 65/40. The prototype uses 70/55/40 everywhere. Pick one.
- The language toggle swaps **UI labels** only. Thai content never changes.
- The detector still flags Inter and the hatch pattern. Both are pinned by the approved direction, so they were kept deliberately.
- Not built out: the deep-dive capability roster, gold labels, reruns, bulk upload, inference cost table, labour-market page. Only วิศวกรรมซอฟต์แวร์ has a full report.
