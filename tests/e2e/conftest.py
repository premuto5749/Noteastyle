"""E2E 테스트 공통 픽스처 (sync 방식) — Noteastyle community talent pool."""

import os
import pytest
from pathlib import Path
from playwright.sync_api import Page, Browser, BrowserContext

BASE_URL = os.getenv("E2E_BASE_URL", "http://localhost:3000")
SCREENSHOTS_DIR = Path(__file__).parent / "screenshots"

# Test user credentials (set via env or use defaults for local dev)
TEST_EMAIL = os.getenv("E2E_TEST_EMAIL", "test@noteastyle.com")
TEST_PASSWORD = os.getenv("E2E_TEST_PASSWORD", "")


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture
def auth_page(page: Page):
    """Supabase cookie-auth 로그인 후 page 반환.

    로그인 페이지는 2단계:
    1. 카카오 로그인 버튼 + '이메일로 로그인' 버튼 표시
    2. 이메일로 로그인 클릭 후 이메일/비밀번호 폼 표시
    """
    if not TEST_PASSWORD:
        pytest.skip("E2E_TEST_PASSWORD 환경변수가 필요합니다")
    page.goto(f"{BASE_URL}/login")
    # 이메일 로그인 버튼 클릭 (showEmailForm 토글)
    page.wait_for_selector("text=이메일로 로그인", timeout=10000)
    page.click("text=이메일로 로그인")
    # 이메일/비밀번호 입력창 대기
    page.wait_for_selector("input[type='email']", timeout=10000)
    page.fill("input[type='email']", TEST_EMAIL)
    page.fill("input[placeholder='비밀번호']", TEST_PASSWORD)
    page.click("button[type='submit']")
    # 로그인 완료 후 대시보드로 이동 대기
    page.wait_for_url(f"{BASE_URL}/**", timeout=20000)
    # 로그인 후 매장 컨텍스트 로드 대기
    page.wait_for_timeout(1500)
    return page


@pytest.fixture
def guest_page(page: Page):
    """인증 없이 페이지 반환 (공개 엔드포인트 테스트용)."""
    return page


@pytest.fixture(autouse=True)
def screenshot_on_failure(page: Page, request):
    """테스트 실패 시 스크린샷 자동 저장."""
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
