#!/usr/bin/env bash
# Runs every migration plus the security tests on a throwaway local Postgres.
# Needs the Postgres server binaries (initdb, pg_ctl, psql). Nothing here touches the live database.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | tail -1 || true)"; P="${BIN:+$BIN/}"
WORK="$(mktemp -d)"; chmod 755 "$WORK"
cp -r "$ROOT/migrations" "$ROOT/tests" "$WORK/"; chmod -R a+rX "$WORK"
SCRIPT="${P}initdb -D $WORK/data -A trust >/dev/null && ${P}pg_ctl -D $WORK/data -o '-p 5599 -k $WORK' -l $WORK/log -w start >/dev/null \
 && psql -h $WORK -p 5599 -d postgres -v ON_ERROR_STOP=1 -q -f $WORK/tests/stub.sql \$(ls $WORK/migrations/*.sql | sed 's/^/-f /') \
 && psql -h $WORK -p 5599 -d postgres -f $WORK/tests/security.sql; code=\$?; ${P}pg_ctl -D $WORK/data stop >/dev/null; exit \$code"
if [ "$(id -u)" = 0 ]; then chown -R postgres "$WORK"; su postgres -c "$SCRIPT"; else bash -c "$SCRIPT"; fi
