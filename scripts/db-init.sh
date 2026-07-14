#!/usr/bin/env bash
# 初始化本地 PostgreSQL：创建 scp 角色与 scp_dev / scp_test 两库（幂等）。
set -euo pipefail

service postgresql start >/dev/null 2>&1 || true
sleep 1

su postgres -c "psql -qc \"DO \\\$\\\$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='scp') THEN CREATE ROLE scp LOGIN PASSWORD 'scp_dev_pw'; END IF; END \\\$\\\$;\""
for db in scp_dev scp_test; do
  su postgres -c "psql -tc \"SELECT 1 FROM pg_database WHERE datname='$db'\"" | grep -q 1 || su postgres -c "createdb $db"
  su postgres -c "psql -qd $db -c 'ALTER SCHEMA public OWNER TO scp;'"
  su postgres -c "psql -qc 'ALTER DATABASE $db OWNER TO scp;'"
done
echo "PostgreSQL ready: scp_dev / scp_test (user=scp)"
