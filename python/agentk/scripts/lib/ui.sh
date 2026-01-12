#!/usr/bin/env bash
# AGENT-K UI Library
# Pretty terminal output, spinners, boxes, and status displays

set -euo pipefail

# Source core for colors
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/core.sh"

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

# Spinner frames
SPINNER_FRAMES=("⠋" "⠙" "⠹" "⠸" "⠼" "⠴" "⠦" "⠧" "⠇" "⠏")

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
    local width
    width=$(get_terminal_width)
    [[ $width -gt 60 ]] && width=60

    echo
    draw_box "AGENT-K v${AGENTK_VERSION}" "$width"
    close_box "$width"
    echo
}

print_mode_banner() {
    local mode="$1"
    local mode_display

    case "$mode" in
        dev) mode_display="Software Development Mode" ;;
        ml)  mode_display="ML Research & Training Mode" ;;
        *)   mode_display="$mode Mode" ;;
    esac

    echo "${DIM}Mode: ${RESET}${CYAN}$mode_display${RESET}"
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
# SPINNER
# =============================================================================

# Global spinner state
_SPINNER_PID=""
_SPINNER_MSG=""

start_spinner() {
    local message="${1:-Working...}"
    _SPINNER_MSG="$message"

    hide_cursor

    (
        local i=0
        while true; do
            printf "\r${YELLOW}%s${RESET} %s" "${SPINNER_FRAMES[$i]}" "$message"
            i=$(( (i + 1) % ${#SPINNER_FRAMES[@]} ))
            sleep 0.1
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

    # Clear the spinner line
    printf "\r%${COLUMNS:-80}s\r" ""

    if [[ "$success" == "true" ]]; then
        echo "${GREEN}${STATUS_DONE}${RESET} $final_message"
    else
        echo "${RED}${STATUS_FAILED}${RESET} $final_message"
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
# MESSAGES
# =============================================================================

print_task() {
    local task="$1"
    echo
    echo "${BOLD}Task:${RESET} ${CYAN}\"$task\"${RESET}"
    echo
}

print_orchestrator_message() {
    local message="$1"
    echo "${MAGENTA}[Orchestrator]${RESET} $message"
}

print_agent_message() {
    local agent="$1"
    local message="$2"
    echo "${CYAN}[$agent]${RESET} $message"
}

print_user_prompt() {
    printf "\n${GREEN}You:${RESET} "
}

print_focus_prompt() {
    local agent="$1"
    printf "\n${CYAN}[$agent]${RESET} ${GREEN}You:${RESET} "
}

print_task_assignment() {
    local agent="$1"
    local task="$2"
    echo "  ${DIM}→${RESET} ${BOLD}$agent:${RESET} $task"
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
# CLEANUP ON EXIT
# =============================================================================

ui_cleanup() {
    show_cursor
    [[ -n "${_SPINNER_PID:-}" ]] && kill "$_SPINNER_PID" 2>/dev/null || true
}

trap ui_cleanup EXIT
