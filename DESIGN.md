# Design System — A2A Forge

## Product Context
- **What this is:** Desktop app for discovering, inspecting, and testing A2A protocol agents
- **Who it's for:** Developers building and integrating AI agents via the A2A protocol
- **Space/industry:** Developer tools — comparable to Postman/Insomnia but for A2A
- **Project type:** Tauri 2.x desktop app (React + Rust), 3-panel layout
- **Aspirational peers:** Linear, Raycast, Warp

## Aesthetic Direction
- **Direction:** Industrial/Utilitarian — function-first, data-dense, monospace accents
- **Decoration level:** Intentional — subtle texture through border treatments and surface elevation, not ornament
- **Mood:** A precision instrument that respects the developer's attention. Professional but not cold — warm neutrals add approachability without sacrificing credibility.
- **Key principle:** Color is rare and meaningful. When something is blue, it matters.

## Typography
- **Display:** Geist Sans 600-700 — no separate display font needed in a tool UI
- **Body/UI:** Geist Sans 400-500 — designed by Vercel for developer interfaces, clean at small sizes
- **Data/Tables:** Geist Mono 400-500 — true tabular figures, ligature-free for data clarity
- **Code:** Geist Mono 400
- **Loading:** Self-hosted woff2 from `geist` npm package (replaces Inter + JetBrains Mono)
- **Scale:**
  - 11px — labels, metadata, timestamps (weight 500, uppercase + letter-spacing for section labels)
  - 12px — body text, table cells, form inputs
  - 13px — subheadings, skill names, emphasized body
  - 15px — section titles
  - 18px — page titles (weight 700, letter-spacing -0.02em)
- **Rules:**
  - `font-variant-numeric: tabular-nums` on all number columns
  - `letter-spacing: -0.01em` on headings 15px+
  - `letter-spacing: 0.08em` + `text-transform: uppercase` on section labels
  - Max line length: 65ch for body text

## Color

### Approach: Restrained
One primary accent + warm neutrals. Color is rare and meaningful.

### Light Mode
| Token | Hex | Usage |
|-------|-----|-------|
| `--primary` | `#2563EB` | Primary actions, active states, links |
| `--primary-light` | `#DBEAFE` | Primary backgrounds, selected states |
| `--primary-dark` | `#1D4ED8` | Primary hover |
| `--amber` | `#D97706` | Secondary accent, warnings |
| `--amber-light` | `#FEF3C7` | Warning backgrounds |
| `--success` | `#059669` | Completed, online, passing |
| `--success-light` | `#D1FAE5` | Success backgrounds |
| `--error` | `#DC2626` | Failed, errors, destructive |
| `--error-light` | `#FEE2E2` | Error backgrounds |
| `--info` | `#2563EB` | Same as primary — informational |
| `--info-light` | `#DBEAFE` | Info backgrounds |
| `--bg-primary` | `#FFFFFF` | Card/panel surfaces |
| `--bg-secondary` | `#F5F4F0` | Sidebar, secondary surfaces |
| `--bg-tertiary` | `#EEEDE9` | App background, outer shell |
| `--text-primary` | `#1A1A18` | Headings, primary content |
| `--text-secondary` | `#5A5A56` | Body text, descriptions |
| `--text-muted` | `#9A9992` | Labels, placeholders, metadata |
| `--border-subtle` | `rgba(0,0,0,0.08)` | Panel dividers, inner borders |
| `--border-default` | `rgba(0,0,0,0.15)` | Input borders, card borders |
| `--border-strong` | `rgba(0,0,0,0.30)` | Emphasized borders |

### Dark Mode
Reduce accent saturation ~15%. Surfaces use elevation (lighter = higher), not just lightness inversion.

| Token | Hex |
|-------|-----|
| `--primary` | `#3B82F6` |
| `--primary-light` | `#1E3A5F` |
| `--bg-primary` | `#1E1E1C` |
| `--bg-secondary` | `#252523` |
| `--bg-tertiary` | `#2C2C2A` |
| `--text-primary` | `#E8E6DE` |
| `--text-secondary` | `#9C9A92` |
| `--text-muted` | `#66645E` |

### Distinctive Choice: Warm Neutrals
Most dev tools use cool blue-grays. A2A Forge uses warm beige-grays (#EEEDE9, #F5F4F0) — this is intentional and distinctive. It makes the app feel more approachable and craft-oriented (like Linear) without sacrificing professionalism.

## Spacing
- **Base unit:** 4px
- **Density:** Comfortable — not cramped, not wasteful
- **Scale:** `2px` `4px` `8px` `12px` `16px` `24px` `32px` `48px` `64px`
- **Rules:**
  - Related items: 4-8px gap
  - Distinct sections: 16-24px gap
  - Panel padding: 12-16px
  - Card padding: 16-24px

## Layout
- **Approach:** Grid-disciplined — strict alignment, predictable spacing
- **Structure:** 3-panel flex (sidebar + skill list + test area)
- **Max content width:** 1400px
- **Min app width:** 1024px
- **Border radius hierarchy:**
  - `sm` 4px — pills, tags, small badges
  - `md` 6px — inputs, buttons, cards, list items
  - `lg` 10px — panels, modals, outer shell
  - `full` 9999px — avatars, status dots, filter chips

## Motion
- **Approach:** Intentional — subtle entrance animations, meaningful state transitions
- **Library:** GSAP + @gsap/react (already integrated)
- **Easing:**
  - Enter: `power2.out` (ease-out)
  - Exit: `power2.in` (ease-in)
  - Move: `power2.inOut` (ease-in-out)
- **Duration:**
  - Micro: 50-100ms (button press, toggle)
  - Short: 150-250ms (hover states, tab switches)
  - Medium: 250-400ms (panel transitions, list stagger)
  - Long: 400-700ms (modal entrance, page transitions)
- **Rules:**
  - Only animate `transform` and `opacity` (GPU-accelerated)
  - Respect `prefers-reduced-motion`
  - No `transition: all` — always specify properties
  - Perpetual animations in `React.memo` leaf components
  - Every `useEffect` with GSAP must `return () => ctx.revert()`

## Interaction States
Every interactive element must have:
- **Hover:** Subtle background shift or color change
- **Focus-visible:** 2px outline in `--primary` with 1px offset
- **Active/pressed:** `scale(0.97)` transform
- **Disabled:** 50% opacity + `cursor: not-allowed`
- **Loading:** Skeleton shapes matching real content layout
- **Empty:** Icon + title + description + optional action (use `EmptyState` component)

## Touch Targets
- Minimum 28px for icon-only buttons
- Minimum 32px for text buttons
- 44px recommended for primary actions

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-26 | Initial design system created | Created by /design-consultation — industrial/utilitarian aesthetic for developer tool |
| 2026-03-26 | Geist Sans + Mono over Inter + JetBrains Mono | Signals developer-experience focus (Vercel association), better at small sizes, true tabular figures |
| 2026-03-26 | Warm neutrals over cool grays | Distinctive vs category (Postman, Insomnia use cool grays), more approachable |
| 2026-03-26 | Primary #2563EB over #185FA5 | Slightly cooler, more confident, better contrast ratios |
| 2026-03-26 | 11px minimum font size | Design review finding — 9-10px was too small for desktop app readability |
