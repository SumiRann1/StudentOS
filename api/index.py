import os
import sys

# Ensure root directory is in sys.path for backend imports
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from FastAPI.main import app

# Vercel entrypoint
__all__ = ["app"]
