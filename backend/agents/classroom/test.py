import os
import sys

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from agents.orchestrator import build_orchestrator

orchestrator = build_orchestrator()

queries = [
    "List my classroom courses",
    "Show coursework for course name STTL",
    "Are there any announcements in Software Tools?"
]

CONFIG = {"configurable": {"thread_id": "classroom_verification"}}

for q in queries:
    print(f"\n==================================================")
    print(f"User Query: {q}")
    print(f"==================================================")
    try:
        response = orchestrator.invoke(
            {"messages": [("human", q)], "query": q},
            config=CONFIG
        )
        
        printed = False
        if "classroom_result" in response and response["classroom_result"]:
            print(f"🏫 Classroom Refined Output:\n{response['classroom_result'][-1].content}")
            printed = True
        
        if not printed:
            print(f"💬 Response:\n{response['messages'][-1].content}")
            
    except Exception as e:
        print(f"Error executing orchestrator query: {e}")
        import traceback
        traceback.print_exc()
