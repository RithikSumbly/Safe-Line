import json

from app.chat.orchestrator import OrchestratorDecision
from app.core.llm_client import _gemini_response_schema
from app.core.schemas import RouterResult


def _has_anyof(node) -> bool:
    if isinstance(node, dict):
        if "anyOf" in node:
            return True
        return any(_has_anyof(v) for v in node.values())
    if isinstance(node, list):
        return any(_has_anyof(item) for item in node)
    return False


def test_orchestrator_schema_has_no_anyof():
    schema = _gemini_response_schema(OrchestratorDecision)
    assert not _has_anyof(schema), json.dumps(schema, indent=2)


def test_router_schema_has_no_anyof():
    schema = _gemini_response_schema(RouterResult)
    assert not _has_anyof(schema), json.dumps(schema, indent=2)
