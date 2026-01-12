# AGENT-K Makefile
# Build, install, and distribution targets

.PHONY: all install uninstall clean test lint help
.PHONY: dist-npm dist-pip dist-brew dist-all
.PHONY: release release-patch release-minor release-major

# Configuration
VERSION := 1.0.0
PREFIX := $(HOME)/.agentk
BIN_DIR := $(HOME)/.local/bin
SHELL := /bin/bash

# Colors
CYAN := \033[0;36m
GREEN := \033[0;32m
YELLOW := \033[1;33m
RESET := \033[0m

#==============================================================================
# Main Targets
#==============================================================================

all: help

help:
	@echo ""
	@echo "$(CYAN)AGENT-K Makefile$(RESET)"
	@echo ""
	@echo "$(GREEN)Installation:$(RESET)"
	@echo "  make install        Install to ~/.agentk and ~/.local/bin"
	@echo "  make uninstall      Remove installation"
	@echo ""
	@echo "$(GREEN)Development:$(RESET)"
	@echo "  make test           Run tests"
	@echo "  make lint           Check shell scripts"
	@echo "  make clean          Clean build artifacts"
	@echo ""
	@echo "$(GREEN)Distribution:$(RESET)"
	@echo "  make dist-npm       Build npm package"
	@echo "  make dist-pip       Build pip package"
	@echo "  make dist-brew      Update Homebrew formula"
	@echo "  make dist-all       Build all distributions"
	@echo ""
	@echo "$(GREEN)Release:$(RESET)"
	@echo "  make release-patch  Release patch version (x.x.X)"
	@echo "  make release-minor  Release minor version (x.X.0)"
	@echo "  make release-major  Release major version (X.0.0)"
	@echo ""

#==============================================================================
# Installation
#==============================================================================

install:
	@echo "$(CYAN)Installing AGENT-K...$(RESET)"
	@mkdir -p $(PREFIX)
	@mkdir -p $(BIN_DIR)
	@cp -r lib modes $(PREFIX)/
	@cp agentk $(PREFIX)/
	@chmod +x $(PREFIX)/agentk
	@chmod +x $(PREFIX)/lib/*.sh
	@ln -sf $(PREFIX)/agentk $(BIN_DIR)/agentk
	@echo "$(GREEN)Installed to $(PREFIX)$(RESET)"
	@echo "$(GREEN)Symlink created at $(BIN_DIR)/agentk$(RESET)"
	@echo ""
	@echo "Make sure $(BIN_DIR) is in your PATH"
	@echo "Run 'agentk --help' to get started"

uninstall:
	@echo "$(CYAN)Uninstalling AGENT-K...$(RESET)"
	@rm -f $(BIN_DIR)/agentk
	@rm -rf $(PREFIX)
	@echo "$(GREEN)Uninstalled$(RESET)"

#==============================================================================
# Development
#==============================================================================

test:
	@echo "$(CYAN)Running tests...$(RESET)"
	@# Basic syntax check
	@bash -n agentk
	@for f in lib/*.sh; do bash -n "$$f"; done
	@echo "$(GREEN)All syntax checks passed$(RESET)"
	@# TODO: Add actual tests

lint:
	@echo "$(CYAN)Linting shell scripts...$(RESET)"
	@if command -v shellcheck &> /dev/null; then \
		shellcheck agentk lib/*.sh; \
		echo "$(GREEN)Lint passed$(RESET)"; \
	else \
		echo "$(YELLOW)shellcheck not installed, skipping$(RESET)"; \
	fi

clean:
	@echo "$(CYAN)Cleaning...$(RESET)"
	@rm -rf dist/ build/ *.egg-info/
	@rm -rf workspace/
	@find . -name "*.pyc" -delete
	@find . -name "__pycache__" -delete
	@echo "$(GREEN)Cleaned$(RESET)"

#==============================================================================
# Distribution
#==============================================================================

dist-npm:
	@echo "$(CYAN)Building npm package...$(RESET)"
	@npm pack
	@echo "$(GREEN)npm package built$(RESET)"

dist-pip:
	@echo "$(CYAN)Building pip package...$(RESET)"
	@# Copy scripts to python package
	@mkdir -p python/agentk/scripts
	@cp -r lib modes agentk python/agentk/scripts/
	@# Build
	@cd python && python -m build
	@echo "$(GREEN)pip package built$(RESET)"

dist-brew:
	@echo "$(CYAN)Updating Homebrew formula...$(RESET)"
	@echo "$(YELLOW)Manual step: Update SHA256 in Formula/agentk.rb after creating GitHub release$(RESET)"

dist-all: dist-npm dist-pip
	@echo "$(GREEN)All distributions built$(RESET)"

#==============================================================================
# Release
#==============================================================================

release-patch:
	@echo "$(CYAN)Creating patch release...$(RESET)"
	@# TODO: Implement version bumping
	@echo "$(YELLOW)Not implemented yet$(RESET)"

release-minor:
	@echo "$(CYAN)Creating minor release...$(RESET)"
	@echo "$(YELLOW)Not implemented yet$(RESET)"

release-major:
	@echo "$(CYAN)Creating major release...$(RESET)"
	@echo "$(YELLOW)Not implemented yet$(RESET)"
