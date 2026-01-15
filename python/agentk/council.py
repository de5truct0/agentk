"""
LLM Council: Three-Stage Consensus System

Inspired by Karpathy's llm-council.
https://github.com/karpathy/llm-council

Three stages:
1. Individual Responses - Each model responds independently
2. Peer Review - Models critique each other's responses (anonymized)
3. Chairman Synthesis - Claude synthesizes the final consensus

Supports two modes:
- Council Mode: Multi-LLM via API (GPT, Gemini, Claude)
- Solo Mode: Multiple Claude CLI instances with different personas
"""

import asyncio
import json
import sys
from typing import Optional, Dict, List, Callable, Any
from dataclasses import dataclass, asdict
from datetime import datetime

from .llm import LLMClient, LLMResponse, MODELS


@dataclass
class StageResult:
    """Result from a council stage."""
    stage: int
    stage_name: str
    responses: Dict[str, str]
    timestamp: str
    
    def to_dict(self) -> Dict:
        return asdict(self)


@dataclass
class CouncilResult:
    """Final result from the council process."""
    query: str
    mode: str
    stages: List[StageResult]
    final_response: str
    chairman: str
    total_tokens: Dict[str, int]
    timestamp: str
    
    def to_dict(self) -> Dict:
        return {
            "query": self.query,
            "mode": self.mode,
            "stages": [s.to_dict() for s in self.stages],
            "final_response": self.final_response,
            "chairman": self.chairman,
            "total_tokens": self.total_tokens,
            "timestamp": self.timestamp,
        }


class Council:
    """
    Multi-LLM Council for consensus-based responses.
    
    Implements three-stage consensus:
    1. Individual responses from each model
    2. Anonymized peer review and ranking
    3. Chairman (Claude) synthesizes final answer
    """
    
    def __init__(
        self,
        mode: str = "council",
        on_stage: Optional[Callable[[str, Dict], None]] = None,
    ):
        """
        Initialize the council.
        
        Args:
            mode: "council" for multi-LLM, "solo" for multi-Claude
            on_stage: Callback for stage updates (stage_name, data)
        """
        self.mode = mode
        self.on_stage = on_stage or (lambda *args: None)
        self.client = LLMClient(use_cli_for_claude=True)
        self.total_tokens = {"input": 0, "output": 0}
    
    def _emit(self, stage: str, data: Dict):
        """Emit a stage update."""
        self.on_stage(stage, data)
        # Also print JSON for Node.js to parse
        print(json.dumps({"stage": stage, **data}), flush=True)
    
    async def run(self, query: str, context: str = "") -> CouncilResult:
        """
        Run the full council process.
        
        Args:
            query: User's question or task
            context: Additional context (from Scout)
            
        Returns:
            CouncilResult with final consensus
        """
        stages = []
        
        # Stage 1: Individual Responses
        self._emit("stage1_start", {"message": "Gathering individual responses..."})
        stage1 = await self._stage1_individual(query, context)
        stages.append(stage1)
        self._emit("stage1_complete", {"responses": stage1.responses})
        
        # Stage 2: Peer Review (if multiple responses)
        if len(stage1.responses) > 1:
            self._emit("stage2_start", {"message": "Running peer review..."})
            stage2 = await self._stage2_peer_review(query, stage1.responses)
            stages.append(stage2)
            self._emit("stage2_complete", {"reviews": stage2.responses})
        
        # Stage 3: Chairman Synthesis
        self._emit("stage3_start", {"message": "Chairman synthesizing final response..."})
        stage3, final_response = await self._stage3_synthesis(query, stages)
        stages.append(stage3)
        self._emit("stage3_complete", {"final": final_response})
        
        return CouncilResult(
            query=query,
            mode=self.mode,
            stages=stages,
            final_response=final_response,
            chairman="claude",
            total_tokens=self.total_tokens,
            timestamp=datetime.now().isoformat(),
        )
    
    async def _stage1_individual(
        self,
        query: str,
        context: str = "",
    ) -> StageResult:
        """Stage 1: Get individual responses from all available models."""
        
        system_prompt = """You are a helpful AI assistant participating in a council discussion.
Provide your best, most thoughtful response to the query.
Be specific, actionable, and back up claims with reasoning."""
        
        if context:
            system_prompt += f"\n\nContext from research:\n{context}"
        
        if self.mode == "council":
            # Multi-LLM mode
            responses = await self.client.query_all(query, system_prompt)
            
            # Track tokens
            for resp in responses.values():
                self.total_tokens["input"] += resp.tokens.get("input", 0)
                self.total_tokens["output"] += resp.tokens.get("output", 0)
            
            return StageResult(
                stage=1,
                stage_name="Individual Responses",
                responses={
                    model: resp.content if not resp.error else f"[Error: {resp.error}]"
                    for model, resp in responses.items()
                },
                timestamp=datetime.now().isoformat(),
            )
        else:
            # Solo mode - multiple Claude instances with different personas
            return await self._stage1_solo(query, context)
    
    async def _stage1_solo(self, query: str, context: str = "") -> StageResult:
        """Stage 1 in solo mode: Multiple Claude CLI instances with personas."""
        
        personas = {
            "engineer": """You are a senior software engineer.
Focus on: implementation details, code quality, architecture, best practices.
Be practical and specific about technical solutions.""",
            
            "tester": """You are a QA engineer and testing specialist.
Focus on: edge cases, error handling, test coverage, potential bugs.
Think about what could go wrong and how to verify correctness.""",
            
            "security": """You are a security analyst.
Focus on: vulnerabilities, attack vectors, secure coding, OWASP guidelines.
Identify potential security issues and recommend mitigations.""",
        }
        
        async def query_persona(name: str, persona: str) -> tuple:
            full_system = persona
            if context:
                full_system += f"\n\nContext:\n{context}"
            
            response = await self.client.query("claude", query, full_system)
            return name, response.content if not response.error else f"[Error: {response.error}]"
        
        tasks = [query_persona(name, persona) for name, persona in personas.items()]
        results = await asyncio.gather(*tasks)
        
        return StageResult(
            stage=1,
            stage_name="Individual Responses (Solo)",
            responses=dict(results),
            timestamp=datetime.now().isoformat(),
        )
    
    async def _stage2_peer_review(
        self,
        query: str,
        responses: Dict[str, str],
    ) -> StageResult:
        """Stage 2: Anonymized peer review of responses."""
        
        # Format responses anonymously
        response_list = []
        model_map = {}  # Map Response A/B/C back to model names
        for i, (model, response) in enumerate(responses.items()):
            label = chr(65 + i)  # A, B, C...
            model_map[label] = model
            response_list.append(f"Response {label}:\n{response}")
        
        formatted_responses = "\n\n---\n\n".join(response_list)
        
        review_prompt = f"""Original Query: {query}

Here are anonymized responses from different sources:

{formatted_responses}

---

Please review these responses and:
1. Identify the strengths and weaknesses of each
2. Point out any factual errors or logical flaws
3. Rank them from best to worst with justification
4. Note any unique insights that should be preserved

Format your review clearly with sections for each response."""
        
        system_prompt = """You are a critical reviewer participating in a council process.
Be objective, fair, and thorough in your analysis.
Focus on accuracy, completeness, and practical value."""
        
        # Use Claude as the reviewer (chairman reviews others)
        response = await self.client.query("claude", review_prompt, system_prompt)
        
        self.total_tokens["input"] += response.tokens.get("input", 0)
        self.total_tokens["output"] += response.tokens.get("output", 0)
        
        return StageResult(
            stage=2,
            stage_name="Peer Review",
            responses={
                "review": response.content if not response.error else f"[Error: {response.error}]",
                "model_map": model_map,
            },
            timestamp=datetime.now().isoformat(),
        )
    
    async def _stage3_synthesis(
        self,
        query: str,
        stages: List[StageResult],
    ) -> tuple:
        """Stage 3: Chairman synthesizes the final response."""
        
        # Build context from previous stages
        stage1_responses = stages[0].responses
        stage2_review = stages[1].responses.get("review", "") if len(stages) > 1 else ""
        
        synthesis_prompt = f"""Original Query: {query}

## Individual Responses:
"""
        for model, response in stage1_responses.items():
            synthesis_prompt += f"\n### {model.upper()}:\n{response}\n"
        
        if stage2_review:
            synthesis_prompt += f"""
## Peer Review Analysis:
{stage2_review}

"""
        
        synthesis_prompt += """
## Your Task:
As the Chairman of this council, synthesize the best possible response by:
1. Combining the strongest elements from each response
2. Addressing any weaknesses identified in the review
3. Resolving any conflicts or contradictions
4. Providing a clear, actionable final answer

Provide your synthesized response directly, without meta-commentary about the process."""
        
        system_prompt = """You are the Chairman of an AI council.
Your role is to synthesize the best possible response from multiple perspectives.
Be decisive, clear, and comprehensive in your final answer."""
        
        response = await self.client.query("claude", synthesis_prompt, system_prompt)
        
        self.total_tokens["input"] += response.tokens.get("input", 0)
        self.total_tokens["output"] += response.tokens.get("output", 0)
        
        final = response.content if not response.error else f"[Error: {response.error}]"
        
        return StageResult(
            stage=3,
            stage_name="Chairman Synthesis",
            responses={"synthesis": final},
            timestamp=datetime.now().isoformat(),
        ), final


async def run_council(
    query: str,
    mode: str = "council",
    context: str = "",
) -> CouncilResult:
    """
    Convenience function to run the council process.
    
    Args:
        query: User's question or task
        mode: "council" or "solo"
        context: Additional context
        
    Returns:
        CouncilResult with final consensus
    """
    council = Council(mode=mode)
    return await council.run(query, context)


def main():
    """CLI entry point for council."""
    import argparse
    
    parser = argparse.ArgumentParser(description="AGENT-K LLM Council")
    parser.add_argument("query", nargs="?", help="Query to process")
    parser.add_argument("--mode", choices=["council", "solo"], default="council",
                       help="Council mode (multi-LLM) or Solo mode (multi-Claude)")
    parser.add_argument("--context", default="", help="Additional context")
    parser.add_argument("--json", action="store_true", help="Output as JSON only")
    
    args = parser.parse_args()
    
    # Read query from stdin if not provided
    if not args.query:
        if sys.stdin.isatty():
            parser.print_help()
            sys.exit(1)
        args.query = sys.stdin.read().strip()
    
    async def run():
        result = await run_council(
            query=args.query,
            mode=args.mode,
            context=args.context,
        )
        
        if args.json:
            print(json.dumps(result.to_dict(), indent=2))
        else:
            print("\n" + "="*60)
            print("COUNCIL RESULT")
            print("="*60)
            print(f"\nQuery: {result.query}")
            print(f"Mode: {result.mode}")
            print(f"Chairman: {result.chairman}")
            print(f"\n{'-'*60}")
            print("FINAL RESPONSE:")
            print("-"*60)
            print(result.final_response)
            print(f"\n{'-'*60}")
            print(f"Total tokens: {result.total_tokens}")
    
    asyncio.run(run())


if __name__ == "__main__":
    main()
