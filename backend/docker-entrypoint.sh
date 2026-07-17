#!/bin/sh
set -eu

cache_dir=${GRADLE_USER_HOME:-/gradle-cache}
marker="$cache_dir/.meowpay-cache-ready"
migrations_dir=/opt/meowpay/migrations

# The bind mount hides image files, so seed the named Gradle cache volume once.
if [ ! -f "$marker" ]; then
  mkdir -p "$cache_dir"
  cp -a /opt/meowpay/gradle-home/. "$cache_dir/"
  touch "$marker"
fi

sql_scalar() {
  psql "$database_url" -v ON_ERROR_STOP=1 -Atqc "$1"
}

bootstrap_migration_history() {
  echo "MeowPay migrations: existing schema detected, bootstrapping history."
  for migration in "$migrations_dir"/0*.sql; do
    filename=$(basename "$migration")
    checksum=$(sha256sum "$migration" | awk '{print $1}')
    sql_scalar "insert into public.app_migrations (filename, checksum) values ('$filename', '$checksum') on conflict (filename) do update set checksum = excluded.checksum, applied_at = now()" >/dev/null
  done
}

run_migrations() {
  if [ -z "${SUPABASE_DB_URL:-}" ]; then
    echo "MeowPay migrations: SUPABASE_DB_URL is not set; skipping automatic migration step."
    return
  fi

  if [ ! -d "$migrations_dir" ]; then
    echo "MeowPay migrations: migration directory $migrations_dir is missing." >&2
    exit 1
  fi

  database_url=${SUPABASE_DB_URL#jdbc:}

  sql_scalar "create table if not exists public.app_migrations (filename text primary key, checksum text not null, applied_at timestamptz not null default now())" >/dev/null

  history_count=$(sql_scalar "select count(*) from public.app_migrations")
  if [ "$history_count" -eq 0 ]; then
    humans_present=$(sql_scalar "select case when to_regclass('public.humans') is null then 0 else 1 end")
    cats_present=$(sql_scalar "select case when to_regclass('public.cats') is null then 0 else 1 end")
    wallets_present=$(sql_scalar "select case when to_regclass('public.wallets') is null then 0 else 1 end")
    transfers_present=$(sql_scalar "select case when to_regclass('public.transfers') is null then 0 else 1 end")
    ledger_present=$(sql_scalar "select case when to_regclass('public.ledger_entries') is null then 0 else 1 end")
    transfer_fn_present=$(sql_scalar "select case when to_regprocedure('public.execute_transfer(uuid,uuid,uuid,bigint,text,text,uuid)') is null then 0 else 1 end")
    create_cat_fn_present=$(sql_scalar "select case when to_regprocedure('public.create_cat(uuid,text)') is null then 0 else 1 end")
    new_user_trigger_present=$(sql_scalar "select case when exists (select 1 from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace where not t.tgisinternal and n.nspname = 'auth' and c.relname = 'users' and t.tgname = 'on_auth_user_created') then 1 else 0 end")
    schema_objects_present=$(
      expr "$humans_present" + "$cats_present" + "$wallets_present" + "$transfers_present" + \
        "$ledger_present" + "$transfer_fn_present" + "$create_cat_fn_present" + "$new_user_trigger_present"
    )

    if [ "$schema_objects_present" -eq 8 ]; then
      bootstrap_migration_history
      return
    fi

    if [ "$schema_objects_present" -ne 0 ]; then
      echo "MeowPay migrations: partial schema detected with no migration history; refusing automatic replay." >&2
      echo "Reset or reconcile the MeowPay objects manually, then restart the backend container." >&2
      exit 1
    fi
  fi

  for migration in "$migrations_dir"/0*.sql; do
    filename=$(basename "$migration")
    checksum=$(sha256sum "$migration" | awk '{print $1}')
    applied_checksum=$(sql_scalar "select checksum from public.app_migrations where filename = '$filename'")

    if [ -n "$applied_checksum" ]; then
      if [ "$applied_checksum" != "$checksum" ]; then
        echo "MeowPay migrations: $filename changed after it was applied; refusing automatic replay." >&2
        echo "Reset the MeowPay schema or record a new append-only migration before restarting." >&2
        exit 1
      fi
      echo "MeowPay migrations: $filename already applied."
      continue
    fi

    echo "MeowPay migrations: applying $filename"
    psql "$database_url" -v ON_ERROR_STOP=1 -f "$migration"
    sql_scalar "insert into public.app_migrations (filename, checksum) values ('$filename', '$checksum')" >/dev/null
  done
}

run_migrations

exec "$@"
