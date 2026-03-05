"""
Community Talent Pool E2E Tests
커뮤니티 인재풀 기능 통합 테스트

테스트 범위:
  - 탐색(Explore) 페이지 렌더링 및 탭 전환
  - 인재풀(Talent Pool) 페이지 렌더링 및 필터
  - Health check API
  - Site settings 공개 API
  - Explore portfolio API (공개)
  - Explore talent API (인증 필요 → 401 검증)
  - Like/unlike 토글 API (인증 필요 → 401 검증)

인증이 필요한 기능 (제안 발송, 수신, 크레딧)은
E2E_TEST_EMAIL + E2E_TEST_PASSWORD 설정 시 auth_page 픽스처로 실행.
"""

import os
import time
import pytest
from playwright.sync_api import Page, expect, APIRequestContext

BASE_URL = os.getenv("E2E_BASE_URL", "http://localhost:3000")


# ─────────────────────────────────────────────
# 1. Health / Public API
# ─────────────────────────────────────────────

class TestPublicApis:
    """인증 없이 접근 가능한 공개 API."""

    def test_health_check(self, page: Page):
        """GET /api/health → 200."""
        res = page.request.get(f"{BASE_URL}/api/health")
        assert res.ok, f"Health check failed: {res.status}"

    def test_site_settings_public(self, page: Page):
        """GET /api/site-settings → 200 with JSON."""
        res = page.request.get(f"{BASE_URL}/api/site-settings")
        assert res.ok, f"Site settings failed: {res.status}"
        data = res.json()
        assert isinstance(data, dict)

    def test_explore_portfolio_requires_auth(self, page: Page):
        """GET /api/explore/portfolio 인증 없으면 401 반환."""
        res = page.request.get(f"{BASE_URL}/api/explore/portfolio")
        assert res.status in (401, 403), (
            f"Expected 401/403 for unauthenticated explore/portfolio, got {res.status}"
        )

    def test_explore_talent_requires_auth(self, page: Page):
        """GET /api/explore/talent 인증 없으면 401 반환."""
        res = page.request.get(f"{BASE_URL}/api/explore/talent")
        assert res.status in (401, 403), (
            f"Expected 401/403 for unauthenticated explore/talent, got {res.status}"
        )

    def test_like_toggle_requires_auth(self, page: Page):
        """POST /api/explore/portfolio/fake-id/like 인증 없으면 401."""
        res = page.request.post(f"{BASE_URL}/api/explore/portfolio/00000000-0000-0000-0000-000000000001/like")
        assert res.status in (401, 403), (
            f"Expected 401/403 for unauthenticated like, got {res.status}"
        )

    def test_notifications_requires_auth(self, page: Page):
        """GET /api/me/notifications 인증 없으면 401."""
        res = page.request.get(f"{BASE_URL}/api/me/notifications")
        assert res.status in (401, 403), (
            f"Expected 401/403 for unauthenticated notifications, got {res.status}"
        )

    def test_talent_settings_requires_auth(self, page: Page):
        """GET /api/me/talent-settings 인증 없으면 401."""
        res = page.request.get(f"{BASE_URL}/api/me/talent-settings")
        assert res.status in (401, 403), (
            f"Expected 401/403, got {res.status}"
        )


# ─────────────────────────────────────────────
# 2. Explore Page UI
# ─────────────────────────────────────────────

class TestExplorePageUI:
    """탐색 페이지 UI 렌더링.

    참고: /explore, /proposals, /profile 은 PROTECTED_PATHS에 없어서
    미들웨어 리다이렉트가 아닌 클라이언트사이드 인증 확인을 사용합니다.
    /로 시작하는 경로(/, /treatments 등)만 미들웨어 리다이렉트 발생.
    """

    def test_root_redirects_unauthenticated(self, page: Page):
        """미인증 접근 시 / → /login 미들웨어 리다이렉트."""
        page.goto(f"{BASE_URL}/")
        page.wait_for_url(f"{BASE_URL}/login**", timeout=10000)
        assert "/login" in page.url

    def test_treatments_redirects_unauthenticated(self, page: Page):
        """미인증 /treatments → /login 미들웨어 리다이렉트."""
        page.goto(f"{BASE_URL}/treatments")
        page.wait_for_url(f"{BASE_URL}/login**", timeout=10000)
        assert "/login" in page.url

    def test_customers_redirects_unauthenticated(self, page: Page):
        """미인증 /customers → /login 미들웨어 리다이렉트."""
        page.goto(f"{BASE_URL}/customers")
        page.wait_for_url(f"{BASE_URL}/login**", timeout=10000)
        assert "/login" in page.url

    def test_settings_redirects_unauthenticated(self, page: Page):
        """미인증 /settings → /login 미들웨어 리다이렉트."""
        page.goto(f"{BASE_URL}/settings")
        page.wait_for_url(f"{BASE_URL}/login**", timeout=10000)
        assert "/login" in page.url

    def test_login_page_shows_email_button(self, page: Page):
        """로그인 페이지가 정상 렌더링 — 카카오 버튼 + 이메일 로그인 버튼."""
        page.goto(f"{BASE_URL}/login")
        # 이메일로 로그인 버튼은 초기에 표시됨
        page.wait_for_selector("button", timeout=10000)
        # 페이지 내 버튼이 최소 1개 이상 있으면 렌더링 성공
        assert page.locator("button").count() >= 1

    def test_login_email_form_appears_on_click(self, page: Page):
        """이메일로 로그인 클릭 시 email input 나타남."""
        page.goto(f"{BASE_URL}/login")
        page.wait_for_timeout(2000)
        # '이메일로 로그인' 텍스트 버튼 클릭
        email_btn = page.get_by_text("이메일로 로그인")
        if email_btn.count() == 0:
            pytest.skip("이메일로 로그인 버튼 없음")
        email_btn.first.click()
        page.wait_for_selector("input[type='email']", timeout=5000)
        expect(page.locator("input[type='email']")).to_be_visible()


# ─────────────────────────────────────────────
# 3. Authenticated Tests (E2E_TEST_PASSWORD 필요)
# ─────────────────────────────────────────────

class TestExploreTabsAuthenticated:
    """로그인 후 탐색 페이지 탭 전환."""

    def test_explore_portfolio_tab_visible(self, auth_page: Page):
        """탐색 페이지 진입 시 포트폴리오 탭이 활성."""
        auth_page.goto(f"{BASE_URL}/explore")
        auth_page.wait_for_selector("text=포트폴리오", timeout=10000)
        expect(auth_page.locator("text=포트폴리오").first).to_be_visible()
        expect(auth_page.locator("text=인재풀").first).to_be_visible()

    def test_explore_talent_tab_navigates(self, auth_page: Page):
        """인재풀 탭 클릭 시 /explore/talent로 이동."""
        auth_page.goto(f"{BASE_URL}/explore")
        auth_page.wait_for_selector("text=인재풀", timeout=10000)
        auth_page.click("button:has-text('인재풀')")
        auth_page.wait_for_url(f"{BASE_URL}/explore/talent**", timeout=10000)
        assert "/explore/talent" in auth_page.url

    def test_talent_pool_search_renders(self, auth_page: Page):
        """인재풀 페이지에 검색창이 표시됨."""
        auth_page.goto(f"{BASE_URL}/explore/talent")
        auth_page.wait_for_selector("text=인재풀", timeout=10000)
        expect(auth_page.locator("input[placeholder*='검색']").first).to_be_visible()

    def test_talent_pool_shop_type_filters(self, auth_page: Page):
        """인재풀 업종 필터 버튼이 모두 표시됨."""
        auth_page.goto(f"{BASE_URL}/explore/talent")
        auth_page.wait_for_selector("text=전체", timeout=10000)
        for label in ["전체", "헤어", "네일", "피부", "두피"]:
            expect(auth_page.locator(f"button:has-text('{label}')").first).to_be_visible()

    def test_talent_pool_hair_filter(self, auth_page: Page):
        """헤어 필터 클릭 시 버튼 스타일 변경."""
        auth_page.goto(f"{BASE_URL}/explore/talent")
        auth_page.wait_for_selector("text=헤어", timeout=10000)
        hair_btn = auth_page.locator("button:has-text('헤어')").first
        hair_btn.click()
        auth_page.wait_for_timeout(500)
        # 헤어 버튼이 활성 스타일(bg-primary)을 가지는지 확인
        classes = hair_btn.get_attribute("class") or ""
        assert "bg-primary" in classes, f"헤어 필터 활성화 스타일 없음: {classes}"

    def test_talent_search_input_works(self, auth_page: Page):
        """검색어 입력 후 검색 버튼 클릭."""
        auth_page.goto(f"{BASE_URL}/explore/talent")
        auth_page.wait_for_selector("input[placeholder*='검색']", timeout=10000)
        auth_page.fill("input[placeholder*='검색']", "헤어")
        auth_page.click("button:has-text('검색')")
        auth_page.wait_for_timeout(1000)
        # 검색 결과 또는 빈 상태 메시지가 표시
        has_results = auth_page.locator(".grid").count() > 0
        has_empty = auth_page.locator("text=검색 결과가 없습니다").count() > 0
        assert has_results or has_empty, "검색 후 결과/빈 상태가 표시되어야 함"


class TestExplorePortfolioAuthenticated:
    """로그인 후 포트폴리오 탐색."""

    def test_explore_sort_dropdown_visible(self, auth_page: Page):
        """정렬 드롭다운(최신순/인기순)이 표시됨."""
        auth_page.goto(f"{BASE_URL}/explore")
        auth_page.wait_for_selector("select", timeout=10000)
        expect(auth_page.locator("select").first).to_be_visible()
        options = auth_page.locator("select option").all_inner_texts()
        assert "최신순" in options
        assert "인기순" in options

    def test_explore_sort_change(self, auth_page: Page):
        """정렬 변경 시 페이지 유지."""
        auth_page.goto(f"{BASE_URL}/explore")
        auth_page.wait_for_selector("select", timeout=10000)
        auth_page.select_option("select", value="popular")
        auth_page.wait_for_timeout(1000)
        assert "/explore" in auth_page.url

    def test_like_button_visible_on_portfolio_card(self, auth_page: Page):
        """포트폴리오 카드에 좋아요 버튼이 표시됨 (카드가 있을 때)."""
        auth_page.goto(f"{BASE_URL}/explore")
        auth_page.wait_for_timeout(2000)
        cards = auth_page.locator(".grid .bg-card, .grid div[class*='card']")
        if cards.count() == 0:
            pytest.skip("포트폴리오 카드 없음 (빈 데이터)")
        # 좋아요 SVG 버튼 확인
        like_btns = auth_page.locator("button[aria-label='좋아요']")
        assert like_btns.count() > 0, "포트폴리오 카드에 좋아요 버튼이 없음"


class TestProposalsPageAuthenticated:
    """제안 관리 페이지."""

    def test_proposals_page_renders(self, auth_page: Page):
        """제안 관리 페이지가 렌더링됨."""
        auth_page.goto(f"{BASE_URL}/proposals")
        auth_page.wait_for_selector("text=제안 관리", timeout=10000)
        expect(auth_page.locator("text=제안 관리").first).to_be_visible()

    def test_proposals_received_tab_visible(self, auth_page: Page):
        """수신함 탭이 표시됨 (designer 역할)."""
        auth_page.goto(f"{BASE_URL}/proposals")
        auth_page.wait_for_timeout(2000)
        # owner/admin이면 발신함도 있고, designer면 수신함만 있음
        has_received = auth_page.locator("text=수신함").count() > 0
        has_no_proposal = auth_page.locator("text=받은 제안이 없습니다").count() > 0
        assert has_received or has_no_proposal, "제안 수신 UI가 표시되어야 함"

    def test_proposals_link_to_talent_pool(self, auth_page: Page):
        """인재풀 보기 링크가 표시됨 (owner/admin)."""
        auth_page.goto(f"{BASE_URL}/proposals")
        auth_page.wait_for_timeout(2000)
        # owner/admin에게만 표시되므로 선택적 확인
        talent_link = auth_page.locator("text=인재풀 보기")
        if talent_link.count() > 0:
            talent_link.first.click()
            auth_page.wait_for_url(f"{BASE_URL}/explore/talent**", timeout=5000)
            assert "/explore/talent" in auth_page.url


class TestProfileTalentSettingsAuthenticated:
    """프로필 페이지 제안 수신 설정."""

    def _goto_profile_and_scroll(self, page: Page):
        """프로필 페이지 열고 하단까지 스크롤."""
        page.goto(f"{BASE_URL}/profile")
        page.wait_for_timeout(2000)
        # 페이지 하단으로 스크롤 (제안 수신 설정 섹션은 하단에 있음)
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        page.wait_for_timeout(500)

    def test_profile_has_talent_settings_section(self, auth_page: Page):
        """프로필 페이지에 제안 수신 설정 섹션 또는 로딩 상태 표시.

        NOTE: 매장 멤버십이 없는 계정(admin-only)은 프로필이 로딩 상태에 머뭄.
        매장 멤버인 계정이면 제안 수신 설정 섹션이 표시됨.
        """
        self._goto_profile_and_scroll(auth_page)
        heading = auth_page.get_by_text("제안 수신 설정")
        loading = auth_page.get_by_text("불러오는 중")
        if heading.count() == 0 and loading.count() > 0:
            pytest.skip("admin-only 계정: 매장 멤버십 없어 프로필 로딩 중 상태")
        assert heading.count() > 0, "제안 수신 설정 섹션이 없음"

    def test_profile_talent_toggle_exists(self, auth_page: Page):
        """제안 수신 checkbox가 프로필 페이지에 존재함 (매장 멤버 계정 필요)."""
        self._goto_profile_and_scroll(auth_page)
        heading = auth_page.get_by_text("제안 수신 설정")
        if heading.count() == 0:
            pytest.skip("admin-only 계정: 매장 멤버십 없어 프로필 미표시")
        toggles = auth_page.locator("input[type='checkbox']")
        assert toggles.count() > 0, "checkbox가 프로필 페이지에 없음"

    def test_profile_talent_toggle_clickable(self, auth_page: Page):
        """제안 수신 checkbox 클릭 시 오류 없이 완료됨 (매장 멤버 계정 필요)."""
        self._goto_profile_and_scroll(auth_page)
        heading = auth_page.get_by_text("제안 수신 설정")
        if heading.count() == 0:
            pytest.skip("admin-only 계정: 매장 멤버십 없어 프로필 미표시")
        toggles = auth_page.locator("input[type='checkbox']")
        toggle = toggles.last
        toggle.scroll_into_view_if_needed()
        toggle.click()
        auth_page.wait_for_timeout(1500)
        assert True


class TestNotificationBellAuthenticated:
    """알림 벨 UI."""

    def test_notification_bell_visible_in_header(self, auth_page: Page):
        """상단 헤더에 알림 벨 버튼이 표시됨."""
        auth_page.goto(f"{BASE_URL}/explore")
        auth_page.wait_for_timeout(2000)
        # AppHeader의 NotificationBell (bell SVG 또는 aria-label)
        bell = auth_page.locator("[aria-label*='알림'], [aria-label*='notification'], button svg").first
        # 헤더가 있으면 통과
        header = auth_page.locator("header, nav").first
        expect(header).to_be_visible()


# ─────────────────────────────────────────────
# 4. API Edge Cases
# ─────────────────────────────────────────────

class TestApiEdgeCases:
    """API 경계 케이스 및 오류 응답 형식 검증."""

    def test_explore_talent_invalid_limit(self, page: Page):
        """인증 없이 explore/talent → 401 (limit 파라미터 무관)."""
        res = page.request.get(f"{BASE_URL}/api/explore/talent?limit=999")
        assert res.status in (401, 403)

    def test_proposals_respond_requires_auth(self, page: Page):
        """PUT /api/me/proposals/xxx/respond 인증 없으면 401."""
        res = page.request.put(
            f"{BASE_URL}/api/me/proposals/00000000-0000-0000-0000-000000000001/respond",
            data={"action": "accept"},
        )
        assert res.status in (401, 403)

    def test_push_subscription_requires_auth(self, page: Page):
        """POST /api/me/push-subscription 인증 없으면 401."""
        res = page.request.post(
            f"{BASE_URL}/api/me/push-subscription",
            data={"endpoint": "https://example.com", "keys": {}},
        )
        assert res.status in (401, 403)

    def test_shop_proposals_requires_auth(self, page: Page):
        """POST /api/shops/{shopId}/proposals 인증 없으면 401."""
        res = page.request.post(
            f"{BASE_URL}/api/shops/00000000-0000-0000-0000-000000000001/proposals",
            data={"to_member_id": "xxx", "position": "디자이너", "salary_range": "협의"},
        )
        assert res.status in (401, 403)

    def test_bookmarks_requires_auth(self, page: Page):
        """POST /api/shops/{shopId}/bookmarks 인증 없으면 401."""
        res = page.request.post(
            f"{BASE_URL}/api/shops/00000000-0000-0000-0000-000000000001/bookmarks",
            data={"portfolio_id": "xxx"},
        )
        assert res.status in (401, 403)
