# Session-start prompts

Copy-paste one of these as the **first message** of a new session working on this repo. Each one
delegates the actual process to [`AGENTS.md`](../AGENTS.md) rather than re-explaining it — the
prompt's job is only to say *which* milestone and *what mode*.

## Default — continue where the last session left off

The one to use almost always. No milestone number to remember or get wrong.

```
Read AGENTS.md, then execute the next milestone.

Find it from docs/MILESTONES.md: the first milestone still marked "not started"
whose dependencies (AGENTS.md's dependency table) are all "done". If one is
marked "in progress" instead, resume that one first — read its Progress log to
see what's already committed before continuing.

Follow AGENTS.md's execution loop exactly: read the milestone doc and every ADR
it links (and DESIGN.md + APP-EXTENSIONS.md if it touches UI) before writing any
code; implement; write backend/frontend tests alongside without running them
unless I ask; attempt the Verify step if the environment supports it, and say
so explicitly if it doesn't; commit as you go with conventional commits scoped
to the milestone, never squashed; check the milestone's items against
AGENTS.md's Non-negotiables list; then mark it done and log it.

Stop and ask me before: creating the Supabase project, putting real credentials
in .env, or running docker compose — those need my input.
```

## Target a specific milestone

Use when you want a milestone done out of its default order, or re-verified.

```
Read AGENTS.md, then execute milestone M<N> specifically
(docs/milestones/M0<N>-*.md), following AGENTS.md's execution loop in full.
Confirm M<N>'s dependencies are already "done" in docs/MILESTONES.md before
starting — if they aren't, tell me instead of skipping ahead or building them
out of order.
```

## Resume a milestone left "in progress"

Use after an interrupted session, when you already know which milestone it was.

```
Read AGENTS.md. docs/MILESTONES.md shows M<N> as "in progress" — read its
Progress log and its recent commits to see what's already done, then continue
from there per AGENTS.md's execution loop. Don't redo work that's already
committed; don't restart the milestone from scratch.
```

## Status only — no implementation

Use to check in without spending a session on code.

```
Read docs/MILESTONES.md and report which milestones are done, in progress, or
not started, and which one is next per the dependency table in AGENTS.md.
Don't implement anything.
```

## Fix-forward on a broken assumption

Use when something implemented in an earlier milestone turns out to contradict
reality (e.g. Supabase's actual JWT signing mode, an API's actual behavior).

```
Read AGENTS.md's "Updating an ADR mid-implementation" section, then apply it:
<describe what was assumed, what's actually true, and which ADR/milestone it
affects>. Correct or supersede the ADR as that section specifies, then fix the
implementation to match. Don't just patch the code and leave the ADR reading
as if the old assumption still holds.
```
