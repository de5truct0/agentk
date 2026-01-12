#!/usr/bin/env bash
# AGENT-K IPC Library
# File-based inter-process communication between agents

set -euo pipefail

# Source core for utilities (use AGENTK_ROOT if set, otherwise compute local path)
_IPC_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -z "${AGENTK_ROOT:-}" ]]; then
    source "$_IPC_SCRIPT_DIR/core.sh"
fi

# =============================================================================
# TASK STATUS CONSTANTS
# =============================================================================

STATUS_PENDING="pending"
STATUS_IN_PROGRESS="in_progress"
STATUS_COMPLETED="completed"
STATUS_FAILED="failed"
STATUS_CANCELLED="cancelled"

# Task types
TYPE_IMPLEMENT="implement"
TYPE_TEST="test"
TYPE_REVIEW="review"
TYPE_RESEARCH="research"
TYPE_EVALUATE="evaluate"

# =============================================================================
# TASK CREATION
# =============================================================================

create_task() {
    local task_id="${1:-$(generate_task_id)}"
    local task_type="$2"
    local assigned_to="$3"
    local prompt="$4"
    local priority="${5:-1}"
    local dependencies="${6:-[]}"
    local context_files="${7:-[]}"

    ensure_workspace

    local task_file
    task_file=$(get_task_file "$task_id")
    local created_at
    created_at=$(date -u '+%Y-%m-%dT%H:%M:%SZ')

    cat > "$task_file" <<EOF
{
  "id": "$task_id",
  "type": "$task_type",
  "status": "$STATUS_PENDING",
  "assigned_to": "$assigned_to",
  "priority": $priority,
  "created_at": "$created_at",
  "started_at": null,
  "completed_at": null,
  "prompt": $(echo "$prompt" | jq -Rs .),
  "context": {
    "files": $context_files,
    "dependencies": $dependencies
  },
  "result": null,
  "error": null
}
EOF

    log_debug "Created task: $task_id (assigned to: $assigned_to)"
    echo "$task_id"
}

# =============================================================================
# TASK READING
# =============================================================================

read_task() {
    local task_id="$1"
    local task_file
    task_file=$(get_task_file "$task_id")

    if [[ -f "$task_file" ]]; then
        cat "$task_file"
    else
        log_error "Task not found: $task_id"
        return 1
    fi
}

get_task_status() {
    local task_id="$1"
    local task_file
    task_file=$(get_task_file "$task_id")

    if [[ -f "$task_file" ]]; then
        jq -r '.status' "$task_file"
    else
        echo "unknown"
    fi
}

get_task_field() {
    local task_id="$1"
    local field="$2"
    local task_file
    task_file=$(get_task_file "$task_id")

    if [[ -f "$task_file" ]]; then
        jq -r ".$field" "$task_file"
    else
        echo ""
    fi
}

# =============================================================================
# TASK UPDATING
# =============================================================================

update_task_status() {
    local task_id="$1"
    local new_status="$2"
    local task_file
    task_file=$(get_task_file "$task_id")

    if [[ ! -f "$task_file" ]]; then
        log_error "Task not found: $task_id"
        return 1
    fi

    local tmp
    tmp=$(mktemp)
    local timestamp
    timestamp=$(date -u '+%Y-%m-%dT%H:%M:%SZ')

    case "$new_status" in
        "$STATUS_IN_PROGRESS")
            jq ".status = \"$new_status\" | .started_at = \"$timestamp\"" "$task_file" > "$tmp"
            ;;
        "$STATUS_COMPLETED"|"$STATUS_FAILED"|"$STATUS_CANCELLED")
            jq ".status = \"$new_status\" | .completed_at = \"$timestamp\"" "$task_file" > "$tmp"
            ;;
        *)
            jq ".status = \"$new_status\"" "$task_file" > "$tmp"
            ;;
    esac

    mv "$tmp" "$task_file"
    log_debug "Updated task $task_id status to: $new_status"
}

update_task_field() {
    local task_id="$1"
    local field="$2"
    local value="$3"
    local task_file
    task_file=$(get_task_file "$task_id")

    if [[ ! -f "$task_file" ]]; then
        log_error "Task not found: $task_id"
        return 1
    fi

    local tmp
    tmp=$(mktemp)
    jq ".$field = $value" "$task_file" > "$tmp"
    mv "$tmp" "$task_file"
}

# =============================================================================
# RESULT HANDLING
# =============================================================================

create_result() {
    local task_id="$1"
    local agent="$2"
    local status="$3"
    local output="$4"
    local files_modified="${5:-[]}"
    local next_steps="${6:-[]}"

    ensure_workspace

    local result_file
    result_file=$(get_result_file "$task_id")
    local completed_at
    completed_at=$(date -u '+%Y-%m-%dT%H:%M:%SZ')

    cat > "$result_file" <<EOF
{
  "task_id": "$task_id",
  "agent": "$agent",
  "status": "$status",
  "output": $(echo "$output" | jq -Rs .),
  "files_modified": $files_modified,
  "next_steps": $next_steps,
  "completed_at": "$completed_at"
}
EOF

    # Also update the task with the result reference
    update_task_field "$task_id" "result" "\"$result_file\""
    update_task_status "$task_id" "$status"

    log_debug "Created result for task: $task_id"
    echo "$result_file"
}

read_result() {
    local task_id="$1"
    local result_file
    result_file=$(get_result_file "$task_id")

    if [[ -f "$result_file" ]]; then
        cat "$result_file"
    else
        log_error "Result not found for task: $task_id"
        return 1
    fi
}

# =============================================================================
# TASK QUERIES
# =============================================================================

list_tasks() {
    local status_filter="${1:-}"
    local task_dir="$AGENTK_WORKSPACE/tasks"

    if [[ ! -d "$task_dir" ]]; then
        echo "[]"
        return
    fi

    local tasks="[]"

    for task_file in "$task_dir"/*.json; do
        [[ -f "$task_file" ]] || continue

        if [[ -z "$status_filter" ]]; then
            tasks=$(echo "$tasks" | jq --slurpfile t "$task_file" '. + $t')
        else
            local task_status
            task_status=$(jq -r '.status' "$task_file")
            if [[ "$task_status" == "$status_filter" ]]; then
                tasks=$(echo "$tasks" | jq --slurpfile t "$task_file" '. + $t')
            fi
        fi
    done

    echo "$tasks"
}

list_tasks_by_agent() {
    local agent="$1"
    local task_dir="$AGENTK_WORKSPACE/tasks"

    if [[ ! -d "$task_dir" ]]; then
        echo "[]"
        return
    fi

    local tasks="[]"

    for task_file in "$task_dir"/*.json; do
        [[ -f "$task_file" ]] || continue

        local assigned_to
        assigned_to=$(jq -r '.assigned_to' "$task_file")
        if [[ "$assigned_to" == "$agent" ]]; then
            tasks=$(echo "$tasks" | jq --slurpfile t "$task_file" '. + $t')
        fi
    done

    echo "$tasks"
}

get_pending_tasks() {
    list_tasks "$STATUS_PENDING"
}

get_active_tasks() {
    list_tasks "$STATUS_IN_PROGRESS"
}

get_completed_tasks() {
    list_tasks "$STATUS_COMPLETED"
}

# =============================================================================
# DEPENDENCY CHECKING
# =============================================================================

check_dependencies_met() {
    local task_id="$1"
    local task_file
    task_file=$(get_task_file "$task_id")

    if [[ ! -f "$task_file" ]]; then
        return 1
    fi

    local deps
    deps=$(jq -r '.context.dependencies[]' "$task_file" 2>/dev/null || echo "")

    if [[ -z "$deps" ]]; then
        return 0  # No dependencies
    fi

    while IFS= read -r dep_id; do
        [[ -z "$dep_id" ]] && continue

        local dep_status
        dep_status=$(get_task_status "$dep_id")
        if [[ "$dep_status" != "$STATUS_COMPLETED" ]]; then
            log_debug "Task $task_id waiting on dependency: $dep_id (status: $dep_status)"
            return 1
        fi
    done <<< "$deps"

    return 0
}

get_ready_tasks() {
    local pending
    pending=$(get_pending_tasks)

    echo "$pending" | jq -c '.[]' | while read -r task; do
        local task_id
        task_id=$(echo "$task" | jq -r '.id')
        if check_dependencies_met "$task_id"; then
            echo "$task"
        fi
    done | jq -s '.'
}

# =============================================================================
# TASK WATCHING
# =============================================================================

watch_task() {
    local task_id="$1"
    local timeout="${2:-300}"  # Default 5 minutes
    local poll_interval="${3:-1}"

    local elapsed=0
    while [[ $elapsed -lt $timeout ]]; do
        local status
        status=$(get_task_status "$task_id")

        case "$status" in
            "$STATUS_COMPLETED"|"$STATUS_FAILED"|"$STATUS_CANCELLED")
                echo "$status"
                return 0
                ;;
        esac

        sleep "$poll_interval"
        elapsed=$((elapsed + poll_interval))
    done

    log_warn "Timeout waiting for task: $task_id"
    echo "timeout"
    return 1
}

watch_all_tasks() {
    local callback="$1"
    local poll_interval="${2:-1}"

    while true; do
        local active
        active=$(get_active_tasks)
        local count
        count=$(echo "$active" | jq 'length')

        if [[ "$count" -eq 0 ]]; then
            # Check for pending tasks
            local pending
            pending=$(get_pending_tasks)
            local pending_count
            pending_count=$(echo "$pending" | jq 'length')

            if [[ "$pending_count" -eq 0 ]]; then
                log_debug "No active or pending tasks, stopping watch"
                break
            fi
        fi

        # Call the callback with current state
        if [[ -n "$callback" ]] && type "$callback" &>/dev/null; then
            "$callback" "$active"
        fi

        sleep "$poll_interval"
    done
}

# =============================================================================
# CLEANUP
# =============================================================================

cancel_task() {
    local task_id="$1"
    update_task_status "$task_id" "$STATUS_CANCELLED"
    log_info "Cancelled task: $task_id"
}

cancel_all_tasks() {
    local task_dir="$AGENTK_WORKSPACE/tasks"

    if [[ ! -d "$task_dir" ]]; then
        return
    fi

    for task_file in "$task_dir"/*.json; do
        [[ -f "$task_file" ]] || continue

        local status
        status=$(jq -r '.status' "$task_file")
        if [[ "$status" == "$STATUS_PENDING" || "$status" == "$STATUS_IN_PROGRESS" ]]; then
            local task_id
            task_id=$(jq -r '.id' "$task_file")
            cancel_task "$task_id"
        fi
    done
}

delete_task() {
    local task_id="$1"
    local task_file
    task_file=$(get_task_file "$task_id")
    local result_file
    result_file=$(get_result_file "$task_id")

    [[ -f "$task_file" ]] && rm "$task_file"
    [[ -f "$result_file" ]] && rm "$result_file"

    log_debug "Deleted task: $task_id"
}

# =============================================================================
# SESSION MANAGEMENT
# =============================================================================

create_session() {
    local session_id
    session_id=$(generate_session_id)
    local session_file="$AGENTK_WORKSPACE/session.json"

    ensure_workspace

    cat > "$session_file" <<EOF
{
  "id": "$session_id",
  "started_at": "$(date -u '+%Y-%m-%dT%H:%M:%SZ')",
  "mode": "${AGENTK_MODE:-dev}",
  "agents": {},
  "task_count": 0
}
EOF

    echo "$session_id"
}

get_current_session() {
    local session_file="$AGENTK_WORKSPACE/session.json"

    if [[ -f "$session_file" ]]; then
        cat "$session_file"
    else
        echo "{}"
    fi
}

update_session_agent() {
    local agent="$1"
    local status="$2"
    local message="${3:-}"
    local session_file="$AGENTK_WORKSPACE/session.json"

    if [[ ! -f "$session_file" ]]; then
        return 1
    fi

    local tmp
    tmp=$(mktemp)
    jq ".agents[\"$agent\"] = {\"status\": \"$status\", \"message\": \"$message\", \"updated_at\": \"$(date -u '+%Y-%m-%dT%H:%M:%SZ')\"}" "$session_file" > "$tmp"
    mv "$tmp" "$session_file"
}

end_session() {
    local session_file="$AGENTK_WORKSPACE/session.json"

    if [[ -f "$session_file" ]]; then
        local tmp
        tmp=$(mktemp)
        jq ".ended_at = \"$(date -u '+%Y-%m-%dT%H:%M:%SZ')\"" "$session_file" > "$tmp"
        mv "$tmp" "$session_file"
    fi

    cancel_all_tasks
}
