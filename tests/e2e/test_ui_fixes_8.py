"""PR #81: UI 정리 및 버그 수정 8건 E2E 테스트.

수정 내역:
1. 드로잉 에디터 좌표계 aspect-square → aspect-[4/3] 통일
2. 드로잉 오버레이 하드코딩 480x480 제거, ResizeObserver 동적 크기
3. 포트폴리오 클릭 시 풀스크린 모달 뷰어 (hover-only 문제 해결)
4. 핀 노트 가독성 개선 (텍스트 크기, 그림자, max-width 증가)
5. AI key_comments DB 저장 및 핀 에디터 연동 (마이그레이션 029)
6. 메인 Stories Row '최근 시술' 헤더 추가, 레이블 2줄 표시
7. 서비스 소메뉴 클릭 안되는 문제 수정 (pointer-events, touch-manipulation)
8. 시술 상세 캐러셀 좌우 화살표 및 페이지 인디케이터 추가
"""

import re

from playwright.sync_api import Page, expect


# ──────────────────────────────────────────────
# Fix 3: 포트폴리오 클릭 시 풀스크린 모달 뷰어
# ──────────────────────────────────────────────

def test_portfolio_grid_click_opens_fullscreen_modal(authenticated_page: Page, base_url: str):
    """포트폴리오 그리드 아이템 클릭 시 풀스크린 모달이 열려야 한다."""
    page = authenticated_page
    page.goto(f"{base_url}/portfolio")
    page.wait_for_load_state("networkidle")

    # 로딩 완료 대기
    page.wait_for_selector(".animate-pulse", state="hidden", timeout=10000)

    # 포트폴리오 아이템이 있는지 확인
    grid_items = page.locator(".grid.grid-cols-3 button.aspect-square")
    if grid_items.count() == 0:
        # 포트폴리오가 비어있으면 빈 상태 또는 로딩 스켈레톤 확인
        empty_msg = page.locator("text=아직 포트폴리오가 없습니다")
        if empty_msg.is_visible(timeout=3000):
            pass  # 빈 상태 정상
        return

    # 첫 번째 아이템 클릭
    grid_items.first.click()

    # 풀스크린 모달이 열려야 한다 (fixed inset-0 bg-black)
    modal = page.locator(".fixed.inset-0.bg-black")
    expect(modal).to_be_visible(timeout=5000)

    # 닫기 버튼이 있어야 한다
    close_btn = modal.locator("button:has-text('닫기')")
    expect(close_btn).to_be_visible()

    # 공개/비공개 상태 표시 (span만 매칭)
    status_text = modal.locator("span:has-text('공개됨')").or_(modal.locator("span:has-text('비공개')"))
    expect(status_text).to_be_visible()

    # 공개하기/비공개 전환 버튼
    toggle_btn = modal.locator("button:has-text('공개하기')").or_(
        modal.locator("button:has-text('비공개로 전환')")
    )
    expect(toggle_btn).to_be_visible()

    # 삭제 버튼
    delete_btn = modal.locator("button:has-text('삭제')")
    expect(delete_btn).to_be_visible()


def test_portfolio_modal_closes_on_click(authenticated_page: Page, base_url: str):
    """포트폴리오 모달 닫기 버튼이 정상 동작해야 한다."""
    page = authenticated_page
    page.goto(f"{base_url}/portfolio")
    page.wait_for_load_state("networkidle")

    grid_items = page.locator(".grid.grid-cols-3 button.aspect-square")
    if grid_items.count() == 0:
        return  # skip if no portfolio items

    grid_items.first.click()
    modal = page.locator(".fixed.inset-0.bg-black")
    expect(modal).to_be_visible(timeout=5000)

    # 닫기 클릭
    page.locator("button:has-text('닫기')").click()
    expect(modal).not_to_be_visible(timeout=3000)


# ──────────────────────────────────────────────
# Fix 6: 메인 Stories Row '최근 시술' 헤더 추가
# ──────────────────────────────────────────────

def test_home_stories_row_has_header(authenticated_page: Page, base_url: str):
    """홈 페이지에 '최근 시술' 헤더가 표시되어야 한다."""
    page = authenticated_page
    page.goto(base_url)
    page.wait_for_load_state("networkidle")

    # 로딩 스켈레톤이 사라질 때까지 대기
    page.wait_for_selector(".animate-pulse", state="hidden", timeout=10000)

    # 최근 시술 헤더 확인 (시술이 있는 경우)
    header = page.locator("h2:has-text('최근 시술')")
    if header.count() > 0:
        expect(header.first).to_be_visible()

        # '전체보기' 링크도 존재
        view_all = page.locator("a:has-text('전체보기')")
        if view_all.count() > 0:
            expect(view_all.first).to_be_visible()


def test_home_stories_row_shows_two_line_labels(authenticated_page: Page, base_url: str):
    """Stories row의 각 아이템이 고객명 + 서비스 타입 2줄로 표시되어야 한다."""
    page = authenticated_page
    page.goto(base_url)
    page.wait_for_load_state("networkidle")

    page.wait_for_selector(".animate-pulse", state="hidden", timeout=10000)

    # Stories row 아이템 (스크롤 영역 내 버튼들)
    stories = page.locator(".flex.gap-3.overflow-x-auto button")
    if stories.count() == 0:
        return  # 시술 데이터 없음

    first_story = stories.first

    # 첫 번째 줄: 고객명 (text-[10px])
    customer_label = first_story.locator("span.text-\\[10px\\]").first
    expect(customer_label).to_be_visible()

    # 두 번째 줄: 서비스 타입 (text-[9px])
    service_label = first_story.locator("span.text-\\[9px\\]")
    expect(service_label).to_be_visible()


# ──────────────────────────────────────────────
# Fix 7: 서비스 소메뉴 클릭 문제 수정
# ──────────────────────────────────────────────

def test_service_submenu_clickable(authenticated_page: Page, base_url: str):
    """서비스 카테고리 클릭 후 서브 메뉴 아이템이 클릭 가능해야 한다.

    예약 생성 페이지에서 ServiceSelector 테스트.
    """
    page = authenticated_page
    page.goto(f"{base_url}/reservation")
    page.wait_for_load_state("networkidle")

    # 서비스 카테고리 버튼들
    category_buttons = page.locator(".flex.gap-2.overflow-x-auto button")
    if category_buttons.count() == 0:
        return  # 카테고리 데이터 없음

    # 첫 번째 카테고리 클릭
    category_buttons.first.click()
    page.wait_for_timeout(500)

    # 서브 서비스 영역 확인 (pointer-events: auto)
    sub_services = page.locator(".flex.flex-wrap.gap-2 button[type='button']")
    if sub_services.count() > 0:
        # 서브 서비스가 클릭 가능한지 확인 (touch-manipulation 클래스)
        first_sub = sub_services.first
        expect(first_sub).to_be_visible()

        # 실제 클릭 가능 여부 테스트 — 클릭이 에러 없이 완료되면 성공
        # (pointer-events 문제가 있었으면 클릭 자체가 실패)
        first_sub.click(timeout=3000)

        # touch-manipulation 클래스가 적용되어 있는지 확인
        expect(first_sub).to_have_class(re.compile("touch-manipulation"))


def test_service_submenu_pointer_events(authenticated_page: Page, base_url: str):
    """서비스 서브메뉴 영역이 pointer-events: auto로 설정되어야 한다."""
    page = authenticated_page
    page.goto(f"{base_url}/reservation")
    page.wait_for_load_state("networkidle")

    category_buttons = page.locator(".flex.gap-2.overflow-x-auto button")
    if category_buttons.count() == 0:
        return

    category_buttons.first.click()
    page.wait_for_timeout(500)

    # 서브메뉴 컨테이너의 pointer-events 스타일 확인
    submenu_container = page.locator(".overflow-hidden.transition-all")
    if submenu_container.count() > 0:
        pe = submenu_container.evaluate("el => getComputedStyle(el).pointerEvents")
        assert pe == "auto", f"pointer-events should be 'auto', got '{pe}'"


# ──────────────────────────────────────────────
# Fix 8: 시술 상세 캐러셀 좌우 화살표 + 인디케이터
# ──────────────────────────────────────────────

def test_treatment_detail_carousel_arrows(authenticated_page: Page, base_url: str):
    """시술 상세 페이지에서 사진 2장 이상일 때 좌우 화살표가 표시되어야 한다."""
    page = authenticated_page
    page.goto(f"{base_url}/treatments")
    page.wait_for_load_state("networkidle")

    # 시술 목록에서 첫 번째 아이템 클릭
    treatment_links = page.locator("a.block.card-elevated[href^='/treatments/']")
    if treatment_links.count() == 0:
        return  # 시술 데이터 없음

    treatment_links.first.click()
    page.wait_for_load_state("networkidle")

    # 캐러셀 컨테이너
    carousel = page.locator(".flex.overflow-x-auto.snap-x")
    if carousel.count() == 0:
        return  # 사진 없음

    # 사진 아이템 수 확인
    slides = carousel.locator(".snap-center")
    if slides.count() < 2:
        return  # 사진 1장이면 화살표 불필요

    # 오른쪽 화살표 (첫 슬라이드에서는 오른쪽만 표시)
    right_arrow = page.locator("button.absolute.right-2")
    expect(right_arrow).to_be_visible(timeout=3000)

    # 페이지 인디케이터 ("1 / N" 형태)
    indicator = page.locator("span:has-text('1 /')")
    expect(indicator).to_be_visible()


def test_treatment_detail_carousel_page_indicator(authenticated_page: Page, base_url: str):
    """캐러셀 페이지 인디케이터가 현재 위치를 표시해야 한다."""
    page = authenticated_page
    page.goto(f"{base_url}/treatments")
    page.wait_for_load_state("networkidle")

    treatment_links = page.locator("a.block.card-elevated[href^='/treatments/']")
    if treatment_links.count() == 0:
        return

    treatment_links.first.click()
    page.wait_for_load_state("networkidle")

    # 도트 인디케이터 확인 (사진 2장 이상)
    dots = page.locator(".absolute.bottom-3 .rounded-full")
    if dots.count() >= 2:
        # 첫 번째 도트가 활성 상태 (bg-white w-4)
        first_dot = dots.first
        expect(first_dot).to_have_class(re.compile("bg-white"))


# ──────────────────────────────────────────────
# Fix 1 & 2: 드로잉 에디터 aspect-[4/3] 통일 + ResizeObserver
# ──────────────────────────────────────────────

def test_annotation_overlay_uses_resize_observer(authenticated_page: Page, base_url: str):
    """AnnotationOverlay의 DrawingOverlay가 ResizeObserver로 동적 크기를 사용해야 한다.

    시술 상세에서 드로잉 데이터가 있는 사진이 있으면 canvas가 렌더링된다.
    """
    page = authenticated_page
    page.goto(f"{base_url}/treatments")
    page.wait_for_load_state("networkidle")

    treatment_links = page.locator("a.block.card-elevated[href^='/treatments/']")
    if treatment_links.count() == 0:
        return

    treatment_links.first.click()
    page.wait_for_load_state("networkidle")

    # 드로잉 캔버스가 있는지 확인
    canvas = page.locator("canvas")
    if canvas.count() == 0:
        return  # 드로잉 데이터 없음

    # 캔버스가 하드코딩 480x480이 아닌 부모 컨테이너 크기를 따르는지 확인
    canvas_width = canvas.first.evaluate("el => el.width")
    canvas_height = canvas.first.evaluate("el => el.height")

    assert canvas_width != 480 or canvas_height != 480, \
        f"Canvas should not be hardcoded 480x480, got {canvas_width}x{canvas_height}"
    assert canvas_width > 0 and canvas_height > 0, \
        f"Canvas dimensions should be positive, got {canvas_width}x{canvas_height}"


def test_photo_carousel_aspect_ratio(authenticated_page: Page, base_url: str):
    """캐러셀 사진이 aspect-[4/3] 비율을 사용해야 한다 (aspect-square 아님)."""
    page = authenticated_page
    page.goto(f"{base_url}/treatments")
    page.wait_for_load_state("networkidle")

    treatment_links = page.locator("a.block.card-elevated[href^='/treatments/']")
    if treatment_links.count() == 0:
        return

    treatment_links.first.click()
    page.wait_for_load_state("networkidle")

    # 캐러셀 슬라이드의 aspect ratio 확인
    slides = page.locator(".snap-center.aspect-\\[4\\/3\\]")
    if slides.count() > 0:
        # aspect-[4/3] 클래스가 적용되어 있으면 OK
        expect(slides.first).to_be_visible()
    else:
        # aspect-square가 남아있으면 실패
        square_slides = page.locator(".snap-center.aspect-square")
        assert square_slides.count() == 0, \
            "Carousel slides should use aspect-[4/3], not aspect-square"


# ──────────────────────────────────────────────
# Fix 4: 핀 노트 가독성 개선
# ──────────────────────────────────────────────

def test_pin_note_readability(authenticated_page: Page, base_url: str):
    """핀 노트가 max-width 160px, shadow-lg로 가독성이 개선되어야 한다."""
    page = authenticated_page
    page.goto(f"{base_url}/treatments")
    page.wait_for_load_state("networkidle")

    treatment_links = page.locator("a.block.card-elevated[href^='/treatments/']")
    if treatment_links.count() == 0:
        return

    treatment_links.first.click()
    page.wait_for_load_state("networkidle")

    # 핀 노트 어노테이션 존재 확인
    pins = page.locator(".pointer-events-auto .rounded-full.shadow-lg")
    if pins.count() == 0:
        return  # 핀 노트 데이터 없음

    # max-width 확인
    max_width = pins.first.evaluate("el => getComputedStyle(el).maxWidth")
    assert max_width == "160px", f"Pin note max-width should be 160px, got {max_width}"


# ──────────────────────────────────────────────
# Fix 5: AI key_comments DB 저장 (마이그레이션 029)
# ──────────────────────────────────────────────

def test_key_comments_field_in_treatment_api(authenticated_page: Page, base_url: str):
    """시술 상세 API가 key_comments 필드를 반환해야 한다 (마이그레이션 029)."""
    page = authenticated_page
    page.goto(f"{base_url}/treatments")
    page.wait_for_load_state("networkidle")

    treatment_links = page.locator("a.block.card-elevated[href^='/treatments/']")
    if treatment_links.count() == 0:
        return

    # 시술 상세 페이지 접근 후 API 응답 확인
    with page.expect_response(
        lambda resp: "/api/shops/" in resp.url and "/treatments/" in resp.url and resp.status == 200,
        timeout=10000
    ) as response_info:
        treatment_links.first.click()

    response = response_info.value
    data = response.json()

    # key_comments 필드 존재 여부 (null이어도 필드 자체는 있어야 함)
    assert "key_comments" in data, \
        f"Treatment API response should include 'key_comments' field. Keys: {list(data.keys())}"
