import asyncio
import os
from playwright.async_api import async_playwright

async def generate_assets():
    os.makedirs("demo-assets/videos", exist_ok=True)

    async with async_playwright() as p:
        # Launch browser with recording enabled for Mobile/Vertical view
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            record_video_dir="demo-assets/videos/",
            record_video_size={"width": 1080, "height": 1920},
            viewport={"width": 1080, "height": 1920},
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1"
        )
        page = await context.new_page()

        print("Navigating to the app (Mobile View)...")
        await page.goto("http://localhost:8000")
        
        await page.wait_for_timeout(2000)
        
        # Type a message
        print("Typing message...")
        chat_input = page.locator('textarea, input[type="text"]').first
        await chat_input.type("How fast is Zynex?", delay=50)
        await page.wait_for_timeout(1000)
        
        # Send message
        await chat_input.press("Enter")
        print("Message sent, waiting for response...")
        
        # Wait for full generation
        await page.wait_for_timeout(8000)

        # Close browser
        await context.close()
        await browser.close()
        print("Done capturing vertical assets!")

if __name__ == "__main__":
    asyncio.run(generate_assets())
