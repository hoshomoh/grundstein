#!/usr/bin/env bash
# Exactly what CI runs, in the same order. Run it before every commit.
set -euo pipefail

cd "$(dirname "$0")/.."

step() { printf '\n\033[1m── %s\033[0m\n' "$1"; }

step "format"
pnpm format:check

step "lint"
pnpm lint

step "typecheck"
pnpm typecheck

step "test"
pnpm test

step "build"
pnpm build

printf '\n\033[32m✓ ci passed\033[0m\n'
