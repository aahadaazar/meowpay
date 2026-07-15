# 0005. Fluid responsive — clamp() between the system's own endpoints

**Status:** Accepted · **Date:** 2026-07-15 · **Milestone:** M1

## Context

`DESIGN.md` has a real responsive strategy: breakpoints at 768 / 1024 / 1440, 44px touch
targets, a 1280px max container, and a collapsing strategy ("reduce columns rather than
scaling").

But it is **fixed-step**. The hero is specified as *"hero h1 72→36px"* — one value below 768px,
another above. That works for a marketing page, where the hero is the only fluid element and
each band is one idea. It works less well for a dashboard, where a 72px total sitting beside a
data table has to hold its proportion across every width, and where the interesting sizes
(a 1024px laptop, a 900px split window) are exactly the ones a two-value snap handles worst.

## Decision

**Interpolate with `clamp()` between the system's own documented mobile and desktop values.**
The endpoints are not new — 72px and 36px are both from `DESIGN.md`. Only the path between them
is added.

| Token | Mobile | Desktop | Fluid |
|---|---|---|---|
| `display-xl` | 36px | 72px | `clamp(2.25rem, 1.06rem + 5.29vw, 4.5rem)` |
| `display-lg` | 32px | 56px | `clamp(2rem, 1.21rem + 3.53vw, 3.5rem)` |
| `display-md` | 28px | 40px | `clamp(1.75rem, 1.36rem + 1.76vw, 2.5rem)` |
| `display-sm` | 24px | 32px | `clamp(1.5rem, 1.24rem + 1.18vw, 2rem)` |
| Section rhythm | 24px | 32px | `clamp(1.5rem, 1.24rem + 1.18vw, 2rem)` |

Interpolation runs **375px → 1440px** — the system's own mobile-to-wide span. Letter-spacing is
expressed in **`em`** (`-0.05em`), so it scales with the size rather than needing a parallel
ramp; this is also what the Plain Black substitution note specifies.

Rules:

- **No page-level horizontal scroll, ever.** Charts reflow with their container; they are never
  a fixed-width canvas inside a scroller.
- **Trail → stacked cards below 768px**, not a horizontally scrolling table.
- Cat cards and charts **2-up desktop → 1-up mobile** — the system's own collapsing strategy.
- Top-up preset pills **wrap**; they never shrink below 44px.
- **44px touch targets hold at every breakpoint.** A floor, not a desktop value.

**Section rhythm drops from 96px to 32px.** `spacing.section` is marketing rhythm; at 96px
between bands a dashboard cannot show the total, the cat cards and the trail together, which
defeats the point. MeowPay uses `spacing.xl` (32px) and the system's own 1280px max container.
This is a departure from *"anchor every band with 96px vertical rhythm"*, scoped to the product
surface — `spacing.section` is untouched for marketing pages.

## Consequences

- Type is proportionate at every width, including the ones between breakpoints that a two-value
  snap serves worst.
- **Fewer breakpoints to maintain.** Display type and rhythm need no media queries at all; media
  queries remain only for genuine *layout* changes (column counts, table→cards) — which is what
  breakpoints are actually good at.
- The `clamp()` middle terms are computed, not typed by feel. They look opaque; the endpoints are
  the readable part and they are the system's.
- **Fluid type can be zoom-hostile.** A pure `vw` size ignores user zoom. Using `rem` in the
  preferred term (`1.06rem + 5.29vw`) keeps it responsive to the root font size, so browser zoom
  and OS text scaling still move it.
- Two rhythms now exist in the codebase — 96px documented, 32px used. The scoping note above is
  what keeps that from reading as drift.

## Alternatives considered

**Keep the system's fixed steps exactly.** Zero deviation, nothing to justify. Rejected: a
72px→36px snap at 768px is a jarring jump on a dashboard hero, and it leaves 769px looking
identical to 1440px — the laptop case, which for this app is the common one. The system's values
are kept as endpoints; only the discontinuity is removed.

**Container queries instead of viewport `clamp()`.** More correct in principle — a chart card
should size to *its container*, not the window. Rejected for the type ramp: display type should
track the page, not the card it happens to sit in, or the same heading renders at two sizes in
two columns. Charts do reflow with their container, which is the case that actually needs it.

**A JS-driven resize observer setting sizes.** Full control. Rejected: it reintroduces layout
thrash, breaks SSR's first paint, and hands a solved CSS problem to JavaScript.

**Horizontally scrolling trail table on mobile.** The cheap answer — keep one component, let it
scroll. Rejected: a horizontally scrolling table hides the amount column, which is the one
column that matters, and it invariably leaks into page-level horizontal scroll. Stacked cards
below 768px cost one more layout but keep every field visible.

**Scale the whole dashboard down on mobile** (`transform: scale`). Rejected: it shrinks touch
targets below 44px, which the system sets as a WCAG-AAA floor, and makes text blurry. The system
already says to reduce columns rather than scale.
