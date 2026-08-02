import operator
from typing import TypedDict, List, Annotated, Literal
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages


class AgentState(TypedDict):
    messages : Annotated[List[BaseMessage], add_messages]
    query : str
    type : Annotated[List[Literal["whatsapp", "email", "timetable", "classroom", "general"]], operator.add]
    current_time : str
    current_day : str
    general_result : List[BaseMessage]
    wa_result : List[BaseMessage]
    email_result : List[BaseMessage]
    timetable_result : List[BaseMessage]
    classroom_result : List[BaseMessage]
