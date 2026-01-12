#!/usr/bin/env bash
# AGENT-K Spawn Library
# Claude subprocess spawning and management

set -euo pipefail

# Source dependencies
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/core.sh"
source "$SCRIPT_DIR/ipc.sh"

# =============================================================================
# GLOBALS
# =============================================================================

# Track spawned agent PIDs
declare -A AGENT_PIDS=()
declare -A AGENT_TASKS=()

# =============================================================================
# AGENT PROMPT LOADING
# =============================================================================

get_agent_prompt_file() {
    local mode="$1"
    local agent="$2"

    local prompt_file

    # Check for shared agents first
    if [[ -f "$AGENTK_ROOT/modes/shared/${agent}.md" ]]; then
        prompt_file="$AGENTK_ROOT/modes/shared/${agent}.md"
    else
        prompt_file="$AGENTK_ROOT/modes/${mode}/${agent}.md"
    fi

    if [[ -f "$prompt_file" ]]; then
        echo "$prompt_file"
    else
        log_error "Agent prompt not found: $prompt_file"
        return 1
    fi
}

load_agent_prompt() {
    local mode="$1"
    local agent="$2"

    local prompt_file
    prompt_file=$(get_agent_prompt_file "$mode" "$agent")

    if [[ -f "$prompt_file" ]]; then
        cat "$prompt_file"
    else
        return 1
    fi
}

build_agent_system_prompt() {
    local mode="$1"
    local agent="$2"
    local task_context="${3:-}"

    local date_context
    date_context=$(get_date_context)

    local agent_prompt
    agent_prompt=$(load_agent_prompt "$mode" "$agent")

    cat <<EOF
$date_context

$agent_prompt

---
CURRENT TASK CONTEXT:
$task_context
EOF
}

# =============================================================================
# AGENT SPAWNING
# =============================================================================

spawn_agent() {
    local agent="$1"
    local task_id="$2"
    local mode="${3:-dev}"

    local task_file
    task_file=$(get_task_file "$task_id")

    if [[ ! -f "$task_file" ]]; then
        log_error "Task not found: $task_id"
        return 1
    fi

    # Read task details
    local prompt
    prompt=$(jq -r '.prompt' "$task_file")
    local context_files
    context_files=$(jq -r '.context.files | join(", ")' "$task_file")

    local task_context="Task ID: $task_id
Prompt: $prompt
Context Files: $context_files"

    # Build system prompt
    local system_prompt
    system_prompt=$(build_agent_system_prompt "$mode" "$agent" "$task_context")

    # Update task status
    update_task_status "$task_id" "$STATUS_IN_PROGRESS"
    update_session_agent "$agent" "working" "Processing task $task_id"

    # Get agent log file
    local log_file
    log_file=$(get_agent_log "$agent")

    log_info "Spawning agent: $agent for task: $task_id"

    # Spawn claude in background
    (
        # Write system prompt to temp file for claude to read
        local prompt_file
        prompt_file=$(mktemp)
        echo "$system_prompt" > "$prompt_file"

        # Run claude with the task
        local output
        if output=$(claude --print "$prompt" --system-prompt "$prompt_file" 2>&1); then
            # Success - create result
            create_result "$task_id" "$agent" "$STATUS_COMPLETED" "$output" "[]" "[]"
            update_session_agent "$agent" "done" "Completed task $task_id"
        else
            # Failed
            create_result "$task_id" "$agent" "$STATUS_FAILED" "$output" "[]" "[]"
            update_session_agent "$agent" "failed" "Failed task $task_id"
        fi

        # Cleanup
        rm -f "$prompt_file"

    ) >> "$log_file" 2>&1 &

    local pid=$!
    AGENT_PIDS[$agent]=$pid
    AGENT_TASKS[$agent]=$task_id

    log_debug "Agent $agent spawned with PID: $pid"
    echo "$pid"
}

spawn_agent_interactive() {
    local agent="$1"
    local mode="${2:-dev}"
    local initial_prompt="${3:-}"

    # Build system prompt
    local system_prompt
    system_prompt=$(build_agent_system_prompt "$mode" "$agent" "Interactive session")

    # Write system prompt to temp file
    local prompt_file
    prompt_file=$(mktemp)
    echo "$system_prompt" > "$prompt_file"

    log_info "Starting interactive session with agent: $agent"

    # Run claude interactively
    if [[ -n "$initial_prompt" ]]; then
        claude --system-prompt "$prompt_file" "$initial_prompt"
    else
        claude --system-prompt "$prompt_file"
    fi

    # Cleanup
    rm -f "$prompt_file"
}

# =============================================================================
# AGENT MANAGEMENT
# =============================================================================

is_agent_running() {
    local agent="$1"

    if [[ -z "${AGENT_PIDS[$agent]:-}" ]]; then
        return 1
    fi

    local pid="${AGENT_PIDS[$agent]}"
    if kill -0 "$pid" 2>/dev/null; then
        return 0
    else
        # Agent finished, clean up
        unset AGENT_PIDS[$agent]
        return 1
    fi
}

wait_agent() {
    local agent="$1"
    local timeout="${2:-300}"

    if [[ -z "${AGENT_PIDS[$agent]:-}" ]]; then
        log_warn "Agent not running: $agent"
        return 1
    fi

    local pid="${AGENT_PIDS[$agent]}"
    local elapsed=0

    while kill -0 "$pid" 2>/dev/null && [[ $elapsed -lt $timeout ]]; do
        sleep 1
        elapsed=$((elapsed + 1))
    done

    if kill -0 "$pid" 2>/dev/null; then
        log_warn "Timeout waiting for agent: $agent"
        return 1
    fi

    # Get exit status
    wait "$pid" 2>/dev/null || true
    unset AGENT_PIDS[$agent]

    log_debug "Agent $agent finished"
    return 0
}

kill_agent() {
    local agent="$1"

    if [[ -z "${AGENT_PIDS[$agent]:-}" ]]; then
        log_warn "Agent not running: $agent"
        return 0
    fi

    local pid="${AGENT_PIDS[$agent]}"

    # Try graceful shutdown first
    kill -TERM "$pid" 2>/dev/null || true
    sleep 1

    # Force kill if still running
    if kill -0 "$pid" 2>/dev/null; then
        kill -KILL "$pid" 2>/dev/null || true
    fi

    # Cancel any active task
    if [[ -n "${AGENT_TASKS[$agent]:-}" ]]; then
        cancel_task "${AGENT_TASKS[$agent]}"
        unset AGENT_TASKS[$agent]
    fi

    unset AGENT_PIDS[$agent]
    update_session_agent "$agent" "stopped" "Killed by user"

    log_info "Killed agent: $agent"
}

kill_all_agents() {
    for agent in "${!AGENT_PIDS[@]}"; do
        kill_agent "$agent"
    done
}

# =============================================================================
# AGENT STATUS
# =============================================================================

get_agent_status() {
    local agent="$1"

    if is_agent_running "$agent"; then
        echo "running"
    elif [[ -n "${AGENT_TASKS[$agent]:-}" ]]; then
        local task_status
        task_status=$(get_task_status "${AGENT_TASKS[$agent]}")
        echo "$task_status"
    else
        echo "idle"
    fi
}

get_all_agent_status() {
    local mode="${1:-dev}"
    local agents=()

    case "$mode" in
        dev) agents=("orchestrator" "engineer" "tester" "security" "scout") ;;
        ml)  agents=("orchestrator" "researcher" "ml-engineer" "data-engineer" "evaluator" "scout") ;;
    esac

    echo "{"
    local first=true
    for agent in "${agents[@]}"; do
        local status
        status=$(get_agent_status "$agent")
        local message=""

        if [[ -n "${AGENT_TASKS[$agent]:-}" ]]; then
            message=$(get_task_field "${AGENT_TASKS[$agent]}" "prompt" | head -c 50)
        fi

        if [[ "$first" == "true" ]]; then
            first=false
        else
            echo ","
        fi

        printf '  "%s": {"status": "%s", "message": "%s"}' "$agent" "$status" "$message"
    done
    echo
    echo "}"
}

# =============================================================================
# AGENT LOG VIEWING
# =============================================================================

view_agent_log() {
    local agent="$1"
    local lines="${2:-50}"

    local log_file
    log_file=$(get_agent_log "$agent")

    if [[ -f "$log_file" ]]; then
        tail -n "$lines" "$log_file"
    else
        echo "No logs found for agent: $agent"
    fi
}

follow_agent_log() {
    local agent="$1"

    local log_file
    log_file=$(get_agent_log "$agent")

    if [[ -f "$log_file" ]]; then
        tail -f "$log_file"
    else
        echo "No logs found for agent: $agent"
    fi
}

clear_agent_log() {
    local agent="$1"

    local log_file
    log_file=$(get_agent_log "$agent")

    if [[ -f "$log_file" ]]; then
        > "$log_file"
        log_debug "Cleared log for agent: $agent"
    fi
}

# =============================================================================
# PARALLEL SPAWNING
# =============================================================================

spawn_agents_parallel() {
    local mode="$1"
    shift
    local task_ids=("$@")

    local pids=()

    for task_id in "${task_ids[@]}"; do
        local assigned_to
        assigned_to=$(get_task_field "$task_id" "assigned_to")

        spawn_agent "$assigned_to" "$task_id" "$mode" &
        pids+=($!)
    done

    # Wait for all spawns to complete
    for pid in "${pids[@]}"; do
        wait "$pid" 2>/dev/null || true
    done
}

# =============================================================================
# CLEANUP
# =============================================================================

cleanup_agents() {
    log_info "Cleaning up agents..."
    kill_all_agents
    cancel_all_tasks
}

# Trap for cleanup on exit
trap cleanup_agents EXIT INT TERM
