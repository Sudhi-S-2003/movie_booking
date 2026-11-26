#!/usr/bin/env bash
# Remove api_key_share-1.env from ALL git history.
#
# DESTRUCTIVE: rewrites every commit hash. Everyone with a clone must
# re-clone (or hard-reset) afterwards. Rotate the leaked key FIRST — the
# secret must be treated as compromised regardless of this purge.
#
# Requires git-filter-repo (pip install git-filter-repo).
# Usage: commit or stash your work, then run from the repo root:
#   bash scripts/purge-leaked-credentials.sh
# Review the result, then force-push yourself:
#   git push --force-with-lease origin main
set -euo pipefail

if [ -n "$(git status --porcelain)" ]; then
  echo "Working tree is not clean. Commit or stash first." >&2
  exit 1
fi
command -v git-filter-repo >/dev/null || { echo "Install git-filter-repo first." >&2; exit 1; }

REMOTE_URL="$(git remote get-url origin 2>/dev/null || true)"
git filter-repo --force --invert-paths --path api_key_share-1.env
# filter-repo removes 'origin' as a safety measure; restore it.
if [ -n "$REMOTE_URL" ]; then git remote add origin "$REMOTE_URL"; fi

echo "History rewritten. Verify with:  git log --all -- api_key_share-1.env   (should print nothing)"
echo "Then force-push:                 git push --force-with-lease origin main"
