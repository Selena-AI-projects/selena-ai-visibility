#!/usr/bin/env bash
#
# Verifies a user-level install of the /audit Claude Code skill on macOS,
# produced by scripts/install-audit-skill-macos.sh.
#
# Pinned source (must match the installer):
#   repo:   https://github.com/parkourcafe/selena-ai-visibility
#   commit: 39de070afafb29cb3d647a8738756c45a7578de9
#   path:   .claude/skills/audit/
#
# Checks, in order:
#   1. ~/.claude/skills/audit/SKILL.md exists.
#   2. All 12 expected files exist.
#   3. Every file's shasum -a 256 matches the pinned checksum manifest.
#   4. Claude Code actually discovers the "audit" skill when invoked from
#      an unrelated, freshly created temporary directory (proves this is
#      a real user-level/global skill, not something only visible inside
#      this repository) - the temporary directory is deleted afterward.
#
# This script only reads ~/.claude/skills/audit and runs one lightweight,
# non-interactive `claude -p` call for check 4 (a real Claude Code
# invocation, so it uses a small amount of API usage). It does not modify
# the installation, does not touch any project repository, and does not
# run a site audit.
#
# Usage:
#   bash scripts/verify-audit-skill-macos.sh
#
# Exit code 0 = all checks passed. Non-zero = at least one check failed.

set -uo pipefail

TARGET_DIR="${HOME}/.claude/skills/audit"
EXPECTED_COMMIT="39de070afafb29cb3d647a8738756c45a7578de9"

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

PASS=0
FAIL=0
ok()  { printf '  [OK]   %s\n' "$1"; PASS=$((PASS+1)); }
bad() { printf '  [FAIL] %s\n' "$1"; FAIL=$((FAIL+1)); }

echo "=== 1. SKILL.md exists ==="
if [ -f "${TARGET_DIR}/SKILL.md" ]; then
  ok "${TARGET_DIR}/SKILL.md"
else
  bad "${TARGET_DIR}/SKILL.md not found"
fi

echo
echo "=== 2. All 12 expected files exist ==="
EXPECTED_FILES=$(printf '%s\n' "${CHECKSUM_MANIFEST}" | awk '{print $2}')
while IFS= read -r rel; do
  [ -z "${rel}" ] && continue
  if [ -f "${TARGET_DIR}/${rel}" ]; then
    ok "${rel}"
  else
    bad "${rel} missing"
  fi
done <<< "${EXPECTED_FILES}"

echo
echo "=== 3. Checksums match the pinned source (commit ${EXPECTED_COMMIT}) ==="
if [ -d "${TARGET_DIR}" ]; then
  if ( cd "${TARGET_DIR}" && printf '%s\n' "${CHECKSUM_MANIFEST}" | shasum -a 256 -c - ) 2>/tmp/verify-audit-shasum.$$.log; then
    ok "all 12 files match shasum -a 256"
  else
    bad "one or more files do not match the pinned checksums:"
    sed 's/^/         /' /tmp/verify-audit-shasum.$$.log >&2
  fi
  rm -f /tmp/verify-audit-shasum.$$.log
else
  bad "${TARGET_DIR} does not exist - cannot check checksums"
fi

echo
echo "=== 4. Claude Code discovers /audit from an unrelated temp directory ==="
if ! command -v claude >/dev/null 2>&1; then
  bad "claude CLI not found on PATH - cannot run the discovery test"
else
  DISCOVERY_DIR="$(mktemp -d "${TMPDIR:-/tmp}/audit-skill-discovery.XXXXXX")"
  echo "# unrelated test project, created only for this check" > "${DISCOVERY_DIR}/README.md"

  DISCOVERY_OUTPUT="$(cd "${DISCOVERY_DIR}" && timeout 90 claude -p \
    "Without calling any tools, look at the list of available skills described in your system context/reminders right now and tell me: is there a skill literally named 'audit' in that list? Reply with exactly: AUDIT_SKILL_FOUND=yes followed by its one-line description, or AUDIT_SKILL_FOUND=no if it is not listed." \
    --setting-sources user,project,local 2>&1)"

  rm -rf "${DISCOVERY_DIR}"

  if printf '%s' "${DISCOVERY_OUTPUT}" | grep -q "AUDIT_SKILL_FOUND=yes"; then
    ok "discovered from ${DISCOVERY_DIR} (now deleted)"
    printf '%s\n' "${DISCOVERY_OUTPUT}" | sed 's/^/         /'
  else
    bad "not discovered - claude output was:"
    printf '%s\n' "${DISCOVERY_OUTPUT}" | sed 's/^/         /'
  fi
fi

echo
echo "=================================="
if [ "${FAIL}" -eq 0 ]; then
  echo "ALL CHECKS PASSED (${PASS}/${PASS})"
  exit 0
else
  echo "FAILED: ${FAIL} check(s) failed, ${PASS} passed"
  exit 1
fi
