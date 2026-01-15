"""
Tools Module for AGENT-K

Provides utilities for:
- Directory scanning
- File tree generation
- Git-aware file filtering
- Pattern matching
"""

from pathlib import Path
from typing import List, Optional, Any
from fnmatch import fnmatch

try:
    import pathspec as pathspec_module
    HAS_PATHSPEC = True
except ImportError:
    pathspec_module = None
    HAS_PATHSPEC = False


# Default ignore patterns (similar to .gitignore)
DEFAULT_IGNORES = [
    ".git",
    ".git/**",
    "node_modules",
    "node_modules/**",
    "__pycache__",
    "__pycache__/**",
    "*.pyc",
    ".venv",
    ".venv/**",
    "venv",
    "venv/**",
    ".env",
    ".env.*",
    "dist",
    "dist/**",
    "build",
    "build/**",
    "*.egg-info",
    "*.egg-info/**",
    ".DS_Store",
    "Thumbs.db",
    "*.log",
    "*.lock",
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    ".idea",
    ".idea/**",
    ".vscode",
    ".vscode/**",
    "coverage",
    "coverage/**",
    ".nyc_output",
    ".nyc_output/**",
    ".next",
    ".next/**",
    ".nuxt",
    ".nuxt/**",
    "*.min.js",
    "*.min.css",
    "*.map",
]


def load_gitignore(root: str) -> Optional[Any]:
    """Load .gitignore patterns from a directory."""
    if not HAS_PATHSPEC or pathspec_module is None:
        return None

    gitignore_path = Path(root) / ".gitignore"
    if not gitignore_path.exists():
        return None

    try:
        with open(gitignore_path, "r") as f:
            patterns = f.read().splitlines()
        return pathspec_module.PathSpec.from_lines("gitwildmatch", patterns)
    except Exception:
        return None


def should_ignore(
    path: str,
    root: str,
    gitignore: Optional[Any] = None,
    extra_ignores: Optional[List[str]] = None,
) -> bool:
    """
    Check if a path should be ignored.
    
    Args:
        path: Absolute path to check
        root: Root directory for relative path calculation
        gitignore: PathSpec from .gitignore
        extra_ignores: Additional patterns to ignore
        
    Returns:
        True if path should be ignored
    """
    # Get relative path
    try:
        rel_path = Path(path).relative_to(root)
        rel_str = str(rel_path)
    except ValueError:
        return True
    
    # Check default ignores
    for pattern in DEFAULT_IGNORES:
        if fnmatch(rel_str, pattern) or fnmatch(Path(path).name, pattern):
            return True
    
    # Check extra ignores
    if extra_ignores:
        for pattern in extra_ignores:
            if fnmatch(rel_str, pattern) or fnmatch(Path(path).name, pattern):
                return True
    
    # Check .gitignore
    if gitignore and HAS_PATHSPEC:
        if gitignore.match_file(rel_str):
            return True
    
    return False


def scan_directory(
    root: str,
    patterns: Optional[List[str]] = None,
    max_files: int = 100,
    max_depth: int = 5,
    extra_ignores: Optional[List[str]] = None,
) -> List[str]:
    """
    Scan a directory for files matching patterns.
    
    Args:
        root: Root directory to scan
        patterns: File patterns to match (e.g., ["*.py", "*.ts"])
        max_files: Maximum number of files to return
        max_depth: Maximum directory depth to traverse
        extra_ignores: Additional patterns to ignore
        
    Returns:
        List of matching file paths (relative to root)
    """
    root_path = Path(root).resolve()
    gitignore = load_gitignore(str(root_path))
    
    matches = []
    
    def scan(directory: Path, depth: int):
        if depth > max_depth or len(matches) >= max_files:
            return
        
        try:
            entries = sorted(directory.iterdir(), key=lambda p: (p.is_file(), p.name))
        except PermissionError:
            return
        
        for entry in entries:
            if len(matches) >= max_files:
                break
            
            if should_ignore(str(entry), str(root_path), gitignore, extra_ignores):
                continue
            
            if entry.is_dir():
                scan(entry, depth + 1)
            elif entry.is_file():
                # Check if file matches patterns
                if patterns:
                    rel_path = entry.relative_to(root_path)
                    if any(fnmatch(str(rel_path), p) or fnmatch(entry.name, p) for p in patterns):
                        matches.append(str(rel_path))
                else:
                    matches.append(str(entry.relative_to(root_path)))
    
    scan(root_path, 0)
    return matches


def get_file_tree(
    root: str,
    max_depth: int = 3,
    max_items: int = 50,
    extra_ignores: Optional[List[str]] = None,
) -> str:
    """
    Generate a text representation of the directory tree.
    
    Args:
        root: Root directory
        max_depth: Maximum depth to display
        max_items: Maximum total items to display
        extra_ignores: Additional patterns to ignore
        
    Returns:
        String representation of the tree
    """
    root_path = Path(root).resolve()
    gitignore = load_gitignore(str(root_path))
    
    lines = [f"{root_path.name}/"]
    item_count = 0
    
    def add_tree(directory: Path, prefix: str, depth: int):
        nonlocal item_count
        
        if depth > max_depth or item_count >= max_items:
            return
        
        try:
            entries = sorted(directory.iterdir(), key=lambda p: (p.is_file(), p.name))
        except PermissionError:
            return
        
        # Filter ignored entries
        entries = [
            e for e in entries
            if not should_ignore(str(e), str(root_path), gitignore, extra_ignores)
        ]
        
        for i, entry in enumerate(entries):
            if item_count >= max_items:
                lines.append(f"{prefix}...")
                break
            
            is_last = i == len(entries) - 1
            connector = "└── " if is_last else "├── "
            
            if entry.is_dir():
                lines.append(f"{prefix}{connector}{entry.name}/")
                item_count += 1
                new_prefix = prefix + ("    " if is_last else "│   ")
                add_tree(entry, new_prefix, depth + 1)
            else:
                lines.append(f"{prefix}{connector}{entry.name}")
                item_count += 1
    
    add_tree(root_path, "", 0)
    
    if item_count >= max_items:
        lines.append(f"\n... (truncated, {max_items}+ items)")
    
    return "\n".join(lines)


def read_file_safe(
    path: str,
    max_lines: int = 100,
    max_chars: int = 10000,
) -> Optional[str]:
    """
    Safely read a file with limits.
    
    Args:
        path: File path
        max_lines: Maximum lines to read
        max_chars: Maximum characters to read
        
    Returns:
        File content or None if error
    """
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            lines = []
            total_chars = 0
            
            for i, line in enumerate(f):
                if i >= max_lines:
                    lines.append(f"\n... (truncated at {max_lines} lines)")
                    break
                
                if total_chars + len(line) > max_chars:
                    lines.append(f"\n... (truncated at {max_chars} chars)")
                    break
                
                lines.append(line)
                total_chars += len(line)
            
            return "".join(lines)
    except Exception:
        return None


def find_project_root(start: str = ".") -> Optional[str]:
    """
    Find the project root by looking for common markers.
    
    Args:
        start: Starting directory
        
    Returns:
        Project root path or None
    """
    markers = [
        ".git",
        "package.json",
        "pyproject.toml",
        "Cargo.toml",
        "go.mod",
        "pom.xml",
        "build.gradle",
        "Makefile",
    ]
    
    current = Path(start).resolve()
    
    while current != current.parent:
        for marker in markers:
            if (current / marker).exists():
                return str(current)
        current = current.parent
    
    return None


def detect_project_type(root: str) -> List[str]:
    """
    Detect the project type(s) based on files present.
    
    Args:
        root: Project root directory
        
    Returns:
        List of detected project types
    """
    root_path = Path(root)
    types = []
    
    type_markers = {
        "nodejs": ["package.json"],
        "python": ["pyproject.toml", "setup.py", "requirements.txt"],
        "rust": ["Cargo.toml"],
        "go": ["go.mod"],
        "java": ["pom.xml", "build.gradle"],
        "typescript": ["tsconfig.json"],
        "react": ["package.json"],  # Check for react in package.json
        "nextjs": ["next.config.js", "next.config.ts", "next.config.mjs"],
        "docker": ["Dockerfile", "docker-compose.yml", "docker-compose.yaml"],
    }
    
    for proj_type, markers in type_markers.items():
        for marker in markers:
            if (root_path / marker).exists():
                types.append(proj_type)
                break
    
    # Check for React specifically in package.json
    pkg_json = root_path / "package.json"
    if pkg_json.exists():
        try:
            import json
            with open(pkg_json) as f:
                pkg = json.load(f)
            deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
            if "react" in deps:
                if "react" not in types:
                    types.append("react")
        except Exception:
            pass
    
    return list(set(types))
