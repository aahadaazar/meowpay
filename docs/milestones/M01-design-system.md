# M1 — Design system

**Type:** enabler · **Status:** design specified, tokenization not started
**ADRs:** [0002](../adr/0002-adopt-clay-design-system-and-extension-strategy.md) ·
[0003](../adr/0003-dark-theme-extension.md) · [0004](../adr/0004-chart-palette-derivation.md) ·
[0005](../adr/0005-fluid-responsive-strategy.md)

## Scope

Turn `DESIGN.md` + [`docs/design/APP-EXTENSIONS.md`](../design/APP-EXTENSIONS.md) into a
running token system.

- Tokenize `DESIGN.md` into the Tailwind theme and shadcn CSS variables, **both modes**
  (re-tokenizing shadcn's cool-gray defaults to Clay tokens — see APP-EXTENSIONS §5).
- Inter via `next/font`, at weight 500 with -0.05em tracking (the Plain Black substitute).
- `next-themes` with the `.dark` class strategy, plus the toggle.
- The dark extension ([0003](../adr/0003-dark-theme-extension.md)).
- Fluid `clamp()` scales ([0005](../adr/0005-fluid-responsive-strategy.md)).
- **Derive and validate the chart palette** — vendor `scripts/validate_palette.js`, run it
  against Clay's real surfaces in both modes, fix every FAIL. The derivation and the validator
  transcripts are already written up in [0004](../adr/0004-chart-palette-derivation.md) and
  [`APP-EXTENSIONS.md` §2](../design/APP-EXTENSIONS.md#2-chart-palette) — this milestone wires
  the result into the codebase and commits the validator as a repeatable check.
- Write `docs/design/APP-EXTENSIONS.md` — **done**, this session, ahead of the code.

## Tests

- **Frontend:** the theme toggle flips the `.dark` class; tokens resolve to the correct values
  in both modes; a committed palette-validation check (the script, run in CI or as a pre-commit
  step) fails the build on a palette regression.

## Verify

Render the dashboard shell at 375px / 768px / 1440px in both themes and look at it — the
validator checks color, not layout.

## Progress log

- not started
