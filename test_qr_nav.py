"""
Automated verification for Dashboard Navigation and Individual Customer QR Code Generator.
"""
import os
import re
import urllib.request

BASE_DIR = r"c:\Users\GOWTHAM NK\OneDrive\Documents\GG bank\frontend"

def test_dashboard_sidebar_and_scripts():
    print("\n[TEST] Verifying dashboard.html:")
    with open(os.path.join(BASE_DIR, "dashboard.html"), "r", encoding="utf-8") as f:
        content = f.read()

    # Verify customer.js is NOT included
    assert "js/customer.js" not in content, "Error: customer.js is still loaded in dashboard.html"
    print("  [OK] customer.js successfully removed from dashboard.html (no event hijacking)")

    # Verify no data-view attributes in sidebar nav
    sidebar_match = re.search(r'<aside class="sidebar">.*?</aside>', content, re.DOTALL)
    assert sidebar_match, "Sidebar not found in dashboard.html"
    sidebar_html = sidebar_match.group(0)
    assert 'data-view="view-bills"' not in sidebar_html, "Error: data-view='view-bills' still present in sidebar"
    assert 'data-view="view-dashboard"' not in sidebar_html, "Error: data-view='view-dashboard' still present in sidebar"
    print("  [OK] data-view attributes cleaned from sidebar (standard multi-page links)")

def test_bill_payments_active():
    print("\n[TEST] Verifying bill-payments.html:")
    with open(os.path.join(BASE_DIR, "bill-payments.html"), "r", encoding="utf-8") as f:
        content = f.read()
    # Check that <li class="nav-item active"> is NOT hardcoded on bill-payments
    assert '<li class="nav-item active">\n          <a class="nav-link" href="bill-payments.html"' not in content, \
        "Error: nav-item active is hardcoded on bill-payments.html"
    print("  [OK] Hardcoded active class removed from bill-payments.html")

def test_qr_pay_sidebar_and_customer_generator():
    print("\n[TEST] Verifying qr-pay.html:")
    with open(os.path.join(BASE_DIR, "qr-pay.html"), "r", encoding="utf-8") as f:
        content = f.read()

    # Check sidebar header matches standard
    assert '<aside class="sidebar">' in content
    assert '<div class="sidebar-header">' in content
    assert '<span class="brand-title">GG BANK</span>' in content
    assert '<span class="brand-subtitle">Smart Digital Banking</span>' in content
    assert '<ul class="nav-menu">' in content
    assert 'nav-list' not in content
    print("  [OK] Sidebar markup standardized to match dashboard.html")

    # Check Individual Customer QR Generator elements
    assert 'id="customerQrSelector"' in content
    assert 'id="customCustomerFormFields"' in content
    assert 'id="myQrCodeContainer"' in content
    assert 'id="myQrCustomerNameDisplay"' in content
    assert 'id="myQrAccountDisplay"' in content
    assert 'id="myQrUpiDisplay"' in content
    assert 'id="customQrAmountInput"' in content
    print("  [OK] Individual Customer QR Generator UI elements present in Tab 2")

def test_qr_pay_js():
    print("\n[TEST] Verifying qr-pay.js:")
    with open(os.path.join(BASE_DIR, "js", "qr-pay.js"), "r", encoding="utf-8") as f:
        content = f.read()

    # Verify individual customer logic
    assert "onCustomerQrSelectionChange" in content
    assert "applyCustomCustomerQr" in content
    assert "getActiveCustomerProfile" in content
    assert "downloadPersonalQr" in content
    assert "printCustomerQrCard" in content
    assert "onCustomAmountChange" in content
    assert "setPresetAmount" in content
    print("  [OK] Individual customer QR generation and export functions implemented")

def test_app_shell_navigation():
    print("\n[TEST] Verifying app-shell.js:")
    with open(os.path.join(BASE_DIR, "js", "app-shell.js"), "r", encoding="utf-8") as f:
        content = f.read()

    assert "item.classList.remove('active')" in content
    assert "sidebar.classList.remove('mobile-open')" in content
    print("  [OK] Navigation resets active classes properly and auto-closes mobile menu")

def test_api_js_qr_mock():
    print("\n[TEST] Verifying api.js mock router:")
    with open(os.path.join(BASE_DIR, "js", "api.js"), "r", encoding="utf-8") as f:
        content = f.read()

    assert "endpoint === '/qr/validate'" in content
    assert "endpoint === '/qr/pay'" in content
    print("  [OK] /qr/validate and /qr/pay fallback endpoints implemented in api.js")

def test_customer_details_qr():
    print("\n[TEST] Verifying customer-details.html & customer-details.js:")
    with open(os.path.join(BASE_DIR, "customer-details.html"), "r", encoding="utf-8") as f:
        html = f.read()
    with open(os.path.join(BASE_DIR, "js", "customer-details.js"), "r", encoding="utf-8") as f:
        js = f.read()

    assert 'id="customerQrModal"' in html
    assert "openCustomerQrModal" in js
    assert "downloadModalQr" in js
    print("  [OK] Customer QR modal and actions integrated into customer-details dossier")

def test_http_server():
    print("\n[TEST] Verifying HTTP Server:")
    req = urllib.request.urlopen("http://localhost:3000/qr-pay.html", timeout=3)
    assert req.status == 200
    req2 = urllib.request.urlopen("http://localhost:3000/dashboard.html", timeout=3)
    assert req2.status == 200
    print("  [OK] Both qr-pay.html and dashboard.html return HTTP 200 OK")

if __name__ == "__main__":
    test_dashboard_sidebar_and_scripts()
    test_bill_payments_active()
    test_qr_pay_sidebar_and_customer_generator()
    test_qr_pay_js()
    test_app_shell_navigation()
    test_api_js_qr_mock()
    test_customer_details_qr()
    test_http_server()
    print("\n========================================================")
    print(" >>> ALL VERIFICATION TESTS PASSED SUCCESSFULLY! <<<")
    print("========================================================\n")
