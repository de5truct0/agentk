"""
LiteLLM Wrapper for AGENT-K Council

Provides unified API access to multiple LLMs:
- GPT-5.2 (OpenAI)
- Gemini 3 Pro (Google)
- Claude Opus 4.5 (Anthropic - via CLI preferred)

Uses LiteLLM for unified API calls with user's own API keys.
"""

import asyncio
import os
import subprocess
import json
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Model configurations - Updated Jan 2025
MODELS = {
    "gpt": {
        "id": "gpt-4o",  # Latest GPT model
        "name": "GPT-4o",
        "strength": "Best benchmarks, agentic reasoning",
        "role": "Proposer",
        "env_key": "OPENAI_API_KEY",
    },
    "gemini": {
        "id": "gemini/gemini-2.0-flash",  # Latest Gemini
        "name": "Gemini 2.0 Flash",
        "strength": "Large context, research, multimodal",
        "role": "Proposer + Scout backend",
        "env_key": "GEMINI_API_KEY",
    },
    "claude": {
        "id": "claude-3-5-sonnet-20241022",  # Use CLI instead when possible
        "name": "Claude Sonnet",
        "strength": "Coding (market leader), security",
        "role": "Chairman + Executor",
        "env_key": "ANTHROPIC_API_KEY",
        "prefer_cli": True,  # Prefer Claude Code CLI over API
    },
}


@dataclass
class LLMResponse:
    """Response from an LLM query."""
    model: str
    content: str
    tokens: Dict[str, int]
    error: Optional[str] = None


class LLMClient:
    """
    Unified LLM client using LiteLLM.
    
    Supports both API calls (via LiteLLM) and Claude Code CLI.
    """
    
    def __init__(self, use_cli_for_claude: bool = True):
        """
        Initialize the LLM client.
        
        Args:
            use_cli_for_claude: If True, use Claude Code CLI instead of API for Claude.
        """
        self.use_cli_for_claude = use_cli_for_claude
        self._available_models = self._detect_available_models()
    
    def _detect_available_models(self) -> Dict[str, bool]:
        """Detect which models are available based on API keys."""
        available = {}
        for key, config in MODELS.items():
            if key == "claude" and self.use_cli_for_claude:
                # Check if Claude CLI is installed
                available[key] = self._check_claude_cli()
            else:
                # Check for API key
                available[key] = bool(os.getenv(config["env_key"]))
        return available
    
    def _check_claude_cli(self) -> bool:
        """Check if Claude Code CLI is installed."""
        try:
            result = subprocess.run(
                ["claude", "--version"],
                capture_output=True,
                text=True,
                timeout=5
            )
            return result.returncode == 0
        except (subprocess.TimeoutExpired, FileNotFoundError):
            return False
    
    @property
    def available_models(self) -> List[str]:
        """Get list of available model keys."""
        return [k for k, v in self._available_models.items() if v]
    
    def is_available(self, model_key: str) -> bool:
        """Check if a specific model is available."""
        return self._available_models.get(model_key, False)
    
    async def query(
        self,
        model_key: str,
        prompt: str,
        system: str = "",
        temperature: float = 0.7,
    ) -> LLMResponse:
        """
        Query a specific LLM.
        
        Args:
            model_key: Key from MODELS dict (gpt, gemini, claude)
            prompt: User prompt
            system: System prompt
            temperature: Sampling temperature
            
        Returns:
            LLMResponse with content and token usage
        """
        if model_key not in MODELS:
            return LLMResponse(
                model=model_key,
                content="",
                tokens={"input": 0, "output": 0},
                error=f"Unknown model: {model_key}"
            )
        
        if not self.is_available(model_key):
            return LLMResponse(
                model=model_key,
                content="",
                tokens={"input": 0, "output": 0},
                error=f"Model not available: {model_key} (missing API key or CLI)"
            )
        
        config = MODELS[model_key]
        
        # Use Claude CLI if preferred
        if model_key == "claude" and self.use_cli_for_claude:
            return await self._query_claude_cli(prompt, system)
        
        # Use LiteLLM for API calls
        return await self._query_litellm(config["id"], prompt, system, temperature)
    
    async def _query_litellm(
        self,
        model_id: str,
        prompt: str,
        system: str,
        temperature: float,
    ) -> LLMResponse:
        """Query via LiteLLM API."""
        try:
            from litellm import acompletion
            
            messages = []
            if system:
                messages.append({"role": "system", "content": system})
            messages.append({"role": "user", "content": prompt})
            
            response = await acompletion(
                model=model_id,
                messages=messages,
                temperature=temperature,
            )
            
            content = response.choices[0].message.content
            tokens = {
                "input": response.usage.prompt_tokens if response.usage else 0,
                "output": response.usage.completion_tokens if response.usage else 0,
            }
            
            return LLMResponse(
                model=model_id,
                content=content,
                tokens=tokens,
            )
            
        except ImportError:
            return LLMResponse(
                model=model_id,
                content="",
                tokens={"input": 0, "output": 0},
                error="LiteLLM not installed. Run: pip install litellm"
            )
        except Exception as e:
            return LLMResponse(
                model=model_id,
                content="",
                tokens={"input": 0, "output": 0},
                error=str(e)
            )
    
    async def _query_claude_cli(
        self,
        prompt: str,
        system: str = "",
    ) -> LLMResponse:
        """Query Claude via Claude Code CLI."""
        try:
            # Build the command
            cmd = ["claude", "-p"]
            
            # Combine system prompt and user prompt
            full_prompt = prompt
            if system:
                full_prompt = f"{system}\n\n{prompt}"
            
            # Run claude CLI
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            
            stdout, stderr = await process.communicate(input=full_prompt.encode())
            
            if process.returncode != 0:
                return LLMResponse(
                    model="claude-cli",
                    content="",
                    tokens={"input": 0, "output": 0},
                    error=f"Claude CLI error: {stderr.decode()}"
                )
            
            return LLMResponse(
                model="claude-cli",
                content=stdout.decode().strip(),
                tokens={"input": 0, "output": 0},  # CLI doesn't report tokens
            )
            
        except Exception as e:
            return LLMResponse(
                model="claude-cli",
                content="",
                tokens={"input": 0, "output": 0},
                error=str(e)
            )
    
    async def query_all(
        self,
        prompt: str,
        system: str = "",
        models: Optional[List[str]] = None,
    ) -> Dict[str, LLMResponse]:
        """
        Query all available models in parallel.
        
        Args:
            prompt: User prompt
            system: System prompt
            models: Specific models to query (defaults to all available)
            
        Returns:
            Dict mapping model keys to their responses
        """
        if models is None:
            models = self.available_models
        
        tasks = {
            model: self.query(model, prompt, system)
            for model in models
            if self.is_available(model)
        }
        
        if not tasks:
            return {}
        
        results = await asyncio.gather(*tasks.values(), return_exceptions=True)
        
        return {
            model: (
                result if isinstance(result, LLMResponse)
                else LLMResponse(
                    model=model,
                    content="",
                    tokens={"input": 0, "output": 0},
                    error=str(result)
                )
            )
            for model, result in zip(tasks.keys(), results)
        }


# Convenience functions
async def query_model(model_key: str, prompt: str, system: str = "") -> str:
    """Quick query to a single model. Returns content or error message."""
    client = LLMClient()
    response = await client.query(model_key, prompt, system)
    return response.content if not response.error else f"Error: {response.error}"


async def query_all_parallel(prompt: str, system: str = "") -> Dict[str, str]:
    """Query all available models in parallel. Returns dict of model -> content."""
    client = LLMClient()
    responses = await client.query_all(prompt, system)
    return {
        model: (resp.content if not resp.error else f"Error: {resp.error}")
        for model, resp in responses.items()
    }
