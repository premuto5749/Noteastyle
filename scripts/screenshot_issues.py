"""
Screenshot issues on Noteastyle app
"""
from playwright.sync_api import sync_playwright
import time

BASE_URL = "http://localhost:3000"
OUT = "C:/Users/cid41/Dev/Noteastyle/screenshots"

import os
os.makedirs(OUT, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    # Mobile viewport (app is mobile-first 480px)
    context = browser.new_context(viewport={"width": 480, "height": 900})
    page = context.new_page()

    # 1. Main page (홈)
    print("1. Taking main page screenshot...")
    page.goto(f"{BASE_URL}/", wait_until="networkidle")
    page.wait_for_timeout(2000)
    page.screenshot(path=f"{OUT}/01_main_page.png", full_page=False)
    print("   saved 01_main_page.png")

    # 2. Portfolio page
    print("2. Taking portfolio page screenshot...")
    page.goto(f"{BASE_URL}/portfolio", wait_until="networkidle")
    page.wait_for_timeout(2000)
    page.screenshot(path=f"{OUT}/02_portfolio.png", full_page=True)
    print("   saved 02_portfolio.png")

    # 3. Treatments list
    print("3. Taking treatments list screenshot...")
    page.goto(f"{BASE_URL}/treatments", wait_until="networkidle")
    page.wait_for_timeout(2000)
    page.screenshot(path=f"{OUT}/03_treatments_list.png", full_page=True)
    print("   saved 03_treatments_list.png")

    # 4. Reservation page (service submenu issue)
    print("4. Taking reservation page screenshot...")
    page.goto(f"{BASE_URL}/reservation", wait_until="networkidle")
    page.wait_for_timeout(2000)
    page.screenshot(path=f"{OUT}/04_reservation.png", full_page=True)
    print("   saved 04_reservation.png")

    # 4b. Click on a service category to see the submenu
    try:
        # Try clicking the first service category button
        first_service = page.locator("button").filter(has_text=lambda t: len(t) > 0).first
        all_buttons = page.locator("button").all()
        print(f"   Found {len(all_buttons)} buttons on reservation page")
        for btn in all_buttons[:10]:
            print(f"   button text: '{btn.text_content()}'")
    except Exception as e:
        print(f"   Error: {e}")

    page.screenshot(path=f"{OUT}/04b_reservation_service_buttons.png", full_page=True)

    # 5. Check if there are treatments to click on
    print("5. Looking for treatment detail pages...")
    page.goto(f"{BASE_URL}/treatments", wait_until="networkidle")
    page.wait_for_timeout(2000)

    # Try to find treatment links
    treatment_links = page.locator("a[href*='/treatments/']").all()
    print(f"   Found {len(treatment_links)} treatment links")

    if treatment_links:
        href = treatment_links[0].get_attribute("href")
        print(f"   Clicking first treatment: {href}")
        page.goto(f"{BASE_URL}{href}", wait_until="networkidle")
        page.wait_for_timeout(2000)
        page.screenshot(path=f"{OUT}/05_treatment_detail.png", full_page=False)
        print("   saved 05_treatment_detail.png")

        # Scroll down to see the bottom sheet
        page.evaluate("window.scrollTo(0, 400)")
        page.wait_for_timeout(500)
        page.screenshot(path=f"{OUT}/05b_treatment_detail_scrolled.png", full_page=False)
        print("   saved 05b_treatment_detail_scrolled.png")

        # Full page
        page.evaluate("window.scrollTo(0, 0)")
        page.screenshot(path=f"{OUT}/05c_treatment_detail_full.png", full_page=True)
        print("   saved 05c_treatment_detail_full.png")

    # Check current URL (might have redirected to login)
    print(f"\nFinal URL: {page.url}")

    browser.close()

print("\nDone! Screenshots saved to:", OUT)
