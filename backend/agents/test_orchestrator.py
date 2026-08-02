import sys
import os
import uuid

# Add backend directory to sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from agents.orchestrator import build_orchestrator

def main():
    print("StudentOS Orchestrator Test CLI Active.")
    print("Commands:")
    print("  - Type 'exit', 'quit', or 'q' to quit.")
    print("  - Type '/clear' or '/new' to start a new chat session (clears history).")
    
    orchestrator = build_orchestrator()
    session_id = str(uuid.uuid4())[:8]
    config = {"configurable": {"thread_id": f"orchestrator_test_{session_id}"}}
    
    while True:
        try:
            query = input("\nYou: ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\nExiting...")
            break
            
        if not query:
            continue
            
        if query.lower() in ["exit", "quit", "q"]:
            break
            
        if query.lower() in ["/clear", "/new"]:
            session_id = str(uuid.uuid4())[:8]
            config = {"configurable": {"thread_id": f"orchestrator_test_{session_id}"}}
            print("\n✨ Started a new chat session (history cleared).")
            continue
            
        try:
            response = orchestrator.invoke(
                {"messages": [("human", query)], "query": query},
                config=config
            )
            
            print("\n=== Orchestrator Response ===")
            
            printed_result = False
            
            if response.get("wa_result"):
                print(f"📱 WhatsApp Refined Output:\n{response['wa_result'][-1].content}")
                printed_result = True
            elif response.get("email_result"):
                print(f"✉️ Email Refined Output:\n{response['email_result'][-1].content}")
                printed_result = True
            elif response.get("timetable_result"):
                print(f"📅 Timetable Refined Output:\n{response['timetable_result'][-1].content}")
                printed_result = True
            elif response.get("classroom_result"):
                print(f"🏫 Classroom Refined Output:\n{response['classroom_result'][-1].content}")
                printed_result = True
            elif response.get("general_result"):
                print(f"💬 General Chat Response:\n{response['general_result'][-1].content}")
                printed_result = True
                
            if not printed_result:
                if response.get("messages"):
                    print(f"💬 Response:\n{response['messages'][-1].content}")
                else:
                    print("⚠️ No output received from orchestrator.")
                    
            print("\n" + "=" * 50)
            
        except Exception as e:
            print(f"Error executing orchestrator: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    main()