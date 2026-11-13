#!/usr/bin/env bash
# Runs the Supabase SQL tests against a throwaway local Postgres cluster.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
[ -x "$PGBIN/initdb" ] || PGBIN="$(dirname "$(command -v initdb)")"

WORK="$(mktemp -d)"
RUN_AS=()
if [ "$(id -u)" = "0" ]; then
  # initdb/postgres refuse to run as root: use an unprivileged user.
  id postgres >/dev/null 2>&1 || useradd -m postgres
  chmod 755 "$WORK"
  chown postgres "$WORK"
  RUN_AS=(su postgres -s /bin/bash -c)
fi

run() { # run a shell command line as the cluster user
  if [ "${#RUN_AS[@]}" -gt 0 ]; then "${RUN_AS[@]}" "$1"; else bash -c "$1"; fi
}

PORT=$(( (RANDOM % 20000) + 40000 ))
SOCK="$WORK"
cleanup() {
  run "'$PGBIN/pg_ctl' -D '$WORK/data' -m immediate stop >/dev/null 2>&1" || true
  rm -rf "$WORK"
}
trap cleanup EXIT

# Files must be readable by the cluster user.
TESTDIR="$WORK/sql"
mkdir "$TESTDIR"
cp "$ROOT"/supabase/tests/*.sql "$ROOT"/supabase/migrations/*.sql "$TESTDIR"/ 2>/dev/null || true
chmod -R a+rX "$TESTDIR"

run "'$PGBIN/initdb' -D '$WORK/data' -A trust -U postgres >/dev/null"
run "'$PGBIN/pg_ctl' -D '$WORK/data' -o \"-p $PORT -k '$SOCK' -c listen_addresses=''\" -l '$WORK/pg.log' -w start >/dev/null"

PSQL="psql -X -q -h '$SOCK' -p $PORT -U postgres -v ON_ERROR_STOP=1"
run "$PSQL -d postgres -c 'create database app_test'" 
for f in stub_auth.sql 20261113000000_friends.sql friends.test.sql; do
  run "$PSQL -d app_test -f '$TESTDIR/$f'"
done
