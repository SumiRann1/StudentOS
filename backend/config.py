from dotenv import load_dotenv 
import os
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

load_dotenv()

MAIL_SENDER= os.getenv("MAIL_SENDER")
PROMAILER_API_KEY= os.getenv("PROMAILER_API_KEY")
PROMAILER_SMTP_ID= os.getenv("PROMAILER_SMTP_ID")

os.environ["GROQ_API_KEY"] = os.getenv("GROQ_API_KEY")

from agents.timetable.tool import tools_list_time
from agents.email.tool import tools_list_email
from agents.whatsapp.tool import tools_list_whatsapp
from agents.classroom.tool import tools_list_classroom
from langchain_groq import ChatGroq

llm = ChatGroq(model="openai/gpt-oss-20b")
whatsapp_llm = llm.bind_tools(tools_list_whatsapp)
timetable_llm = llm.bind_tools(tools_list_time)
email_llm = llm.bind_tools(tools_list_email)
classroom_llm = llm.bind_tools(tools_list_classroom)

refinement_llm = ChatGroq(model="openai/gpt-oss-20b")

from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, ToolMessage

def clean_messages_for_non_tool_llm(messages: list) -> list:
    """
    Cleans a list of messages for an LLM invocation that does not have tools bound.
    It removes or converts ToolMessages and AIMessages with tool_calls,
    so that the LLM/API provider does not throw a 400 Bad Request error.
    """
    cleaned = []
    for msg in messages:
        if isinstance(msg, ToolMessage):
            # Convert ToolMessage to a SystemMessage so the content is preserved
            # but it is not a ToolMessage anymore.
            cleaned.append(SystemMessage(content=f"System: Tool '{msg.name}' returned output:\n{msg.content}"))
        elif isinstance(msg, AIMessage):
            # If the AIMessage has tool calls, strip them so the API sees it as a text message
            if msg.tool_calls:
                content = msg.content
                if not content:
                    content = f"[Called tool: {', '.join(tc['name'] for tc in msg.tool_calls)}]"
                cleaned.append(AIMessage(content=content, response_metadata=msg.response_metadata))
            else:
                cleaned.append(msg)
        else:
            cleaned.append(msg)
    return cleaned


