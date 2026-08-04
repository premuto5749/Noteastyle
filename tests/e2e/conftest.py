"""E2E 테스트 공통 픽스처 — Noteastyle (Next.js + Supabase Auth)."""

import os
import pytest
from pathlib import Path
from playwright.sync_api import Page


BASE_URL = os.getenv("E2E_BASE_URL", "http://localhost:3000")
SCREENSHOTS_DIR = Path(__file__).parent / "screenshots"

# Supabase Auth 환경변수 (로그인에 사용)
TEST_EMAIL = os.getenv("E2E_TEST_EMAIL", "")
TEST_PASSWORD = os.getenv("E2E_TEST_PASSWORD", "")


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture
def authenticated_page(page: Page, base_url: str):
    """Supabase Auth로 로그인된 페이지를 반환.

    E2E_TEST_EMAIL, E2E_TEST_PASSWORD 환경변수 필요.
    없으면 로그인 건너뜀 (비인증 상태로 테스트).
    """
    if TEST_EMAIL and TEST_PASSWORD:
        page.goto(f"{base_url}/login")
        page.wait_for_load_state("networkidle")

        # "또는 이메일로 로그인" 버튼 클릭 (카카오 OAuth 화면에서)
        email_toggle = page.locator("button:has-text('이메일로 로그인')")
        if email_toggle.is_visible(timeout=3000):
            email_toggle.click()
            page.wait_for_timeout(500)

        # 이메일/비밀번호 입력
        email_input = page.locator("input[type='email']")
        if email_input.is_visible(timeout=3000):
            email_input.fill(TEST_EMAIL)
            page.locator("input[type='password']").fill(TEST_PASSWORD)
            page.locator("button[type='submit']").click()
            # 로그인 성공 후 홈으로 리다이렉트 대기
            page.wait_for_url(lambda url: "/login" not in url, timeout=15000)
            page.wait_for_load_state("networkidle")

    return page


@pytest.fixture(autouse=True)
def screenshot_on_failure(page: Page, request):
    """테스트 실패시 스크린샷 자동 저장."""
    yield
    rep = getattr(request.node, "rep_call", None)
    if rep is not None and rep.failed:
        SCREENSHOTS_DIR.mkdir(exist_ok=True)
        name = request.node.nodeid.replace("/", "_").replace("::", "_").replace("\\", "_")
        page.screenshot(path=str(SCREENSHOTS_DIR / f"{name}.png"))


@pytest.hookimpl(tryfirst=True, hookwrapper=True)
def pytest_runtest_makereport(item, call):
    outcome = yield
    rep = outcome.get_result()
    setattr(item, "rep_" + rep.when, rep)
