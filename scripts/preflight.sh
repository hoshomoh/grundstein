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

# Pushing to main deploys, and docs/DATA-SOURCES.md says to re-run the source check
# before any release. Saying so in a document did not make it happen: the catalogue went
# three days and several deploys past its date while the interface kept printing that
# date on every loan. This is the rule with teeth.
verified="$(grep -oE "CATALOGUE_VERIFIED_ON = '[0-9-]+'" src/domain/programmes.ts | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}')"
if [ -z "$verified" ]; then
  echo "preflight: cannot read CATALOGUE_VERIFIED_ON from src/domain/programmes.ts" >&2
  exit 1
fi

age=$(( ( $(date +%s) - $(date -d "$verified" +%s) ) / 86400 ))
if [ "$age" -gt "${GRUNDSTEIN_MAX_DATA_AGE_DAYS:-30}" ]; then
  cat >&2 <<MESSAGE

preflight: the KfW figures were last checked on $verified — $age days ago.

The interface prints that date on every loan, so it is a claim about how current the
numbers are. Re-read the sources listed in docs/DATA-SOURCES.md, compare them against
src/domain/programmes.ts and src/domain/states.ts, then move both VERIFIED_ON constants
and the dates in that file.

To push without re-checking — a fix that touches no figures, say — run:
  GRUNDSTEIN_MAX_DATA_AGE_DAYS=9999 ./scripts/preflight.sh
MESSAGE
  exit 1
fi
printf 'preflight: KfW figures checked %s days ago\n' "$age"

printf '\n\033[32m✓ preflight passed — safe to push\033[0m\n'
