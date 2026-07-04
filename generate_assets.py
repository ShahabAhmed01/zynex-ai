import asyncio
import os
from playwright.async_api import async_playwright

async def generate_assets():
    # Create directories
    os.makedirs("demo-assets/screenshots", exist_ok=True)
    os.makedirs("demo-assets/videos", exist_ok=True)

    async with async_playwright() as p:
        # Launch browser with recording enabled
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            record_video_dir="demo-assets/videos/",
            record_video_size={"width": 1920, "height": 1080},
            viewport={"width": 1920, "height": 1080}
        )
        page = await context.new_page()

        # Go to the application
        print("Navigating to the app...")
        await page.goto("http://localhost:8000")
        
        # Take initial screenshot (Landing Page)
        await page.wait_for_timeout(2000)
        await page.screenshot(path="demo-assets/screenshots/01-landing-page.png")
        print("Captured 01-landing-page.png")
        
        # Click the "Activate Free AI" banner or similar if needed.
        # Wait, the README says: "When you open the web UI, simply click the 'Activate Free AI' banner to instantly auto-provision your API key via OpenRouter."
        try:
            # Look for elements with text "Activate Free AI"
            banner = page.locator('text="Activate Free AI"')
            if await banner.count() > 0:
                await banner.click()
                await page.wait_for_timeout(2000)
                await page.screenshot(path="demo-assets/screenshots/02-activation.png")
                print("Captured 02-activation.png")
        except Exception as e:
            print("No activation banner found or click failed:", e)

        # Type a message to the AI
        print("Typing message...")
        # We need to find the chat input. Usually it's an input or textarea
        chat_input = page.locator('textarea, input[type="text"]').first
        await chat_input.type("Can you explain how the SSE streaming works in Zynex?", delay=50) # Realistic typing
        await page.wait_for_timeout(1000)
        await page.screenshot(path="demo-assets/screenshots/03-typing-message.png")
        print("Captured 03-typing-message.png")
        
        # Send message
        await chat_input.press("Enter")
        print("Message sent, waiting for response...")
        
        # Wait while it's generating
        await page.wait_for_timeout(3000)
        await page.screenshot(path="demo-assets/screenshots/04-generating-response.png")
        print("Captured 04-generating-response.png")
        
        # Wait more for full generation
        await page.wait_for_timeout(10000)
        await page.screenshot(path="demo-assets/screenshots/05-full-response.png")
        print("Captured 05-full-response.png")

        # Optionally test dark mode / light mode if available
        try:
            theme_btn = page.locator('button[aria-label="Toggle Theme"], button[title="Toggle Theme"], .theme-toggle')
            if await theme_btn.count() > 0:
                await theme_btn.click()
                await page.wait_for_timeout(1000)
                await page.screenshot(path="demo-assets/screenshots/06-theme-toggle.png")
                print("Captured 06-theme-toggle.png")
        except Exception as e:
            print("No theme toggle found:", e)

        # Close browser to save the video
        await context.close()
        await browser.close()
        print("Done capturing assets!")

if __name__ == "__main__":
    asyncio.run(generate_assets())
