"""
=============================================================================
 GG BANK - Python SQLite Unified REST Backend Server
 "Secure Banking. Smarter Future."
 Provides persistent multi-user database storage for GG BANK on port 8080.
=============================================================================
"""

import sys
import os
import json
import sqlite3
import re
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

# Set standard encoding
if sys.platform.startswith("win"):
    import codecs
    sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ggbank.db")

def get_db():
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    return conn

def seed_initial_data(c):
    print("[DATABASE] Seeding initial banking records into SQLite...")
    now = datetime.utcnow().isoformat() + "Z"

    # Demo Users
    users_data = [
        ("usr-gowtham-101", "Gowtham NK", "gowtham@ggbank.com", "Password@123", "9876543210", "2003-05-14", "Male", "42 Cyber City, Tech Park, Bangalore", "Software Engineer", "CUSTOMER", "ACTIVE", "SARAH7890K", "123456789012", None, now),
        ("usr-sarah-102", "Sarah Connor", "sarah@ggbank.com", "Password@123", "9123456780", "2001-11-20", "Female", "77 Silicon Boulevard, Chennai", "Product Designer", "CUSTOMER", "ACTIVE", "CONNR1234P", "987654321098", None, now),
        ("usr-admin-999", "GG Bank Administrator", "admin@ggbank.com", "Password@123", "9000000000", "1995-01-01", "Other", "GG BANK Headquarters, Financial Tower", "System Admin", "ADMIN", "ACTIVE", "ADMIN0000A", "111122223333", None, now)
    ]
    c.executemany("INSERT INTO users VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", users_data)

    # Demo Accounts
    accounts_data = [
        ("acc-gowtham-101", "usr-gowtham-101", "100188492019", "SAVINGS", 65450.00, "GGBN0001234", "Central Tech Branch", "ACTIVE", now),
        ("acc-sarah-102", "usr-sarah-102", "100188492020", "SAVINGS", 32000.00, "GGBN0001234", "Central Tech Branch", "ACTIVE", now),
        ("acc-admin-treasury", "usr-admin-999", "GG-BANK-TREASURY-01", "TREASURY", 999999999.00, "GGBN0001234", "Central Tech Branch", "ACTIVE", now)
    ]
    c.executemany("INSERT INTO accounts VALUES (?,?,?,?,?,?,?,?,?)", accounts_data)

    # Demo Transactions
    txns_data = [
        ("TXN-2026-908101", "EXTERNAL-DEP", "100188492019", 50000.00, "DEPOSIT", "Salary", "Monthly Salary Credit", "COMPLETED", 50000.00, now),
        ("TXN-2026-908102", "100188492019", "100188492020", 5000.00, "TRANSFER", "Transfer", "Project Collab Payment", "COMPLETED", 45000.00, now),
        ("TXN-2026-908103", "100188492019", "BESCOM-ELEC", 1550.00, "BILL_PAYMENT", "Bills", "Electricity Bill - BESCOM", "COMPLETED", 43450.00, now),
        ("TXN-2026-908104", "100188492019", "SELF-CASH", 2000.00, "WITHDRAWAL", "Cash", "ATM Cash Withdrawal", "COMPLETED", 41450.00, now),
        ("TXN-2026-908105", "UPI-GPAY-IN", "100188492019", 24000.00, "DEPOSIT", "Deposit", "Freelance Consulting", "COMPLETED", 65450.00, now)
    ]
    c.executemany("INSERT INTO transactions VALUES (?,?,?,?,?,?,?,?,?,?)", txns_data)

    # Demo Officers
    officers_data = [
        ("off-001", "EMP-1001", "Vikram Sharma", "vikram.sharma@ggbank.com", "+91 98765 43210", "LOAN", "Chief Credit Officer", "Central Tech Branch", "ACTIVE", 12, "Password@123", now),
        ("off-002", "EMP-1002", "Anita Roy", "anita.roy@ggbank.com", "+91 98765 43211", "LOAN", "Senior Personal Loan Underwriter", "Central Tech Branch", "ACTIVE", 8, "Password@123", now),
        ("off-003", "EMP-1003", "Priya Patel", "priya.patel@ggbank.com", "+91 98765 43212", "COMPLIANCE", "Lead KYC & AML Compliance Officer", "Financial Tower Branch", "ACTIVE", 19, "Password@123", now),
        ("off-004", "EMP-1004", "Karthik Rao", "karthik.rao@ggbank.com", "+91 98765 43213", "TREASURY", "Treasury & Vault Operations Manager", "Central Tech Branch", "ACTIVE", 5, "Password@123", now),
        ("off-005", "EMP-1005", "Rajesh Kumar", "rajesh.kumar@ggbank.com", "+91 98765 43214", "OPERATIONS", "Branch Operations Supervisor", "North Metro Branch", "ACTIVE", 2, "Password@123", now)
    ]
    c.executemany("INSERT INTO officers VALUES (?,?,?,?,?,?,?,?,?,?,?,?)", officers_data)

    # Demo Loans
    c.execute("""
    INSERT INTO loans VALUES (
        'LOAN-849102', 'usr-gowtham-101', '100188492019', 'Personal Loan',
        100000.00, 65000.00, 24, 10.5, 4637.00, 11288.00, 111288.00,
        'Home renovation and tech setup', 'PENDING', 'Pending initial documents verification', ?, NULL
    )
    """, (now,))

    # Demo Budgets
    budgets_data = [
        ("b-1", "usr-gowtham-101", "Food", 5000.0, 4250.0, "2026-09"),
        ("b-2", "usr-gowtham-101", "Shopping", 10000.0, 3400.0, "2026-09"),
        ("b-3", "usr-gowtham-101", "Bills", 4000.0, 1550.0, "2026-09"),
        ("b-4", "usr-gowtham-101", "Transport", 3000.0, 1200.0, "2026-09"),
        ("b-5", "usr-gowtham-101", "Entertainment", 3500.0, 900.0, "2026-09")
    ]
    c.executemany("INSERT INTO budgets VALUES (?,?,?,?,?,?)", budgets_data)

    # Demo Notifications
    notifs_data = [
        ("notif-1", "usr-gowtham-101", "Deposit Received", "₹22,850.00 has been credited to your account 100188492019.", "TRANSACTION", 0, now),
        ("notif-2", "usr-gowtham-101", "Budget Alert", "You have used 85% of your monthly Food budget.", "BUDGET", 0, now)
    ]
    c.executemany("INSERT INTO notifications VALUES (?,?,?,?,?,?,?)", notifs_data)

    # Demo UPI
    c.execute("INSERT INTO upi_profiles VALUES ('usr-gowtham-101', '100188492019', 'gowtham@ggbank', '1234', 'ACTIVE', NULL)")

    # Demo Audit Logs
    c.execute("INSERT INTO audit_logs VALUES ('LOG-1001', 'usr-gowtham-101', NULL, 'USER_REGISTRATION', 'New customer account created for Gowtham NK', ?, 'SUCCESS')", (now,))
    c.execute("INSERT INTO audit_logs VALUES ('LOG-1002', 'usr-admin-999', 'usr-admin-999', 'SYSTEM_INITIALIZED', 'GG BANK Database initialized and primed', ?, 'SUCCESS')", (now,))
    print("[DATABASE] SQLite Database primed successfully with demo records.")

def init_db():
    conn = get_db()
    c = conn.cursor()

    # 1. Users
    c.execute("""
    CREATE TABLE IF NOT EXISTS users (
        userId TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE,
        password TEXT NOT NULL,
        phone TEXT,
        dateOfBirth TEXT,
        gender TEXT,
        address TEXT,
        occupation TEXT,
        role TEXT DEFAULT 'CUSTOMER',
        status TEXT DEFAULT 'ACTIVE',
        panNumber TEXT,
        aadhaarNumber TEXT,
        documents TEXT,
        createdAt TEXT
    )
    """)

    # 2. Accounts
    c.execute("""
    CREATE TABLE IF NOT EXISTS accounts (
        accountId TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        accountNumber TEXT UNIQUE NOT NULL,
        accountType TEXT DEFAULT 'SAVINGS',
        balance REAL DEFAULT 0.0,
        ifscCode TEXT DEFAULT 'GGBN0001234',
        branch TEXT DEFAULT 'Central Tech Branch',
        status TEXT DEFAULT 'ACTIVE',
        createdAt TEXT,
        FOREIGN KEY (userId) REFERENCES users(userId)
    )
    """)

    # 3. Transactions
    c.execute("""
    CREATE TABLE IF NOT EXISTS transactions (
        transactionId TEXT PRIMARY KEY,
        senderAccount TEXT,
        receiverAccount TEXT,
        amount REAL NOT NULL,
        type TEXT NOT NULL,
        category TEXT,
        description TEXT,
        status TEXT DEFAULT 'COMPLETED',
        balanceAfter REAL,
        createdAt TEXT
    )
    """)

    # 4. Beneficiaries
    c.execute("""
    CREATE TABLE IF NOT EXISTS beneficiaries (
        beneficiaryId TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        name TEXT NOT NULL,
        accountNumber TEXT NOT NULL,
        ifscCode TEXT,
        bankName TEXT,
        createdAt TEXT
    )
    """)

    # 5. Budgets
    c.execute("""
    CREATE TABLE IF NOT EXISTS budgets (
        budgetId TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        category TEXT NOT NULL,
        limitAmount REAL NOT NULL,
        spent REAL DEFAULT 0.0,
        month TEXT
    )
    """)

    # 6. Loans
    c.execute("""
    CREATE TABLE IF NOT EXISTS loans (
        loanId TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        accountNumber TEXT NOT NULL,
        loanType TEXT NOT NULL,
        requestedAmount REAL NOT NULL,
        monthlyIncome REAL,
        tenure INTEGER,
        interestRate REAL,
        estimatedEMI REAL,
        totalInterest REAL,
        totalRepayment REAL,
        purpose TEXT,
        status TEXT DEFAULT 'PENDING',
        adminRemarks TEXT,
        createdAt TEXT,
        approvedAt TEXT
    )
    """)

    # 7. Notifications
    c.execute("""
    CREATE TABLE IF NOT EXISTS notifications (
        notificationId TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT DEFAULT 'INFO',
        read INTEGER DEFAULT 0,
        createdAt TEXT
    )
    """)

    # 8. Audit Logs
    c.execute("""
    CREATE TABLE IF NOT EXISTS audit_logs (
        logId TEXT PRIMARY KEY,
        userId TEXT,
        adminId TEXT,
        action TEXT NOT NULL,
        description TEXT,
        timestamp TEXT,
        status TEXT DEFAULT 'SUCCESS'
    )
    """)

    # 9. Officers
    c.execute("""
    CREATE TABLE IF NOT EXISTS officers (
        officerId TEXT PRIMARY KEY,
        employeeId TEXT UNIQUE,
        name TEXT NOT NULL,
        email TEXT UNIQUE,
        phone TEXT,
        department TEXT,
        designation TEXT,
        branch TEXT,
        status TEXT DEFAULT 'ACTIVE',
        assignedCases INTEGER DEFAULT 0,
        password TEXT DEFAULT 'Password@123',
        createdAt TEXT
    )
    """)

    # 10. UPI Profiles
    c.execute("""
    CREATE TABLE IF NOT EXISTS upi_profiles (
        userId TEXT PRIMARY KEY,
        accountNumber TEXT,
        upiId TEXT,
        upiPin TEXT DEFAULT '1234',
        status TEXT DEFAULT 'ACTIVE',
        pendingRequest TEXT
    )
    """)

    # 11. Profile Edit Requests
    c.execute("""
    CREATE TABLE IF NOT EXISTS profile_requests (
        requestId TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        customerName TEXT,
        status TEXT DEFAULT 'PENDING_OFFICER_APPROVAL',
        currentDetails TEXT,
        requestedDetails TEXT,
        submittedAt TEXT,
        reviewedBy TEXT
    )
    """)

    # 12. Admin Settings
    c.execute("""
    CREATE TABLE IF NOT EXISTS admin_settings (
        key TEXT PRIMARY KEY,
        value TEXT
    )
    """)

    conn.commit()

    c.execute("SELECT COUNT(*) FROM users")
    count = c.fetchone()[0]
    if count == 0:
        seed_initial_data(c)
        conn.commit()

    conn.close()


class GgBankApiHandler(BaseHTTPRequestHandler):
    def _set_cors(self):
        origin = self.headers.get("Origin", "")
        allowed_origins = [
            "https://ggbank.vercel.app",
            "http://localhost:3000",
            "http://localhost:5173",
            "http://localhost:5500",
            "http://127.0.0.1:5500",
            "http://127.0.0.1:3000",
            "http://localhost:8080"
        ]
        custom_env = os.environ.get("ALLOWED_ORIGINS")
        if custom_env:
            for o in custom_env.split(","):
                if o.strip():
                    allowed_origins.append(o.strip())

        if origin in allowed_origins or (origin and origin.endswith(".vercel.app")):
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Access-Control-Allow-Credentials", "true")
        else:
            self.send_header("Access-Control-Allow-Origin", "*")

        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Origin, Accept, Access-Control-Request-Method, Access-Control-Request-Headers")
        self.send_header("Access-Control-Expose-Headers", "Origin, Content-Type, Accept, Authorization")
        self.send_header("Access-Control-Max-Age", "86400")


    def do_OPTIONS(self):
        self.send_response(200)
        self._set_cors()
        self.end_headers()

    def _read_body(self):
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length > 0:
            raw = self.rfile.read(content_length).decode("utf-8")
            try:
                return json.loads(raw)
            except Exception:
                return {}
        return {}

    def _send_json(self, status_code, payload):
        self.send_response(status_code)
        self._set_cors()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.end_headers()
        self.wfile.write(json.dumps(payload, ensure_ascii=False).encode("utf-8"))

    def _send_success(self, data, message="Operation completed successfully", status=200):
        self._send_json(status, {"success": True, "message": message, "data": data})

    def _send_error(self, message, status=400):
        self._send_json(status, {"success": False, "message": message, "error": message})

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        if path.startswith("/api"):
            path = path[4:]  # Strip /api prefix
        if not path.startswith("/"):
            path = "/" + path

        conn = get_db()
        c = conn.cursor()

        try:
            # 1. /auth/login status / verification
            if path == "/system_health" or path == "/health":
                self._send_success({"status": "ONLINE", "database": "SQLite", "engine": "GG-BANK-V2"})
                return

            # 2. /users/me
            if path == "/users/me":
                c.execute("SELECT * FROM users ORDER BY createdAt DESC LIMIT 1")
                row = c.fetchone()
                if row:
                    self._send_success(dict(row))
                else:
                    self._send_error("No user found", 404)
                return

            # 3. /accounts/user/{userId}
            if path.startswith("/accounts/user/"):
                uid = path.split("/")[-1]
                c.execute("SELECT * FROM accounts WHERE userId = ?", (uid,))
                acc = c.fetchone()
                if not acc:
                    # Fallback to first active account
                    c.execute("SELECT * FROM accounts LIMIT 1")
                    acc = c.fetchone()
                self._send_success(dict(acc) if acc else None)
                return

            # 4. /transactions/account/{accountNumber}
            if path.startswith("/transactions/account/"):
                acc_num = path.split("/")[-1]
                c.execute("SELECT * FROM transactions WHERE senderAccount = ? OR receiverAccount = ? ORDER BY createdAt DESC", (acc_num, acc_num))
                txns = [dict(r) for r in c.fetchall()]
                self._send_success(txns)
                return

            # 5. /transactions
            if path == "/transactions":
                c.execute("SELECT * FROM transactions ORDER BY createdAt DESC")
                self._send_success([dict(r) for r in c.fetchall()])
                return

            # 6. /beneficiaries
            if path == "/beneficiaries":
                c.execute("SELECT * FROM beneficiaries ORDER BY createdAt DESC")
                self._send_success([dict(r) for r in c.fetchall()])
                return

            # 7. /loans
            if path == "/loans":
                c.execute("SELECT * FROM loans ORDER BY createdAt DESC")
                self._send_success([dict(r) for r in c.fetchall()])
                return

            # 8. /budgets
            if path == "/budgets":
                c.execute("SELECT * FROM budgets")
                self._send_success([dict(r) for r in c.fetchall()])
                return

            # 9. /notifications and /admin/notifications
            if path in ("/notifications", "/admin/notifications"):
                c.execute("SELECT * FROM notifications ORDER BY createdAt DESC")
                self._send_success([dict(r) for r in c.fetchall()])
                return

            # 10. /insights or /insights/{userId}
            if path.startswith("/insights"):
                c.execute("SELECT amount, type FROM transactions")
                total_income = 0.0
                total_expenses = 0.0
                for row in c.fetchall():
                    amt = float(row["amount"])
                    t_type = row["type"]
                    if t_type == "DEPOSIT":
                        total_income += amt
                    elif t_type in ("TRANSFER", "WITHDRAWAL", "BILL_PAYMENT"):
                        total_expenses += amt
                savings = max(0.0, total_income - total_expenses)
                rate = round((savings / total_income * 100), 1) if total_income > 0 else 0.0
                insights_data = {
                    "totalIncome": total_income,
                    "totalExpenses": total_expenses,
                    "savings": savings,
                    "savingsRate": rate,
                    "avgMonthlySpending": round(total_expenses / 2, 2),
                    "highestCategory": "Food & Dining",
                    "insights": [
                        f"Your savings rate is healthy at {rate}% this month.",
                        "Direct multi-device database connectivity is active and persistent.",
                        "Food & Utilities remain your most active ledger transactions."
                    ]
                }
                self._send_success(insights_data)
                return

            # 11. /upi/my-upi
            if path == "/upi/my-upi":
                c.execute("SELECT * FROM upi_profiles LIMIT 1")
                row = c.fetchone()
                if row:
                    self._send_success(dict(row))
                else:
                    self._send_success({"upiId": "gowtham@ggbank", "status": "ACTIVE"})
                return

            # 12. /upi/requests
            if path == "/upi/requests":
                c.execute("SELECT * FROM upi_profiles WHERE pendingRequest IS NOT NULL")
                rows = [dict(r) for r in c.fetchall()]
                self._send_success(rows)
                return

            # 13. /admin/dashboard or /admin/dashboard/overview or /admin/stats
            if path in ("/admin/dashboard", "/admin/stats", "/admin/dashboard/overview"):
                c.execute("SELECT COUNT(*) FROM users WHERE role = 'CUSTOMER'")
                total_customers = c.fetchone()[0]
                c.execute("SELECT COUNT(*), COALESCE(SUM(balance), 0) FROM accounts")
                total_accounts, total_balance = c.fetchone()
                c.execute("SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type = 'DEPOSIT'")
                total_deposits = c.fetchone()[0]
                c.execute("SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type = 'WITHDRAWAL'")
                total_withdrawals = c.fetchone()[0]
                c.execute("SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type = 'TRANSFER'")
                total_transfers = c.fetchone()[0]
                c.execute("SELECT COUNT(*) FROM loans WHERE status = 'PENDING'")
                pending_loans = c.fetchone()[0]
                c.execute("SELECT COUNT(*) FROM accounts WHERE status = 'ACTIVE'")
                active_accounts = c.fetchone()[0]
                c.execute("SELECT COUNT(*) FROM accounts WHERE status = 'BLOCKED'")
                blocked_accounts = c.fetchone()[0]

                stats = {
                    "totalCustomers": total_customers,
                    "totalAccounts": total_accounts,
                    "totalBalance": total_balance,
                    "totalDeposits": total_deposits,
                    "totalWithdrawals": total_withdrawals,
                    "totalTransfers": total_transfers,
                    "pendingLoans": pending_loans,
                    "activeAccounts": active_accounts,
                    "blockedAccounts": blocked_accounts
                }

                c.execute("SELECT * FROM transactions ORDER BY createdAt DESC LIMIT 5")
                recent_txns = [dict(r) for r in c.fetchall()]
                c.execute("SELECT * FROM loans WHERE status = 'PENDING' LIMIT 5")
                pending_loans_list = [dict(r) for r in c.fetchall()]

                overview_data = {
                    "stats": stats,
                    "recentTransactions": recent_txns,
                    "pendingLoans": pending_loans_list
                }

                if path == "/admin/dashboard/overview":
                    self._send_success(overview_data)
                elif path == "/admin/dashboard":
                    # Support both flat stats and nested stats/overview for all frontend callers
                    combined = dict(stats)
                    combined["stats"] = stats
                    combined["recentTransactions"] = recent_txns
                    combined["pendingLoans"] = pending_loans_list
                    self._send_success(combined)
                else:
                    self._send_success(stats)
                return

            # 14. /admin/customers
            if path == "/admin/customers":
                c.execute("""
                SELECT u.*, a.accountId, a.accountNumber, a.accountType, a.balance, a.ifscCode, a.branch,
                       COALESCE(a.status, u.status) as accountStatus
                FROM users u
                LEFT JOIN accounts a ON u.userId = a.userId
                WHERE u.role = 'CUSTOMER'
                ORDER BY u.createdAt DESC
                """)
                custs = []
                for r in c.fetchall():
                    row = dict(r)
                    pan = row.get("panNumber") or "ABCDE1234F"
                    dl = row.get("dlNumber") or "DL-1420110012345"
                    aadhaar = row.get("aadhaarNumber") or "2345 6789 0123"
                    if "documents" not in row or not row["documents"]:
                        row["documents"] = {
                            "panNumber": pan,
                            "dlNumber": dl,
                            "aadhaarNumber": aadhaar
                        }
                    elif isinstance(row["documents"], str):
                        try:
                            row["documents"] = json.loads(row["documents"])
                        except Exception:
                            row["documents"] = {"panNumber": pan, "dlNumber": dl, "aadhaarNumber": aadhaar}
                    custs.append(row)
                self._send_success(custs)
                return

            # 15. /admin/customers/{userId}
            if path.startswith("/admin/customers/") and not any(k in path for k in ("/status", "/activate", "/deactivate", "/block", "/edit")):
                user_id = path.split("/")[3]
                c.execute("SELECT * FROM users WHERE userId = ?", (user_id,))
                user = c.fetchone()
                if not user:
                    self._send_error("Customer not found", 404)
                    return
                c.execute("SELECT * FROM accounts WHERE userId = ?", (user_id,))
                acc = c.fetchone()
                c.execute("SELECT * FROM transactions WHERE senderAccount = ? OR receiverAccount = ? ORDER BY createdAt DESC LIMIT 10",
                          (acc["accountNumber"] if acc else "", acc["accountNumber"] if acc else ""))
                txns = [dict(r) for r in c.fetchall()]
                c.execute("SELECT * FROM loans WHERE userId = ?", (user_id,))
                loans = [dict(r) for r in c.fetchall()]

                self._send_success({
                    "user": dict(user),
                    "account": dict(acc) if acc else None,
                    "totalTransactionsCount": len(txns),
                    "recentTransactions": txns,
                    "loans": loans
                })
                return

            # 16. /admin/accounts
            if path == "/admin/accounts":
                c.execute("""
                SELECT a.*, u.name as customerName, u.email as customerEmail, u.phone as customerPhone
                FROM accounts a
                LEFT JOIN users u ON a.userId = u.userId
                ORDER BY a.createdAt DESC
                """)
                accs = [dict(r) for r in c.fetchall()]
                self._send_success(accs)
                return

            # 17. /admin/transactions
            if path == "/admin/transactions":
                c.execute("SELECT * FROM transactions ORDER BY createdAt DESC")
                self._send_success([dict(r) for r in c.fetchall()])
                return

            # 18. /admin/deposits
            if path == "/admin/deposits":
                c.execute("SELECT * FROM transactions WHERE type = 'DEPOSIT' ORDER BY createdAt DESC")
                self._send_success([dict(r) for r in c.fetchall()])
                return

            # 19. /admin/withdrawals
            if path == "/admin/withdrawals":
                c.execute("SELECT * FROM transactions WHERE type = 'WITHDRAWAL' ORDER BY createdAt DESC")
                self._send_success([dict(r) for r in c.fetchall()])
                return

            # 20. /admin/transfers
            if path == "/admin/transfers":
                c.execute("SELECT * FROM transactions WHERE type = 'TRANSFER' ORDER BY createdAt DESC")
                self._send_success([dict(r) for r in c.fetchall()])
                return

            # 21. /admin/loans
            if path == "/admin/loans":
                c.execute("SELECT * FROM loans ORDER BY createdAt DESC")
                self._send_success([dict(r) for r in c.fetchall()])
                return

            # 22. /admin/reports
            if path.startswith("/admin/reports"):
                c.execute("SELECT * FROM users WHERE role = 'CUSTOMER'")
                custs = [dict(r) for r in c.fetchall()]
                c.execute("SELECT * FROM transactions ORDER BY createdAt DESC")
                txns = [dict(r) for r in c.fetchall()]
                c.execute("SELECT * FROM loans ORDER BY createdAt DESC")
                loans = [dict(r) for r in c.fetchall()]
                c.execute("SELECT COALESCE(SUM(balance), 0) FROM accounts")
                total_vault = c.fetchone()[0]

                deposits = [t for t in txns if t["type"] == "DEPOSIT"]
                withdrawals = [t for t in txns if t["type"] == "WITHDRAWAL"]
                transfers = [t for t in txns if t["type"] == "TRANSFER"]

                report = {
                    "customerReport": {"totalCustomers": len(custs), "customersList": custs},
                    "transactionReport": txns,
                    "depositReport": {"totalDepositsAmount": sum(t["amount"] for t in deposits), "count": len(deposits), "items": deposits},
                    "withdrawalReport": {"totalWithdrawalsAmount": sum(t["amount"] for t in withdrawals), "count": len(withdrawals), "items": withdrawals},
                    "transferReport": {"totalTransfersAmount": sum(t["amount"] for t in transfers), "count": len(transfers), "items": transfers},
                    "loanReport": {"items": loans, "totalLoansApproved": sum(l["requestedAmount"] for l in loans if l["status"] == "APPROVED")},
                    "financialSummary": {
                        "totalVaultBalance": total_vault,
                        "totalDeposits": sum(t["amount"] for t in deposits),
                        "totalWithdrawals": sum(t["amount"] for t in withdrawals),
                        "totalTransfers": sum(t["amount"] for t in transfers)
                    }
                }
                self._send_success(report)
                return

            # 23. /admin/notifications
            if path == "/admin/notifications":
                c.execute("SELECT * FROM notifications ORDER BY createdAt DESC")
                self._send_success([dict(r) for r in c.fetchall()])
                return

            # 24. /admin/audit-logs
            if path == "/admin/audit-logs":
                c.execute("SELECT * FROM audit_logs ORDER BY timestamp DESC")
                self._send_success([dict(r) for r in c.fetchall()])
                return

            # 25. /admin/profile
            if path == "/admin/profile":
                c.execute("SELECT * FROM users WHERE role = 'ADMIN' LIMIT 1")
                admin = c.fetchone()
                self._send_success(dict(admin) if admin else {})
                return

            # 26. /admin/settings
            if path == "/admin/settings":
                settings = {
                    "bankName": "GG BANK",
                    "bankBranch": "Central Tech Branch",
                    "ifscCode": "GGBN0001234",
                    "currency": "INR (₹)",
                    "emailNotifications": True,
                    "smsAlerts": True,
                    "twoFactorAuth": True,
                    "maxLoginAttempts": 5,
                    "sessionTimeoutMinutes": 15
                }
                self._send_success(settings)
                return

            # 27. /admin/officers
            if path == "/admin/officers":
                c.execute("SELECT * FROM officers ORDER BY createdAt DESC")
                self._send_success([dict(r) for r in c.fetchall()])
                return

            # 28. /profile-requests or /profile/requests
            if path in ("/profile-requests", "/profile/requests"):
                c.execute("SELECT * FROM profile_requests ORDER BY submittedAt DESC")
                self._send_success([dict(r) for r in c.fetchall()])
                return

            # Unmatched GET
            self._send_error(f"Endpoint GET {path} not found", 404)

        except Exception as e:
            self._send_error(f"Internal server error: {str(e)}", 500)
        finally:
            conn.close()

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path
        if path.startswith("/api"):
            path = path[4:]
        if not path.startswith("/"):
            path = "/" + path

        body = self._read_body()
        conn = get_db()
        c = conn.cursor()
        now = datetime.utcnow().isoformat() + "Z"

        try:
            # 1. /auth/login
            if path in ("/auth/login", "/login"):
                email = (body.get("email") or "").strip().lower()
                acc_num = (body.get("accountNumber") or "").strip()
                password = body.get("password")

                user = None
                account = None

                if email:
                    c.execute("SELECT * FROM users WHERE LOWER(email) = ?", (email,))
                    user = c.fetchone()
                    if user:
                        c.execute("SELECT * FROM accounts WHERE userId = ?", (user["userId"],))
                        account = c.fetchone()
                elif acc_num:
                    c.execute("SELECT * FROM accounts WHERE accountNumber = ?", (acc_num,))
                    account = c.fetchone()
                    if account:
                        c.execute("SELECT * FROM users WHERE userId = ?", (account["userId"],))
                        user = c.fetchone()

                if not user:
                    self._send_error(f"No registered account found with {'email ' + email if email else 'account number ' + acc_num}.", 404)
                    return

                if password and user["password"] != password:
                    self._send_error("Incorrect password. Please verify your password and try again.", 401)
                    return

                if user["status"] == "BLOCKED":
                    self._send_error("Account is blocked. Please contact GG BANK administration.", 403)
                    return

                user_dict = dict(user)
                acc_dict = dict(account) if account else None

                # Log audit
                c.execute("INSERT INTO audit_logs VALUES (?, ?, NULL, 'LOGIN', ?, ?, 'SUCCESS')",
                          (f"LOG-{int(datetime.utcnow().timestamp())}", user_dict["userId"], f"Customer logged in: {user_dict['email']}", now))
                conn.commit()

                self._send_success({
                    "token": f"jwt-{user_dict['userId']}",
                    "user": user_dict,
                    "account": acc_dict
                }, "Authentication successful")
                return

            # 2. /users/register
            if path in ("/users/register", "/auth/register"):
                email = (body.get("email") or "").strip().lower()
                pan = (body.get("panNumber") or "").strip().upper()
                aadhaar = (body.get("aadhaarNumber") or "").strip()

                # Check duplicate email
                c.execute("SELECT userId FROM users WHERE LOWER(email) = ?", (email,))
                if c.fetchone():
                    self._send_error(f"An account with email {email} already exists.", 409)
                    return

                # Check duplicate PAN
                if pan:
                    c.execute("SELECT userId, name FROM users WHERE panNumber = ?", (pan,))
                    dup = c.fetchone()
                    if dup:
                        self._send_error(f"PAN {pan} is already registered to {dup['name']}.", 409)
                        return

                user_id = f"usr-{int(datetime.utcnow().timestamp()) % 1000000}"
                # Generate unique 12-digit account number starting with 100188
                import random
                acc_num = f"100188{random.randint(100000, 999999)}"

                new_user = (
                    user_id,
                    body.get("name", "New Customer"),
                    email,
                    body.get("password", "Password@123"),
                    body.get("phone", ""),
                    body.get("dateOfBirth", ""),
                    body.get("gender", ""),
                    body.get("address", ""),
                    body.get("occupation", ""),
                    "CUSTOMER",
                    "ACTIVE",
                    pan,
                    aadhaar,
                    json.dumps({
                        "panDoc": body.get("panDoc", ""),
                        "aadhaarDoc": body.get("aadhaarDoc", ""),
                        "addressProofDoc": body.get("addressProofDoc", ""),
                        "photoDoc": body.get("photoDoc", ""),
                        "signatureDoc": body.get("signatureDoc", "")
                    }),
                    now
                )
                c.execute("INSERT INTO users VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", new_user)

                acc_id = f"acc-{user_id}"
                acc_type = body.get("accountType", "SAVINGS")
                new_acc = (
                    acc_id,
                    user_id,
                    acc_num,
                    acc_type,
                    0.00,
                    "GGBN0001234",
                    "Central Tech Branch",
                    "ACTIVE",
                    now
                )
                c.execute("INSERT INTO accounts VALUES (?,?,?,?,?,?,?,?,?)", new_acc)

                # Initialize UPI Profile
                c.execute("INSERT INTO upi_profiles VALUES (?, ?, ?, '1234', 'ACTIVE', NULL)",
                          (user_id, acc_num, f"{email.split('@')[0]}@ggbank"))

                # Audit log
                c.execute("INSERT INTO audit_logs VALUES (?, ?, NULL, 'USER_REGISTRATION', ?, ?, 'SUCCESS')",
                          (f"LOG-{int(datetime.utcnow().timestamp())}", user_id, f"New customer account created for {body.get('name')}", now))

                conn.commit()

                c.execute("SELECT * FROM users WHERE userId = ?", (user_id,))
                user_res = dict(c.fetchone())
                c.execute("SELECT * FROM accounts WHERE accountId = ?", (acc_id,))
                acc_res = dict(c.fetchone())

                self._send_success({"user": user_res, "account": acc_res}, "Customer registered successfully", 201)
                return

            # 3. /transfer
            if path == "/transfer":
                sender_acc_num = body.get("senderAccount")
                receiver_acc_num = body.get("receiverAccount")
                amount = float(body.get("amount", 0))

                if sender_acc_num == receiver_acc_num:
                    self._send_error("Cannot transfer money to the same account", 400)
                    return
                if amount <= 0:
                    self._send_error("Transfer amount must be greater than zero", 400)
                    return

                c.execute("SELECT * FROM accounts WHERE accountNumber = ?", (sender_acc_num,))
                sender_acc = c.fetchone()
                if not sender_acc or sender_acc["status"] != "ACTIVE":
                    self._send_error("Sender account is invalid or inactive", 400)
                    return

                if sender_acc["balance"] < amount:
                    self._send_error("Insufficient balance in sender account", 400)
                    return

                c.execute("SELECT * FROM accounts WHERE accountNumber = ?", (receiver_acc_num,))
                receiver_acc = c.fetchone()

                new_sender_bal = sender_acc["balance"] - amount
                c.execute("UPDATE accounts SET balance = ? WHERE accountNumber = ?", (new_sender_bal, sender_acc_num))

                if receiver_acc:
                    new_rec_bal = receiver_acc["balance"] + amount
                    c.execute("UPDATE accounts SET balance = ? WHERE accountNumber = ?", (new_rec_bal, receiver_acc_num))

                txn_id = f"TXN-2026-{int(datetime.utcnow().timestamp()) % 1000000}"
                c.execute("""
                INSERT INTO transactions VALUES (?, ?, ?, ?, 'TRANSFER', 'Transfer', ?, 'COMPLETED', ?, ?)
                """, (txn_id, sender_acc_num, receiver_acc_num, amount, body.get("description", f"Transfer to {receiver_acc_num}"), new_sender_bal, now))

                c.execute("INSERT INTO audit_logs VALUES (?, ?, NULL, 'TRANSFER', ?, ?, 'SUCCESS')",
                          (f"LOG-{int(datetime.utcnow().timestamp())}", sender_acc["userId"], f"Transferred ₹{amount} to {receiver_acc_num}", now))

                conn.commit()

                c.execute("SELECT * FROM transactions WHERE transactionId = ?", (txn_id,))
                self._send_success(dict(c.fetchone()), "Transfer completed successfully")
                return

            # 4. /deposit
            if path in ("/deposit", "/admin/deposits/credit", "/admin/deposit"):
                acc_num = body.get("accountNumber")
                amount = float(body.get("amount", 0))

                if amount <= 0:
                    self._send_error("Deposit amount must be greater than zero", 400)
                    return

                c.execute("SELECT * FROM accounts WHERE accountNumber = ?", (acc_num,))
                acc = c.fetchone()
                if not acc:
                    self._send_error(f"Account number {acc_num} not found", 404)
                    return

                new_bal = acc["balance"] + amount
                c.execute("UPDATE accounts SET balance = ? WHERE accountNumber = ?", (new_bal, acc_num))

                txn_id = f"TXN-2026-{int(datetime.utcnow().timestamp()) % 1000000}"
                c.execute("""
                INSERT INTO transactions VALUES (?, ?, ?, ?, 'DEPOSIT', 'Deposit', ?, 'COMPLETED', ?, ?)
                """, (txn_id, body.get("paymentMethod", "ONLINE-DEP"), acc_num, amount, body.get("description", "Direct Account Deposit"), new_bal, now))

                conn.commit()
                c.execute("SELECT * FROM transactions WHERE transactionId = ?", (txn_id,))
                self._send_success(dict(c.fetchone()), f"Deposited ₹{amount} successfully")
                return

            # 5. /withdraw
            if path == "/withdraw":
                acc_num = body.get("accountNumber")
                amount = float(body.get("amount", 0))

                if amount <= 0:
                    self._send_error("Withdrawal amount must be greater than zero", 400)
                    return

                c.execute("SELECT * FROM accounts WHERE accountNumber = ?", (acc_num,))
                acc = c.fetchone()
                if not acc:
                    self._send_error("Account not found", 404)
                    return

                if acc["balance"] < amount:
                    self._send_error("Insufficient balance for withdrawal", 400)
                    return

                new_bal = acc["balance"] - amount
                c.execute("UPDATE accounts SET balance = ? WHERE accountNumber = ?", (new_bal, acc_num))

                txn_id = f"TXN-2026-{int(datetime.utcnow().timestamp()) % 1000000}"
                c.execute("""
                INSERT INTO transactions VALUES (?, ?, 'SELF-CASH', ?, 'WITHDRAWAL', 'Cash', ?, 'COMPLETED', ?, ?)
                """, (txn_id, acc_num, amount, body.get("description", "Cash Withdrawal"), new_bal, now))

                conn.commit()
                c.execute("SELECT * FROM transactions WHERE transactionId = ?", (txn_id,))
                self._send_success(dict(c.fetchone()), "Withdrawal processed successfully")
                return

            # 6. /bills/pay
            if path == "/bills/pay":
                acc_num = body.get("accountNumber")
                amount = float(body.get("amount", 0))

                c.execute("SELECT * FROM accounts WHERE accountNumber = ?", (acc_num,))
                acc = c.fetchone()
                if not acc:
                    self._send_error("Account not found", 404)
                    return

                if acc["balance"] < amount:
                    self._send_error("Insufficient balance to pay bill", 400)
                    return

                new_bal = acc["balance"] - amount
                c.execute("UPDATE accounts SET balance = ? WHERE accountNumber = ?", (new_bal, acc_num))

                txn_id = f"TXN-2026-{int(datetime.utcnow().timestamp()) % 1000000}"
                desc = f"{body.get('category')} Bill - {body.get('provider')} (ID: {body.get('consumerNumber')})"
                c.execute("""
                INSERT INTO transactions VALUES (?, ?, ?, ?, 'BILL_PAYMENT', 'Bills', ?, 'COMPLETED', ?, ?)
                """, (txn_id, acc_num, f"{body.get('category', 'BILL').upper()}-PAY", amount, desc, new_bal, now))

                conn.commit()
                c.execute("SELECT * FROM transactions WHERE transactionId = ?", (txn_id,))
                self._send_success(dict(c.fetchone()), "Bill payment completed successfully")
                return

            # 7. /beneficiaries
            if path == "/beneficiaries":
                ben_id = f"ben-{int(datetime.utcnow().timestamp()) % 1000000}"
                c.execute("""
                INSERT INTO beneficiaries VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (ben_id, body.get("userId", "usr-gowtham-101"), body.get("name"), body.get("accountNumber"),
                      body.get("ifscCode"), body.get("bankName"), now))
                conn.commit()
                self._send_success({"beneficiaryId": ben_id, **body}, "Beneficiary added successfully")
                return

            # 8. /loans
            if path == "/loans":
                loan_id = f"LOAN-{int(datetime.utcnow().timestamp()) % 1000000}"
                c.execute("""
                INSERT INTO loans VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', 'Application submitted for review', ?, NULL)
                """, (
                    loan_id,
                    body.get("userId", "usr-gowtham-101"),
                    body.get("accountNumber"),
                    body.get("loanType", "Personal Loan"),
                    float(body.get("requestedAmount", 0)),
                    float(body.get("monthlyIncome", 0)),
                    int(body.get("tenure", 12)),
                    float(body.get("interestRate", 10.5)),
                    float(body.get("estimatedEMI", 0)),
                    float(body.get("totalInterest", 0)),
                    float(body.get("totalRepayment", 0)),
                    body.get("purpose", ""),
                    now
                ))
                conn.commit()
                c.execute("SELECT * FROM loans WHERE loanId = ?", (loan_id,))
                self._send_success(dict(c.fetchone()), "Loan application submitted")
                return

            # 9. /qr/validate
            if path == "/qr/validate":
                qr_data = body.get("qrData", "")
                target_acc = None
                # Check for 11 or 12 digit account number
                match = re.search(r"\b\d{11,12}\b", qr_data)
                if match:
                    target_acc = match.group()

                if not target_acc:
                    self._send_error("Unrecognized QR Code format", 400)
                    return

                c.execute("SELECT * FROM accounts WHERE accountNumber = ?", (target_acc,))
                acc = c.fetchone()
                if not acc:
                    self._send_error("Account associated with QR code not found in GG BANK", 404)
                    return

                c.execute("SELECT name FROM users WHERE userId = ?", (acc["userId"],))
                u = c.fetchone()
                res = {
                    "accountNumber": acc["accountNumber"],
                    "accountType": acc["accountType"],
                    "status": acc["status"],
                    "name": u["name"] if u else "GG Bank Customer",
                    "qrIdentifier": f"QR-VERIFIED-{acc['accountNumber']}",
                    "verified": True
                }
                self._send_success(res, "QR verified successfully")
                return

            # 10. /qr/pay
            if path == "/qr/pay":
                sender_acc_num = body.get("senderAccount")
                receiver_acc_num = body.get("receiverAccount")
                amount = float(body.get("amount", 0))

                c.execute("SELECT * FROM accounts WHERE accountNumber = ?", (sender_acc_num,))
                sender_acc = c.fetchone()
                c.execute("SELECT * FROM accounts WHERE accountNumber = ?", (receiver_acc_num,))
                receiver_acc = c.fetchone()

                if not sender_acc or not receiver_acc:
                    self._send_error("Account not found for QR payment", 404)
                    return
                if sender_acc["balance"] < amount:
                    self._send_error("Insufficient balance in account", 400)
                    return

                new_s_bal = sender_acc["balance"] - amount
                new_r_bal = receiver_acc["balance"] + amount

                c.execute("UPDATE accounts SET balance = ? WHERE accountNumber = ?", (new_s_bal, sender_acc_num))
                c.execute("UPDATE accounts SET balance = ? WHERE accountNumber = ?", (new_r_bal, receiver_acc_num))

                txn_id = f"TXN-2026-{int(datetime.utcnow().timestamp()) % 1000000}"
                c.execute("""
                INSERT INTO transactions VALUES (?, ?, ?, ?, 'TRANSFER', 'Transfer', ?, 'COMPLETED', ?, ?)
                """, (txn_id, sender_acc_num, receiver_acc_num, amount, body.get("note", "Instant QR Scan & Pay"), new_s_bal, now))

                conn.commit()
                c.execute("SELECT * FROM transactions WHERE transactionId = ?", (txn_id,))
                self._send_success(dict(c.fetchone()), "QR Payment completed successfully", 201)
                return

            # 11. /profile-requests
            if path in ("/profile-requests", "/profile/requests"):
                req_id = f"REQ-PROF-{int(datetime.utcnow().timestamp()) % 1000000}"
                c.execute("""
                INSERT INTO profile_requests VALUES (?, ?, ?, 'PENDING_OFFICER_APPROVAL', ?, ?, ?, NULL)
                """, (
                    req_id,
                    body.get("userId"),
                    body.get("customerName", "Customer"),
                    json.dumps(body.get("currentDetails", {})),
                    json.dumps(body.get("requestedDetails", {})),
                    now
                ))
                conn.commit()
                self._send_success({"requestId": req_id}, "Profile edit request submitted")
                return

            # 12. /upi/customize
            if path == "/upi/customize":
                handle = body.get("upiHandle")
                c.execute("UPDATE upi_profiles SET upiId = ? WHERE userId = 'usr-gowtham-101'", (handle,))
                conn.commit()
                self._send_success({"upiId": handle}, "UPI customized")
                return

            # 13. /admin/officers
            if path == "/admin/officers":
                off_id = f"off-{int(datetime.utcnow().timestamp()) % 10000}"
                emp_id = f"EMP-{random.randint(1005, 9999)}"
                c.execute("""
                INSERT INTO officers VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'Password@123', ?)
                """, (
                    off_id,
                    emp_id,
                    body.get("name"),
                    body.get("email"),
                    body.get("phone", "+91 98765 00000"),
                    body.get("department", "LOAN"),
                    body.get("designation", "Banking Officer"),
                    body.get("branch", "Central Tech Branch"),
                    body.get("status", "ACTIVE"),
                    now
                ))
                conn.commit()
                c.execute("SELECT * FROM officers WHERE officerId = ?", (off_id,))
                self._send_success(dict(c.fetchone()), "Officer registered successfully")
                return

            # 14. /admin/clear-all-data
            if path == "/admin/clear-all-data":
                auth_header = self.headers.get("Authorization", "")
                if not auth_header or not ("admin" in auth_header.lower() or "bearer" in auth_header.lower()):
                    self._send_error("Forbidden: Administrative authorization required to clear database records", 403)
                    return

                c.execute("DELETE FROM transactions")
                c.execute("DELETE FROM loans")
                c.execute("DELETE FROM beneficiaries")
                c.execute("DELETE FROM budgets")
                c.execute("DELETE FROM profile_requests")
                c.execute("DELETE FROM notifications")
                c.execute("DELETE FROM users WHERE role != 'ADMIN'")
                c.execute("DELETE FROM accounts WHERE accountType != 'TREASURY'")
                conn.commit()
                self._send_success({"cleared": True}, "All customer records and transactions wiped successfully")
                return

            # 15. /admin/reset-default-data
            if path == "/admin/reset-default-data":
                auth_header = self.headers.get("Authorization", "")
                if not auth_header or not ("admin" in auth_header.lower() or "bearer" in auth_header.lower()):
                    self._send_error("Forbidden: Administrative authorization required to reset database records", 403)
                    return

                c.execute("DELETE FROM users")
                c.execute("DELETE FROM accounts")
                c.execute("DELETE FROM transactions")
                c.execute("DELETE FROM beneficiaries")
                c.execute("DELETE FROM budgets")
                c.execute("DELETE FROM loans")
                c.execute("DELETE FROM notifications")
                c.execute("DELETE FROM audit_logs")
                c.execute("DELETE FROM officers")
                c.execute("DELETE FROM upi_profiles")
                c.execute("DELETE FROM profile_requests")
                seed_initial_data(c)
                conn.commit()
                self._send_success({"reset": True}, "Default clean records restored successfully")
                return

            self._send_error(f"Endpoint POST {path} not found", 404)

        except Exception as e:
            self._send_error(f"Internal server error: {str(e)}", 500)
        finally:
            conn.close()

    def do_PUT(self):
        parsed = urlparse(self.path)
        path = parsed.path
        if path.startswith("/api"):
            path = path[4:]
        if not path.startswith("/"):
            path = "/" + path

        body = self._read_body()
        conn = get_db()
        c = conn.cursor()
        now = datetime.utcnow().isoformat() + "Z"

        try:
            # 1. /admin/customers/{userId}/status or activate/deactivate/block
            if path.startswith("/admin/customers/") and any(k in path for k in ("/activate", "/deactivate", "/block", "/status")):
                user_id = path.split("/")[3]
                new_status = "ACTIVE"
                if path.endswith("/activate"): new_status = "ACTIVE"
                elif path.endswith("/deactivate"): new_status = "INACTIVE"
                elif path.endswith("/block"): new_status = "BLOCKED"
                elif body.get("status"): new_status = body.get("status").upper()

                c.execute("UPDATE users SET status = ? WHERE userId = ?", (new_status, user_id))
                c.execute("UPDATE accounts SET status = ? WHERE userId = ?", (new_status, user_id))
                conn.commit()

                c.execute("SELECT * FROM users WHERE userId = ?", (user_id,))
                self._send_success(dict(c.fetchone()), f"Customer status updated to {new_status}")
                return

            # 2. /admin/customers/{userId}/edit
            if path.startswith("/admin/customers/") and (path.endswith("/edit") or "/edit" in path):
                user_id = path.split("/")[3]
                updates = []
                params = []
                for k in ("name", "email", "phone", "dateOfBirth", "address", "status"):
                    if k in body:
                        updates.append(f"{k} = ?")
                        params.append(body[k])
                if updates:
                    params.append(user_id)
                    c.execute(f"UPDATE users SET {', '.join(updates)} WHERE userId = ?", params)
                    conn.commit()

                c.execute("SELECT * FROM users WHERE userId = ?", (user_id,))
                self._send_success(dict(c.fetchone()), "Customer details updated successfully")
                return

            # 3. /admin/loans/{loanId}/approve
            if path.startswith("/admin/loans/") and path.endswith("/approve"):
                loan_id = path.split("/")[3]
                c.execute("SELECT * FROM loans WHERE loanId = ?", (loan_id,))
                loan = c.fetchone()
                if not loan:
                    self._send_error("Loan not found", 404)
                    return

                remarks = body.get("remarks", "Approved by Loan Officer")
                c.execute("UPDATE loans SET status = 'APPROVED', adminRemarks = ?, approvedAt = ? WHERE loanId = ?",
                          (remarks, now, loan_id))

                # Disburse funds to user account
                c.execute("SELECT * FROM accounts WHERE accountNumber = ?", (loan["accountNumber"],))
                acc = c.fetchone()
                if acc:
                    new_bal = acc["balance"] + loan["requestedAmount"]
                    c.execute("UPDATE accounts SET balance = ? WHERE accountNumber = ?", (new_bal, loan["accountNumber"]))
                    txn_id = f"TXN-2026-{int(datetime.utcnow().timestamp()) % 1000000}"
                    c.execute("""
                    INSERT INTO transactions VALUES (?, 'GG-BANK-LOAN-DISBURSAL', ?, ?, 'LOAN_DISBURSEMENT', 'Loan', ?, 'COMPLETED', ?, ?)
                    """, (txn_id, acc["accountNumber"], loan["requestedAmount"], f"Disbursement for {loan['loanType']} ({loan_id})", new_bal, now))

                conn.commit()
                c.execute("SELECT * FROM loans WHERE loanId = ?", (loan_id,))
                self._send_success(dict(c.fetchone()), "Loan approved and funds credited successfully")
                return

            # 4. /admin/loans/{loanId}/reject
            if path.startswith("/admin/loans/") and path.endswith("/reject"):
                loan_id = path.split("/")[3]
                remarks = body.get("remarks", "Declined per credit guidelines")
                c.execute("UPDATE loans SET status = 'REJECTED', adminRemarks = ? WHERE loanId = ?", (remarks, loan_id))
                conn.commit()
                c.execute("SELECT * FROM loans WHERE loanId = ?", (loan_id,))
                self._send_success(dict(c.fetchone()), "Loan application rejected")
                return

            # 5. /notifications/read-all or /admin/notifications/read-all
            if "notifications/read-all" in path:
                c.execute("UPDATE notifications SET read = 1")
                conn.commit()
                self._send_success({}, "All notifications marked as read")
                return

            # 6. /notifications/{id}/read
            if "/notifications/" in path and path.endswith("/read"):
                notif_id = path.split("/")[2] if path.startswith("/notifications/") else path.split("/")[3]
                c.execute("UPDATE notifications SET read = 1 WHERE notificationId = ?", (notif_id,))
                conn.commit()
                self._send_success({}, "Notification marked as read")
                return

            self._send_error(f"Endpoint PUT {path} not found", 404)

        except Exception as e:
            self._send_error(f"Internal server error: {str(e)}", 500)
        finally:
            conn.close()

    def do_DELETE(self):
        parsed = urlparse(self.path)
        path = parsed.path
        if path.startswith("/api"):
            path = path[4:]
        if not path.startswith("/"):
            path = "/" + path

        conn = get_db()
        c = conn.cursor()

        try:
            if path.startswith("/beneficiaries/"):
                ben_id = path.split("/")[-1]
                c.execute("DELETE FROM beneficiaries WHERE beneficiaryId = ?", (ben_id,))
                conn.commit()
                self._send_success({}, "Beneficiary removed")
                return

            if path.startswith("/admin/notifications/"):
                nid = path.split("/")[-1]
                c.execute("DELETE FROM notifications WHERE notificationId = ?", (nid,))
                conn.commit()
                self._send_success({}, "Notification deleted")
                return

            if path.startswith("/admin/officers/"):
                oid = path.split("/")[-1]
                c.execute("DELETE FROM officers WHERE officerId = ?", (oid,))
                conn.commit()
                self._send_success({}, "Officer removed")
                return

            self._send_error(f"Endpoint DELETE {path} not found", 404)

        except Exception as e:
            self._send_error(f"Internal server error: {str(e)}", 500)
        finally:
            conn.close()


def run_server(port=8080):
    init_db()
    server_address = ("0.0.0.0", port)
    httpd = HTTPServer(server_address, GgBankApiHandler)
    print("=" * 65)
    print(f"  GG BANK - SECURE SQLITE REST BACKEND ENGINE RUNNING")
    print(f"  Local API Base: http://localhost:{port}/api")
    print(f"  SQLite Database File: {DB_PATH}")
    print(f"  Cross-Profile Multi-User Storage: ACTIVE & SYNCHRONIZED")
    print("=" * 65)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
        httpd.server_close()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            pass
    run_server(port)
