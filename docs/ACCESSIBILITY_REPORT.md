# SafeLine Accessibility Report (WCAG 2.2 AA)

**Product surface:** Vite + React SPA (`Frontend/`)  
**Date:** July 2026  
**Target:** WCAG 2.2 Level AA · Lighthouse Accessibility ≥ 95 (target 100)

## Modes (exactly two)

| Mode | Persistence | Behavior |
|------|-------------|----------|
| **Default** | `localStorage` `safeline-a11y-mode` = `default` | Brand visual identity unchanged (Desk / Coffee themes still apply). Global focus rings and `prefers-reduced-motion` honored. |
| **Accessibility** | `safeline-a11y-mode` = `accessibility` | Higher-contrast tokens, larger base type (~112.5%), increased line/letter spacing, Atkinson Hyperlegible font, stronger focus rings, underlined links, larger minimum control heights (~44px), animations forced off. |

Toggle: **A11y** control in header and sidebar (`AccessibilityModeToggle`). Desk/Coffee theme toggle remains separate.

## Lighthouse Accessibility scores

Audited with Lighthouse (headless Chrome) against a production `vite build` served via SPA static host.

| Route | Before (baseline audit) | After |
|-------|-------------------------|-------|
| `/` (Home) | ~94 (contrast + heading-order) | **100** |
| `/chat` | Not measured (SPA 404 on first pass) | **100** |
| `/sign-in` | — | **100** |
| `/about` | — | **100** |

Baseline “before” on Home came from the first post-implementation Lighthouse run that still failed color-contrast and heading-order; subsequent contrast/hierarchy fixes brought all four primary routes to **100/100**.

Dashboard (`/dashboard`) is auth-gated and was not included in automated Lighthouse CI for this report; structural table captions, filter label, and status live regions were applied in code.

## Issues discovered and fixes

### Keyboard & focus

| Issue | Fix | WCAG |
|-------|-----|------|
| No skip link | Skip to `#main-content` in `AppLayout` | 2.4.1 |
| Weak / inconsistent focus | Stronger `:focus-visible`; Accessibility mode 3px ring | 2.4.7, 2.4.11 |
| Verdict panel: no focus trap / restore; backdrop was a tabbable button | Focus trap Tab/Shift+Tab; restore previous focus; inert backdrop `div` | 2.1.2, 2.4.3 |
| Sidebar labels only on hover | Focus expands sidebar; pin control; `aria-label` on links | 2.1.1 |
| Session rename/delete hover-only | Always keyboard-reachable; visible on focus-within | 2.1.1 |
| Escape closes report | Kept / confirmed | 2.1.1 |

### Screen reader / semantics

| Issue | Fix | WCAG |
|-------|-----|------|
| Missing form label on composer | Visually hidden `<label>` + `aria-describedby` | 1.3.1, 3.3.2 |
| Rename input unlabeled | Labelled rename field | 3.3.2 |
| Dashboard filter unlabeled | `sr-only` label + caption on table | 1.3.1, 4.1.2 |
| Errors not announced | `role="alert"` on auth/chat errors | 4.1.3, 3.3.1 |
| Loading not announced | `role="status"` / `aria-live` (loaders, ProtectedRoute) | 4.1.3 |
| Progress bar unlabeled | `role="progressbar"` + valuemin/max/now | 4.1.2 |
| Risk gauge color-only | `role="meter"` + text band label | 1.4.1, 1.3.1 |
| Ledger severity color-only | SR severity text + visible label | 1.4.1 |
| External links | “opens in a new tab” via `sr-only` | 3.2.5 (advisory) |
| Dialog headings | Proper `aria-labelledby`, hierarchy cleanup | 1.3.1, 2.4.6 |
| Landmarks | `main`, labeled `nav` / `aside` / composer regions | 1.3.1, 2.4.1 |

### Color & contrast

| Issue | Fix | WCAG |
|-------|-----|------|
| Muted `text-ink/40–65` failing AA | Raised to `/70–80` where Lighthouse failed; source chips use ink on tinted bg | 1.4.3 |
| Disabled send text low contrast | Darker disabled token | 1.4.3 |
| Links in About blended into text | Always underlined + stronger contrast | 1.4.1, 1.4.3 |

### Motion

| Issue | Fix | WCAG |
|-------|-----|------|
| Animations ignore user preference in Accessibility mode | Force-disable animations/transitions when `data-a11y="accessibility"`; keep OS `prefers-reduced-motion` in default | 2.3.3 |

### Forms

| Issue | Fix | WCAG |
|-------|-----|------|
| Required indicated only visually | Required asterisk + `(required)` for SR; `autocomplete`; `aria-invalid` / `aria-describedby` | 3.3.2, 1.3.5 |
| Destructive delete | Confirm dialog before session delete | 3.3.4 |

### Responsive / targets

| Issue | Fix | WCAG |
|-------|-----|------|
| Icon controls &lt; 44×44 | Accessibility mode `min-height: 2.75rem` on controls; composer/session buttons sized up | 2.5.5 / 2.5.8 |

## WCAG 2.2 AA criteria addressed (summary)

1.1.1, 1.3.1, 1.3.5, 1.4.1, 1.4.3, 1.4.4 (zoom via rem/`font-size` bump in A11y mode), 1.4.10 (layout reflow preserved), 1.4.11 (focus/UI contrast improvements), 1.4.12 (spacing in A11y mode), 1.4.13 (tooltips/nav tips), 2.1.1, 2.1.2, 2.2.2 (motion), 2.3.3, 2.4.1, 2.4.2 (page titles existing), 2.4.3, 2.4.4, 2.4.6, 2.4.7, 2.5.3, 2.5.8 (A11y targets), 3.2.3 (consistent nav), 3.3.1, 3.3.2, 3.3.4, 4.1.2, 4.1.3.

## Out of scope / remaining limitations

- **Meta WhatsApp client** is not our DOM; voice/keyboard a11y there depends on Meta.
- **No separate Dark Mode** beyond existing Desk/Coffee; Accessibility mode is the a11y overlay (not grayscale/invert/cursor size/reading guide UI).
- **NVDA / JAWS / VoiceOver:** patterns match best practice (`alert`, `status`, labels, dialog trap); full assistive-tech certification not run in CI.
- **axe DevTools** / Lighthouse used for automated checks; continuous CI gate for a11y not added (can wire `@axe-core/cli` later).
- **Embedded media:** no site-hosted video player; decorative mockups only.
- **Guest chat history** does not persist indefinitely; a11y of history is limited to signed-in sessions.

## Key files

- [`Frontend/src/contexts/A11yModeContext.tsx`](../Frontend/src/contexts/A11yModeContext.tsx)
- [`Frontend/src/components/AccessibilityModeToggle.tsx`](../Frontend/src/components/AccessibilityModeToggle.tsx)
- [`Frontend/src/index.css`](../Frontend/src/index.css) (`html[data-a11y="accessibility"]`, `.sr-only`, `.skip-link`)
- [`Frontend/src/components/layout/AppLayout.tsx`](../Frontend/src/components/layout/AppLayout.tsx)
- [`Frontend/src/components/verdict/VerdictReportPanel.tsx`](../Frontend/src/components/verdict/VerdictReportPanel.tsx)

## How to re-verify

```bash
cd Frontend && npm run build
npx serve dist -s -l 4180
npx lighthouse http://127.0.0.1:4180/ --only-categories=accessibility
# also /chat, /sign-in, /about
```

Manually: Tab through nav → Skip link → Open a verdict report (focus trap, Esc) → Toggle Accessibility mode and confirm type/contrast/motion changes persist after reload.
