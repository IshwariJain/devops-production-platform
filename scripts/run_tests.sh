#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
APP_DIR="$PROJECT_ROOT/app"
VENV_DIR="$APP_DIR/venv"

echo "================================"
echo "Preparing test environment"
echo "================================"

cd "$APP_DIR"

if [ ! -d "$VENV_DIR" ]; then
    echo "Virtual environment not found. Creating it..."
    python3 -m venv "$VENV_DIR"
fi

echo "Installing test dependencies..."
"$VENV_DIR/bin/pip" install -r requirements-test.txt

echo "================================"
echo "Running application tests"
echo "================================"

"$VENV_DIR/bin/pytest" -v

echo "================================"
echo "All tests passed successfully!"
echo "================================"
