import os
from apscheduler.jobstores.sqlalchemy import SQLAlchemyJobStore


AUTOMATION_DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "automation.db"))
os.makedirs(os.path.dirname(AUTOMATION_DB_PATH), exist_ok=True)

jobstores = {"default": SQLAlchemyJobStore(url=f"sqlite:///{AUTOMATION_DB_PATH}")}