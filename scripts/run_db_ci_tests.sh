#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

CI_RUN_ID="$(printf '%s' "${JOB_NAME:-local}-${BUILD_NUMBER:-local}" | sha256sum | cut -c1-12)"
CI_DB_CONTAINER="devops-postgres-ci-${CI_RUN_ID}"
CI_DB_USER="ci_test_user"
CI_DB_NAME="ci_test_db"
CI_NETWORK="ci-network"

CI_DB_PASSWORD="$(openssl rand -hex 24)"

CI_DB_CONTAINER_ID=""

cleanup() {
    if [ -n "$CI_DB_CONTAINER_ID" ]; then
        echo "Cleaning up temporary CI database..."
        docker rm -f "$CI_DB_CONTAINER_ID" >/dev/null 2>&1 || true
    fi
}

trap cleanup EXIT

echo "===== Starting Temporary PostgreSQL ====="

CI_DB_CONTAINER_ID="$(docker run -d \
    --name "$CI_DB_CONTAINER" \
    --network "$CI_NETWORK" \
    -e POSTGRES_USER="$CI_DB_USER" \
    -e POSTGRES_PASSWORD="$CI_DB_PASSWORD" \
    -e POSTGRES_DB="$CI_DB_NAME" \
    postgres:16)"

echo "===== Waiting for PostgreSQL Readiness ====="

READY=0

for i in $(seq 1 30); do
    if docker exec "$CI_DB_CONTAINER" \
        psql -v ON_ERROR_STOP=1 -U "$CI_DB_USER" -d "$CI_DB_NAME" \
        -tAc "SELECT 1" >/dev/null 2>&1; then
        READY=1
        break
    fi

    sleep 2
done

if [ "$READY" -ne 1 ]; then
    echo "ERROR: PostgreSQL did not become ready"
    exit 1
fi

echo "===== Initializing Test Database ====="

docker exec -i "$CI_DB_CONTAINER" \
    psql -v ON_ERROR_STOP=1 \
    -U "$CI_DB_USER" -d "$CI_DB_NAME" <<'SQL'

CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

SQL

echo "===== Running PostgreSQL Integration Test ====="

export TEST_DATABASE_URL="postgresql+psycopg://${CI_DB_USER}:${CI_DB_PASSWORD}@${CI_DB_CONTAINER}:5432/${CI_DB_NAME}"
export REQUIRE_DB_TEST=1

cd "$PROJECT_ROOT/app"

./venv/bin/pytest -v test_database.py

echo "===== PostgreSQL Integration Test PASSED ====="
