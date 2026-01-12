#!/usr/bin/env bash
# AGENT-K UI Library
# Pretty terminal output, spinners, boxes, and status displays

set -euo pipefail

# Source core for colors (use AGENTK_ROOT if set, otherwise compute local path)
_UI_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -z "${AGENTK_ROOT:-}" ]]; then
    source "$_UI_SCRIPT_DIR/core.sh"
fi

# =============================================================================
# UNICODE CHARACTERS
# =============================================================================

# Box drawing
BOX_TL="╭"
BOX_TR="╮"
BOX_BL="╰"
BOX_BR="╯"
BOX_H="─"
BOX_V="│"
BOX_CROSS="┼"
BOX_T_DOWN="┬"
BOX_T_UP="┴"
BOX_T_RIGHT="├"
BOX_T_LEFT="┤"

# Status indicators
STATUS_WAITING="[ ]"
STATUS_WORKING="[◐]"
STATUS_ACTIVE="[●]"
STATUS_DONE="[✓]"
STATUS_FAILED="[✗]"

# Spinner frames - retro style
SPINNER_FRAMES=("⠋" "⠙" "⠹" "⠸" "⠼" "⠴" "⠦" "⠧" "⠇" "⠏")
SPINNER_ALT=("◐" "◓" "◑" "◒")
SPINNER_DOTS=("⣾" "⣽" "⣻" "⢿" "⡿" "⣟" "⣯" "⣷")
SPINNER_STAR=("✶" "✷" "✸" "✹" "✺" "✹" "✸" "✷")

# Session token tracking
_SESSION_TOKENS=0
_SESSION_START_TIME=""

# Progress bar
PROGRESS_FILLED="█"
PROGRESS_EMPTY="░"

# =============================================================================
# SCREEN UTILITIES
# =============================================================================

get_terminal_width() {
    tput cols 2>/dev/null || echo 80
}

get_terminal_height() {
    tput lines 2>/dev/null || echo 24
}

clear_screen() {
    printf "\033[2J\033[H"
}

move_cursor() {
    local row="$1"
    local col="$2"
    printf "\033[%d;%dH" "$row" "$col"
}

hide_cursor() {
    printf "\033[?25l"
}

show_cursor() {
    printf "\033[?25h"
}

save_cursor() {
    printf "\033[s"
}

restore_cursor() {
    printf "\033[u"
}

# =============================================================================
# BOX DRAWING
# =============================================================================

draw_box() {
    local title="$1"
    local width="${2:-$(get_terminal_width)}"

    # Ensure minimum width
    [[ $width -lt 20 ]] && width=20

    local inner_width=$((width - 2))
    local title_len=${#title}
    local padding=$(( (inner_width - title_len) / 2 ))

    # Top border
    printf "%s" "$BOX_TL"
    printf "%${inner_width}s" | tr ' ' "$BOX_H"
    printf "%s\n" "$BOX_TR"

    # Title line
    if [[ -n "$title" ]]; then
        printf "%s" "$BOX_V"
        printf "%${padding}s" ""
        printf "${BOLD}%s${RESET}" "$title"
        printf "%$((inner_width - padding - title_len))s" ""
        printf "%s\n" "$BOX_V"

        # Separator after title
        printf "%s" "$BOX_V"
        printf "%${inner_width}s" | tr ' ' "$BOX_H"
        printf "%s\n" "$BOX_V"
    fi
}

draw_box_line() {
    local content="$1"
    local width="${2:-$(get_terminal_width)}"
    local inner_width=$((width - 4))

    printf "%s " "$BOX_V"
    printf "%-${inner_width}s" "$content"
    printf " %s\n" "$BOX_V"
}

close_box() {
    local width="${1:-$(get_terminal_width)}"
    local inner_width=$((width - 2))

    printf "%s" "$BOX_BL"
    printf "%${inner_width}s" | tr ' ' "$BOX_H"
    printf "%s\n" "$BOX_BR"
}

# =============================================================================
# HEADER / BANNER
# =============================================================================

print_banner() {
    init_session_stats
    echo
    echo "${BOLD}${CYAN}╔═══════════════════════════════════════╗${RESET}"
    echo "${BOLD}${CYAN}║${RESET}         ${BOLD}✦ AGENT-K ✦${RESET}         ${DIM}v${AGENTK_VERSION}${RESET}   ${BOLD}${CYAN}║${RESET}"
    echo "${BOLD}${CYAN}╚═══════════════════════════════════════╝${RESET}"
}

print_mode_banner() {
    local mode="$1"
    local mode_display
    local mode_icon

    case "$mode" in
        dev) mode_display="Development" ; mode_icon="⚡" ;;
        ml)  mode_display="ML Research" ; mode_icon="🧠" ;;
        *)   mode_display="$mode" ; mode_icon="◆" ;;
    esac

    echo
    echo "${DIM}$mode_icon $mode_display │ /help for commands │ /exit to quit${RESET}"
    echo
}

# =============================================================================
# STATUS INDICATORS
# =============================================================================

get_status_indicator() {
    local status="$1"

    case "$status" in
        waiting|pending)    echo "${DIM}${STATUS_WAITING}${RESET}" ;;
        working|in_progress) echo "${YELLOW}${STATUS_WORKING}${RESET}" ;;
        active)             echo "${CYAN}${STATUS_ACTIVE}${RESET}" ;;
        done|completed)     echo "${GREEN}${STATUS_DONE}${RESET}" ;;
        failed|error)       echo "${RED}${STATUS_FAILED}${RESET}" ;;
        *)                  echo "${STATUS_WAITING}" ;;
    esac
}

print_agent_status() {
    local agent="$1"
    local status="$2"
    local message="${3:-}"

    local indicator
    indicator=$(get_status_indicator "$status")
    local agent_display
    agent_display=$(printf "%-12s" "$agent")

    echo "${indicator} ${BOLD}${agent_display}${RESET} ${DIM}${message}${RESET}"
}

print_all_agent_status() {
    local -n agents_ref=$1  # nameref to associative array

    for agent in "${!agents_ref[@]}"; do
        local status="${agents_ref[$agent]%%:*}"
        local message="${agents_ref[$agent]#*:}"
        print_agent_status "$agent" "$status" "$message"
    done
}

# =============================================================================
# SPINNER - Claude Code Style
# =============================================================================

# Global spinner state
_SPINNER_PID=""
_SPINNER_MSG=""
_SPINNER_START=""

start_spinner() {
    local message="${1:-Working...}"
    _SPINNER_MSG="$message"
    _SPINNER_START=$(date +%s)

    hide_cursor

    (
        local i=0
        local start_time=$(date +%s)
        while true; do
            local elapsed=$(($(date +%s) - start_time))
            local elapsed_str="${elapsed}s"
            printf "\r${DIM}✢${RESET} ${CYAN}%s${RESET}${DIM} (%s)${RESET}  " "$message" "$elapsed_str"
            i=$(( (i + 1) % 4 ))
            sleep 0.25
        done
    ) &

    _SPINNER_PID=$!
    disown "$_SPINNER_PID" 2>/dev/null || true
}

stop_spinner() {
    local success="${1:-true}"
    local final_message="${2:-$_SPINNER_MSG}"

    if [[ -n "$_SPINNER_PID" ]]; then
        kill "$_SPINNER_PID" 2>/dev/null || true
        wait "$_SPINNER_PID" 2>/dev/null || true
        _SPINNER_PID=""
    fi

    # Calculate elapsed time
    local elapsed=""
    if [[ -n "$_SPINNER_START" ]]; then
        elapsed=$(($(date +%s) - _SPINNER_START))
        elapsed=" ${DIM}(${elapsed}s)${RESET}"
    fi

    # Clear the spinner line
    printf "\r%${COLUMNS:-80}s\r" ""

    if [[ "$success" == "true" ]]; then
        echo "${GREEN}✓${RESET} $final_message$elapsed"
    else
        echo "${RED}✗${RESET} $final_message$elapsed"
    fi

    show_cursor
}

# =============================================================================
# PROGRESS BAR
# =============================================================================

print_progress_bar() {
    local current="$1"
    local total="$2"
    local width="${3:-40}"
    local label="${4:-Progress}"

    local percent=$((current * 100 / total))
    local filled=$((current * width / total))
    local empty=$((width - filled))

    printf "%s: " "$label"

    # Filled portion
    printf "${GREEN}"
    for ((i = 0; i < filled; i++)); do
        printf "%s" "$PROGRESS_FILLED"
    done

    # Empty portion
    printf "${DIM}"
    for ((i = 0; i < empty; i++)); do
        printf "%s" "$PROGRESS_EMPTY"
    done

    printf "${RESET} %3d%%\n" "$percent"
}

# =============================================================================
# CHAT UI - Claude Code Style
# =============================================================================

# Chat message boundaries
CHAT_USER_PREFIX="╭─"
CHAT_USER_SUFFIX="─╮"
CHAT_AGENT_PREFIX="├─"
CHAT_AGENT_SUFFIX="─┤"
CHAT_END="╰"
CHAT_CONTINUE="│"

print_chat_divider() {
    local width
    width=$(get_terminal_width)
    local line_width=$((width - 4))
    printf "${DIM}%s%${line_width}s%s${RESET}\n" "├" "" "┤" | tr ' ' '─'
}

print_user_message_start() {
    local width
    width=$(get_terminal_width)
    local line_width=$((width - 12))
    echo
    printf "${GREEN}╭─ You ${RESET}${DIM}"
    printf "%${line_width}s" | tr ' ' '─'
    printf "${RESET}\n"
}

print_user_message_end() {
    local width
    width=$(get_terminal_width)
    printf "${DIM}╰"
    printf "%$((width - 2))s" | tr ' ' '─'
    printf "${RESET}\n"
}

print_agent_response_start() {
    local agent="${1:-Agent}"
    local width
    width=$(get_terminal_width)
    local agent_label=" $agent "
    local line_width=$((width - ${#agent_label} - 4))
    echo
    printf "${CYAN}╭─${BOLD}${agent_label}${RESET}${DIM}"
    printf "%${line_width}s" | tr ' ' '─'
    printf "${RESET}\n"
}

print_agent_response_end() {
    local width
    width=$(get_terminal_width)
    printf "${DIM}╰"
    printf "%$((width - 2))s" | tr ' ' '─'
    printf "${RESET}\n"
}

print_chat_content() {
    local content="$1"
    local prefix="${2:-${DIM}│${RESET}}"

    # Print each line with the prefix
    while IFS= read -r line; do
        printf "%s %s\n" "$prefix" "$line"
    done <<< "$content"
}

print_user_input_box() {
    local input="$1"
    print_user_message_start
    print_chat_content "$input" "${GREEN}│${RESET}"
    print_user_message_end
}

print_agent_response_box() {
    local agent="$1"
    local response="$2"
    print_agent_response_start "$agent"
    print_chat_content "$response" "${CYAN}│${RESET}"
    print_agent_response_end
}

# =============================================================================
# MESSAGES
# =============================================================================

print_task() {
    local task="$1"
    print_user_message_start
    printf "${GREEN}│${RESET} ${BOLD}Task:${RESET} %s\n" "$task"
    print_user_message_end
}

print_orchestrator_message() {
    local message="$1"
    print_agent_response_start "Orchestrator"
    print_chat_content "$message" "${MAGENTA}│${RESET}"
    print_agent_response_end
}

print_agent_message() {
    local agent="$1"
    local message="$2"
    print_agent_response_start "$agent"
    print_chat_content "$message" "${CYAN}│${RESET}"
    print_agent_response_end
}

print_user_prompt() {
    printf "\n${GREEN}>${RESET} "
}

print_focus_prompt() {
    local agent="$1"
    printf "\n${CYAN}$agent>${RESET} "
}

print_task_assignment() {
    local agent="$1"
    local task="$2"
    echo "${CYAN}│${RESET}   ${DIM}→${RESET} ${BOLD}$agent:${RESET} $task"
}

print_thinking() {
    local message="${1:-Thinking...}"
    printf "${DIM}│ %s${RESET}\n" "$message"
}

# =============================================================================
# DIVIDERS
# =============================================================================

print_divider() {
    local char="${1:-─}"
    local width
    width=$(get_terminal_width)
    printf "${DIM}"
    printf "%${width}s" | tr ' ' "$char"
    printf "${RESET}\n"
}

print_section() {
    local title="$1"
    echo
    print_divider
    echo "${BOLD}$title${RESET}"
    print_divider
}

# =============================================================================
# HELP TEXT
# =============================================================================

print_command_help() {
    echo
    echo "${BOLD}Session Commands:${RESET}"
    echo "  ${CYAN}/status${RESET}          Show all agent states"
    echo "  ${CYAN}/logs <agent>${RESET}    View agent output"
    echo "  ${CYAN}/kill <agent>${RESET}    Stop agent(s)"
    echo "  ${CYAN}/focus <agent>${RESET}   Talk directly to agent"
    echo "  ${CYAN}/unfocus${RESET}         Return to orchestrator"
    echo "  ${CYAN}/visual${RESET}          Toggle tmux view"
    echo "  ${CYAN}/clear${RESET}           Clear screen"
    echo "  ${CYAN}/exit${RESET}            End session"
    echo
}

print_scout_commands() {
    echo
    echo "${BOLD}Scout Commands:${RESET}"
    echo "  ${CYAN}/search <query>${RESET}  Web search"
    echo "  ${CYAN}/github <query>${RESET}  Search GitHub"
    echo "  ${CYAN}/papers <topic>${RESET}  Search papers"
    echo "  ${CYAN}/libs <task>${RESET}     Find libraries"
    echo "  ${CYAN}/sota <topic>${RESET}    State-of-the-art"
    echo
}

print_ml_commands() {
    echo
    echo "${BOLD}ML Commands:${RESET}"
    echo "  ${CYAN}/experiment <name>${RESET}   Start experiment"
    echo "  ${CYAN}/metrics${RESET}             Show metrics"
    echo "  ${CYAN}/tensorboard${RESET}         Open TensorBoard"
    echo "  ${CYAN}/checkpoint${RESET}          Save model"
    echo "  ${CYAN}/compare <e1> <e2>${RESET}   Compare experiments"
    echo "  ${CYAN}/huggingface <q>${RESET}     Search HF Hub"
    echo
}

# =============================================================================
# ERROR DISPLAY
# =============================================================================

print_error() {
    local message="$1"
    echo "${RED}${BOLD}Error:${RESET} ${RED}$message${RESET}" >&2
}

print_warning() {
    local message="$1"
    echo "${YELLOW}${BOLD}Warning:${RESET} ${YELLOW}$message${RESET}"
}

print_success() {
    local message="$1"
    echo "${GREEN}${BOLD}Success:${RESET} $message"
}

print_info() {
    local message="$1"
    echo "${CYAN}${BOLD}Info:${RESET} $message"
}

# =============================================================================
# SESSION STATS & TOKEN TRACKING
# =============================================================================

# Token tracking file (persists across subshells)
_TOKEN_FILE=""

init_session_stats() {
    _SESSION_START_TIME=$(date +%s)
    _SESSION_TOKENS=0
    # Create token tracking file (export for subshells)
    export _TOKEN_FILE="${AGENTK_WORKSPACE:-.}/.session_tokens"
    echo "0" > "$_TOKEN_FILE"
}

add_tokens() {
    local tokens="${1:-0}"
    if [[ -n "$_TOKEN_FILE" ]] && [[ -f "$_TOKEN_FILE" ]]; then
        local current
        current=$(cat "$_TOKEN_FILE" 2>/dev/null || echo "0")
        local new_total=$((current + tokens))
        echo "$new_total" > "$_TOKEN_FILE"
        _SESSION_TOKENS=$new_total
    else
        _SESSION_TOKENS=$((_SESSION_TOKENS + tokens))
    fi
}

get_session_tokens() {
    if [[ -n "$_TOKEN_FILE" ]] && [[ -f "$_TOKEN_FILE" ]]; then
        cat "$_TOKEN_FILE" 2>/dev/null || echo "0"
    else
        echo "${_SESSION_TOKENS:-0}"
    fi
}

format_tokens() {
    local tokens="$1"
    if [[ $tokens -ge 1000000 ]]; then
        printf "%.1fM" "$(echo "scale=1; $tokens / 1000000" | bc)"
    elif [[ $tokens -ge 1000 ]]; then
        printf "%.1fk" "$(echo "scale=1; $tokens / 1000" | bc)"
    else
        echo "$tokens"
    fi
}

print_session_stats() {
    local elapsed=""
    if [[ -n "${_SESSION_START_TIME:-}" ]]; then
        local now=$(date +%s)
        local secs=$(($now - $_SESSION_START_TIME))
        local mins=$((secs / 60))
        secs=$((secs % 60))
        if [[ $mins -gt 0 ]]; then
            elapsed="${mins}m ${secs}s"
        else
            elapsed="${secs}s"
        fi
    fi

    local total_tokens
    total_tokens=$(get_session_tokens)
    local tokens_display
    tokens_display=$(format_tokens "$total_tokens")

    echo
    print_divider "─"
    printf "${DIM}Session: %s │ Tokens: ↑ %s${RESET}\n" "$elapsed" "$tokens_display"

    # Cleanup token file
    [[ -n "$_TOKEN_FILE" ]] && rm -f "$_TOKEN_FILE" 2>/dev/null
}

print_status_line() {
    local message="${1:-}"
    local tokens="${2:-0}"
    local elapsed="${3:-0}"

    local tokens_display
    tokens_display=$(format_tokens "$tokens")

    printf "${DIM}✢ %s (ctrl+c to interrupt · %ss · ↑ %s tokens)${RESET}" "$message" "$elapsed" "$tokens_display"
}

# =============================================================================
# CLEANUP ON EXIT
# =============================================================================

ui_cleanup() {
    show_cursor
    [[ -n "${_SPINNER_PID:-}" ]] && kill "$_SPINNER_PID" 2>/dev/null || true
}

trap ui_cleanup EXIT
