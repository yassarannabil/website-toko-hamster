import hmac
import hashlib
import base64
import json
import datetime
import uuid

def minify_json(data):
    return json.dumps(data, separators=(',', ':'))

def generate_signature(client_id, request_id, request_timestamp, request_target, body_dict, secret_key):
    body_minified = minify_json(body_dict)
    
    # Digest = Base64Encode(SHA256(minify(RequestBody)))
    digest = base64.b64encode(hashlib.sha256(body_minified.encode('utf-8')).digest()).decode('utf-8')
    
    # Component string
    # Client-Id:{Client-Id}\nRequest-Id:{Request-Id}\nRequest-Timestamp:{Request-Timestamp}\nRequest-Target:{Request-Target}\nDigest:{Digest}
    components = (
        f"Client-Id:{client_id}\n"
        f"Request-Id:{request_id}\n"
        f"Request-Timestamp:{request_timestamp}\n"
        f"Request-Target:{request_target}\n"
        f"Digest:{digest}"
    )
    
    # Signature = HMACSHA256(ClientSecret, components)
    signature = hmac.new(
        secret_key.encode('utf-8'),
        components.encode('utf-8'),
        hashlib.sha256
    ).digest()
    
    return "HMACSHA256=" + base64.b64encode(signature).decode('utf-8')

if __name__ == "__main__":
    req_body = {
        "order": {
            "amount": 20000,
            "invoice_number": "INV-20210231-0001"
        },
        "payment": {
            "payment_due_date": 60
        }
    }
    
    client_id = "MCH-0001-10791114622547"
    secret_key = "SK-XXXX" # dummy
    req_id = str(uuid.uuid4())
    req_ts = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    req_target = "/checkout/v1/payment"
    
    sig = generate_signature(client_id, req_id, req_ts, req_target, req_body, secret_key)
    print("Signature:", sig)
    print("Digest Base64:", base64.b64encode(hashlib.sha256(minify_json(req_body).encode('utf-8')).digest()).decode('utf-8'))
