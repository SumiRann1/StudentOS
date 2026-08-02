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

refinement_llm = ChatGroq(model="openai/gpt-oss-120b")

