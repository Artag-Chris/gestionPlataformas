#!/usr/bin/env python3
"""
Script to test Slack webhook integration
Generates a valid HMAC-SHA256 signature for testing
"""

import json
import hmac
import hashlib
import requests
import time
from datetime import datetime

# Configuration
SLACK_SIGNING_SECRET = "e0d400bb387dcc0ba2480ee193f58442"
GATEWAY_URL = "http://localhost:3000/api/webhooks/slack"
SLACK_TEAM_ID = "T06C5E4Q70E"  # Your Slack workspace ID
BOT_USER_ID = "U06CJ37D9U5"

def generate_slack_signature(body: str, timestamp: str, secret: str) -> str:
    """Generate Slack HMAC-SHA256 signature"""
    signed_content = f"v0:{timestamp}:{body}"
    signature = "v0=" + hmac.new(
        secret.encode(),
        signed_content.encode(),
        hashlib.sha256
    ).hexdigest()
    return signature

def send_message_event():
    """Send a message.channels event"""
    timestamp = str(int(time.time()))
    
    # Slack webhook payload for message event
    payload = {
        "token": "verification_token",
        "team_id": SLACK_TEAM_ID,
        "api_app_id": "A06CJ4KN9V2",
        "event": {
            "type": "message",
            "channel": "C06CJFJ3TCM",  # Public channel
            "user": BOT_USER_ID,
            "text": "Test message for bot integration",
            "ts": timestamp,
            "event_ts": timestamp
        },
        "type": "event_callback",
        "event_id": f"Ev{timestamp}",
        "event_time": int(timestamp)
    }
    
    body = json.dumps(payload)
    signature = generate_slack_signature(body, timestamp, SLACK_SIGNING_SECRET)
    
    headers = {
        "Content-Type": "application/json",
        "X-Slack-Request-Timestamp": timestamp,
        "X-Slack-Signature": signature
    }
    
    print(f"[*] Sending message.channels event...")
    print(f"[*] Timestamp: {timestamp}")
    print(f"[*] Signature: {signature}")
    print(f"[*] Payload:\n{json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(GATEWAY_URL, data=body, headers=headers)
        print(f"[+] Response status: {response.status_code}")
        print(f"[+] Response body: {response.text}")
    except Exception as e:
        print(f"[-] Error: {e}")

def send_app_mention_event():
    """Send an app_mention event"""
    timestamp = str(int(time.time()))
    
    payload = {
        "token": "verification_token",
        "team_id": SLACK_TEAM_ID,
        "api_app_id": "A06CJ4KN9V2",
        "event": {
            "type": "app_mention",
            "channel": "C06CJFJ3TCM",
            "user": BOT_USER_ID,
            "text": f"<@U06CJ4KNKV0> help",
            "ts": timestamp,
            "event_ts": timestamp
        },
        "type": "event_callback",
        "event_id": f"Ev{timestamp}",
        "event_time": int(timestamp)
    }
    
    body = json.dumps(payload)
    signature = generate_slack_signature(body, timestamp, SLACK_SIGNING_SECRET)
    
    headers = {
        "Content-Type": "application/json",
        "X-Slack-Request-Timestamp": timestamp,
        "X-Slack-Signature": signature
    }
    
    print(f"\n[*] Sending app_mention event...")
    print(f"[*] Timestamp: {timestamp}")
    print(f"[*] Signature: {signature}")
    
    try:
        response = requests.post(GATEWAY_URL, data=body, headers=headers)
        print(f"[+] Response status: {response.status_code}")
        print(f"[+] Response body: {response.text}")
    except Exception as e:
        print(f"[-] Error: {e}")

if __name__ == "__main__":
    print("=" * 60)
    print("Slack Webhook Test Script")
    print("=" * 60)
    send_message_event()
    time.sleep(2)
    send_app_mention_event()
    print("\n[*] Tests completed!")
