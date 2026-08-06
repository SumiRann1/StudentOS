import sys
import os
import json

# Setup backend directory in python path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from agents.whatsapp.client import WhatsAppClient
from agents.whatsapp.tool import (
    _get_whatsapp_chat_list_impl,
    _read_whatsapp_messages_impl,
    _send_whatsapp_message_impl,
    _summarize_whatsapp_chat_impl
)

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "No tool name provided"}))
        sys.exit(1)
        
    tool_name = sys.argv[1]
    args_str = sys.argv[2] if len(sys.argv) > 2 else "{}"
    
    try:
        args = json.loads(args_str)
    except Exception as e:
        print(json.dumps({"success": False, "error": f"Invalid arguments JSON: {e}"}))
        sys.exit(1)
        
    client = WhatsAppClient()
    try:
        if tool_name == "get_whatsapp_chat_list":
            result = _get_whatsapp_chat_list_impl()
        elif tool_name == "read_whatsapp_messages":
            result = _read_whatsapp_messages_impl(**args)
        elif tool_name == "send_whatsapp_message":
            result = _send_whatsapp_message_impl(**args)
        elif tool_name == "summarize_whatsapp_chat":
            result = _summarize_whatsapp_chat_impl(**args)
        else:
            print(json.dumps({"success": False, "error": f"Unknown tool: {tool_name}"}))
            sys.exit(1)
            
        print(json.dumps({"success": True, "result": result}))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
    finally:
        try:
            client.close()
        except Exception:
            pass

if __name__ == "__main__":
    main()
