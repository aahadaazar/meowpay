# MeowPay — Manual Testing Checklist

Use this checklist for a hands-on pass against a running MeowPay stack. It is not the milestone
tracker; milestone status remains in [docs/MILESTONES.md](../MILESTONES.md).

Record any failure with the date, browser, viewport, steps, expected result, actual result, and
any relevant console or network error.

## Requested product changes

- Allow cats owned by one human to transfer treats to cats owned by another human. In transfer selectors, show both the cat and its human owner.
- Simplify human-wallet top-ups to a single **Add 1000 treats** button; remove the full preset/custom-amount top-up component.
- Make **Move treats** a separate modal feature. Follow the reference layout: From and To selectors, treats amount, optional note, and a **Review transfer** action.
- Keep human-to-own-cat funding as a separate, short flow; do not include it in the Move treats feature.
- When a cat receives treats from a human or another cat, show a notification and a temporary visual highlight (such as a glow) on the affected cat.
- In both the From and To selectors, pair every cat name with its owner's name so the owner is always clear.
- Paginate the ledger in both the frontend and backend, and present ledger activity in a drawer.
- Remove the hover interaction from Top recipients; show each recipient's total treats directly.
- Improve the dashboard chart layout so the distribution, treat-flow, and top-recipient visuals have enough room and do not feel cramped, using the supplied reference as the layout direction.
- Make empty activity states visually appealing with an icon and concise explanatory text.

## Before testing

- [x] The frontend, backend, and Supabase project are running and configured.
- [x] Test with two separate human accounts (Human A and Human B).
- [x] Human A has at least two cats; Human B has at least one cat.
- [x] Test in a private/incognito window or a second browser profile for Human B.
- [x] Keep both dashboards open when testing realtime behaviour.

## Authentication and account setup

- [x] A new user can sign up with email and password and reaches the dashboard.
- [x] Invalid or incomplete sign-up input shows a useful validation error.
- [x] An existing user can sign in and reaches the dashboard.
- [x] Invalid credentials are rejected without signing in.
- [x] Signing out returns the user to the signed-out experience.
- [x] A signed-out visit to the dashboard redirects to login.
- [x] A new cat can be created with a valid name.
- [x] Invalid or empty cat input is rejected.
- [x] A newly created cat appears on the dashboard with its wallet balance.

## Wallet funding

- [x] Human A can top up their own human wallet using a preset or a valid custom amount.
- [x] The human-wallet balance and Human A's total balance increase by the top-up amount.
- [x] Human B cannot see Human A's cats, balances, or ledger activity.
- [x] A top-up appears in the human-wallet ledger trail with the correct amount and time.
- [x] The top-up flow does not let the user choose a recipient wallet.

## Transfers

- [x] A transfer recipient is always a cat; a human wallet is not offered as a recipient.
- [x] Human A can transfer treats from their own human wallet to one of their cats.
- [x] Human A can transfer treats from one of their cats to another of their own cats.
- [x] The confirmation dialog shows the correct sender, recipient, amount, and note before submit.
- [x] Cancelling the confirmation dialog makes no balance change.
- [x] A completed own-cat transfer debits the sender and credits the recipient by the same amount.
- [x] Human A's combined total remains unchanged after a human → cat or own-cat → own-cat transfer.
- [x] The transfer appears in the ledger trail with the correct amount, counterpart, note, and time.
- [x] Human A can transfer from their cat to a cat owned by Human B.
- [x] Human B sees the incoming transfer and updated balance without refreshing.
- [x] Human A cannot select or send from a cat they do not own.
- [x] Zero, negative, malformed, and over-balance amounts are rejected without changing balances.
- [x] Re-submitting a completed confirmation does not create a duplicate transfer or double-charge.

## Realtime and ledger

- [x] A top-up made in one open session appears in another relevant session without a refresh.
- [x] A transfer updates all affected wallet cards and ledger trails without a refresh.
- [x] The ledger is ordered newest first.
- [x] Human A never receives Human B's wallet or ledger updates, and vice versa.
- [x] Reloading the dashboard preserves the correct balances and recent activity.

## Activity charts

- [x] Treat-flow chart shows credits above and debits below the zero line.
- [x] Top-recipient chart reflects outgoing transfers and handles the “Other” grouping when present.
- [x] Chart tooltips and legends are readable in both themes.
- [x] Internal transfers between Human A's own cats do not inflate aggregate activity totals.
- [x] Empty or sparse activity states render cleanly without errors.

## Visual and responsive pass

- [x] Check the login and dashboard at 375px, 768px, and 1440px widths.
- [x] Check light and dark themes at each viewport.
- [x] Navigation, dialogs, forms, cards, ledger trail, and charts remain usable at each viewport.
- [x] Buttons and preset controls remain tappable and do not overlap or clip.
- [x] No browser-console errors occur during the main flows.

## Test record

| Date | Tester | Environment / browser | Result | Notes or issue link |
| ---- | ------ | --------------------- | ------ | ------------------- |
|      |        |                       |        |                     |
