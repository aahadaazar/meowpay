# 0002. Adopt Clay as the design system; extend it in a companion document

**Status:** Accepted · **Date:** 2026-07-15 · **Milestone:** [M1](../milestones/M01-design-system.md)

## Context

The repo ships `DESIGN.md` — a detailed analysis of **Clay.com's marketing site**: tokens,
components, do's and don'ts, an iteration guide. It is the only design input available.

MeowPay is not a marketing site. It is a dashboard: a data table, two charts, dialogs, toasts,
an empty state, and a theme toggle. `DESIGN.md` closes its own Known Gaps with the admission
that matters here:

> *The actual Clay product surface (in-app data tables, formula editor, agent builder) shares
> some tokens with the marketing site but adds many product-specific components that are out
> of scope.*

So the system is authoritative and **knowingly incomplete** for what is being built. It also
has no dark theme and no chart palette. Something has to fill the gap, and the question is
where that lands.

## Decision

**`DESIGN.md` is the system of record and is never edited.** Extensions live in a companion
document, [`docs/design/APP-EXTENSIONS.md`](../design/APP-EXTENSIONS.md), under three rules:

1. **Additive only.** The source is never modified. The app's system is
   `DESIGN.md` **+** `APP-EXTENSIONS.md`.
2. **Derived, not invented.** Where the source can answer, it answers — a new value is either
   an existing token, or produced from one by a documented procedure.
3. **Every extension carries an ADR** — [0003](0003-dark-theme-extension.md) (dark),
   [0004](0004-chart-palette-derivation.md) (charts), [0005](0005-fluid-responsive-strategy.md)
   (responsive).

**Brand voltage is set to middle.** Saturated brand cards on non-data sections; **neutral
surfaces under all data**. Charts and the trail sit on `product-mockup-card` — the system's own
component for holding product UI fragments, which is precisely what a chart is.

## Consequences

- The Clay analysis stays pristine and re-readable as a source. A reviewer can diff what was
  given from what was added, and the additions are auditable in one place.
- Extension values are **traceable**: every color in `APP-EXTENSIONS.md` is a Clay hue at a
  measured lightness, or a Clay token used in a new role.
- **Two documents to consult** rather than one merged system. Accepted: merging them would make
  the additions invisible, which is the opposite of the point.
- The middle-voltage setting means the dashboard is quieter than Clay's marketing pages. It
  reads as *Clay's product*, not Clay's homepage — which is the correct target.
- **No illustrations.** Claymation is the brand's most-recognized element and is commissioned
  art the source explicitly excludes from tokens. Faking it with flat vector work is an explicit
  "Don't". This is the largest visible divergence from Clay's actual voice, and it is a scope
  decision taken openly rather than papered over.

## Alternatives considered

**Edit `DESIGN.md` in place.** One document, no indirection. Rejected: it destroys the
distinction between the given system and our additions — exactly what a reviewer wants to see
separated — and it silently rewrites an analysis of someone else's live site to suit our app.

**Ignore `DESIGN.md`; use shadcn defaults.** Fastest path. Rejected: it discards the only
design input in the repo, and shadcn's cool-gray defaults violate the system's single most
emphatic rule — *"Don't use cool grays for canvas. The cream tint is non-negotiable."* If the
system is adopted at all, it is adopted at the token layer (see
[`APP-EXTENSIONS.md` §5](../design/APP-EXTENSIONS.md#shadcn-ships-cool-grays)).

**Treat the marketing analysis as binding without extension.** Rejected: it cannot be done.
The system has no dark theme, no chart palette, and no data table. Following it strictly means
not building the product. The gaps are real and the source says so.

**Invent a fresh system for the product surface.** Rejected: it throws away a detailed,
opinionated system that is already right about surface, radius, type and rhythm, and replaces a
traceable derivation with taste.
