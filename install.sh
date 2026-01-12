#!/usr/bin/env bash
# AGENT-K Installer
# Install AGENT-K to your system

set -euo pipefail

# =============================================================================
# CONFIGURATION
# =============================================================================

AGENTK_VERSION="1.0.0"
AGENTK_REPO="de5truct0/agentk"
INSTALL_DIR="${AGENTK_INSTALL_DIR:-$HOME/.agentk}"
BIN_DIR="${AGENTK_BIN_DIR:-$HOME/.local/bin}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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
# BANNER
# =============================================================================

print_banner() {
    echo
    echo -e "${CYAN}╭─────────────────────────────────────────────────╮${RESET}"
    echo -e "${CYAN}│${RESET}  ${BOLD}AGENT-K Installer${RESET}                              ${CYAN}│${RESET}"
    echo -e "${CYAN}│${RESET}  Multi-Agent Claude Code Terminal Suite          ${CYAN}│${RESET}"
    echo -e "${CYAN}│${RESET}  Version: ${GREEN}$AGENTK_VERSION${RESET}                               ${CYAN}│${RESET}"
    echo -e "${CYAN}╰─────────────────────────────────────────────────╯${RESET}"
    echo
}

# =============================================================================
# SYSTEM DETECTION
# =============================================================================

detect_os() {
    case "$(uname -s)" in
        Darwin*)    echo "macos" ;;
        Linux*)     echo "linux" ;;
        MINGW*|MSYS*|CYGWIN*) echo "windows" ;;
        *)          echo "unknown" ;;
    esac
}

detect_arch() {
    case "$(uname -m)" in
        x86_64|amd64)   echo "x86_64" ;;
        arm64|aarch64)  echo "arm64" ;;
        *)              echo "unknown" ;;
    esac
}

detect_shell() {
    basename "${SHELL:-/bin/bash}"
}

get_shell_rc() {
    local shell
    shell=$(detect_shell)
    case "$shell" in
        bash)
            if [[ -f "$HOME/.bash_profile" ]]; then
                echo "$HOME/.bash_profile"
            else
                echo "$HOME/.bashrc"
            fi
            ;;
        zsh)    echo "$HOME/.zshrc" ;;
        fish)   echo "$HOME/.config/fish/config.fish" ;;
        *)      echo "$HOME/.profile" ;;
    esac
}

# =============================================================================
# DEPENDENCY CHECKS
# =============================================================================

check_dependencies() {
    local missing=()

    info "Checking dependencies..."

    # Required
    if ! command -v bash &>/dev/null; then
        missing+=("bash")
    else
        local bash_version
        bash_version=$(bash --version | head -1 | grep -oE '[0-9]+\.[0-9]+' | head -1)
        local major_version="${bash_version%%.*}"
        if [[ "$major_version" -lt 4 ]]; then
            warn "Bash 4.0+ recommended (found: $bash_version)"
        fi
    fi

    if ! command -v jq &>/dev/null; then
        missing+=("jq")
    fi

    if ! command -v claude &>/dev/null; then
        missing+=("claude (Claude Code CLI)")
    fi

    # Optional
    if ! command -v tmux &>/dev/null; then
        warn "tmux not installed (optional, for visual mode)"
    fi

    if [[ ${#missing[@]} -gt 0 ]]; then
        error "Missing required dependencies: ${missing[*]}"
        echo
        echo "Install missing dependencies:"

        local os
        os=$(detect_os)
        case "$os" in
            macos)
                echo "  brew install ${missing[*]}"
                ;;
            linux)
                echo "  sudo apt install ${missing[*]}  # Debian/Ubuntu"
                echo "  sudo yum install ${missing[*]}  # RHEL/CentOS"
                ;;
        esac
        echo
        return 1
    fi

    success "All required dependencies found"
    return 0
}

# =============================================================================
# INSTALLATION
# =============================================================================

install_from_local() {
    local source_dir="$1"

    info "Installing from local source: $source_dir"

    # Create install directory
    mkdir -p "$INSTALL_DIR"

    # Copy files
    cp -r "$source_dir"/* "$INSTALL_DIR/"

    # Make scripts executable
    chmod +x "$INSTALL_DIR/agentk"
    chmod +x "$INSTALL_DIR/lib/"*.sh 2>/dev/null || true

    success "Files installed to $INSTALL_DIR"
}

install_from_github() {
    local version="${1:-latest}"

    info "Installing from GitHub: $AGENTK_REPO ($version)"

    # Determine download URL
    local download_url
    if [[ "$version" == "latest" ]]; then
        download_url="https://github.com/$AGENTK_REPO/archive/refs/heads/main.tar.gz"
    else
        download_url="https://github.com/$AGENTK_REPO/archive/refs/tags/$version.tar.gz"
    fi

    # Create temp directory
    local tmp_dir
    tmp_dir=$(mktemp -d)
    trap "rm -rf $tmp_dir" EXIT

    # Download
    info "Downloading..."
    if command -v curl &>/dev/null; then
        curl -sL "$download_url" | tar xz -C "$tmp_dir"
    elif command -v wget &>/dev/null; then
        wget -qO- "$download_url" | tar xz -C "$tmp_dir"
    else
        error "Neither curl nor wget found"
        return 1
    fi

    # Find extracted directory
    local extracted_dir
    extracted_dir=$(find "$tmp_dir" -mindepth 1 -maxdepth 1 -type d | head -1)

    if [[ -z "$extracted_dir" ]]; then
        error "Failed to extract archive"
        return 1
    fi

    # Install
    install_from_local "$extracted_dir/agentk"
}

create_symlink() {
    info "Creating symlink in $BIN_DIR..."

    # Create bin directory if needed
    mkdir -p "$BIN_DIR"

    # Remove old symlink if exists
    rm -f "$BIN_DIR/agentk"

    # Create symlink
    ln -s "$INSTALL_DIR/agentk" "$BIN_DIR/agentk"

    success "Symlink created: $BIN_DIR/agentk"
}

add_to_path() {
    local shell_rc
    shell_rc=$(get_shell_rc)
    local path_line="export PATH=\"\$HOME/.local/bin:\$PATH\""

    # Check if already in PATH
    if echo "$PATH" | grep -q "$BIN_DIR"; then
        info "PATH already includes $BIN_DIR"
        return 0
    fi

    # Check if already in shell rc
    if grep -q ".local/bin" "$shell_rc" 2>/dev/null; then
        info "PATH export already in $shell_rc"
        return 0
    fi

    info "Adding to PATH in $shell_rc..."

    echo "" >> "$shell_rc"
    echo "# AGENT-K" >> "$shell_rc"
    echo "$path_line" >> "$shell_rc"

    success "Added to $shell_rc"
    warn "Run 'source $shell_rc' or restart your terminal to use agentk"
}

# =============================================================================
# VERIFICATION
# =============================================================================

verify_installation() {
    info "Verifying installation..."

    if [[ ! -f "$INSTALL_DIR/agentk" ]]; then
        error "agentk not found in $INSTALL_DIR"
        return 1
    fi

    if [[ ! -x "$INSTALL_DIR/agentk" ]]; then
        error "agentk is not executable"
        return 1
    fi

    # Try to run version command
    if "$INSTALL_DIR/agentk" --version &>/dev/null; then
        local version
        version=$("$INSTALL_DIR/agentk" --version)
        success "Installation verified: $version"
        return 0
    else
        error "Failed to run agentk"
        return 1
    fi
}

# =============================================================================
# MAIN
# =============================================================================

main() {
    print_banner

    local source="${1:-}"
    local version="${2:-latest}"

    # Check dependencies
    if ! check_dependencies; then
        exit 1
    fi

    echo

    # Install
    if [[ -n "$source" && -d "$source" ]]; then
        install_from_local "$source"
    elif [[ -d "$(dirname "$0")/lib" ]]; then
        # Installing from cloned repo
        install_from_local "$(dirname "$0")"
    else
        install_from_github "$version"
    fi

    # Create symlink
    create_symlink

    # Add to PATH
    add_to_path

    echo

    # Verify
    if verify_installation; then
        echo
        echo -e "${GREEN}╭─────────────────────────────────────────────────╮${RESET}"
        echo -e "${GREEN}│${RESET}  ${BOLD}Installation Complete!${RESET}                         ${GREEN}│${RESET}"
        echo -e "${GREEN}╰─────────────────────────────────────────────────╯${RESET}"
        echo
        echo "Get started:"
        echo "  ${CYAN}agentk${RESET}              # Start interactive session"
        echo "  ${CYAN}agentk --mode ml${RESET}    # ML research mode"
        echo "  ${CYAN}agentk --help${RESET}       # Show all options"
        echo
    else
        echo
        error "Installation may have issues. Please check the errors above."
        exit 1
    fi
}

# Run
main "$@"
