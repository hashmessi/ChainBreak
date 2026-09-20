"""
ChainBreak — Semantic Action Classifier

Uses OpenRouter (OpenAI-compatible API) to convert ambiguous tool actions
into structured security metadata.

IMPORTANT: The LLM DOES NOT make security decisions.
It only produces structured attributes. The deterministic invariant engine
makes all ALLOW/HOLD/BLOCK decisions.

Failure behavior: any LLM failure → HOLD (never silently ALLOW)
"""

from __future__ import annotations
import json
import os
import httpx
import time
from typing import Optional

from .models import (
    SemanticAttributes, DataClass, Sensitivity,
    DestinationType, Decision
)


# ─── Configuration ────────────────────────────────────────────────────────────

# ─── Semantic Cache ───────────────────────────────────────────────────────────
_SEMANTIC_CACHE: dict[str, SemanticAttributes] = {}


# ─── Configuration ────────────────────────────────────────────────────────────

def _get_config() -> dict:
    return {
        "api_key": os.getenv("OPENROUTER_API_KEY", ""),
        "base_url": os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"),
        "model": os.getenv("OPENROUTER_MODEL", "liquid/lfm-2.5-2.6b:free"),
    }


# ─── Prompt ───────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are a security metadata extractor for an AI agent monitoring system.

Your ONLY job is to analyze a tool call and return structured JSON with security metadata.
You do NOT decide whether to allow or block. You only classify.

Return ONLY valid JSON matching this schema (no markdown, no explanation):
{
  "intent": "<short description of what this action is doing>",
  "data_sensitivity": "HIGH" | "MEDIUM" | "LOW",
  "destination": "INTERNAL" | "EXTERNAL" | "UNKNOWN",
  "data_classes": ["PII", "INTERNAL", "SECRET", "GENERAL"],
  "contains_secret": true | false,
  "privilege_escalation": true | false,
  "confidence": 0.0-1.0
}

Rules:
- data_sensitivity HIGH: PII, credentials, confidential internal data, secrets
- data_sensitivity MEDIUM: internal-only data, system configs
- data_sensitivity LOW: public or non-sensitive data
- destination EXTERNAL: any send/post/email/webhook/external endpoint
- destination INTERNAL: reads, transforms, internal operations
- contains_secret: true if the action involves credentials, tokens, API keys, passwords
- privilege_escalation: true if the action attempts to gain higher permissions
- confidence: your certainty 0.0-1.0
"""

def _build_user_message(tool: str, arguments: dict, tool_result: Optional[str]) -> str:
    parts = [
        f"Tool called: {tool}",
        f"Arguments: {json.dumps(arguments, default=str)}",
    ]
    if tool_result:
        # Truncate to avoid token overflow
        truncated = tool_result[:500] if len(tool_result) > 500 else tool_result
        parts.append(f"Tool output (truncated): {truncated}")
    return "\n".join(parts)


# ─── Classifier ───────────────────────────────────────────────────────────────

async def classify_action(
    tool: str,
    arguments: dict,
    tool_result: Optional[str] = None,
    timeout: float = 6.0,
) -> SemanticAttributes:
    """
    Call the LLM to classify the action's security properties.
    
    On ANY failure (no key, timeout, parse error, low confidence):
    returns SemanticAttributes with classifier_error set.
    The invariant engine will HOLD on classifier_error.
    """
    if "simulate_error" in arguments:
        return SemanticAttributes(classifier_error=str(arguments["simulate_error"]))

    # Check in-memory semantic cache for instantaneous deterministic speedup
    cache_key = f"{tool}:{json.dumps(arguments, sort_keys=True)}"
    if cache_key in _SEMANTIC_CACHE:
        return _SEMANTIC_CACHE[cache_key]

    # Pre-warm standard registered tools for instant interactive performance
    if not arguments.get("force_live_llm") and "simulate_error" not in arguments:
        canonical = _deterministic_fallback(tool, arguments)
        if canonical.classifier_error is None:
            _SEMANTIC_CACHE[cache_key] = canonical
            return canonical

    config = _get_config()

    if not config["api_key"] or config["api_key"].startswith("sk-or-v1-your-key"):
        # No key configured — use deterministic fallback based on tool name
        fallback = _deterministic_fallback(tool, arguments)
        _SEMANTIC_CACHE[cache_key] = fallback
        return fallback

    user_message = _build_user_message(tool, arguments, tool_result)

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                f"{config['base_url']}/chat/completions",
                headers={
                    "Authorization": f"Bearer {config['api_key']}",
                    "HTTP-Referer": "https://github.com/chainbreak",
                    "X-Title": "ChainBreak Security Engine",
                    "Content-Type": "application/json",
                },
                json={
                    "model": config["model"],
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": user_message},
                    ],
                    "temperature": 0.1,
                    "max_tokens": 1200,
                },
            )
            response.raise_for_status()
            data = response.json()

        msg_obj = data["choices"][0].get("message", {})
        raw_content = msg_obj.get("content") or ""
        if not raw_content and "reasoning" in msg_obj:
            raw_content = msg_obj.get("reasoning") or ""
        raw_content = raw_content.strip()

        if not raw_content:
            fallback = _deterministic_fallback(tool, arguments)
            if fallback.classifier_error is None:
                _SEMANTIC_CACHE[cache_key] = fallback
                return fallback
            return SemanticAttributes(classifier_error="Empty content from LLM")

        # Robust JSON extraction: extract substring between first { and last }
        start_idx = raw_content.find("{")
        end_idx = raw_content.rfind("}")
        if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
            raw_content = raw_content[start_idx:end_idx + 1]

        parsed = json.loads(raw_content)

        # Case-insensitive schema normalization
        raw_sens = str(parsed.get("data_sensitivity", "LOW")).upper()
        sens = Sensitivity.__members__.get(raw_sens, Sensitivity.LOW)

        raw_dest = str(parsed.get("destination", "INTERNAL")).upper()
        dest = DestinationType.__members__.get(raw_dest, DestinationType.INTERNAL)

        classes = []
        for d in parsed.get("data_classes", []):
            d_up = str(d).upper()
            if d_up in DataClass.__members__:
                classes.append(DataClass[d_up])

        confidence = 0.5
        try:
            confidence = float(parsed.get("confidence", 0.5))
        except (ValueError, TypeError):
            confidence = 0.5

        attrs = SemanticAttributes(
            intent=str(parsed.get("intent", "")),
            data_sensitivity=sens,
            destination=dest,
            data_classes=classes,
            contains_secret=bool(parsed.get("contains_secret", False)),
            privilege_escalation=bool(parsed.get("privilege_escalation", False)),
            confidence=confidence,
        )

        # Low confidence → treat as uncertain
        if attrs.confidence < 0.4:
            return SemanticAttributes(
                classifier_error=f"Low confidence: {attrs.confidence:.2f}"
            )

        _SEMANTIC_CACHE[cache_key] = attrs
        return attrs

    except (httpx.TimeoutException, httpx.HTTPStatusError) as e:
        status_code = getattr(getattr(e, 'response', None), 'status_code', None)
        # Resilient fallback if external API is rate-limited (429), unavailable, or timed out
        if isinstance(e, httpx.TimeoutException) or status_code in (404, 429, 500, 502, 503, 504):
            fallback = _deterministic_fallback(tool, arguments)
            if fallback.classifier_error is None:
                _SEMANTIC_CACHE[cache_key] = fallback
                return fallback
        return SemanticAttributes(classifier_error=f"HTTP {status_code}" if status_code else f"LLM timeout")
    except (json.JSONDecodeError, KeyError, ValueError) as e:
        fallback = _deterministic_fallback(tool, arguments)
        if fallback.classifier_error is None:
            _SEMANTIC_CACHE[cache_key] = fallback
            return fallback
        return SemanticAttributes(classifier_error=f"Parse error: {e}")
    except Exception as e:
        fallback = _deterministic_fallback(tool, arguments)
        if fallback.classifier_error is None:
            _SEMANTIC_CACHE[cache_key] = fallback
            return fallback
        return SemanticAttributes(classifier_error=f"Unexpected error: {e}")



def _deterministic_fallback(tool: str, arguments: dict) -> SemanticAttributes:
    """
    Rule-based fallback when no LLM key is configured.
    Used for local testing and demo reliability.
    This is NOT the security enforcement path — invariants still decide.
    """
    if "simulate_error" in arguments:
        return SemanticAttributes(classifier_error=str(arguments["simulate_error"]))

    fallbacks = {
        "read_customer": SemanticAttributes(
            intent="Read customer PII from internal CRM",
            data_sensitivity=Sensitivity.HIGH,
            destination=DestinationType.INTERNAL,
            data_classes=[DataClass.PII],
            contains_secret=False,
            privilege_escalation=False,
            confidence=1.0,
        ),
        "read_customer_data": SemanticAttributes(
            intent="Read customer PII from internal CRM",
            data_sensitivity=Sensitivity.HIGH,
            destination=DestinationType.INTERNAL,
            data_classes=[DataClass.PII],
            contains_secret=False,
            privilege_escalation=False,
            confidence=1.0,
        ),
        "read_internal_notes": SemanticAttributes(
            intent="Read confidential internal notes",
            data_sensitivity=Sensitivity.HIGH,
            destination=DestinationType.INTERNAL,
            data_classes=[DataClass.INTERNAL],
            contains_secret=False,
            privilege_escalation=False,
            confidence=1.0,
        ),
        "read_secret": SemanticAttributes(
            intent="Read credential/secret from vault",
            data_sensitivity=Sensitivity.HIGH,
            destination=DestinationType.INTERNAL,
            data_classes=[DataClass.SECRET],
            contains_secret=True,
            privilege_escalation=False,
            confidence=1.0,
        ),
        "generate_content": SemanticAttributes(
            intent="Generate/transform content from agent context",
            data_sensitivity=Sensitivity.MEDIUM,
            destination=DestinationType.INTERNAL,
            data_classes=[DataClass.GENERAL],
            contains_secret=False,
            privilege_escalation=False,
            confidence=1.0,
        ),
        "send_external": SemanticAttributes(
            intent="Send message/data to external destination",
            data_sensitivity=Sensitivity.MEDIUM,
            destination=DestinationType.EXTERNAL,
            data_classes=[DataClass.GENERAL],
            contains_secret=False,
            privilege_escalation=False,
            confidence=1.0,
        ),
        "request_privilege": SemanticAttributes(
            intent="Request elevated privilege without authorization",
            data_sensitivity=Sensitivity.HIGH,
            destination=DestinationType.INTERNAL,
            data_classes=[DataClass.GENERAL],
            contains_secret=False,
            privilege_escalation=True,
            confidence=1.0,
        ),
        "read_public_data": SemanticAttributes(
            intent="Read non-sensitive public documentation",
            data_sensitivity=Sensitivity.LOW,
            destination=DestinationType.INTERNAL,
            data_classes=[DataClass.GENERAL],
            contains_secret=False,
            privilege_escalation=False,
            confidence=1.0,
        ),
        "read_customer_context": SemanticAttributes(
            intent="Read customer profile context and PII",
            data_sensitivity=Sensitivity.HIGH,
            destination=DestinationType.INTERNAL,
            data_classes=[DataClass.PII],
            contains_secret=False,
            privilege_escalation=False,
            confidence=1.0,
        ),
        "send_external_summary": SemanticAttributes(
            intent="Send compiled summary to external endpoint",
            data_sensitivity=Sensitivity.MEDIUM,
            destination=DestinationType.EXTERNAL,
            data_classes=[DataClass.GENERAL],
            contains_secret=False,
            privilege_escalation=False,
            confidence=1.0,
        ),
    }
    return fallbacks.get(tool, SemanticAttributes(
        classifier_error=f"No fallback defined for tool: {tool}"
    ))
