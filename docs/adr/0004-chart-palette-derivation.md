# 0004. Chart palette — derived from Clay's hues, validated against Clay's surfaces

**Status:** Accepted · **Date:** 2026-07-15 · **Milestone:** [M1](../milestones/M01-design-system.md)

> Every hex in this document came out of `validate_palette.js`. The transcripts are included
> rather than summarised, because "we ran it" is not a claim a reader should have to take on
> trust.

## Context

`DESIGN.md` ships no chart palette. It ships **feature-card fills** — seven saturated brand
hues specified as 24px surfaces you sit *on*, with text placed over them.

A data mark has the opposite job: it is small, it must be legible **against** the surface, and
it must be separable from its neighbour under color-vision deficiency. Reusing card fills as
series colors is the most common way a brand-faithful chart becomes unreadable.

MeowPay needs three color jobs: **diverging** (treat flow — credits above the line, debits
below), **sequential** (top recipients), and a **categorical** set for anything with series
identity. The surfaces are Clay's real ones: `canvas` #fffaf0 in light,
`surface-dark-elevated` #1a2a2a in dark ([0003](0003-dark-theme-extension.md)).

## Decision

**Derive the palette by procedure and validate it with a script. Never eyeball it.**

Method: hold each brand hue's **OKLCH hue angle** — the brand identity — and step *lightness*
until the step clears the lightness band, the chroma floor (C ≥ 0.10) and 3:1 against **both**
real surfaces. Then enumerate slot orderings and keep the one maximising the minimum adjacent
CVD ΔE, because **ordering is the CVD-safety mechanism**, not a cosmetic choice.

### The finding: the brand hues fail as data marks

Measured on `canvas` #fffaf0:

| Brand hue | Contrast | |
|---|---|---|
| `brand-peach` #ffb084 | **1.71** | fails |
| `brand-ochre` #e8b94a | **1.76** | fails |
| `brand-mint` #a4d4c5 | **1.58** | fails |
| `brand-lavender` #b8a4ed | **2.11** | fails |
| `brand-coral` #ff6b5a | **2.69** | fails |
| `brand-pink` #ff4d8b | 3.02 | passes, barely |
| `brand-teal` #1a3a3a | 11.80 | passes — but chroma 0.038: reads as **ink**, not a hue |

Six of seven fail on the brand's own canvas. Peach and ochre were predicted to fail; they do.
The raw set also collapses on identity — worst adjacent pair `#e8b94a↔#ffb084` at **ΔE 5.0**
(deutan), **8.1** normal-vision.

**A correction to the expected result, recorded because it was measured rather than assumed:**
the working assumption was that dark would "mostly pass as-is" while light needed darker steps.
False. The brand hues sit at OKLCH L **0.686–0.832**; the dark lightness band is **0.48–0.67**.
They are too light for *dark* as well. Both modes need darker steps — light for contrast, dark
for the band.

### Result: 5 categorical slots, one set for both modes

| Slot | Hue | Hex | OKLCH L |
|---|---|---|---|
| 1 | ochre | `#a87f00` | 0.62 |
| 2 | mint | `#009d81` | 0.62 |
| 3 | peach | `#d16100` | 0.62 |
| 4 | teal | `#009a9a` | 0.62 |
| 5 | coral | `#e24a3c` | 0.62 |

```
$ node scripts/validate_palette.js "#a87f00,#009d81,#d16100,#009a9a,#e24a3c" \
      --mode light --surface "#fffaf0"

Palette (light, surface #fffaf0, categorical): 5 slots
  [PASS] Lightness band         all 5 inside L 0.43–0.77
  [PASS] Chroma floor           all 5 >= 0.1
  [PASS] CVD separation         worst adjacent #009d81↔#a87f00 ΔE 11.6 (protan) · tritan 19.8
  [PASS] Normal-vision floor    worst adjacent #009d81↔#a87f00 ΔE 17.1 (normal)
  [PASS] Contrast vs surface    all 5 >= 3:1
  → ALL CHECKS PASS

$ node scripts/validate_palette.js "#a87f00,#009d81,#d16100,#009a9a,#e24a3c" \
      --mode dark --surface "#1a2a2a"

Palette (dark, surface #1a2a2a, categorical): 5 slots
  [PASS] Lightness band         all 5 inside L 0.48–0.67
  [PASS] Chroma floor           all 5 >= 0.1
  [PASS] CVD separation         worst adjacent #009d81↔#a87f00 ΔE 11.6 (protan) · tritan 19.8
  [PASS] Normal-vision floor    worst adjacent #009d81↔#a87f00 ΔE 17.1 (normal)
  [PASS] Contrast vs surface    all 5 >= 3:1
  → ALL CHECKS PASS
```

**One set serves both modes — and that is a validated outcome, not a shortcut.** The standing
rule is that dark steps are *selected* for the dark surface, never auto-flipped from light. Both
surfaces were run independently and the same step passed both, because Clay's surfaces sit at
opposite extremes (cream L≈0.98, dark-elevated L≈0.29): a mid-lightness mark at L 0.62 clears
3:1 against each. Had it not passed, a separate dark column would have been derived.

**The series cap is five, and it is derived.** Best ordering of six reaches normal-vision ΔE
**14.5**, below the floor of 15 — in both modes. Clay's hue wheel is warm-clustered (pink 4°,
coral 29°, peach 50°, ochre 86° inside 82° of arc; only mint 174° / teal 195° cool), and the
collapses are structural:

| Pair | CVD ΔE | Normal ΔE |
|---|---|---|
| `ochre ↔ peach` | **0** | 12 |
| `mint ↔ teal` | **4** | 4 |
| `pink ↔ coral` | **8** | 8 |

A sixth series folds into **"Other"**. It never gets a generated hue.

### Sequential — teal, validated as an ordinal ramp

**Teal, not lavender** — lavender is reserved for agents by the system's own Iteration Guide
("lavender for AI-agent products").

| | | | | | light-end |
|---|---|---|---|---|---|
| **Light** | `#00bcbc` | `#009a9a` | `#007879` | `#005959` | 2.26:1 PASS |
| **Dark** | `#00caca` | `#00abab` | `#008989` | `#006969` | 2.29:1 PASS |

Both runs: monotone lightness, all gaps ≥ 0.06, hue spread 1°/0°, ALL CHECKS PASS. Dark flips
the anchor — the step nearest the surface is the darkest, so the dark ramp is bounded at
`#006969` rather than at the light end.

### Diverging — teal ↔ coral, neutral midpoint

| Role | Light | Dark |
|---|---|---|
| Credit (teal) | `#009a9a` | `#00abab` |
| Debit (coral) | `#e24a3c` | `#f45b4b` |
| Midpoint | `surface-strong` #ebe6d6 | `#4a4a4a` |

Teal is cool (195°), coral warm (29°) — they read as opposite. Separation **CVD ΔE 11.7,
normal 29.9**.

`brand-teal` #1a3a3a is **not** the pole: at 11.80:1 on cream with chroma 0.038 it reads as
black, and a black pole kills the two-hue read the form depends on. The teal pole takes a
**mid-step**.

The dark midpoint is a **true neutral** and deliberately *not* an alpha-white over the dark
surface — that would inherit `surface-dark-elevated`'s teal tint and place a faint **teal at the
midpoint**, biasing the credit pole. The midpoint must read as "nothing".

### Debits are not errors — enforced structurally

The `error` token is never used for outflow. But measurement shows avoiding the token is **not
sufficient**. Clay's brand hues overlap its own semantic palette, because both are warm
(ΔE < 15 means a reader cannot reliably separate them):

| Candidate | vs `success` | vs `warning` | vs `error` | |
|---|---|---|---|---|
| ochre `#a87f00` | 20.5 | 15.9 | 18.3 | free |
| teal `#009a9a` | 17.2 | 28.3 | 31.3 | free |
| lavender `#9367e9` | 37.9 | 35.8 | 28.0 | free (reserved for agents) |
| peach `#d16100` | 29.2 | 16.0 | **9.1** | reads as `error` |
| coral `#e24a3c` | 34.8 | 19.5 | **2.7** | reads as `error` |
| pink `#dd4679` | 37.9 | 24.5 | **7.8** | reads as `error` |
| mint `#009d81` | **14.1** | 26.9 | 31.5 | reads as `success` |

**The coral debit pole sits ΔE 2.7 from `error` #ef4444 — perceptually the same red.** Every
warm brand hue does. Since the diverging pair needs a warm pole opposite teal, this cannot be
solved by picking a different brand hue; it is solved by never letting hue carry the meaning:

- Debits are **below the zero line**. Position carries the sign — intrinsic to the form and the
  strongest secondary encoding available.
- Status ships with **icon + label, never color alone**, so a failed transfer reads as failed
  without reference to its red.
- The trail's direction is a **labelled badge** ("Sent" / "Received"), not a colored cell.

No reader ever has to distinguish debit-coral from error-red by hue, because neither carries its
meaning by hue alone.

## Consequences

- The charts are brand-recognisable — every hue angle is Clay's — and legible in both modes,
  which the raw brand hues are not.
- **The palette is reproducible.** The validator is vendored to `scripts/validate_palette.js` and
  wired as a committed check in M1, so the runs above are repeatable rather than a claim in a
  document. Changing a hue means re-running, not re-arguing.
- **Five series maximum**, then "Other". A property of Clay's hue wheel, not of the method.
- Dark mode loses no palette fidelity — the same steps pass.
- The validator checks **color, not layout**. Label collision, tick density and reflow are
  verified by rendering at 375 / 768 / 1440px in both modes.

## Alternatives considered

**Use the brand hues directly as series colors.** Maximum brand fidelity, zero derivation, and
the obvious thing to do. Rejected on measurement: six of seven fail contrast on Clay's own
canvas (peach 1.71:1, mint 1.58:1), and peach↔ochre collapse to **ΔE 0** under deuteranopia —
literally the same color. A chart in the brand's exact hues that cannot be read is not brand
fidelity.

**Eyeball darker versions of the brand hues.** Fast, and would probably have looked fine.
Rejected: "looks different enough" is exactly the failure the validator exists to prevent —
peach↔ochre look distinct to full-color vision and are identical under CVD. Taste cannot see
deuteranopia.

**Import a known-good palette (Tableau 10, Viridis, the skill's own default).** Guaranteed to
pass every check on day one. Rejected: it discards the brand entirely. The whole exercise is a
Clay-derived product; shipping generic blue/orange series would make the charts the one part of
the app with no relationship to the design system. Deriving from Clay's hue angles keeps the
brand and buys the same guarantees.

**Lavender as the sequential ramp.** It has the best separation of any Clay hue (ΔE 28–38 from
every status token) and a wide usable lightness range — on the numbers it is the *best*
sequential candidate. Rejected on semantics: the system assigns lavender to AI-agent products,
and MeowPay uses it for the agentic surfaces. A lavender chart ramp would make every bar look
agent-authored.

**A neutral-grey midpoint derived from the dark hairline** (`rgba(255,255,255,0.10)` over the
surface). One token, no new value. Rejected: it inherits the surface's teal tint, putting a hue
at the diverging midpoint and biasing the teal pole. `#4a4a4a` is added instead.

**Drop the diverging form; use one color and a signed axis.** Removes the error-red adjacency
entirely. Rejected: credits-above / debits-below maps literally onto
`ledger_entries.direction`, and the two-hue read is what makes net flow legible at a glance. The
adjacency is mitigated by position and labelling instead.
