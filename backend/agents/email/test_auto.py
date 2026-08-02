import sys, os
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from agents.email.graph import build_graph
from agents.state import AgentState

email_agent = build_graph(AgentState)

def test_query(query: str):
    print(f"\n--- Testing query: '{query}' ---")
    CONFIG = {"configurable": {"thread_id": "1"}}
    response = email_agent.invoke({"messages": [("human", query)]}, config=CONFIG)
    print("Bot: ", response["messages"][-1].content)
    print("\n------------------------------------------------------\n")
    print(response)

# Test summarizing inbox
# test_query("Summarize my inbox.")

# test_query("Send an email to akresumiran@gmail.com with subject 'Test Email from StudentOS' and body 'Test Email from StudentOS'")

# Test drafting an email
# test_query("Draft an email to professor@university.edu with the subject 'Assignment Extension' asking for an extension until Friday.")

# Test reading unread emails in time interval
# test_query("Show me unread emails received today")

# Test reading email with name/subject description auto-resolution
test_query("Read my email regarding mess")

# Test checking email attachments
# test_query("Are there any attachments in my email regarding mess?")
