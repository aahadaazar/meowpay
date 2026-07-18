#!/bin/sh
set -eu

usage() {
  cat <<'EOF'
Usage: ./scripts/cleanup_supabase.sh [--dry-run] [--yes]

Removes MeowPay e2e test data from the configured Supabase database while
keeping the schema, migration history, and treasury wallet seed intact.

Defaults:
  --dry-run   Preview counts only (default)
  --yes       Execute the cleanup

Environment:
  SUPABASE_DB_URL              Required. JDBC or postgres URL for Supabase.
  MEOWPAY_TEST_EMAIL_LIKE      Optional. Email pattern to target.
                               Default: %@meowpay.test

Examples:
  ./scripts/cleanup_supabase.sh
  ./scripts/cleanup_supabase.sh --yes
  MEOWPAY_TEST_EMAIL_LIKE='smoke-%@meowpay.test' ./scripts/cleanup_supabase.sh --yes
EOF
}

mode="dry-run"

for arg in "$@"; do
  case "$arg" in
    --dry-run)
      mode="dry-run"
      ;;
    --yes)
      mode="execute"
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [ -z "${SUPABASE_DB_URL:-}" ]; then
  echo "SUPABASE_DB_URL is required." >&2
  exit 1
fi

database_url=${SUPABASE_DB_URL#jdbc:}
test_email_like=${MEOWPAY_TEST_EMAIL_LIKE:-%@meowpay.test}

print_preview() {
  psql "$database_url" \
    -v ON_ERROR_STOP=1 \
    -v test_email_like="$test_email_like" \
    -At <<'SQL'
WITH target_auth_users AS (
    SELECT id, email
    FROM auth.users
    WHERE email LIKE :'test_email_like'
),
target_humans AS (
    SELECT h.id, h.email
    FROM public.humans h
    WHERE h.id IN (SELECT id FROM target_auth_users)
       OR h.email LIKE :'test_email_like'
),
target_cats AS (
    SELECT c.id
    FROM public.cats c
    WHERE c.human_id IN (SELECT id FROM target_humans)
),
target_wallets AS (
    SELECT w.id
    FROM public.wallets w
    WHERE w.human_id IN (SELECT id FROM target_humans)
       OR w.cat_id IN (SELECT id FROM target_cats)
),
target_transfers AS (
    SELECT t.id
    FROM public.transfers t
    WHERE t.sender_wallet_id IN (SELECT id FROM target_wallets)
       OR t.receiver_wallet_id IN (SELECT id FROM target_wallets)
       OR t.initiated_by IN (SELECT id FROM target_humans)
),
target_ledger_entries AS (
    SELECT le.id
    FROM public.ledger_entries le
    WHERE le.wallet_id IN (SELECT id FROM target_wallets)
       OR le.counterparty_wallet_id IN (SELECT id FROM target_wallets)
       OR le.initiated_by IN (SELECT id FROM target_humans)
)
SELECT 'auth.users=' || (SELECT count(*) FROM target_auth_users)
UNION ALL
SELECT 'public.humans=' || (SELECT count(*) FROM target_humans)
UNION ALL
SELECT 'public.cats=' || (SELECT count(*) FROM target_cats)
UNION ALL
SELECT 'public.wallets=' || (SELECT count(*) FROM target_wallets)
UNION ALL
SELECT 'public.transfers=' || (SELECT count(*) FROM target_transfers)
UNION ALL
SELECT 'public.ledger_entries=' || (SELECT count(*) FROM target_ledger_entries)
ORDER BY 1;
SQL
}

run_cleanup() {
  psql "$database_url" \
    -v ON_ERROR_STOP=1 \
    -v test_email_like="$test_email_like" <<'SQL'
BEGIN;

CREATE TEMP TABLE target_auth_users ON COMMIT DROP AS
SELECT id, email
FROM auth.users
WHERE email LIKE :'test_email_like';

CREATE TEMP TABLE target_humans ON COMMIT DROP AS
SELECT h.id, h.email
FROM public.humans h
WHERE h.id IN (SELECT id FROM target_auth_users)
   OR h.email LIKE :'test_email_like';

CREATE TEMP TABLE target_cats ON COMMIT DROP AS
SELECT c.id
FROM public.cats c
WHERE c.human_id IN (SELECT id FROM target_humans);

CREATE TEMP TABLE target_wallets ON COMMIT DROP AS
SELECT w.id
FROM public.wallets w
WHERE w.human_id IN (SELECT id FROM target_humans)
   OR w.cat_id IN (SELECT id FROM target_cats);

DELETE FROM public.ledger_entries le
WHERE le.wallet_id IN (SELECT id FROM target_wallets)
   OR le.counterparty_wallet_id IN (SELECT id FROM target_wallets)
   OR le.initiated_by IN (SELECT id FROM target_humans);

DELETE FROM public.transfers t
WHERE t.sender_wallet_id IN (SELECT id FROM target_wallets)
   OR t.receiver_wallet_id IN (SELECT id FROM target_wallets)
   OR t.initiated_by IN (SELECT id FROM target_humans);

DELETE FROM public.humans h
WHERE h.id IN (SELECT id FROM target_humans);

DELETE FROM auth.users u
WHERE u.id IN (SELECT id FROM target_auth_users);

COMMIT;

WITH target_auth_users AS (
    SELECT id
    FROM auth.users
    WHERE email LIKE :'test_email_like'
),
target_humans AS (
    SELECT id
    FROM public.humans
    WHERE id IN (SELECT id FROM target_auth_users)
       OR email LIKE :'test_email_like'
),
target_cats AS (
    SELECT c.id
    FROM public.cats c
    WHERE c.human_id IN (SELECT id FROM target_humans)
),
target_wallets AS (
    SELECT w.id
    FROM public.wallets w
    WHERE w.human_id IN (SELECT id FROM target_humans)
       OR w.cat_id IN (SELECT id FROM target_cats)
),
target_transfers AS (
    SELECT t.id
    FROM public.transfers t
    WHERE t.sender_wallet_id IN (SELECT id FROM target_wallets)
       OR t.receiver_wallet_id IN (SELECT id FROM target_wallets)
       OR t.initiated_by IN (SELECT id FROM target_humans)
),
target_ledger_entries AS (
    SELECT le.id
    FROM public.ledger_entries le
    WHERE le.wallet_id IN (SELECT id FROM target_wallets)
       OR le.counterparty_wallet_id IN (SELECT id FROM target_wallets)
       OR le.initiated_by IN (SELECT id FROM target_humans)
)
SELECT 'Remaining auth.users: ' || (SELECT count(*) FROM target_auth_users)
UNION ALL
SELECT 'Remaining public.humans: ' || (SELECT count(*) FROM target_humans)
UNION ALL
SELECT 'Remaining public.cats: ' || (SELECT count(*) FROM target_cats)
UNION ALL
SELECT 'Remaining public.wallets: ' || (SELECT count(*) FROM target_wallets)
UNION ALL
SELECT 'Remaining public.transfers: ' || (SELECT count(*) FROM target_transfers)
UNION ALL
SELECT 'Remaining public.ledger_entries: ' || (SELECT count(*) FROM target_ledger_entries);
SQL
}

echo "Target email pattern: $test_email_like"
echo "Previewing cleanup scope in Supabase..."
print_preview

if [ "$mode" = "dry-run" ]; then
  echo
  echo "Dry run only. Re-run with --yes to delete those rows."
  exit 0
fi

echo
echo "Executing cleanup..."
run_cleanup
