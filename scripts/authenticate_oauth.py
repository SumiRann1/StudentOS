#!/usr/bin/env python3
"""
OAuth Authentication Helper Script for Student OS
Run this script to interactively sign in and generate OAuth token JSON files
for Google Classroom and Gmail services with persistent refresh capabilities.

Usage:
  python scripts/authenticate_oauth.py --service email
  python scripts/authenticate_oauth.py --service classroom
  python scripts/authenticate_oauth.py --service all
  python scripts/authenticate_oauth.py --check
"""

import os
import sys
import argparse
import json

# Allow oauthlib to accept token scopes if user deselects any scope during consent
os.environ["OAUTHLIB_RELAX_TOKEN_SCOPE"] = "1"

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import InstalledAppFlow


BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_DIR = os.path.join(BASE_DIR, "data")

SERVICE_CONFIG = {
    "email": {
        "name": "Gmail Service",
        "scopes": ["https://www.googleapis.com/auth/gmail.modify"],
        "credentials": os.path.join(DATA_DIR, "email_oauth_credentials.json"),
        "token": os.path.join(DATA_DIR, "email_oauth_token.json"),
    },
    "classroom": {
        "name": "Google Classroom Service",
        "scopes": [
            "https://www.googleapis.com/auth/classroom.courses.readonly",
            "https://www.googleapis.com/auth/classroom.coursework.me.readonly",
            "https://www.googleapis.com/auth/classroom.announcements.readonly",
            "https://www.googleapis.com/auth/classroom.student-submissions.me.readonly",
        ],
        "credentials": os.path.join(DATA_DIR, "classroom_oauth_credentials.json"),
        "token": os.path.join(DATA_DIR, "classroom_oauth_token.json"),
    }
}


def check_token(service_key: str) -> bool:
    config = SERVICE_CONFIG[service_key]
    token_path = config["token"]
    name = config["name"]
    scopes = config["scopes"]

    print(f"\n--- Checking {name} ---")
    if not os.path.exists(token_path):
        print(f"❌ Token file missing: {token_path}")
        return False

    try:
        creds = Credentials.from_authorized_user_file(token_path, scopes)
        if creds.valid:
            print(f"✅ Token is valid! Expiry: {creds.expiry}")
            return True
        elif creds.expired and creds.refresh_token:
            print("⚠️ Token is expired, attempting refresh...")
            creds.refresh(Request())
            print(f"✅ Token refreshed successfully! New Expiry: {creds.expiry}")
            with open(token_path, "w", encoding="utf-8") as f:
                f.write(creds.to_json())
            print(f"💾 Updated token saved to {token_path}")
            return True
        else:
            print("❌ Token is invalid and missing refresh_token.")
            return False
    except Exception as e:
        print(f"❌ Failed to load/refresh token: {e}")
        return False


def authenticate_service(service_key: str, port: int = 0, code: str = None) -> bool:
    config = SERVICE_CONFIG[service_key]
    name = config["name"]
    credentials_path = config["credentials"]
    token_path = config["token"]
    scopes = config["scopes"]

    print(f"\n==========================================")
    print(f" Authenticating: {name}")
    print(f"==========================================")

    if not os.path.exists(credentials_path):
        print(f"❌ Credentials file missing at '{credentials_path}'.")
        print(f"Please ensure '{os.path.basename(credentials_path)}' is in the 'data/' directory.")
        return False

    try:
        if code:
            # Extract code if full URL was pasted
            clean_code = code.strip()
            if "code=" in clean_code:
                import urllib.parse
                parsed = urllib.parse.urlparse(clean_code)
                query = urllib.parse.parse_qs(parsed.query)
                if "code" in query:
                    clean_code = query["code"][0]

            flow = InstalledAppFlow.from_client_secrets_file(
                credentials_path,
                scopes,
                redirect_uri="http://localhost"
            )
            print("🔑 Exchanging authorization code for OAuth tokens...")
            flow.fetch_token(code=clean_code)
            creds = flow.credentials
        else:
            flow = InstalledAppFlow.from_client_secrets_file(credentials_path, scopes)
            auth_url, _ = flow.authorization_url(prompt="consent", access_type="offline")
            print(f"🌐 Sign in URL:\n{auth_url}\n")
            print(f"Waiting for authorization...")
            creds = flow.run_local_server(
                port=port,
                prompt="consent",
                access_type="offline",
                authorization_prompt_message="Open this link in your browser to sign in: {url}"
            )

        os.makedirs(os.path.dirname(token_path), exist_ok=True)
        with open(token_path, "w", encoding="utf-8") as f:
            f.write(creds.to_json())

        print(f"✅ Authentication successful for {name}!")
        print(f"💾 Token saved to: {token_path}")
        return True
    except Exception as e:
        print(f"❌ Authentication failed for {name}: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description="Student OS OAuth Authentication Tool")
    parser.add_argument(
        "--service",
        choices=["email", "classroom", "all"],
        default="all",
        help="Service to authenticate (email, classroom, or all)"
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Check token status without running interactive sign-in"
    )
    parser.add_argument(
        "--code",
        type=str,
        default=None,
        help="Authorization code or redirect URL obtained from browser sign-in"
    )
    parser.add_argument(
        "--port",
        type=int,
        default=0,
        help="Port for local server redirect (default: 0 for dynamic free port)"
    )

    args = parser.parse_args()

    services_to_process = ["classroom", "email"] if args.service == "all" else [args.service]

    if args.check:
        all_valid = True
        for s in services_to_process:
            valid = check_token(s)
            if not valid:
                all_valid = False
        sys.exit(0 if all_valid else 1)

    print("🔑 Student OS OAuth Helper")
    print("This script will help you complete Google sign-in and save persistent tokens.")

    success_count = 0
    for s in services_to_process:
        if authenticate_service(s, port=args.port, code=args.code):
            success_count += 1

    print(f"\n🎉 Completed {success_count}/{len(services_to_process)} authentications successfully.")



if __name__ == "__main__":
    main()
