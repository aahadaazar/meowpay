# MeowPay — Manual Testing Checklist

Use this checklist for a hands-on pass against a running MeowPay stack. It is not the milestone
tracker; milestone status remains in [docs/MILESTONES.md](../MILESTONES.md).

Record any failure with the date, browser, viewport, steps, expected result, actual result, and
any relevant console or network error.

## Before testing

- [ ] The frontend, backend, and Supabase project are running and configured.
- [ ] Test with two separate human accounts (Human A and Human B).
- [ ] Human A has at least two cats; Human B has at least one cat.
- [ ] Test in a private/incognito window or a second browser profile for Human B.
- [ ] Keep both dashboards open when testing realtime behaviour.

## Authentication and account setup

- [ ] A new user can sign up with email and password and reaches the dashboard.
- [ ] Invalid or incomplete sign-up input shows a useful validation error.
- [ ] An existing user can sign in and reaches the dashboard.
- [ ] Invalid credentials are rejected without signing in.
- [ ] Signing out returns the user to the signed-out experience.
- [ ] A signed-out visit to the dashboard redirects to login.
- [ ] A new cat can be created with a valid name.
- [ ] Invalid or empty cat input is rejected.
- [ ] A newly created cat appears on the dashboard with its wallet balance.

## Wallet funding

- [ ] Human A can top up their own human wallet using a preset or a valid custom amount.
- [ ] The human-wallet balance and Human A's total balance increase by the top-up amount.
- [ ] Human B cannot see Human A's cats, balances, or ledger activity.
- [ ] A top-up appears in the human-wallet ledger trail with the correct amount and time.
- [ ] The top-up flow does not let the user choose a recipient wallet.

## Transfers

- [ ] A transfer recipient is always a cat; a human wallet is not offered as a recipient.
- [ ] Human A can transfer treats from their own human wallet to one of their cats.
- [ ] Human A can transfer treats from one of their cats to another of their own cats.
- [ ] The confirmation dialog shows the correct sender, recipient, amount, and note before submit.
- [ ] Cancelling the confirmation dialog makes no balance change.
- [ ] A completed own-cat transfer debits the sender and credits the recipient by the same amount.
- [ ] Human A's combined total remains unchanged after a human → cat or own-cat → own-cat transfer.
- [ ] The transfer appears in the ledger trail with the correct amount, counterpart, note, and time.
- [ ] Human A can transfer from their cat to a cat owned by Human B.
- [ ] Human B sees the incoming transfer and updated balance without refreshing.
- [ ] Human A cannot select or send from a cat they do not own.
- [ ] Zero, negative, malformed, and over-balance amounts are rejected without changing balances.
- [ ] Re-submitting a completed confirmation does not create a duplicate transfer or double-charge.

## Realtime and ledger

- [ ] A top-up made in one open session appears in another relevant session without a refresh.
- [ ] A transfer updates all affected wallet cards and ledger trails without a refresh.
- [ ] The ledger is ordered newest first.
- [ ] Human A never receives Human B's wallet or ledger updates, and vice versa.
- [ ] Reloading the dashboard preserves the correct balances and recent activity.

## Activity charts

- [ ] Treat-flow chart shows credits above and debits below the zero line.
- [ ] Top-recipient chart reflects outgoing transfers and handles the “Other” grouping when present.
- [ ] Chart tooltips and legends are readable in both themes.
- [ ] Internal transfers between Human A's own cats do not inflate aggregate activity totals.
- [ ] Empty or sparse activity states render cleanly without errors.

## Visual and responsive pass

- [ ] Check the login and dashboard at 375px, 768px, and 1440px widths.
- [ ] Check light and dark themes at each viewport.
- [ ] Navigation, dialogs, forms, cards, ledger trail, and charts remain usable at each viewport.
- [ ] Buttons and preset controls remain tappable and do not overlap or clip.
- [ ] No browser-console errors occur during the main flows.

## Test record

| Date | Tester | Environment / browser | Result | Notes or issue link |
| --- | --- | --- | --- | --- |
|  |  |  |  |  |
