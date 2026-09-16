import os
import sys
import json
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from typing import Dict, Any
import logging
import uuid

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from agents.orchastetor.graph import build_orchastetor_graph
from state import AgentState
from langchain_core.messages import HumanMessage, SystemMessage
from .schemas import *
from config import llm
from db.database import *

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

chat_router = APIRouter(prefix="/chat", tags=["Chat"])
agent = build_orchastetor_graph(AgentState)


async def generate_agent_stream(query: str, thread_id: str, state: dict, config: dict):
    """Async generator for streaming agent output token-by-token as Server-Sent Events (SSE)."""
    try:
        full_response = ""

        yield f"data: {json.dumps({'type': 'new_thread', 'thread_id': thread_id})}" + "\n\n"

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
                    full_response += content
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

        if full_response:
            await save_messages(thread_id=thread_id, sender="agent", content=full_response)

        yield "data: [DONE]\n\n"

    except Exception as e:
        logger.error(f"Error during agent streaming: {e}")
        err_payload = {"type": "error", "error": str(e)}
        yield f"data: {json.dumps(err_payload)}\n\n"


@chat_router.post("/stream")
async def stream_agent(request: QueryRequest):
    """
    Dedicated endpoint for streaming agent responses via Server-Sent Events (SSE).
    
    Expects JSON body: {"query": "Your question here", "thread_id": "optional_session_id", "user_name": "user_name"}
    """
    query = request.query
    if not query or not query.strip():
        raise HTTPException(status_code=400, detail="Query is required.")
    thread_id = request.thread_id
    if not thread_id or not str(thread_id).strip():
        thread_id = str(uuid.uuid4())
    user_name = request.user_name

    logger.info(f"Streaming query from user '{user_name}': '{query}' (thread_id: {thread_id})")
    config = {"configurable": {"thread_id": thread_id}}
    state = {"query": query, "messages": [HumanMessage(content=query)], "user_name": user_name}

    await save_messages(thread_id=thread_id, sender="user", content=query)

    return StreamingResponse(
        generate_agent_stream(query, thread_id, state, config),
        media_type="text/event-stream"
    )

@chat_router.post("/get_chat_info", response_model=TitleResponse)
async def get_chat_info(request: QueryRequest):
    """
    Dedicated endpoint for getting title and thread_id of the chat
    
    Expects JSON body: {"query": "Your question here", "thread_id": "optional_session_id", "user_name": "user_name"}
    """
    query = request.query
    if not query or not query.strip():
        raise HTTPException(status_code=400, detail="Query is required.")
    
    thread_id = request.thread_id
    if not thread_id or not str(thread_id).strip() or thread_id == "default_thread":
        thread_id = str(uuid.uuid4())
    
    title = ""
    try:
        title_prompt = "Generate a concise 3-5 word title summarizing the user query below. Return ONLY the title text without quotes, markdown, or punctuation."
        res = llm.invoke([SystemMessage(content=title_prompt), HumanMessage(content=query.strip())])
        if res and res.content:
            title = str(res.content).strip().strip('"').strip("'")
    except Exception as e:
        logger.warning(f"Failed to generate LLM title: {e}")

    if not title:
        title = query[:40] + ("..." if len(query) > 40 else "")

    await save_thread(thread_id=thread_id, user_name=request.user_name, title=title)
    return TitleResponse(thread_id=thread_id,title=title)

@chat_router.post("/get_user_threads", response_model=ThreadsDBResponse)
async def fetch_user_threads_route(request: QueryRequest):
    """
    Dedicated endpoint for getting list of user threads
    
    Expects JSON body: {"user_name": "user_name"}
    """
    user_name = request.user_name
    if not user_name or not user_name.strip():
        raise HTTPException(status_code=400, detail="User name is required.")
    
    # Automatically delete unpinned threads older than 1 day before fetching
    try:
        await delete_unpinned_threads()
    except Exception as e:
        logger.warning(f"Auto-cleanup of old unpinned threads failed: {e}")
    
    threads = await get_recent_threads(user_name)
    return ThreadsDBResponse(user_name=user_name, response=threads)

@chat_router.post("/get_thread_messages", response_model=ThreadsDBResponse)
async def fetch_thread_messages_route(request: QueryRequest):
    """
    Dedicated endpoint for getting messages of a thread
    
    Expects JSON body: {"thread_id": "thread_id"}
    """
    thread_id = request.thread_id
    if not thread_id or not str(thread_id).strip():
        raise HTTPException(status_code=400, detail="Thread ID is required.")
    
    messages = await get_thread_messages(thread_id)
    return ThreadsDBResponse(user_name=request.user_name, response=messages)

@chat_router.post("/delete_thread")
async def delete_thread_route(request: QueryRequest):
    """
    Dedicated endpoint for deleting a thread
    
    Expects JSON body: {"thread_id": "thread_id"}
    """
    thread_id = request.thread_id
    if not thread_id or not str(thread_id).strip():
        raise HTTPException(status_code=400, detail="Thread ID is required.")
    
    await delete_thread(thread_id)
    return {"message":"Thread deleted successfully", "thread_id": thread_id}

@chat_router.post("/delete_unpinned_threads")
async def delete_unpinned_threads_route():
    """
    Dedicated endpoint for deleting old threads
    """
    await delete_unpinned_threads()
    return {"message":"Old threads deleted successfully"}

@chat_router.post("/pin_thread")
async def pin_thread_route(request: PinRequest):
    """
    Dedicated endpoint for pinning a thread
    
    Expects JSON body: {"thread_id": "thread_id"}
    """
    thread_id = request.thread_id
    if not thread_id or not str(thread_id).strip():
        raise HTTPException(status_code=400, detail="Thread ID is required.")
    
    await pin_thread(thread_id)
    return {"message":"Thread pinned successfully", "thread_id": thread_id}

@chat_router.post("/unpin_thread")
async def unpin_thread_route(request: PinRequest):
    """
    Dedicated endpoint for unpinning a thread
    
    Expects JSON body: {"thread_id": "thread_id"}
    """
    thread_id = request.thread_id
    if not thread_id or not str(thread_id).strip():
        raise HTTPException(status_code=400, detail="Thread ID is required.")
    
    await unpin_thread(thread_id)
    return {"message":"Thread unpinned successfully", "thread_id": thread_id}

