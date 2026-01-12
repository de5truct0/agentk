#!/usr/bin/env bash
# AGENT-K Visual Mode Library
# tmux-based multi-pane agent visualization

set -euo pipefail

# Source dependencies (use AGENTK_ROOT if set, otherwise compute local path)
_VISUAL_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -z "${AGENTK_ROOT:-}" ]]; then
    source "$_VISUAL_SCRIPT_DIR/core.sh"
    source "$_VISUAL_SCRIPT_DIR/ui.sh"
fi

# =============================================================================
# CONSTANTS
# =============================================================================

TMUX_SESSION_NAME="agentk"
TMUX_MAIN_WINDOW="main"

# =============================================================================
# TMUX DETECTION
# =============================================================================

check_tmux() {
    if ! command -v tmux &>/dev/null; then
        log_error "tmux is not installed"
        echo "Install with: brew install tmux"
        return 1
    fi
    return 0
}

is_inside_tmux() {
    [[ -n "${TMUX:-}" ]]
}

session_exists() {
    tmux has-session -t "$TMUX_SESSION_NAME" 2>/dev/null
}

# =============================================================================
# LAYOUT CONFIGURATIONS
# =============================================================================

# Dev mode: 6 panes (3x2 grid)
# ┌───────────────┬───────────────┬───────────────┐
# │  ORCHESTRATOR │   ENGINEER    │    TESTER     │
# ├───────────────┼───────────────┼───────────────┤
# │   SECURITY    │     SCOUT     │    [MAIN]     │
# └───────────────┴───────────────┴───────────────┘

# ML mode: 6 panes (3x2 grid)
# ┌───────────────┬───────────────┬───────────────┐
# │  ORCHESTRATOR │   RESEARCHER  │  ML ENGINEER  │
# ├───────────────┼───────────────┼───────────────┤
# │ DATA ENGINEER │   EVALUATOR   │     SCOUT     │
# └───────────────┴───────────────┴───────────────┘

get_agents_for_mode() {
    local mode="$1"
    case "$mode" in
        dev)
            echo "orchestrator engineer tester security scout main"
            ;;
        ml)
            echo "orchestrator researcher ml-engineer data-engineer evaluator scout"
            ;;
    esac
}

# =============================================================================
# SESSION MANAGEMENT
# =============================================================================

create_tmux_session() {
    local mode="${1:-dev}"

    if session_exists; then
        log_warn "Session $TMUX_SESSION_NAME already exists"
        return 0
    fi

    log_info "Creating tmux session: $TMUX_SESSION_NAME"

    # Create new detached session
    tmux new-session -d -s "$TMUX_SESSION_NAME" -n "$TMUX_MAIN_WINDOW"

    # Set up the layout
    setup_layout "$mode"

    log_info "tmux session created"
}

setup_layout() {
    local mode="$1"
    local agents
    agents=($(get_agents_for_mode "$mode"))

    # Start with a single pane, then split
    local session="$TMUX_SESSION_NAME:$TMUX_MAIN_WINDOW"

    # Create 3x2 grid
    # First split horizontally into 3 columns
    tmux split-window -h -t "$session"
    tmux split-window -h -t "$session"

    # Select each column and split vertically
    tmux select-pane -t "$session.0"
    tmux split-window -v -t "$session.0"

    tmux select-pane -t "$session.2"
    tmux split-window -v -t "$session.2"

    tmux select-pane -t "$session.4"
    tmux split-window -v -t "$session.4"

    # Now we have 6 panes (0-5)
    # Assign names/titles to panes
    local pane_idx=0
    for agent in "${agents[@]}"; do
        local title
        title=$(echo "$agent" | tr '[:lower:]' '[:upper:]' | tr '-' ' ')

        # Set pane title
        tmux select-pane -t "$session.$pane_idx" -T "$title"

        # Set pane border format to show title
        tmux set-option -p -t "$session.$pane_idx" pane-border-format "#{pane_title}"

        pane_idx=$((pane_idx + 1))
    done

    # Enable pane borders with titles
    tmux set-option -t "$TMUX_SESSION_NAME" pane-border-status top
    tmux set-option -t "$TMUX_SESSION_NAME" pane-border-style "fg=colour240"
    tmux set-option -t "$TMUX_SESSION_NAME" pane-active-border-style "fg=colour51"

    # Set nice colors
    tmux set-option -t "$TMUX_SESSION_NAME" status-style "bg=colour235,fg=colour136"
    tmux set-option -t "$TMUX_SESSION_NAME" status-left "#[fg=colour51,bold] AGENT-K #[fg=colour240]│"
    tmux set-option -t "$TMUX_SESSION_NAME" status-right "#[fg=colour240]│ #[fg=colour136]$mode mode "

    # Select the main/input pane (last one)
    tmux select-pane -t "$session.$((${#agents[@]} - 1))"
}

# =============================================================================
# PANE OPERATIONS
# =============================================================================

get_pane_for_agent() {
    local agent="$1"
    local mode="${2:-dev}"
    local agents
    agents=($(get_agents_for_mode "$mode"))

    local idx=0
    for a in "${agents[@]}"; do
        if [[ "$a" == "$agent" ]]; then
            echo "$idx"
            return 0
        fi
        idx=$((idx + 1))
    done

    log_error "Agent not found: $agent"
    return 1
}

send_to_pane() {
    local pane_idx="$1"
    local command="$2"

    tmux send-keys -t "$TMUX_SESSION_NAME:$TMUX_MAIN_WINDOW.$pane_idx" "$command" Enter
}

clear_pane() {
    local pane_idx="$1"
    tmux send-keys -t "$TMUX_SESSION_NAME:$TMUX_MAIN_WINDOW.$pane_idx" "clear" Enter
}

write_to_pane() {
    local pane_idx="$1"
    local text="$2"

    # Use printf to write text without executing
    tmux send-keys -t "$TMUX_SESSION_NAME:$TMUX_MAIN_WINDOW.$pane_idx" "printf '%s\n' '$text'" Enter
}

# =============================================================================
# AGENT VISUALIZATION
# =============================================================================

show_agent_status_in_pane() {
    local agent="$1"
    local status="$2"
    local message="${3:-}"
    local mode="${4:-dev}"

    local pane_idx
    pane_idx=$(get_pane_for_agent "$agent" "$mode") || return

    local status_line
    case "$status" in
        waiting)    status_line="[ ] Waiting..." ;;
        working)    status_line="[◐] Working..." ;;
        active)     status_line="[●] Active" ;;
        done)       status_line="[✓] Complete" ;;
        failed)     status_line="[✗] Failed" ;;
    esac

    clear_pane "$pane_idx"

    if [[ -n "$message" ]]; then
        write_to_pane "$pane_idx" "$status_line"
        write_to_pane "$pane_idx" ""
        write_to_pane "$pane_idx" "$message"
    else
        write_to_pane "$pane_idx" "$status_line"
    fi
}

stream_agent_log_to_pane() {
    local agent="$1"
    local mode="${2:-dev}"

    local pane_idx
    pane_idx=$(get_pane_for_agent "$agent" "$mode") || return

    local log_file
    log_file=$(get_agent_log "$agent")

    if [[ -f "$log_file" ]]; then
        send_to_pane "$pane_idx" "tail -f '$log_file'"
    else
        write_to_pane "$pane_idx" "No logs yet..."
    fi
}

# =============================================================================
# SESSION LIFECYCLE
# =============================================================================

setup_tmux_session() {
    local mode="${1:-dev}"

    check_tmux || return 1

    if is_inside_tmux; then
        log_warn "Already inside tmux. Creating nested session..."
    fi

    create_tmux_session "$mode"

    # Initialize all panes with waiting status
    local agents
    agents=($(get_agents_for_mode "$mode"))

    for agent in "${agents[@]}"; do
        show_agent_status_in_pane "$agent" "waiting" "" "$mode"
    done

    # Attach to session
    if ! is_inside_tmux; then
        tmux attach-session -t "$TMUX_SESSION_NAME"
    else
        tmux switch-client -t "$TMUX_SESSION_NAME"
    fi
}

attach_to_session() {
    if ! session_exists; then
        log_error "No AGENT-K session found"
        return 1
    fi

    if is_inside_tmux; then
        tmux switch-client -t "$TMUX_SESSION_NAME"
    else
        tmux attach-session -t "$TMUX_SESSION_NAME"
    fi
}

detach_from_session() {
    if is_inside_tmux; then
        tmux detach-client
    fi
}

kill_tmux_session() {
    if session_exists; then
        tmux kill-session -t "$TMUX_SESSION_NAME"
        log_info "tmux session killed"
    fi
}

# =============================================================================
# VISUAL UPDATES
# =============================================================================

update_visual_status() {
    local mode="${1:-dev}"

    if ! session_exists; then
        return
    fi

    local agents
    agents=($(get_agents_for_mode "$mode"))

    for agent in "${agents[@]}"; do
        local status
        status=$(get_agent_status "$agent")

        local message=""
        if [[ -n "${AGENT_TASKS[$agent]:-}" ]]; then
            message=$(get_task_field "${AGENT_TASKS[$agent]}" "prompt" 2>/dev/null | head -c 50 || echo "")
        fi

        show_agent_status_in_pane "$agent" "$status" "$message" "$mode"
    done
}

# Background visual updater
start_visual_updater() {
    local mode="${1:-dev}"
    local interval="${2:-2}"

    (
        while session_exists; do
            update_visual_status "$mode"
            sleep "$interval"
        done
    ) &

    echo $!
}

stop_visual_updater() {
    local pid="$1"
    kill "$pid" 2>/dev/null || true
}

# =============================================================================
# CLEANUP
# =============================================================================

cleanup_visual() {
    kill_tmux_session
}
