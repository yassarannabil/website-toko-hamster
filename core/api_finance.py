from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from django.db.models import Sum
from django.utils import timezone
from datetime import timedelta
from .models import Transaction, Expense

class FinanceSummaryAPIView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        # Default: 30 days
        days = int(request.query_params.get('days', 30))
        start_date = timezone.now() - timedelta(days=days)

        # Transaksi sukses: LUNAS, DIKIRIM, SAMPAI
        success_statuses = ['LUNAS', 'DIKIRIM', 'SAMPAI']
        transactions = Transaction.objects.filter(created_at__gte=start_date, status_pembayaran__in=success_statuses)
        
        gross_revenue = sum(t.total_bayar for t in transactions)
        total_ongkir = sum(t.biaya_ongkir for t in transactions)
        total_packing = sum(t.biaya_packing for t in transactions)
        
        # Refunds
        refund_transactions = Transaction.objects.filter(created_at__gte=start_date, nominal_refund__gt=0)
        refund_loss = sum(t.nominal_refund for t in refund_transactions)

        # Pesanan Belum Dibayar (PENDING)
        pending_transactions = Transaction.objects.filter(created_at__gte=start_date, status_pembayaran='PENDING')
        potensi_pendapatan = sum(t.total_bayar for t in pending_transactions)

        # Expenses
        expenses = Expense.objects.filter(tanggal__gte=start_date.date())
        total_expense = sum(e.nominal for e in expenses)

        # True Net Profit
        net_revenue = gross_revenue - total_ongkir - total_packing - refund_loss - total_expense

        return Response({
            "gross_revenue": gross_revenue,
            "net_revenue": net_revenue,
            "total_expense": total_expense,
            "refund_loss": refund_loss,
            "potensi_pendapatan": potensi_pendapatan,
            "pass_through_costs": total_ongkir + total_packing,
            "period_days": days
        })

class ExpenseAPIView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        ledger = []
        
        # 1. Manual Expenses
        expenses = Expense.objects.all().order_by('-tanggal', '-created_at')[:50]
        for e in expenses:
            ledger.append({
                "id": f"EXP-{e.expense_id}",
                "tanggal": e.tanggal,
                "tipe": "Pengeluaran",
                "kategori": e.kategori,
                "keterangan": e.keterangan,
                "nominal": -e.nominal,
                "color": "red"
            })
            
        # 2. Transactions (Income)
        success_statuses = ['LUNAS', 'DIKIRIM', 'SAMPAI']
        transactions = Transaction.objects.filter(status_pembayaran__in=success_statuses).order_by('-created_at')[:50]
        for t in transactions:
            ledger.append({
                "id": f"TRX-{t.transaction_id}",
                "tanggal": t.created_at.date(),
                "tipe": "Pemasukan",
                "kategori": "Penjualan",
                "keterangan": f"Pesanan INV-{t.transaction_id}",
                "nominal": t.total_bayar,
                "color": "green"
            })
            
        # 3. Transactions (Refunds)
        refunds = Transaction.objects.filter(nominal_refund__gt=0).order_by('-created_at')[:50]
        for r in refunds:
            ledger.append({
                "id": f"REF-{r.transaction_id}",
                "tanggal": r.created_at.date(),
                "tipe": "Pengeluaran",
                "kategori": "Refund",
                "keterangan": f"Klaim Garansi INV-{r.transaction_id}",
                "nominal": -r.nominal_refund,
                "color": "red"
            })

        # Sort the combined ledger by date descending
        ledger.sort(key=lambda x: x['tanggal'], reverse=True)
        return Response(ledger[:100])

    def post(self, request):
        tanggal = request.data.get('tanggal')
        kategori = request.data.get('kategori')
        keterangan = request.data.get('keterangan')
        nominal = request.data.get('nominal')

        if not all([tanggal, kategori, keterangan, nominal]):
            return Response({"error": "Semua kolom wajib diisi"}, status=400)

        expense = Expense.objects.create(
            tanggal=tanggal,
            kategori=kategori,
            keterangan=keterangan,
            nominal=nominal
        )
        return Response({"message": "Pengeluaran berhasil dicatat", "id": expense.expense_id})

class FinanceChartAPIView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        days = int(request.query_params.get('days', 30))
        start_date = timezone.now() - timedelta(days=days)
        
        # We'll aggregate daily revenue
        success_statuses = ['LUNAS', 'DIKIRIM', 'SAMPAI']
        transactions = Transaction.objects.filter(created_at__gte=start_date, status_pembayaran__in=success_statuses).order_by('created_at')
        
        # Group by date string (YYYY-MM-DD)
        daily_data = {}
        
        for i in range(days + 1):
            day_str = (start_date + timedelta(days=i)).strftime('%Y-%m-%d')
            daily_data[day_str] = {"date": day_str, "revenue": 0, "expense": 0}

        for t in transactions:
            day_str = t.created_at.strftime('%Y-%m-%d')
            if day_str in daily_data:
                # Net revenue contribution = total_bayar - ongkir - packing - refund
                net_contrib = t.total_bayar - t.biaya_ongkir - t.biaya_packing - t.nominal_refund
                daily_data[day_str]["revenue"] += net_contrib

        expenses = Expense.objects.filter(tanggal__gte=start_date.date())
        for e in expenses:
            day_str = e.tanggal.strftime('%Y-%m-%d')
            if day_str in daily_data:
                daily_data[day_str]["expense"] += e.nominal
                
        # Convert back to list
        chart_data = list(daily_data.values())
        return Response(chart_data)
