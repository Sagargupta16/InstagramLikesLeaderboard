# /// script
# requires-python = ">=3.12"
# dependencies = ["playwright>=1.55", "pillow>=11"]
# ///
"""Capture README screenshots, the scan animation, and the social card from the demo page.

Serve the built site first (`npm run build`, then any static server on public/), then:

    uv run scripts/capture-screenshots.py http://127.0.0.1:8765

Writes docs/screenshots/*.webp and public/og-card.png. Needs a Chromium build for
Playwright (`uv run --with playwright playwright install chromium` once).
"""

from __future__ import annotations

import base64
import io
import sys
import time
from pathlib import Path

from PIL import Image
from playwright.sync_api import Page, sync_playwright

ROOT = Path(__file__).resolve().parent.parent
SHOTS = ROOT / "docs" / "screenshots"
DESKTOP = {"width": 1280, "height": 800}
PHONE = {"width": 390, "height": 844}
ANIMATION_SIZE = (960, 600)


def to_image(png: bytes) -> Image.Image:
    return Image.open(io.BytesIO(png)).convert("RGB")


def save_webp(png: bytes, name: str, width: int | None = None) -> None:
    image = to_image(png)
    if width and image.width > width:
        image = image.resize(
            (width, round(image.height * width / image.width)), Image.LANCZOS
        )
    image.save(SHOTS / name, "WEBP", quality=82, method=6)


def open_demo(page: Page, base: str) -> None:
    page.goto(f"{base}/demo.html")
    page.evaluate("localStorage.clear()")
    page.reload()
    page.wait_for_selector(".mode-selector")


def start_scan(page: Page) -> None:
    page.get_by_label("Follower comparison").check()
    page.get_by_role("button", name="Start scan").click()


def wait_for_results(page: Page) -> None:
    page.wait_for_selector(".results-nav", timeout=60_000)
    dismiss_toast(page)


def dismiss_toast(page: Page) -> None:
    close = page.locator(".toast__close-button")
    if close.count() > 0:
        close.click()
    page.wait_for_timeout(300)


def show_view(page: Page, label: str) -> None:
    page.get_by_role("button", name=label, exact=True).click()
    page.wait_for_timeout(350)


def scroll_to(page: Page, selector: str) -> None:
    # Scroll so the element sits just below the fixed app header.
    page.evaluate(
        """selector => {
            const element = document.querySelector(selector);
            const header = document.querySelector('.app-header');
            const offset = (header ? header.getBoundingClientRect().height : 0) + 8;
            window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY - offset);
        }""",
        selector,
    )
    page.wait_for_timeout(300)


def capture_scan_animation(page: Page) -> None:
    """Record the scan at its real pace: each frame is shown for the time it took."""
    frames: list[Image.Image] = []
    stamps: list[float] = []

    def grab() -> None:
        frames.append(to_image(page.screenshot()).resize(ANIMATION_SIZE, Image.LANCZOS))
        stamps.append(time.monotonic())

    page.get_by_label("Follower comparison").check()
    grab()
    page.get_by_role("button", name="Start scan").click()
    while page.locator(".results-nav").count() == 0 and len(frames) < 400:
        grab()
    wait_for_results(page)
    grab()

    durations = [round((b - a) * 1000) for a, b in zip(stamps, stamps[1:])]
    durations[0] = max(durations[0], 900)
    durations.append(3000)
    frames[0].save(
        SHOTS / "scan.webp",
        "WEBP",
        save_all=True,
        append_images=frames[1:],
        duration=durations,
        loop=0,
        quality=70,
        method=6,
    )
    print(
        f"scan animation: {len(frames)} frames, scan took {stamps[-1] - stamps[0]:.1f} s"
    )


def capture_desktop(page: Page, base: str) -> bytes:
    page.goto(f"{base}/")
    page.wait_for_timeout(300)
    save_webp(page.screenshot(), "landing-desktop.webp")

    open_demo(page, base)
    save_webp(page.screenshot(), "start-desktop.webp")
    capture_scan_animation(page)

    save_webp(page.screenshot(full_page=True), "dashboard-desktop.webp")
    show_view(page, "Leaderboard")
    leaderboard = page.screenshot()
    save_webp(leaderboard, "leaderboard-desktop.webp")
    show_view(page, "Follower Analysis")
    save_webp(page.screenshot(), "followers-desktop.webp")
    return leaderboard


def capture_phone(page: Page, base: str) -> None:
    open_demo(page, base)
    save_webp(page.screenshot(), "start-phone.webp", width=390)
    start_scan(page)
    wait_for_results(page)
    save_webp(page.screenshot(), "dashboard-phone.webp", width=390)
    show_view(page, "Leaderboard")
    scroll_to(page, ".tabs-container")
    save_webp(page.screenshot(), "leaderboard-phone.webp", width=390)
    show_view(page, "Follower Analysis")
    scroll_to(page, ".tabs-container")
    save_webp(page.screenshot(), "followers-phone.webp", width=390)


def capture_og_card(page: Page, app_png: bytes) -> None:
    shot = base64.b64encode(app_png).decode()
    page.set_viewport_size({"width": 1200, "height": 630})
    page.set_content(
        f"""<!DOCTYPE html><html><body style="margin:0;width:1200px;height:630px;overflow:hidden;
background:#0a0a0b;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f5f5f7">
<div style="position:absolute;left:64px;top:84px;width:500px">
  <div style="font-size:20px;letter-spacing:3px;color:#5eead4;font-weight:700">OPEN SOURCE &middot; MIT</div>
  <div style="font-size:56px;font-weight:800;line-height:1.05;margin-top:22px">Instagram<br>Likes Leaderboard</div>
  <div style="font-size:25px;line-height:1.4;color:#a1a1ac;margin-top:26px">
    See who likes your recent posts and who does not follow back.
    Runs in your browser with fixed, sequential request pacing.</div>
  <div style="display:inline-block;margin-top:34px;padding:14px 24px;border:2px solid #5eead4;border-radius:999px;
    color:#5eead4;font-size:22px;font-weight:700">Try the live demo</div>
</div>
<img src="data:image/png;base64,{shot}" style="position:absolute;left:600px;top:64px;width:820px;
  border:1px solid #3a3a42;border-radius:16px;box-shadow:0 24px 60px rgba(0,0,0,.6)">
</body></html>"""
    )
    page.wait_for_timeout(200)
    to_image(page.screenshot()).save(
        ROOT / "public" / "og-card.png", "PNG", optimize=True
    )


def main() -> None:
    base = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8765").rstrip("/")
    SHOTS.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        desktop = browser.new_page(viewport=DESKTOP, color_scheme="dark")
        leaderboard_png = capture_desktop(desktop, base)
        phone = browser.new_page(
            viewport=PHONE,
            device_scale_factor=2,
            is_mobile=True,
            has_touch=True,
            color_scheme="dark",
        )
        capture_phone(phone, base)
        capture_og_card(desktop, leaderboard_png)
        browser.close()
    for path in sorted([*SHOTS.glob("*.webp"), ROOT / "public" / "og-card.png"]):
        print(f"{path.relative_to(ROOT).as_posix()}  {path.stat().st_size:,} bytes")


if __name__ == "__main__":
    main()
