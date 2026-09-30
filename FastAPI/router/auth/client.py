import os
from dotenv import load_dotenv
from supabase import Client, create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_all_users():
    try:
        users = supabase.table("users").select("*").execute()
        return users.data or []
    except Exception as e:
        print(f"Warning: Could not fetch users from Supabase: {e}")
        return []