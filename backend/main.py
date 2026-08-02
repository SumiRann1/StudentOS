import sys, os
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from agents.timetable.graph import build_graph
from agents.timetable.state import TimeTableState

timetable_agent = build_graph(TimeTableState)

while True:
    query = input("You: ")
    CONFIG = {"configurable": {"thread_id" : "1"}}
    if query.lower() == "exit":
        break
    response = timetable_agent.invoke({"messages" : [("human", query)], "query" : query}, config=CONFIG)
    print("Bot: ", response["timetable_result"][-1].content)
    print("\n------------------------------------------------------\n")
    print(response["query"])
    print(response["timetable_result"])