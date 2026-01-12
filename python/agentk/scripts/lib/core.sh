#!/usr/bin/env bash
# AGENT-K Core Library
# Shared functions for logging, JSON helpers, date context, and path utilities

set -euo pipefail

# =============================================================================
# CONSTANTS
# =============================================================================

AGENTK_VERSION="1.0.3"
AGENTK_ROOT="${AGENTK_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
AGENTK_WORKSPACE="${AGENTK_ROOT}/workspace"
CLAUDE_KNOWLEDGE_CUTOFF="2024-04"

# =============================================================================
# COLORS & FORMATTING
# =============================================================================

# Check if terminal supports colors
if [[ -t 1 ]] && command -v tput &>/dev/null && [[ $(tput colors 2>/dev/null || echo 0) -ge 8 ]]; then
    RED=$(tput setaf 1)
    GREEN=$(tput setaf 2)
    YELLOW=$(tput setaf 3)
    BLUE=$(tput setaf 4)
    MAGENTA=$(tput setaf 5)
    CYAN=$(tput setaf 6)
    WHITE=$(tput setaf 7)
    BOLD=$(tput bold)
    DIM=$(tput dim)
    RESET=$(tput sgr0)
else
    RED="" GREEN="" YELLOW="" BLUE="" MAGENTA="" CYAN="" WHITE=""
    BOLD="" DIM="" RESET=""
fi

# =============================================================================
# LOGGING
# =============================================================================

# Log levels (bash 3.x compatible - no associative arrays)
LOG_LEVEL="${LOG_LEVEL:-info}"

_get_log_level_num() {
    case "$1" in
        debug) echo 0 ;;
        info)  echo 1 ;;
        warn)  echo 2 ;;
        error) echo 3 ;;
        *)     echo 1 ;;
    esac
}

_log() {
    local level="$1"
    local message="$2"
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    # Check if we should log this level
    local current_level
    current_level=$(_get_log_level_num "$LOG_LEVEL")
    local msg_level
    msg_level=$(_get_log_level_num "$level")

    if [[ $msg_level -ge $current_level ]]; then
        case "$level" in
            debug) echo "${DIM}[$timestamp] [DEBUG] $message${RESET}" ;;
            info)  echo "${CYAN}[$timestamp] [INFO]${RESET} $message" ;;
            warn)  echo "${YELLOW}[$timestamp] [WARN]${RESET} $message" >&2 ;;
            error) echo "${RED}[$timestamp] [ERROR]${RESET} $message" >&2 ;;
        esac
    fi

    # Also log to file if workspace exists
    if [[ -d "$AGENTK_WORKSPACE/logs" ]]; then
        echo "[$timestamp] [$level] $message" >> "$AGENTK_WORKSPACE/logs/agentk.log"
    fi
}

log_debug() { _log debug "$1"; }
log_info()  { _log info "$1"; }
log_warn()  { _log warn "$1"; }
log_error() { _log error "$1"; }

# =============================================================================
# DATE & RECENCY AWARENESS
# =============================================================================

get_today() {
    date '+%Y-%m-%d'
}

get_knowledge_age_months() {
    local cutoff_year=${CLAUDE_KNOWLEDGE_CUTOFF%%-*}
    local cutoff_month=${CLAUDE_KNOWLEDGE_CUTOFF##*-}
    local current_year=$(date '+%Y')
    local current_month=$(date '+%m')

    # Remove leading zeros for arithmetic
    cutoff_month=$((10#$cutoff_month))
    current_month=$((10#$current_month))

    echo $(( (current_year - cutoff_year) * 12 + current_month - cutoff_month ))
}

get_date_context() {
    local today
    today=$(get_today)
    local age_months
    age_months=$(get_knowledge_age_months)

    cat <<EOF
================================================================================
DATE AWARENESS
================================================================================
TODAY'S DATE: $today
CLAUDE KNOWLEDGE CUTOFF: $CLAUDE_KNOWLEDGE_CUTOFF (~$age_months months old)

IMPORTANT: Any information from your training data may be outdated. When suggesting:
- Libraries/frameworks → verify current version exists
- Best practices → check if still recommended
- APIs → confirm endpoints haven't changed
- Papers/research → look for newer publications

USE SCOUT to verify recency when uncertain.
================================================================================
EOF
}

# =============================================================================
# JSON HELPERS (requires jq)
# =============================================================================

check_jq() {
    if ! command -v jq &>/dev/null; then
        log_error "jq is required but not installed. Install with: brew install jq"
        exit 1
    fi
}

json_get() {
    local file="$1"
    local key="$2"
    jq -r "$key" "$file" 2>/dev/null || echo ""
}

json_set() {
    local file="$1"
    local key="$2"
    local value="$3"
    local tmp
    tmp=$(mktemp)

    if [[ -f "$file" ]]; then
        jq "$key = $value" "$file" > "$tmp" && mv "$tmp" "$file"
    else
        echo "{}" | jq "$key = $value" > "$file"
    fi
}

json_create() {
    local file="$1"
    shift
    local json="{}"

    while [[ $# -gt 0 ]]; do
        local key="$1"
        local value="$2"
        json=$(echo "$json" | jq "$key = $value")
        shift 2
    done

    echo "$json" > "$file"
}

# =============================================================================
# PATH UTILITIES
# =============================================================================

ensure_dir() {
    local dir="$1"
    if [[ ! -d "$dir" ]]; then
        mkdir -p "$dir"
        log_debug "Created directory: $dir"
    fi
}

ensure_workspace() {
    ensure_dir "$AGENTK_WORKSPACE"
    ensure_dir "$AGENTK_WORKSPACE/tasks"
    ensure_dir "$AGENTK_WORKSPACE/results"
    ensure_dir "$AGENTK_WORKSPACE/logs"
    ensure_dir "$AGENTK_WORKSPACE/experiments"
}

get_task_file() {
    local task_id="$1"
    echo "$AGENTK_WORKSPACE/tasks/${task_id}.json"
}

get_result_file() {
    local task_id="$1"
    echo "$AGENTK_WORKSPACE/results/${task_id}.json"
}

get_agent_log() {
    local agent="$1"
    echo "$AGENTK_WORKSPACE/logs/${agent}.log"
}

# =============================================================================
# ID GENERATION
# =============================================================================

generate_id() {
    local prefix="${1:-task}"
    echo "${prefix}_$(date '+%Y%m%d_%H%M%S')_$$"
}

generate_session_id() {
    generate_id "session"
}

generate_task_id() {
    generate_id "task"
}

# =============================================================================
# DEPENDENCY CHECKS
# =============================================================================

check_dependencies() {
    local has_jq has_claude
    has_jq=$(command -v jq 2>/dev/null)
    has_claude=$(command -v claude 2>/dev/null)

    # Check required dependencies
    if [[ -z "$has_jq" ]] || [[ -z "$has_claude" ]]; then
        if [[ -z "$has_jq" ]]; then
            log_error "Missing dependency: jq"
            log_info "Install with: brew install jq"
        fi
        if [[ -z "$has_claude" ]]; then
            log_error "Missing dependency: claude (Claude Code CLI)"
            log_info "Install from: https://claude.ai/code"
        fi
        exit 1
    fi

    log_debug "All dependencies satisfied"
}

check_optional_dependencies() {
    local optional=()

    command -v tmux &>/dev/null || optional+=("tmux (for --visual mode)")

    if [[ ${#optional[@]} -gt 0 ]]; then
        log_debug "Optional dependencies not installed: ${optional[*]}"
    fi
}

# =============================================================================
# CLEANUP
# =============================================================================

cleanup_old_tasks() {
    local days="${1:-7}"
    local task_dir="$AGENTK_WORKSPACE/tasks"
    local result_dir="$AGENTK_WORKSPACE/results"

    if [[ -d "$task_dir" ]]; then
        find "$task_dir" -name "*.json" -mtime "+$days" -delete 2>/dev/null || true
    fi

    if [[ -d "$result_dir" ]]; then
        find "$result_dir" -name "*.json" -mtime "+$days" -delete 2>/dev/null || true
    fi

    log_debug "Cleaned up tasks older than $days days"
}

# =============================================================================
# EXPORTS
# =============================================================================

export AGENTK_VERSION
export AGENTK_ROOT
export AGENTK_WORKSPACE
export CLAUDE_KNOWLEDGE_CUTOFF
