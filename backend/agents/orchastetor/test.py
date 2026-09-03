import os
import sys

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from agents.orchastetor.graph import build_orchastetor_graph
from state import AgentState
from langchain_core.messages import HumanMessage

agent = build_orchastetor_graph(AgentState)
CONFIG = {"configurable": {"thread_id": "thread_main"}}

while True:
    try:
        user_query = input("\nUser : ")
        if user_query.strip().lower() in ["exit", "quit"]:
            break

        state = {"query": user_query, "messages": [HumanMessage(content=user_query)]}

        print("\nResponse: ", end="", flush=True)

        for chunk, metadata in agent.stream(state, config=CONFIG, stream_mode="messages"):
            node = metadata.get("langgraph_node")

            if hasattr(chunk, "tool_calls") and chunk.tool_calls:
                for tc in chunk.tool_calls:
                    tool_name = tc.get("name")
                    tool_args = tc.get("args")
                    print(f"\n[{node} Tool Execution: {tool_name}({tool_args})]", flush=True)
                    print("Response: ", end="", flush=True)
            elif hasattr(chunk, "content") and chunk.content:
                sys.stdout.write(chunk.content)
                sys.stdout.flush()

        print()
    except (KeyboardInterrupt, EOFError):
        break
