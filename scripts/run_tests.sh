#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
APP_DIR="$PROJECT_ROOT/app"

echo "================================"
echo "Running application tests"
echo "================================"

cd "$APP_DIR"

source venv/bin/activate

pytest -v

echo "================================"
echo "All tests passed successfully!"
echo "================================"
