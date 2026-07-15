# 0003. Dark theme — a deliberate deviation from a documented system contract

**Status:** Accepted · **Date:** 2026-07-15 · **Milestone:** [M1](../milestones/M01-design-system.md)

> **This ADR records a knowing deviation from an explicit rule in `DESIGN.md`, taken on an
> explicit call. It is a trade-off, not an oversight.** The rule is quoted below in full so
> that the departure is on the record rather than discovered later.

## Context

`DESIGN.md` is unambiguous. From its Iteration Guide:

> *The cream-throughout palette is a system contract — don't add a dark footer.*

From its Don'ts:

> *Don't use cool grays for canvas. The cream tint is non-negotiable.*
> *Don't use a dark footer. The cream footer is part of the system's warm-throughout pacing.*

And from its Overview, on `surface-dark`: *"for occasional dark cards (rare)"*.

The system does not merely lack a dark theme — it **argues against one**. Cream-throughout is
called out as the thing that differentiates Clay from its cool-gray competitors. A dark mode is
a direct departure from a stated contract.

Against that: MeowPay is a wallet dashboard — a surface people leave open, not a page they
scroll once and leave. A theme toggle was called for explicitly.

The two positions do not reconcile. One of them has to give, and the choice needs to be on the
record.

## Decision

**Ship a dark theme.** The system contract is knowingly departed from, scoped to the **product
surface only** — any marketing page would remain cream-throughout.

The deviation is contained by one rule: **the dark theme invents no colors.** Every value is a
token already in `DESIGN.md`, assembled into a mode the source never assembles.

| Role | Light | Dark | Origin |
|---|---|---|---|
| Canvas | `canvas` #fffaf0 | `surface-dark` #0a1a1a | existing token |
| Card | `canvas` + `hairline` | `surface-dark-elevated` #1a2a2a | existing token |
| Ink | `ink` #0a0a0a | `on-dark` #ffffff | existing token |
| Body | `body` #3a3a3a | `on-dark-soft` #a0a0a0 | existing token |
| Primary button | `button-primary` | **`button-on-color`** | existing component |
| Hairline | `hairline` #e5e5e5 | `rgba(255,255,255,0.10)` | derived |

**The primary button inverts, and the system supplies the inversion.** `primary` (#0a0a0a) on
`surface-dark` (#0a1a1a) measures **1.11:1** — not weak, *invisible*; the two differ only in the
blue channel. `button-on-color` already exists for "white button used over saturated brand-color
feature cards" — an inversion for when the surface is too dark for the near-black primary. Dark
mode is that case at page scale. It measures **17.17:1**.

The warmth argument is also partly preserved by accident of the source's own choices:
`surface-dark` is #0a**1a1a** — a *teal-tinted* near-black, not a neutral one. Clay's dark
tokens were never cool gray. The cream is gone; the refusal of cool gray is not.

Implementation: `next-themes` with the **`.dark` class** strategy — the toggle must be able to
disagree with the OS.

## Consequences

- **The system contract is broken, and this document is where that is admitted.** Anyone
  auditing the app against `DESIGN.md` will find the conflict; they will find it here first.
- The blast radius is one mode on one surface. No token is redefined; light mode is untouched
  and remains exactly what the source specifies.
- **Dark mode loses a text hierarchy step.** `muted` (#6a6a6a) measures **2.76:1** on
  `surface-dark-elevated` — it fails even the 3:1 large-text bar. Dark collapses `body` and
  `muted` onto `on-dark-soft` and separates them by size and weight instead. This is a real
  loss, accepted rather than patched with an invented grey.
- Every surface now needs verifying twice, including the chart palette
  ([0004](0004-chart-palette-derivation.md)), which is validated against **both**
  #fffaf0 and #1a2a2a.
- The claymation gap widens: the illustrations are lit for cream and would not composite onto
  #0a1a1a. Since none are used ([0002](0002-adopt-clay-design-system-and-extension-strategy.md)),
  the cost is theoretical here — but it is one reason the source's contract exists.

## Alternatives considered

**Honor the contract — light mode only.** The system says cream-throughout is non-negotiable;
the disciplined answer is to obey it, and it costs nothing to build. Rejected on an explicit
product call: a wallet dashboard is a long-dwell surface and the toggle was asked for. This was
the strongest alternative and it is the one a reviewer should push on — the honest answer is
that the product requirement was weighted above the brand contract, not that the contract was
found to be wrong.

**Dark theme with a new, purpose-designed dark palette.** Better dark ergonomics — a real
neutral ramp would restore the `muted` step lost above. Rejected: inventing colors turns a
scoped deviation into a fork of the system. Assembling from existing tokens keeps the departure
auditable and reversible; the missing hierarchy step is the price and it is small.

**Dim/sepia mode instead of dark** — a darker cream, holding warmth throughout. Genuinely more
faithful to Clay, and tempting. Rejected: at the luminance a real low-light mode needs, a
cream-derived surface goes muddy brown rather than warm, and the brand hues — already failing
contrast on cream ([0004](0004-chart-palette-derivation.md)) — get no relief from it. It would
deliver neither the contract nor the ergonomics.

**Follow the OS via media query only, no toggle.** Simpler, no persistence. Rejected: the theme
is a user choice and must be able to disagree with the OS. `next-themes` with the `.dark` class
costs one provider.
