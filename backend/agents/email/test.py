import sys, os
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from agents.email.graph import build_graph
from agents.email.state import EmailState

email_agent = build_graph(EmailState)

print("StudentOS Email Assistant Active. Type 'exit' to quit.")
while True:
    query = input("You: ")
    CONFIG = {"configurable": {"thread_id": "1"}}
    if query.lower() == "exit":
        break
    response = email_agent.invoke({"messages": [("human", query)]}, config=CONFIG)
    print("Bot: ", response["messages"][-1].content)
    print("\n------------------------------------------------------\n")
    print(response)