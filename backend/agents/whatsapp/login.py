import sys
import os

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from agents.whatsapp.client import WhatsAppClient

def main():
    print("=== WhatsApp Web Login Client ===")
    client = WhatsAppClient()
    try:
        client.initialize()
        print("Success: WhatsApp Web is logged in and session is ready.")
    except Exception as e:
        print(f"Error during login: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    main()
