"""
AGENT-K Council - Main Entry Point

Run the council from command line:
    python -m agentk "your query here"
    python -m agentk --mode solo "your query here"
"""

import asyncio
import argparse
import sys
import json
from datetime import datetime

from .council import Council, run_council
from .scout import Scout, run_scout
from .llm import LLMClient, MODELS


def print_banner():
    """Print the AGENT-K banner."""
    banner = """
    ╔═══════════════════════════════════════╗
    ║     AGENT-K Council v2.3.5            ║
    ║     Multi-LLM Consensus System        ║
    ╚═══════════════════════════════════════╝
    """
    print(banner)


def print_models_status(client: LLMClient):
    """Print available models status."""
    print("\n  Available Models:")
    for key, config in MODELS.items():
        status = "✓" if client.is_available(key) else "✗"
        color_start = "\033[92m" if client.is_available(key) else "\033[91m"
        color_end = "\033[0m"
        print(f"    {color_start}{status}{color_end} {config['name']} ({config['role']})")
    print()


async def run_full_pipeline(
    query: str,
    mode: str = "council",
    skip_scout: bool = False,
    json_output: bool = False,
    project_root: str = None,
):
    """Run the full AGENT-K pipeline: Scout -> Council."""
    
    results = {
        "query": query,
        "mode": mode,
        "timestamp": datetime.now().isoformat(),
    }
    
    # Stage 0: Scout (Research)
    if not skip_scout:
        if not json_output:
            print("\n  [Scout] Gathering context...")
        
        scout_report = await run_scout(query, project_root)
        results["scout"] = scout_report.to_dict()
        
        if not json_output:
            if scout_report.outdated_warnings:
                print("  [Scout] Warnings:")
                for warn in scout_report.outdated_warnings:
                    print(f"    ⚠ {warn}")
            print("  [Scout] Done\n")
        
        context = scout_report.to_context_string()
    else:
        context = ""
    
    # Run Council
    if not json_output:
        print(f"  [Council] Running {mode} mode...")
    
    council_result = await run_council(query, mode, context)
    results["council"] = council_result.to_dict()
    
    if json_output:
        print(json.dumps(results, indent=2))
    else:
        print("\n" + "="*50)
        print("  FINAL RESPONSE")
        print("="*50)
        print(council_result.final_response)
        print("="*50)
        print(f"\n  Total tokens: {council_result.total_tokens}")
    
    return results


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="AGENT-K Council - Multi-LLM Consensus System",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python -m agentk "How do I optimize this React app?"
  python -m agentk --mode solo "Review this code for security issues"
  python -m agentk --skip-scout "Simple question"
  echo "query" | python -m agentk --json
        """
    )
    
    parser.add_argument(
        "query",
        nargs="?",
        help="Query to process"
    )
    
    parser.add_argument(
        "--mode", "-m",
        choices=["council", "solo"],
        default="council",
        help="Council mode (multi-LLM) or Solo mode (multi-Claude)"
    )
    
    parser.add_argument(
        "--skip-scout",
        action="store_true",
        help="Skip the Scout research phase"
    )
    
    parser.add_argument(
        "--project", "-p",
        help="Project root directory for context"
    )
    
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output as JSON only"
    )
    
    parser.add_argument(
        "--status",
        action="store_true",
        help="Show available models and exit"
    )
    
    parser.add_argument(
        "--version", "-v",
        action="version",
        version="AGENT-K Council v2.3.5"
    )
    
    args = parser.parse_args()
    
    # Handle status check
    if args.status:
        print_banner()
        client = LLMClient()
        print_models_status(client)
        sys.exit(0)
    
    # Get query from args or stdin
    query = args.query
    if not query:
        if sys.stdin.isatty():
            print_banner()
            parser.print_help()
            sys.exit(1)
        query = sys.stdin.read().strip()
    
    if not query:
        print("Error: No query provided")
        sys.exit(1)
    
    # Print banner (unless JSON output)
    if not args.json:
        print_banner()
        client = LLMClient()
        print_models_status(client)
    
    # Run the pipeline
    try:
        asyncio.run(run_full_pipeline(
            query=query,
            mode=args.mode,
            skip_scout=args.skip_scout,
            json_output=args.json,
            project_root=args.project,
        ))
    except KeyboardInterrupt:
        print("\n\nInterrupted")
        sys.exit(130)
    except Exception as e:
        if args.json:
            print(json.dumps({"error": str(e)}))
        else:
            print(f"\nError: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
