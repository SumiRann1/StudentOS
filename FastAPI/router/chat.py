import os
import sys
import json
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from typing import Dict, Any
import logging

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from agents.orchastetor.graph import build_orchastetor_graph
from state import AgentState
from langchain_core.messages import HumanMessage
from .schema import QueryRequest

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

chat_router = APIRouter(prefix="/chat", tags=["Chat"])
agent = build_orchastetor_graph(AgentState)


async def generate_agent_stream(state: dict, config: dict):
    """Async generator for streaming agent output token-by-token as Server-Sent Events (SSE)."""
    try:
        async for event in agent.astream_events(state, config=config, version="v2"):
            kind = event.get("event")
            name = event.get("name", "")
            node = event.get("metadata", {}).get("langgraph_node", "")

            if node == "preprocessor":
                continue

            if kind == "on_chat_model_stream":
                chunk = event["data"]["chunk"]
                
                if hasattr(chunk, "tool_call_chunks") and chunk.tool_call_chunks:
                    if any(tc.get("name") == "RouterOutput" for tc in chunk.tool_call_chunks):
                        continue

                content = chunk.content
                if isinstance(content, list):
                    content = "".join([c.get("text", "") if isinstance(c, dict) else str(c) for c in content])
                
                if content:
                    payload = {
                        "type": "content",
                        "node": name,
                        "content": content
                    }
                    yield f"data: {json.dumps(payload)}\n\n"

            elif kind == "on_tool_start":
                if name != "RouterOutput":
                    payload = {
                        "type": "tool_call",
                        "name": name,
                        "args": event["data"].get("input")
                    }
                    yield f"data: {json.dumps(payload)}\n\n"

        yield "data: [DONE]\n\n"
    except Exception as e:
        logger.error(f"Error during agent streaming: {e}")
        err_payload = {"type": "error", "error": str(e)}
        yield f"data: {json.dumps(err_payload)}\n\n"


@chat_router.post("/stream")
async def stream_agent(request: QueryRequest):
    """
    Dedicated endpoint for streaming agent responses via Server-Sent Events (SSE).
    
    Expects JSON body: {"query": "Your question here", "thread_id": "optional_session_id"}
    """
    query = request.query
    if not query or not query.strip():
        raise HTTPException(status_code=400, detail="Query is required.")
    thread_id = request.thread_id or "default_thread"

    logger.info(f"Streaming query: '{query}' (thread_id: {thread_id})")
    config = {"configurable": {"thread_id": thread_id}}
    state = {"query": query, "messages": [HumanMessage(content=query)]}

    return StreamingResponse(
        generate_agent_stream(state, config),
        media_type="text/event-stream"
    )



