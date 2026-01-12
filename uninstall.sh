#!/usr/bin/env bash
# AGENT-K Uninstaller
# Remove AGENT-K from your system

set -euo pipefail

# =============================================================================
# CONFIGURATION
# =============================================================================

INSTALL_DIR="${AGENTK_INSTALL_DIR:-$HOME/.agentk}"
BIN_DIR="${AGENTK_BIN_DIR:-$HOME/.local/bin}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

# =============================================================================
# HELPERS
# =============================================================================

info() {
    echo -e "${CYAN}[INFO]${RESET} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${RESET} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${RESET} $1"
}

error() {
    echo -e "${RED}[ERROR]${RESET} $1" >&2
}

# =============================================================================
# UNINSTALLATION
# =============================================================================

remove_files() {
    info "Removing AGENT-K files..."

    # Remove symlink
    if [[ -L "$BIN_DIR/agentk" ]]; then
        rm -f "$BIN_DIR/agentk"
        success "Removed symlink: $BIN_DIR/agentk"
    fi

    # Remove installation directory
    if [[ -d "$INSTALL_DIR" ]]; then
        rm -rf "$INSTALL_DIR"
        success "Removed directory: $INSTALL_DIR"
    else
        warn "Installation directory not found: $INSTALL_DIR"
    fi

    # Remove workspace (optional)
    local workspace="$HOME/.agentk-workspace"
    if [[ -d "$workspace" ]]; then
        read -p "Remove workspace data ($workspace)? [y/N] " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm -rf "$workspace"
            success "Removed workspace: $workspace"
        else
            info "Kept workspace data"
        fi
    fi
}

cleanup_shell_rc() {
    info "Cleaning up shell configuration..."

    local shell_rcs=(
        "$HOME/.bashrc"
        "$HOME/.bash_profile"
        "$HOME/.zshrc"
        "$HOME/.profile"
    )

    for rc in "${shell_rcs[@]}"; do
        if [[ -f "$rc" ]]; then
            # Remove AGENT-K related lines
            if grep -q "AGENT-K" "$rc" 2>/dev/null; then
                # Create backup
                cp "$rc" "${rc}.agentk-backup"

                # Remove lines (macOS compatible)
                if [[ "$(uname)" == "Darwin" ]]; then
                    sed -i '' '/# AGENT-K/d' "$rc"
                    sed -i '' '/agentk/d' "$rc"
                else
                    sed -i '/# AGENT-K/d' "$rc"
                    sed -i '/agentk/d' "$rc"
                fi

                success "Cleaned $rc (backup: ${rc}.agentk-backup)"
            fi
        fi
    done
}

# =============================================================================
# MAIN
# =============================================================================

main() {
    echo
    echo -e "${CYAN}╭─────────────────────────────────────────────────╮${RESET}"
    echo -e "${CYAN}│${RESET}  ${BOLD}AGENT-K Uninstaller${RESET}                            ${CYAN}│${RESET}"
    echo -e "${CYAN}╰─────────────────────────────────────────────────╯${RESET}"
    echo

    # Confirm
    read -p "Are you sure you want to uninstall AGENT-K? [y/N] " -n 1 -r
    echo

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        info "Uninstall cancelled"
        exit 0
    fi

    echo

    # Remove files
    remove_files

    # Cleanup shell rc
    cleanup_shell_rc

    echo
    echo -e "${GREEN}╭─────────────────────────────────────────────────╮${RESET}"
    echo -e "${GREEN}│${RESET}  ${BOLD}AGENT-K Uninstalled${RESET}                            ${GREEN}│${RESET}"
    echo -e "${GREEN}╰─────────────────────────────────────────────────╯${RESET}"
    echo
    echo "To reinstall, run:"
    echo "  curl -sSL https://raw.githubusercontent.com/adityakatiyar/agentk/main/install.sh | bash"
    echo
}

# Run
main "$@"
