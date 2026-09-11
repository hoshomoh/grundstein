#!/usr/bin/env bash
# Check out HEAD somewhere else, install from the lockfile, and run ci.sh there —
# so what passes is what you are about to push, not a working tree that has moved on.
set -euo pipefail

cd "$(dirname "$0")/.."
repo="$(pwd)"

if ! git diff-index --quiet HEAD --; then
  echo "preflight: working tree is dirty. Commit first — preflight tests HEAD, not your tree." >&2
  exit 1
fi

tmpdir="$(mktemp -d -t grundstein-preflight-XXXXXX)"
worktree="$tmpdir/tree"
cleanup() {
  git -C "$repo" worktree remove --force "$worktree" >/dev/null 2>&1 || true
  rm -rf "$tmpdir"
}
trap cleanup EXIT

echo "preflight: checking out $(git rev-parse --short HEAD) into $worktree"
git -C "$repo" worktree add --detach --quiet "$worktree" HEAD

cd "$worktree"
pnpm install --frozen-lockfile
./scripts/ci.sh

printf '\n\033[32m✓ preflight passed — safe to push\033[0m\n'
