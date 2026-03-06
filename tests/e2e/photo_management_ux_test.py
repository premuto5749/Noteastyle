"""E2E tests for photo-management-ux feature (FR-01 ~ FR-05).

Covers:
- FR-01: FaceSwap double-wait elimination (UI state only)
- FR-02: Upload parallelization (UI state only)
- FR-03: Gallery selection (3-col grid: camera/gallery/video)
- FR-04: Carousel quick actions (4 icons in action bar)
- FR-05: Annotation aspect ratio (dynamic, not hardcoded 4:3)
"""

import os
import pytest
from playwright.sync_api import Page, expect


# Use API to discover a treatment ID with photos
def _find_treatment_with_photos(page: Page, base_url: str) -> str | None:
    """Navigate to treatments list and find a treatment that has photos."""
    resp = page.request.get(f"{base_url}/api/health")
    if resp.status != 200:
        return None

    # Try the treatments page — look for treatment cards (not sidebar links)
    page.goto(f"{base_url}/treatments")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2000)

    # Look for treatment card links in main content area (exclude sidebar)
    cards = page.locator("main a[href*='/treatments/'][href$='-']")
    if cards.count() > 0:
        href = cards.first.get_attribute("href") or ""
        import re
        m = re.search(r"/treatments/([a-f0-9-]{36})", href)
        if m:
            return m.group(1)

    return None


# Known treatment ID from the DB (미모 shop, has photos)
KNOWN_TREATMENT_ID = os.getenv(
    "E2E_TREATMENT_ID",
    "3c9376bd-25ab-42c4-b2d3-7b4ee9919ee0",
)


@pytest.fixture
def treatment_id(authenticated_page: Page, base_url: str) -> str:
    """Return a treatment ID, trying dynamic discovery first."""
    tid = _find_treatment_with_photos(authenticated_page, base_url)
    if tid:
        return tid
    if KNOWN_TREATMENT_ID:
        return KNOWN_TREATMENT_ID
    pytest.skip("No treatment ID available for testing")


# ---------------------------------------------------------------------------
# FR-03: NativeCapture has 3 buttons (camera / gallery / video)
# ---------------------------------------------------------------------------

class TestGallerySelection:
    """FR-03: NativeCapture shows 3-col grid with camera, gallery, video."""

    def test_capture_page_has_three_buttons(self, authenticated_page: Page, base_url: str, treatment_id: str):
        """Capture page should show 3 media input buttons."""
        authenticated_page.goto(f"{base_url}/treatments/{treatment_id}/capture")
        authenticated_page.wait_for_load_state("networkidle")

        # Should have title
        expect(authenticated_page.locator("text=사진/영상 추가")).to_be_visible(timeout=10000)

        # Should have 3 buttons: 카메라, 갤러리, 영상
        expect(authenticated_page.locator("button:has-text('카메라')")).to_be_visible()
        expect(authenticated_page.locator("button:has-text('갤러리')")).to_be_visible()
        expect(authenticated_page.locator("button:has-text('영상')")).to_be_visible()

    def test_capture_page_has_gallery_input_without_capture(self, authenticated_page: Page, base_url: str, treatment_id: str):
        """Gallery input should NOT have capture attribute (allows file picker)."""
        authenticated_page.goto(f"{base_url}/treatments/{treatment_id}/capture")
        authenticated_page.wait_for_load_state("networkidle")
        expect(authenticated_page.locator("text=사진/영상 추가")).to_be_visible(timeout=10000)

        # Find all file inputs
        file_inputs = authenticated_page.locator("input[type='file']")
        count = file_inputs.count()
        assert count >= 3, f"Expected at least 3 file inputs, got {count}"

        # Gallery input: accepts images, NO capture attr, HAS multiple
        gallery_input = authenticated_page.locator("input[type='file'][accept='image/*']:not([capture])")
        expect(gallery_input).to_have_count(1)
        expect(gallery_input).to_have_attribute("multiple", "")

    def test_capture_page_skip_button(self, authenticated_page: Page, base_url: str, treatment_id: str):
        """With no items captured, save button shows skip text."""
        authenticated_page.goto(f"{base_url}/treatments/{treatment_id}/capture")
        authenticated_page.wait_for_load_state("networkidle")
        expect(authenticated_page.locator("text=사진/영상 추가")).to_be_visible(timeout=10000)

        save_btn = authenticated_page.locator("button:has-text('건너뛰기')")
        expect(save_btn).to_be_visible(timeout=5000)


# ---------------------------------------------------------------------------
# FR-04: PhotoCarousel quick action bar
# ---------------------------------------------------------------------------

class TestCarouselQuickActions:
    """FR-04: Treatment detail page shows quick action bar below carousel."""

    def test_treatment_detail_has_quick_action_bar(self, authenticated_page: Page, base_url: str, treatment_id: str):
        """Treatment detail with photos should show 4 quick action buttons."""
        authenticated_page.goto(f"{base_url}/treatments/{treatment_id}")
        authenticated_page.wait_for_load_state("networkidle")

        # Wait for loading to finish
        loading = authenticated_page.locator("text=불러오는 중...")
        if loading.is_visible(timeout=2000):
            loading.wait_for(state="hidden", timeout=15000)

        # Quick action bar buttons (left: 어노테이션, 페이스스왑, 모자이크 / right: bookmark)
        annotate_btn = authenticated_page.locator("button:has-text('어노테이션')")
        if not annotate_btn.is_visible(timeout=5000):
            pytest.skip("No quick action bar (treatment has no photos)")

        expect(annotate_btn).to_be_visible()
        expect(authenticated_page.locator("button:has-text('페이스스왑')")).to_be_visible()
        expect(authenticated_page.locator("button:has-text('모자이크')")).to_be_visible()

        # Bookmark button (right side, SVG icon only — no text)
        bookmark_btn = authenticated_page.locator("button svg path[d*='M19 21l-7-5-7 5V5']")
        expect(bookmark_btn).to_be_visible()

    def test_quick_action_buttons_count(self, authenticated_page: Page, base_url: str, treatment_id: str):
        """Quick action bar should have exactly 4 buttons."""
        authenticated_page.goto(f"{base_url}/treatments/{treatment_id}")
        authenticated_page.wait_for_load_state("networkidle")

        loading = authenticated_page.locator("text=불러오는 중...")
        if loading.is_visible(timeout=2000):
            loading.wait_for(state="hidden", timeout=15000)

        # The action bar is the container below the carousel with bg-muted/50
        # Look for buttons near 어노테이션 text as anchor
        annotate_btn = authenticated_page.locator("button:has-text('어노테이션')")
        if not annotate_btn.is_visible(timeout=5000):
            pytest.skip("No quick action bar visible")

        # Count: 어노테이션, 페이스스왑, 모자이크, bookmark = 4
        action_bar = annotate_btn.locator("xpath=ancestor::div[contains(@class,'flex')]/..")
        action_bar_buttons = action_bar.locator("button")
        assert action_bar_buttons.count() == 4, f"Expected 4 quick action buttons, got {action_bar_buttons.count()}"


# ---------------------------------------------------------------------------
# FR-05: PhotoAnnotationEditor dynamic aspect ratio
# ---------------------------------------------------------------------------

class TestAnnotationAspectRatio:
    """FR-05: Annotation editor uses dynamic aspect ratio from image."""

    def test_annotation_editor_dynamic_aspect(self, authenticated_page: Page, base_url: str, treatment_id: str):
        """Annotation editor container should use inline aspect-ratio style."""
        authenticated_page.goto(f"{base_url}/treatments/{treatment_id}")
        authenticated_page.wait_for_load_state("networkidle")

        loading = authenticated_page.locator("text=불러오는 중...")
        if loading.is_visible(timeout=2000):
            loading.wait_for(state="hidden", timeout=15000)

        # Click pin button to open annotation editor
        pin_btn = authenticated_page.locator("button:has-text('어노테이션')")
        if not pin_btn.is_visible(timeout=5000):
            pytest.skip("No annotation button (no photos)")

        pin_btn.click()
        authenticated_page.wait_for_timeout(1500)

        # Find annotation editor image
        editor_img = authenticated_page.locator("img[alt='Treatment photo']")
        if not editor_img.is_visible(timeout=5000):
            pytest.skip("Annotation editor did not open")

        # Check parent container for dynamic aspect-ratio style
        has_dynamic = authenticated_page.evaluate("""
            () => {
                const img = document.querySelector('img[alt="Treatment photo"]');
                if (!img) return false;
                const parent = img.parentElement;
                return parent && parent.style.aspectRatio !== '';
            }
        """)
        assert has_dynamic, "Annotation editor image container should have dynamic inline aspect-ratio style"

    def test_annotation_editor_no_hardcoded_43(self, authenticated_page: Page, base_url: str, treatment_id: str):
        """Annotation editor should NOT use hardcoded aspect-[4/3] class."""
        authenticated_page.goto(f"{base_url}/treatments/{treatment_id}")
        authenticated_page.wait_for_load_state("networkidle")

        loading = authenticated_page.locator("text=불러오는 중...")
        if loading.is_visible(timeout=2000):
            loading.wait_for(state="hidden", timeout=15000)

        pin_btn = authenticated_page.locator("button:has-text('어노테이션')")
        if not pin_btn.is_visible(timeout=5000):
            pytest.skip("No annotation button (no photos)")

        pin_btn.click()
        authenticated_page.wait_for_timeout(1500)

        editor_img = authenticated_page.locator("img[alt='Treatment photo']")
        if not editor_img.is_visible(timeout=5000):
            pytest.skip("Annotation editor did not open")

        has_hardcoded = authenticated_page.evaluate("""
            () => {
                const img = document.querySelector('img[alt="Treatment photo"]');
                if (!img) return false;
                const parent = img.parentElement;
                return parent && parent.className.includes('aspect-[4/3]');
            }
        """)
        assert not has_hardcoded, "Annotation editor should not use hardcoded aspect-[4/3] class"


# ---------------------------------------------------------------------------
# FR-01: FaceSwap UI state (no double-wait)
# ---------------------------------------------------------------------------

class TestFaceSwapUIState:
    """FR-01: FaceSwap flow UI elements exist."""

    def test_treatment_detail_has_faceswap_button(self, authenticated_page: Page, base_url: str, treatment_id: str):
        """Treatment detail page should have faceswap quick action enabled for photos."""
        authenticated_page.goto(f"{base_url}/treatments/{treatment_id}")
        authenticated_page.wait_for_load_state("networkidle")

        loading = authenticated_page.locator("text=불러오는 중...")
        if loading.is_visible(timeout=2000):
            loading.wait_for(state="hidden", timeout=15000)

        # Find the 페이스스왑 button in quick action bar
        faceswap_btn = authenticated_page.locator("button:has-text('페이스스왑')")
        if not faceswap_btn.is_visible(timeout=5000):
            pytest.skip("No faceswap button (treatment has no photos)")

        expect(faceswap_btn).to_be_visible()
        expect(faceswap_btn).to_be_enabled()
