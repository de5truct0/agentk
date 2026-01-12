#!/usr/bin/env python3
"""
AGENT-K CLI Entry Point

This is a thin Python wrapper that executes the bash-based agentk script.
"""

import os
import sys
import subprocess
import shutil
from pathlib import Path


def get_agentk_root() -> Path:
    """Get the root directory of the agentk installation."""
    # Check if running from installed package
    package_dir = Path(__file__).parent
    scripts_dir = package_dir / "scripts"

    if scripts_dir.exists():
        return scripts_dir

    # Check if running from source
    source_dir = package_dir.parent.parent
    if (source_dir / "agentk").exists():
        return source_dir

    raise FileNotFoundError("Could not find agentk scripts directory")


def check_dependencies() -> list:
    """Check for required dependencies."""
    missing = []

    # Check bash
    if not shutil.which("bash"):
        missing.append("bash")

    # Check jq
    if not shutil.which("jq"):
        missing.append("jq")

    # Check claude
    if not shutil.which("claude"):
        missing.append("claude (Claude Code CLI)")

    return missing


def main():
    """Main entry point for agentk CLI."""
    # Check dependencies
    missing = check_dependencies()
    if missing:
        print("Missing required dependencies:")
        for dep in missing:
            print(f"  - {dep}")
        print()
        print("Install missing dependencies:")
        print("  brew install jq         # macOS")
        print("  sudo apt install jq     # Linux")
        print()
        print("Install Claude Code CLI:")
        print("  https://claude.ai/code")
        sys.exit(1)

    try:
        agentk_root = get_agentk_root()
    except FileNotFoundError as e:
        print(f"Error: {e}")
        sys.exit(1)

    # Set environment
    env = os.environ.copy()
    env["AGENTK_ROOT"] = str(agentk_root)

    # Find the agentk script
    agentk_script = agentk_root / "agentk"
    if not agentk_script.exists():
        print(f"Error: agentk script not found at {agentk_script}")
        sys.exit(1)

    # Execute the bash script
    try:
        result = subprocess.run(
            ["bash", str(agentk_script)] + sys.argv[1:],
            env=env,
            cwd=os.getcwd()
        )
        sys.exit(result.returncode)
    except KeyboardInterrupt:
        print("\nInterrupted")
        sys.exit(130)
    except Exception as e:
        print(f"Error running agentk: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
