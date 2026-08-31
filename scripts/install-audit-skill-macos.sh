#!/usr/bin/env bash
#
# Installs the hardened /audit Claude Code skill as a USER-LEVEL skill on
# macOS, so it is available from any project, not just this repository.
#
# Pinned source (never "latest" - an exact, verified commit):
#   repo:   https://github.com/parkourcafe/selena-ai-visibility
#   commit: 39de070afafb29cb3d647a8738756c45a7578de9
#   path:   .claude/skills/audit/
#
# What this script does, in order:
#   1. Fetches ONLY .claude/skills/audit/ at the pinned commit, via a
#      blobless + sparse-checkout git fetch (no full clone, no history,
#      no other files in the repo are ever downloaded).
#   2. Verifies every fetched file against a checksum manifest embedded
#      in this script (shasum -a 256 -c), generated from and matching
#      the repository at the pinned commit. Aborts on any mismatch,
#      before touching anything under ~/.claude.
#   3. Backs up any existing ~/.claude/skills/audit/ to
#      ~/.claude/skills/backups/audit-<UTC timestamp>/.
#   4. Installs the verified files to ~/.claude/skills/audit/.
#   5. Re-verifies the installed files against the same manifest.
#   6. Deletes the temporary download directory.
#
# What this script deliberately does NOT do:
#   - it does not run `git clone` on the full repository
#   - it does not install any dependency (no npm/pip/brew install, no
#     node_modules - the only tools used are git and shasum, both of
#     which ship with Xcode Command Line Tools / macOS)
#   - it does not modify any project repository on this machine
#   - it does not run a site audit or touch any website
#   - it requires this repository's private-repo git access; it does
#     not manage or ask for any credential itself, it just uses
#     whatever `git` on this machine is already configured to use
#     (the same credentials you use to clone/pull this repo normally)
#
# Usage:
#   bash scripts/install-audit-skill-macos.sh
#
# Safe to re-run any time; each run backs up whatever was there before
# installing the pinned version fresh.

set -euo pipefail

REPO_OWNER="parkourcafe"
REPO_NAME="selena-ai-visibility"
REPO_URL="https://github.com/${REPO_OWNER}/${REPO_NAME}.git"
COMMIT_SHA="39de070afafb29cb3d647a8738756c45a7578de9"
SOURCE_SUBPATH=".claude/skills/audit"

TARGET_DIR="${HOME}/.claude/skills/audit"
SKILLS_DIR="${HOME}/.claude/skills"
BACKUP_ROOT="${HOME}/.claude/skills/backups"

# shasum -a 256 checksum manifest for every file under .claude/skills/audit/
# at commit 39de070afafb29cb3d647a8738756c45a7578de9. This is the pinned
# source of truth this script verifies against - not "whatever we happened
# to download".
read -r -d '' CHECKSUM_MANIFEST <<'MANIFEST_EOF' || true
7cc0ce6ced7c805742d8526dd6b0b797e4746f92bbd22286495bd6c19ad8de4b  CHANGES.md
833f9216b7f16525e009b031ae91696721d380a3a5836f103d06451bffaff9c5  SKILL.md
e7df97a7aa3957652ec85286cba5082a1f5a5606892dff2b33b28d8eecdd1414  code/check_page_similarity.py
528d5c44909860cf3d0f8e8f85ff0753574d39129d6979709397825e476a6297  references/audit-report-template.html
885c600e0bf400787e82553ded19d79783f539d0a6a87d1ccf65bc4dd651bae5  references/citations.md
6200509b486537dfdb0fe3ba53b8db23acb0f0e01d122236c125c02dea7dfc70  references/doorway-pages.md
d8f1a1660eeb552e6a7c126225083d050515fc1f8827614fe9970377a9af72c5  references/gbp-setup.md
628a5d4ae9fca3605ce713074f712fd5157604ee09ca3c458cc4373111c36e99  references/geo.md
682d9e07f85b9287ad74132704dbeaf45762485febdcd75255272a351e47aacd  references/meta-info.md
e47e364e8d8eecce34e4e6236b46490b0203f42ce170412ce80602c6ec349d78  references/on-page-seo.md
b09de76339a28cbc9fbf4c2dceb397052c80e9ad950ee094c60b2922bdc7502b  references/pyramid-structure.md
62ff3ebd7ad145e044b5da79d4277edec9434080ef9d363a60f8c3342a0b5fae  references/wordpress-audit.md
MANIFEST_EOF

log()  { printf '==> %s\n' "$1"; }
fail() { printf 'ERROR: %s\n' "$1" >&2; exit 1; }

if [ "$(uname -s)" != "Darwin" ]; then
  printf 'WARNING: this installer targets macOS; detected %s. Continuing, since it only uses portable tools (git, shasum, mkdir, mv).\n' "$(uname -s)" >&2
fi

command -v git    >/dev/null 2>&1 || fail "git not found. Install Xcode Command Line Tools: xcode-select --install"
command -v shasum >/dev/null 2>&1 || fail "shasum not found (ships with macOS by default). Cannot verify integrity without it."

TMPDIR_CLONE="$(mktemp -d "${TMPDIR:-/tmp}/audit-skill-install.XXXXXX")"
cleanup() { rm -rf "${TMPDIR_CLONE}"; }
trap cleanup EXIT

log "Fetching ${SOURCE_SUBPATH} at commit ${COMMIT_SHA} (sparse, blobless - not a full clone)"
git -C "${TMPDIR_CLONE}" init -q
git -C "${TMPDIR_CLONE}" remote add origin "${REPO_URL}"
git -C "${TMPDIR_CLONE}" config core.sparseCheckout true
git -C "${TMPDIR_CLONE}" sparse-checkout init --cone
git -C "${TMPDIR_CLONE}" sparse-checkout set "${SOURCE_SUBPATH}"
if ! git -C "${TMPDIR_CLONE}" fetch --quiet --depth 1 --filter=blob:none origin "${COMMIT_SHA}"; then
  fail "Could not fetch commit ${COMMIT_SHA} from ${REPO_URL}. This repository is private - confirm your existing git credentials for it work, e.g.: git ls-remote ${REPO_URL}"
fi
git -C "${TMPDIR_CLONE}" checkout --quiet FETCH_HEAD

FETCHED_DIR="${TMPDIR_CLONE}/${SOURCE_SUBPATH}"
[ -d "${FETCHED_DIR}" ] || fail "Expected path ${SOURCE_SUBPATH} was not present at commit ${COMMIT_SHA} after fetch."

log "Verifying fetched files against the pinned checksum manifest (shasum -a 256 -c)"
EXPECTED_COUNT=$(printf '%s\n' "${CHECKSUM_MANIFEST}" | grep -c .)
ACTUAL_COUNT=$(find "${FETCHED_DIR}" -type f | wc -l | tr -d ' ')
[ "${ACTUAL_COUNT}" -eq "${EXPECTED_COUNT}" ] || fail "Expected ${EXPECTED_COUNT} files, fetched ${ACTUAL_COUNT}. Aborting - refusing to install a mismatched file set."

( cd "${FETCHED_DIR}" && printf '%s\n' "${CHECKSUM_MANIFEST}" | shasum -a 256 -c - ) \
  || fail "Checksum verification FAILED on the freshly fetched files. Nothing under ~/.claude was touched. Aborting."

log "All ${EXPECTED_COUNT} fetched files match the pinned source checksums."

mkdir -p "${SKILLS_DIR}"

BACKUP_PATH=""
if [ -e "${TARGET_DIR}" ]; then
  TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
  BACKUP_PATH="${BACKUP_ROOT}/audit-${TIMESTAMP}"
  mkdir -p "${BACKUP_ROOT}"
  log "Existing installation found at ${TARGET_DIR} - backing up to ${BACKUP_PATH}"
  mv "${TARGET_DIR}" "${BACKUP_PATH}"
else
  log "No existing installation at ${TARGET_DIR} - nothing to back up."
fi

log "Installing verified files to ${TARGET_DIR}"
mv "${FETCHED_DIR}" "${TARGET_DIR}"

log "Re-verifying installed files in place (proves source hashes == installed hashes)"
( cd "${TARGET_DIR}" && printf '%s\n' "${CHECKSUM_MANIFEST}" | shasum -a 256 -c - ) \
  || fail "Post-install verification FAILED. The installed copy does not match the pinned source. Investigate ${TARGET_DIR} before using it."

echo
echo "SUCCESS"
echo "Installed:  ${TARGET_DIR}"
echo "From:       ${REPO_URL} @ ${COMMIT_SHA}"
echo "Files:      ${EXPECTED_COUNT}/${EXPECTED_COUNT} verified (shasum -a 256)"
if [ -n "${BACKUP_PATH}" ]; then
  echo "Backup of previous install: ${BACKUP_PATH}"
  echo
  echo "To roll back this install:"
  echo "  rm -rf \"${TARGET_DIR}\" && mv \"${BACKUP_PATH}\" \"${TARGET_DIR}\""
fi
echo
echo "Next: open a NEW terminal in any project and run: claude"
echo "Then invoke the skill with: /audit <url>"
