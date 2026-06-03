import os
import django
import sys
import requests
import uuid
import datetime
import hmac
import hashlib
import base64
import json

client_id = "BRN-0239-1780472793618"
secret_key = "SK-VNdsXpBdjM9UNfLbQOlI"
base_url = "https://api-sandbox.doku.com"
target_path = "/checkout/v1/payment"

payload = {
    "order": {
        "amount": 10000,
        "invoice_number": "INV-12345",
        "currency": "IDR"
    },
    "payment": {
        "payment_due_date": 60
    }
}

body_minified = json.dumps(payload, separators=(',', ':'))
digest_bytes = hashlib.sha256(body_minified.encode('utf-8')).digest()
digest = base64.b64encode(digest_bytes).decode('utf-8')

request_id = str(uuid.uuid4())
request_timestamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

components = (
    f"Client-Id:{client_id}\n"
    f"Request-Id:{request_id}\n"
    f"Request-Timestamp:{request_timestamp}\n"
    f"Request-Target:{target_path}\n"
    f"Digest:{digest}"
)

signature = hmac.new(
    secret_key.encode('utf-8'),
    components.encode('utf-8'),
    hashlib.sha256
).digest()

sig_header = "HMACSHA256=" + base64.b64encode(signature).decode('utf-8')

headers = {
    "Client-Id": client_id,
    "Request-Id": request_id,
    "Request-Timestamp": request_timestamp,
    "Signature": sig_header,
    "Content-Type": "application/json"
}

res = requests.post(base_url + target_path, data=body_minified, headers=headers)
print("Status:", res.status_code)
print("Response:", res.json())
