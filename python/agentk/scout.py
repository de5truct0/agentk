"""
Scout Agent: Research-First Intelligence

The Scout agent always runs first to:
1. Check current date (detect outdated LLM knowledge)
2. Scan project files for context
3. Perform web searches if needed
4. Flag when LLM responses may be outdated

This ensures other agents have accurate, current information.
"""

import asyncio
import os
import subprocess
import json
from datetime import datetime, date
from typing import Optional, Dict, List, Any
from dataclasses import dataclass
from pathlib import Path

from .tools import scan_directory, get_file_tree
from .llm import LLMClient


@dataclass
class ScoutReport:
    """Report from Scout's research phase."""
    timestamp: str
    current_date: str
    project_context: Dict[str, Any]
    web_results: Optional[List[Dict]] = None
    outdated_warnings: Optional[List[str]] = None
    recommendations: Optional[str] = None
    
    def to_dict(self) -> Dict:
        return {
            "timestamp": self.timestamp,
            "current_date": self.current_date,
            "project_context": self.project_context,
            "web_results": self.web_results,
            "outdated_warnings": self.outdated_warnings,
            "recommendations": self.recommendations,
        }
    
    def to_context_string(self) -> str:
        """Format report as context string for other agents."""
        parts = [
            f"## Scout Report - {self.timestamp}",
            f"Current Date: {self.current_date}",
        ]
        
        if self.outdated_warnings:
            parts.append("\n### Warnings (Potentially Outdated Info):")
            for warning in self.outdated_warnings:
                parts.append(f"- {warning}")
        
        if self.project_context.get("summary"):
            parts.append(f"\n### Project Context:\n{self.project_context['summary']}")
        
        if self.web_results:
            parts.append("\n### Web Research:")
            for result in self.web_results[:3]:  # Top 3 results
                parts.append(f"- {result.get('title', 'N/A')}: {result.get('snippet', '')}")
        
        if self.recommendations:
            parts.append(f"\n### Recommendations:\n{self.recommendations}")
        
        return "\n".join(parts)


class Scout:
    """
    Research agent that gathers context before other agents act.
    
    Always runs first to ensure agents have:
    - Current date awareness
    - Project structure understanding
    - Up-to-date web information when needed
    """
    
    # Topics that likely need current info
    CURRENT_INFO_KEYWORDS = [
        "latest", "newest", "current", "2024", "2025", "2026",
        "version", "update", "release", "best practices",
        "benchmark", "comparison", "vs", "alternative",
        "deprecated", "breaking change", "migration",
    ]
    
    # LLM knowledge cutoffs (approximate)
    LLM_CUTOFFS = {
        "gpt": date(2024, 4, 1),  # GPT-4o training cutoff
        "gemini": date(2024, 4, 1),
        "claude": date(2024, 4, 1),  # Claude 3.5 training cutoff
    }
    
    def __init__(self, project_root: Optional[str] = None):
        """
        Initialize Scout.
        
        Args:
            project_root: Root directory of the project to analyze
        """
        self.project_root = Path(project_root) if project_root else Path.cwd()
        self.client = LLMClient(use_cli_for_claude=True)
        self.today = date.today()
    
    def needs_web_search(self, query: str) -> bool:
        """Determine if query needs current web information."""
        query_lower = query.lower()
        return any(kw in query_lower for kw in self.CURRENT_INFO_KEYWORDS)
    
    def check_outdated_risk(self, query: str) -> List[str]:
        """Check if query might get outdated LLM responses."""
        warnings = []
        query_lower = query.lower()
        
        # Check for specific technologies that evolve fast
        fast_evolving = {
            "react": "React versions change frequently",
            "next.js": "Next.js has frequent major updates",
            "nextjs": "Next.js has frequent major updates",
            "typescript": "TypeScript releases new features regularly",
            "python 3": "Python 3.x has yearly releases",
            "node": "Node.js has regular releases",
            "docker": "Docker features evolve",
            "kubernetes": "Kubernetes has quarterly releases",
            "aws": "AWS services update frequently",
            "gcp": "GCP services update frequently",
            "azure": "Azure services update frequently",
        }
        
        for tech, warning in fast_evolving.items():
            if tech in query_lower:
                warnings.append(f"{warning} - verify current best practices")
        
        # Check for year references
        import re
        years = re.findall(r'20\d{2}', query)
        for year in years:
            if int(year) > 2024:
                warnings.append(f"Query mentions {year} - LLMs may lack recent data")
        
        # General warning for "latest" queries
        if "latest" in query_lower or "newest" in query_lower:
            warnings.append("Query asks for 'latest' info - web search recommended")
        
        return warnings
    
    async def scan_project(self) -> Dict[str, Any]:
        """Scan the project directory for context."""
        context = {
            "root": str(self.project_root),
            "files": [],
            "summary": "",
        }
        
        try:
            # Get file tree
            tree = get_file_tree(str(self.project_root), max_depth=3)
            context["tree"] = tree
            
            # Scan for key files
            key_files = scan_directory(
                str(self.project_root),
                patterns=[
                    "package.json",
                    "pyproject.toml",
                    "Cargo.toml",
                    "go.mod",
                    "README.md",
                    "*.config.js",
                    "*.config.ts",
                ],
                max_files=10,
            )
            context["files"] = key_files
            
            # Generate summary using Claude
            if key_files:
                file_list = "\n".join([f"- {f}" for f in key_files[:5]])
                summary_prompt = f"""Based on these project files, provide a 2-3 sentence summary of the project:

Files found:
{file_list}

Directory structure:
{tree[:1000]}  # Truncate if too long

Provide a brief summary of what this project is and its main technologies."""
                
                response = await self.client.query(
                    "claude",
                    summary_prompt,
                    "You are a code analyst. Be concise."
                )
                if not response.error:
                    context["summary"] = response.content
            
        except Exception as e:
            context["error"] = str(e)
        
        return context
    
    async def web_search(self, query: str) -> List[Dict]:
        """
        Perform web search for current information.
        
        Note: This uses Claude's web search capability via CLI.
        """
        results = []
        
        try:
            # Use Claude CLI with web search
            search_prompt = f"""Search the web for current information about: {query}

Provide the top 3 most relevant and recent results with:
1. Title
2. Brief snippet/summary
3. Date if available

Focus on official documentation, recent blog posts, or authoritative sources."""
            
            response = await self.client.query(
                "claude",
                search_prompt,
                "You have web search capability. Use it to find current information."
            )
            
            if not response.error:
                # Parse the response into structured results
                # This is a simplified parsing - Claude's response format may vary
                results.append({
                    "title": "Web Search Results",
                    "snippet": response.content,
                    "source": "claude-web-search",
                })
        except Exception as e:
            results.append({
                "title": "Search Error",
                "snippet": str(e),
                "source": "error",
            })
        
        return results
    
    async def investigate(self, query: str) -> ScoutReport:
        """
        Run full Scout investigation.
        
        Args:
            query: The user's query to investigate
            
        Returns:
            ScoutReport with all gathered context
        """
        timestamp = datetime.now().isoformat()
        
        # Check for outdated info risk
        outdated_warnings = self.check_outdated_risk(query)
        
        # Scan project
        project_context = await self.scan_project()
        
        # Web search if needed
        web_results = None
        if self.needs_web_search(query) or outdated_warnings:
            web_results = await self.web_search(query)
        
        # Generate recommendations
        recommendations = None
        if outdated_warnings or web_results:
            rec_parts = []
            if outdated_warnings:
                rec_parts.append("Consider verifying information with official documentation.")
            if web_results:
                rec_parts.append("Web search results included for current context.")
            recommendations = " ".join(rec_parts)
        
        return ScoutReport(
            timestamp=timestamp,
            current_date=str(self.today),
            project_context=project_context,
            web_results=web_results,
            outdated_warnings=outdated_warnings if outdated_warnings else None,
            recommendations=recommendations,
        )


async def run_scout(
    query: str,
    project_root: Optional[str] = None,
) -> ScoutReport:
    """
    Convenience function to run Scout investigation.
    
    Args:
        query: User's query
        project_root: Project directory (defaults to cwd)
        
    Returns:
        ScoutReport with gathered context
    """
    scout = Scout(project_root=project_root)
    return await scout.investigate(query)


def main():
    """CLI entry point for Scout."""
    import argparse
    
    parser = argparse.ArgumentParser(description="AGENT-K Scout - Research Agent")
    parser.add_argument("query", nargs="?", help="Query to research")
    parser.add_argument("--project", "-p", help="Project root directory")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    
    args = parser.parse_args()
    
    import sys
    if not args.query:
        if sys.stdin.isatty():
            parser.print_help()
            sys.exit(1)
        args.query = sys.stdin.read().strip()
    
    async def run():
        report = await run_scout(args.query, args.project)
        
        if args.json:
            print(json.dumps(report.to_dict(), indent=2))
        else:
            print(report.to_context_string())
    
    asyncio.run(run())


if __name__ == "__main__":
    main()
