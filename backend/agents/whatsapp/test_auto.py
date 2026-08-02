import sys, os
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from agents.whatsapp.graph import build_graph
from agents.state import AgentState

wa_agent = build_graph(AgentState)

def test_query(query: str):
    print(f"\n--- Testing query: '{query}' ---")
    CONFIG = {"configurable": {"thread_id": "1"}}
    response = wa_agent.invoke({"messages": [("human", query)]}, config=CONFIG)
    if "wa_result" in response and response["wa_result"]:
        print("Bot: ", response["wa_result"][-1].content)
    else:
        print("Bot: ", response["messages"][-1].content)
    print("\n------------------------------------------------------\n")
    print(response)

# Test listing WhatsApp chats
test_query("Read messages from Ishan")
test_query("Show me my active chats")


