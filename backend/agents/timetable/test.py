import os
import sys

# Ensure backend directory is in sys.path so 'state' and 'agents' modules can be imported
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from agents.timetable.graph import build_timetable_graph
from state import AgentState
from langchain_core.messages import HumanMessage

timetable_graph = build_timetable_graph(AgentState)

config = {"configurable": {"thread_id": "1"}}

while True:
    try:
        user_query = input("\nQuery (or 'exit'): ")
        if user_query.strip().lower() in ["exit", "quit"]:
            break

        state = {"query": user_query, "messages": [HumanMessage(content=user_query)]}

        printed_tools = set()
        print("\nResponse: ", end="", flush=True)

        for chunk, metadata in timetable_graph.stream(state, config=config, stream_mode="messages"):
            node = metadata.get("langgraph_node")

            if node == "chat_node":
                if hasattr(chunk, "tool_calls") and chunk.tool_calls:
                    for tc in chunk.tool_calls:
                        tc_id = tc.get("id") or tc.get("name")
                        if tc_id not in printed_tools:
                            printed_tools.add(tc_id)
                            tool_name = tc.get("name")
                            tool_args = tc.get("args")
                            print(f"\n[Tool Execution: {tool_name}({tool_args})]", flush=True)
                            print("Response: ", end="", flush=True)
                elif chunk.content:
                    sys.stdout.write(chunk.content)
                    sys.stdout.flush()

        print()
    except (KeyboardInterrupt, EOFError):
        break

