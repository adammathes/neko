#!/bin/sh

HOOKS_DIR=$(git rev-parse --git-path hooks)
SCRIPT_DIR=$(dirname "$0")

echo "Installing git hooks to $HOOKS_DIR..."

cp "$SCRIPT_DIR/pre-push-hook.sh" "$HOOKS_DIR/pre-push"
chmod +x "$HOOKS_DIR/pre-push"

echo "Hooks installed successfully."
