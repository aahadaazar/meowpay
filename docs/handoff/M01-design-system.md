# M1 Handoff - Design system

**Status:** complete on 2026-07-15  
**Milestone record:** [M01](../milestones/M01-design-system.md)  
**Decision records:** [ADR 0002](../adr/0002-adopt-clay-design-system-and-extension-strategy.md),
[ADR 0003](../adr/0003-dark-theme-extension.md),
[ADR 0004](../adr/0004-chart-palette-derivation.md),
[ADR 0005](../adr/0005-fluid-responsive-strategy.md)

## Delivered

- Clay tokens are wired into `frontend/app/globals.css` and `frontend/tailwind.config.ts`,
  replacing shadcn's neutral defaults with cream canvas, warm surfaces, Clay radii, display
  type clamps, brand colors, and chart tokens.
- Dark mode is implemented with `next-themes` using the `.dark` class strategy, assembled from
  the documented Clay dark tokens and the `button-on-color` inversion.
- Inter is loaded through `next/font/google` at weights 400 / 500 / 600, with display Tailwind
  tokens using the M1 `clamp()` sizes and `-0.05em` tracking.
- `frontend/components/theme-provider.tsx` and `frontend/components/theme-toggle.tsx` provide
  the product-surface theme wrapper and 44px icon toggle.
- The root page is now a tokenized dashboard shell: header, total band, card grid, chart-palette
  swatches, and a trail surface. It intentionally remains static and does not implement M4
  realtime dashboard behavior early.
- `scripts/validate_palette.js` vendors the repeatable palette check and `frontend/package.json`
  wires it into `prebuild` as `npm run validate:palette`.

## Tests authored, not run

- `frontend/app/design-tokens.test.ts` checks light-mode shadcn variables, dark-mode extension
  variables, and the derived five-slot chart palette.
- `frontend/components/theme-toggle.test.tsx` checks that the toggle flips the `.dark` class.
- `frontend/test/setup.ts` mocks `next/font/google` for Vitest.

Tests were intentionally not executed, following the milestone method.

## Verification status

- Palette validation was run with Windows Node `v20.19.3`:
  `node scripts/validate_palette.js --check`. All categorical, sequential, and diverging checks
  passed against light `#fffaf0` and dark `#1a2a2a` surfaces.
- The dashboard shell was rendered through Next dev server and inspected in Chrome at 375px,
  768px, and 1440px in both light and dark. The captures were nonblank, stayed within the
  viewport, and showed no obvious text overlap.
- Frontend dependencies were installed temporarily for verification and then removed. No Docker
  Compose run was performed, and no real credentials were created or edited.
- During install, npm reported advisories for the pinned scaffold dependency set, including
  `next@14.2.15`. M1 did not upgrade framework versions because that is outside the milestone
  scope.

## Commit trail

- `85e4595 docs(m1): mark design system in progress`
- `3994917 feat(m1): tokenize clay design system`
- `ce5a145 test(m1): add palette and theme checks`
- `af2c9f3 docs(m1): mark design system done`

## Next milestone

M2, [Ledger core](../milestones/M02-ledger-core.md), is the next eligible milestone. Before
implementation, read its milestone file and ADRs 0006-0010 in full. M2 owns the Supabase
migrations, ledger-first money movement, treasury funding model, `execute_transfer`, and
idempotency/status behavior. It does not require UI design docs unless its scope changes.

## Worktree note

At handoff, unrelated pre-existing edits remain in the ADR files and M02-M10 milestone files.
They were not altered by M1 and should be preserved while continuing the work.
