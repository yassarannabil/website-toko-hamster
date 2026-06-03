import json
import base64
import hashlib
import hmac
import uuid
import datetime
import requests
from django.conf import settings

def minify_json(data):
    """
    Minify JSON data to eliminate spaces and newlines.
    """
    return json.dumps(data, separators=(',', ':'))

def generate_doku_signature(client_id, request_id, request_timestamp, request_target, body_dict, secret_key):
    """
    Generate HMAC-SHA256 signature for DOKU Request or Response.
    """
    body_minified = minify_json(body_dict) if body_dict else ""
    
    # Digest = Base64Encode(SHA256(minify(RequestBody)))
    digest = base64.b64encode(hashlib.sha256(body_minified.encode('utf-8')).digest()).decode('utf-8')
    
    components = (
        f"Client-Id:{client_id}\n"
        f"Request-Id:{request_id}\n"
        f"Request-Timestamp:{request_timestamp}\n"
        f"Request-Target:{request_target}\n"
        f"Digest:{digest}"
    )
    
    signature = hmac.new(
        secret_key.encode('utf-8'),
        components.encode('utf-8'),
        hashlib.sha256
    ).digest()
    
    return "HMACSHA256=" + base64.b64encode(signature).decode('utf-8')

def create_doku_checkout_url(transaction):
    """
    Hit DOKU Checkout API to generate the payment url.
    Returns: (payment_url, token_id, error_message)
    """
    client_id = settings.DOKU_CLIENT_ID
    secret_key = settings.DOKU_SECRET_KEY
    base_url = settings.DOKU_BASE_URL
    target_path = "/checkout/v1/payment"
    endpoint = f"{base_url}{target_path}"
    
    request_id = str(uuid.uuid4())
    request_timestamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    
    # Construct Items
    line_items = []
    # For simplicity, we bundle everything into one item if it's too complex, 
    # but let's add the basic items. 
    # Hamster items
    for h in transaction.hamsters.all():
        line_items.append({
            "name": f"{h.variant.spesies} - {h.variant.varian_warna} ({h.jenis_kelamin})",
            "quantity": 1,
            "price": int(h.harga_display)
        })
    
    # Add Packing & Ongkir
    if transaction.biaya_packing > 0:
        line_items.append({
            "name": "Biaya Packing",
            "quantity": 1,
            "price": int(transaction.biaya_packing)
        })
        
    if transaction.biaya_ongkir > 0:
        line_items.append({
            "name": f"Ongkos Kirim",
            "quantity": 1,
            "price": int(transaction.biaya_ongkir)
        })
        
    # We must ensure the sum of line_items matches the total_bayar
    # Sometimes due to adjustments, it might not match perfectly.
    # To be safe, if we don't need line_items, we can omit it, but DOKU recommends it.
    # Actually, DOKU allows omitting line_items for basic request! Let's do basic for reliability.
    
    payload = {
        "order": {
            "amount": int(transaction.total_bayar),
            "invoice_number": f"INV-{transaction.transaction_id}",
            "currency": "IDR",
            "callback_url": f"{settings.FRONTEND_URL}/orders", # Redirect user to orders page after payment
            "auto_redirect": True,
        },
        "payment": {
            "payment_due_date": 60 # 60 minutes
        },
    }
    
    # Include customer info if available
    if transaction.customer:
        customer_name = transaction.alamat.nama_penerima if transaction.alamat else transaction.customer.nomor_wa
        payload["customer"] = {
            "id": str(transaction.customer.customer_id),
            "name": customer_name[:255], # max 255 chars
            "phone": transaction.customer.nomor_wa,
        }
        if transaction.alamat:
            payload["customer"]["email"] = transaction.customer.user.email if transaction.customer.user else "customer@noskahamster.com"
            payload["customer"]["address"] = transaction.alamat.detail_alamat[:400]
            payload["customer"]["postcode"] = transaction.alamat.kode_pos
            payload["customer"]["country"] = "ID"
            
    signature = generate_doku_signature(client_id, request_id, request_timestamp, target_path, payload, secret_key)
    
    headers = {
        "Client-Id": client_id,
        "Request-Id": request_id,
        "Request-Timestamp": request_timestamp,
        "Signature": signature,
        "Content-Type": "application/json"
    }
    
    try:
        body_minified = json.dumps(payload, separators=(',', ':'))
        response = requests.post(endpoint, data=body_minified, headers=headers, timeout=15)
        res_data = response.json()
        
        if response.status_code == 200 and "response" in res_data:
            payment_url = res_data["response"]["payment"]["url"]
            token_id = res_data["response"]["payment"]["token_id"]
            return payment_url, token_id, None
        else:
            err = res_data.get("error_messages", [str(res_data)])
            return None, None, f"DOKU Error: {', '.join(err)}"
            
    except Exception as e:
        return None, None, f"Exception: {str(e)}"
