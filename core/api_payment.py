import hmac
import hashlib
import base64
import json
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from .models import Transaction

class DokuNotificationAPIView(APIView):
    """
    Endpoint for DOKU Server-to-Server (S2S) Notification.
    """
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        client_id = request.headers.get('Client-Id', '')
        request_id = request.headers.get('Request-Id')
        request_timestamp = request.headers.get('Request-Timestamp')
        signature_header = request.headers.get('Signature')
        
        if not all([client_id, request_id, request_timestamp, signature_header]):
            return Response({"error": "Missing headers"}, status=status.HTTP_400_BAD_REQUEST)
            
        if client_id.strip() != settings.DOKU_CLIENT_ID.strip():
            print(f"Client ID mismatch. Expected: '{settings.DOKU_CLIENT_ID}', Got: '{client_id}'", flush=True)
            return Response({"error": "Invalid Client-Id"}, status=status.HTTP_401_UNAUTHORIZED)
            
        # Validate Signature
        target_path = request.path # Usually "/api/payment/doku-notify/"
        secret_key = settings.DOKU_SECRET_KEY
        
        raw_body = request.body
        digest_raw = base64.b64encode(hashlib.sha256(raw_body).digest()).decode('utf-8')
        
        components_raw = (
            f"Client-Id:{client_id}\n"
            f"Request-Id:{request_id}\n"
            f"Request-Timestamp:{request_timestamp}\n"
            f"Request-Target:{target_path}\n"
            f"Digest:{digest_raw}"
        )
        expected_signature_raw = "HMACSHA256=" + base64.b64encode(hmac.new(secret_key.encode('utf-8'), components_raw.encode('utf-8'), hashlib.sha256).digest()).decode('utf-8')
        
        # Test Minified Body as well
        body_minified = json.dumps(request.data, separators=(',', ':'))
        digest_minified = base64.b64encode(hashlib.sha256(body_minified.encode('utf-8')).digest()).decode('utf-8')
        components_minified = (
            f"Client-Id:{client_id}\n"
            f"Request-Id:{request_id}\n"
            f"Request-Timestamp:{request_timestamp}\n"
            f"Request-Target:{target_path}\n"
            f"Digest:{digest_minified}"
        )
        expected_signature_min = "HMACSHA256=" + base64.b64encode(hmac.new(secret_key.encode('utf-8'), components_minified.encode('utf-8'), hashlib.sha256).digest()).decode('utf-8')

        print(f"--- DOKU WEBHOOK DEBUG ---", flush=True)
        print(f"Headers Signature: {signature_header}", flush=True)
        print(f"Expected Raw: {expected_signature_raw}", flush=True)
        print(f"Expected Minified: {expected_signature_min}", flush=True)
        print(f"Target Path: {target_path}", flush=True)
        print(f"Raw Body: {raw_body}", flush=True)
        print(f"Minified Body: {body_minified}", flush=True)
        print(f"--------------------------", flush=True)
        
        if hmac.compare_digest(expected_signature_raw, signature_header) or hmac.compare_digest(expected_signature_min, signature_header):
            print("Signature matches!", flush=True)
            # Proceed with processing
            try:
                transaction_status = request.data.get('transaction', {}).get('status', '').upper()
                invoice_number = request.data.get('order', {}).get('invoice_number', '')
                
                if invoice_number.startswith("INV-"):
                    transaction_id = invoice_number.replace("INV-", "")
                    trx = Transaction.objects.filter(transaction_id=transaction_id).first()
                    
                    if trx:
                        if transaction_status == "SUCCESS":
                            trx.status_pembayaran = "LUNAS"
                            channel = request.data.get('payment', {}).get('type', '') or request.data.get('channel', {}).get('id', '')
                            if channel:
                                trx.metode_pembayaran = f"DOKU - {channel}"
                            trx.save()
            except Exception as e:
                print(f"Error processing DOKU webhook: {e}")
                
            return Response({"message": "OK"}, status=status.HTTP_200_OK)
        else:
            return Response({"error": "Invalid signature"}, status=status.HTTP_401_UNAUTHORIZED)
