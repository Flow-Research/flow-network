#!/usr/bin/env bash
set -euo pipefail

TARGET="${1:-}"
if [ -z "$TARGET" ]; then
  echo "Usage: $0 <epic-path-or-epic-name>" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SPEC_ROOT="$("${SCRIPT_DIR}/resolve-spec-root.sh")"

if [ -d "$TARGET" ] && [ -f "$TARGET/.build-e2e-state.json" ]; then
  EPIC_PATH="$TARGET"
else
  EPIC_PATH="${SPEC_ROOT%/}/${TARGET}"
fi

STATE_FILE="${EPIC_PATH}/.build-e2e-state.json"
if [ ! -f "$STATE_FILE" ]; then
  echo "Missing state file: ${STATE_FILE}" >&2
  exit 1
fi

require_file() {
  local path="$1"
  local label="$2"
  if [ ! -s "$path" ]; then
    echo "Missing or empty ${label}: ${path}" >&2
    exit 1
  fi
}

require_file "$STATE_FILE" "state file"

PHASE=$(jq -r '.phase // empty' "$STATE_FILE")
if [ -z "$PHASE" ]; then
  echo "State file missing phase" >&2
  exit 1
fi

case "$PHASE" in
  BRAINSTORM|AWAIT_BRAINSTORM_EVAL|PRD|AWAIT_PRD_EVAL|TECH_SPEC|AWAIT_TECHSPEC_EVAL|MVP_SPEC|AWAIT_MVP_EVAL|ENGINEER|QA|AWAIT_QA_EVAL|AWAIT_LOCAL_RUN|LOCAL_RUN|COMPLETE)
    ;;
  *)
    echo "Unknown phase: $PHASE" >&2
    exit 1
    ;;
esac

CHECKPOINT_BRAINSTORM=$(jq -r '.checkpoints.brainstorm // "pending"' "$STATE_FILE")
CHECKPOINT_PRD=$(jq -r '.checkpoints.prd // "pending"' "$STATE_FILE")
CHECKPOINT_TECHSPEC=$(jq -r '.checkpoints.tech_spec // "pending"' "$STATE_FILE")

require_brainstorm_evidence="false"
if [ "$PHASE" != "BRAINSTORM" ]; then
  require_brainstorm_evidence="true"
fi

require_prd_review_evidence="false"
if [ "$PHASE" = "AWAIT_PRD_EVAL" ] || [ "$PHASE" = "TECH_SPEC" ] || [ "$PHASE" = "AWAIT_TECHSPEC_EVAL" ] || [ "$PHASE" = "MVP_SPEC" ] || [ "$PHASE" = "AWAIT_MVP_EVAL" ] || [ "$PHASE" = "ENGINEER" ] || [ "$PHASE" = "QA" ] || [ "$PHASE" = "AWAIT_QA_EVAL" ] || [ "$PHASE" = "LOCAL_RUN" ] || [ "$PHASE" = "COMPLETE" ]; then
  require_prd_review_evidence="true"
fi
if [ "$CHECKPOINT_PRD" = "complete" ] || [ "$CHECKPOINT_PRD" = "awaiting_eval" ]; then
  require_prd_review_evidence="true"
fi

if [ "$require_prd_review_evidence" = "true" ]; then
  PRD_FILE="${EPIC_PATH}/product_spec.md"
  PRD_REVIEW_FILE="${EPIC_PATH}/prd_review_summary.md"

  require_file "$PRD_FILE" "product_spec.md"
  require_file "$PRD_REVIEW_FILE" "prd_review_summary.md"

  if ! grep -q '^## PRD Review Complete' "$PRD_REVIEW_FILE"; then
    echo "PRD review summary missing completion header" >&2
    exit 1
  fi

  if ! grep -q 'All perspectives signed off: ✅' "$PRD_REVIEW_FILE"; then
    echo "PRD review summary missing all-perspectives sign-off" >&2
    exit 1
  fi

  PRD_HASH=$(shasum -a 256 "$PRD_FILE" | awk '{print $1}')
  if ! grep -q "^PRD SHA256: ${PRD_HASH}$" "$PRD_REVIEW_FILE"; then
    echo "PRD review summary missing matching PRD SHA256 fingerprint (stale or invalid review)" >&2
    exit 1
  fi
fi

require_techspec_review_evidence="false"
if [ "$PHASE" = "AWAIT_TECHSPEC_EVAL" ] || [ "$PHASE" = "MVP_SPEC" ] || [ "$PHASE" = "AWAIT_MVP_EVAL" ] || [ "$PHASE" = "ENGINEER" ] || [ "$PHASE" = "QA" ] || [ "$PHASE" = "AWAIT_QA_EVAL" ] || [ "$PHASE" = "LOCAL_RUN" ] || [ "$PHASE" = "COMPLETE" ]; then
  require_techspec_review_evidence="true"
fi
if [ "$CHECKPOINT_TECHSPEC" = "complete" ] || [ "$CHECKPOINT_TECHSPEC" = "awaiting_eval" ]; then
  require_techspec_review_evidence="true"
fi

if [ "$require_techspec_review_evidence" = "true" ]; then
  TECHSPEC_FILE="${EPIC_PATH}/technical_spec.md"
  TECHSPEC_REVIEW_FILE="${EPIC_PATH}/techspec_review_summary.md"

  require_file "$TECHSPEC_FILE" "technical_spec.md"
  require_file "$TECHSPEC_REVIEW_FILE" "techspec_review_summary.md"

  if ! grep -q '^## Tech Spec Review Complete' "$TECHSPEC_REVIEW_FILE"; then
    echo "Tech spec review summary missing completion header" >&2
    exit 1
  fi

  if ! grep -q 'All perspectives signed off: ✅' "$TECHSPEC_REVIEW_FILE"; then
    echo "Tech spec review summary missing all-perspectives sign-off" >&2
    exit 1
  fi

  TECHSPEC_HASH=$(shasum -a 256 "$TECHSPEC_FILE" | awk '{print $1}')
  if ! grep -q "^TECH SPEC SHA256: ${TECHSPEC_HASH}$" "$TECHSPEC_REVIEW_FILE"; then
    echo "Tech spec review summary missing matching TECH SPEC SHA256 fingerprint (stale or invalid review)" >&2
    exit 1
  fi
fi
if [ "$CHECKPOINT_BRAINSTORM" = "complete" ] || [ "$CHECKPOINT_BRAINSTORM" = "awaiting_eval" ]; then
  require_brainstorm_evidence="true"
fi

if [ "$require_brainstorm_evidence" = "true" ]; then
  TRANSCRIPT_FILE="${EPIC_PATH}/brainstorm_transcript.md"
  BRAINSTORM_FILE="${EPIC_PATH}/brainstorm.md"

  require_file "$TRANSCRIPT_FILE" "brainstorm transcript"
  require_file "$BRAINSTORM_FILE" "brainstorm.md"

  Q_COUNT=$(grep -Ec '^Q[0-9]+:' "$TRANSCRIPT_FILE")
  A_COUNT=$(grep -Ec '^A[0-9]+:' "$TRANSCRIPT_FILE")

  if [ "$Q_COUNT" -lt 3 ]; then
    echo "Brainstorm transcript must contain at least 3 Q/A exchanges (found Q=$Q_COUNT)" >&2
    exit 1
  fi

  if [ "$A_COUNT" -lt 3 ]; then
    echo "Brainstorm transcript must contain at least 3 Q/A exchanges (found A=$A_COUNT)" >&2
    exit 1
  fi

  if ! grep -q '^Clarity Check:' "$TRANSCRIPT_FILE"; then
    echo "Brainstorm transcript missing 'Clarity Check:' section" >&2
    exit 1
  fi

  if ! grep -q '^Answer:' "$TRANSCRIPT_FILE"; then
    echo "Brainstorm transcript missing 'Answer:' line for clarity check" >&2
    exit 1
  fi
fi

if [ -f "${EPIC_PATH}/product_spec.md" ]; then
  require_file "${EPIC_PATH}/product_spec.md" "product_spec.md"
fi

if [ -f "${EPIC_PATH}/technical_spec.md" ]; then
  require_file "${EPIC_PATH}/technical_spec.md" "technical_spec.md"
fi

if [ -f "${EPIC_PATH}/MVP_technical_spec.md" ]; then
  require_file "${EPIC_PATH}/MVP_technical_spec.md" "MVP_technical_spec.md"
fi

echo "Validation OK for ${EPIC_PATH} (phase: ${PHASE})"
