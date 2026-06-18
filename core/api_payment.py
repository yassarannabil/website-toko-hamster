import hmac
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from .models import Transaction
from .doku_utils import generate_doku_signature

class DokuNotificationAPIView(APIView):
    """
    Endpoint for DOKU Server-to-Server (S2S) Notification.
    """
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        client_id = request.headers.get('Client-Id')
        request_id = request.headers.get('Request-Id')
        request_timestamp = request.headers.get('Request-Timestamp')
        signature_header = request.headers.get('Signature')
        
        if not all([client_id, request_id, request_timestamp, signature_header]):
            return Response({"error": "Missing headers"}, status=status.HTTP_400_BAD_REQUEST)
            
        if client_id != settings.DOKU_CLIENT_ID:
            return Response({"error": "Invalid Client-Id"}, status=status.HTTP_401_UNAUTHORIZED)
            
        # Validate Signature
        target_path = request.path # Usually "/api/payment/doku-notify/"
        # Re-generate signature from raw payload to match precisely
        body_dict = request.data
        secret_key = settings.DOKU_SECRET_KEY
        
        expected_signature = generate_doku_signature(client_id, request_id, request_timestamp, target_path, body_dict, secret_key)
        
        # hmac.compare_digest is safer against timing attacks
        if not hmac.compare_digest(expected_signature, signature_header):
            print(f"Signature mismatch. Expected: {expected_signature}, Got: {signature_header}")
            return Response({"error": "Invalid signature"}, status=status.HTTP_401_UNAUTHORIZED)
            
        # Process the payload
        try:
            transaction_status = body_dict.get('transaction', {}).get('status', '').upper()
            invoice_number = body_dict.get('order', {}).get('invoice_number', '')
            
            if invoice_number.startswith("INV-"):
                transaction_id = invoice_number.replace("INV-", "")
                trx = Transaction.objects.filter(transaction_id=transaction_id).first()
                
                if trx:
                    if transaction_status == "SUCCESS":
                        trx.status_pembayaran = "LUNAS"
                        # Extract payment method from payload if available
                        channel = body_dict.get('payment', {}).get('type', '') or body_dict.get('channel', {}).get('id', '')
                        if channel:
                            trx.metode_pembayaran = f"DOKU - {channel}"
                        trx.save()
                    elif transaction_status == "FAILED":
                        # Optional: Mark as cancelled or let user retry
                        pass
        except Exception as e:
            print(f"Error processing DOKU webhook: {e}")
            
        # DOKU expects HTTP 200 OK
        return Response({"message": "OK"}, status=status.HTTP_200_OK)
