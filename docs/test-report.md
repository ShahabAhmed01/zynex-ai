# Test Report: Zero-Config OAuth API Key Provisioning (PR #1)
 
## Summary
Ran the app locally at localhost:8000 without any .env file to verify demo mode, setup banner, chat streaming, OAuth popup, and model switcher. All 5 tests passed.
 
## Test Results
 
### Test 1: Setup banner appears in demo mode — PASSED
- Banner visible at top with "Activate Free AI" text and green "FREE" badge
- Descriptive text mentions "Gemini, Llama, DeepSeek"
- "Activate Free AI" button is prominent and clickable
- Model selector shows "Gemini 2.0 (Free)" with green dot
 
### Test 2: /api/config returns correct demo mode state — PASSED
- Response: `{"demo_mode":true,"has_api_key":false,"default_model":"google/gemini-2.0-flash-001"}`
- All three fields present with expected values
 
### Test 3: Demo mode chat streaming works — PASSED
- Typed "Hello, how are you?" and pressed Enter
- Demo response streamed with structured content (numbered sections, bold headings, bullet points)
- Response includes demo mode notice: "Running in demo mode — activate free AI via the setup banner for real responses."
- Conversation appeared in sidebar history under "Today"
 
### Test 4: Activate AI button triggers OpenRouter popup — PASSED
- Clicked "Activate Free AI" button
- Popup window opened to OpenRouter sign-up page
- URL contains properly URL-encoded callback_url (`%253A`, `%252F` visible)
- Button in main app changed to "Connecting…" (disabled) while popup is open
- After closing popup, button reverted to "Activate Free AI"
 
### Test 5: Model switcher cycles through free models — PASSED
- Click 1: Gemini 2.0 (Free) → Llama 3.3 (Free) + toast "Switched to Llama 3.3 (Free)"
- Click 2: Llama 3.3 (Free) → DeepSeek R1 (Free) + toast "Switched to DeepSeek R1 (Free)"
- Click 3: DeepSeek R1 (Free) → Gemini 2.0 (Free) + toast "Switched to Gemini 2.0 (Free)"
 
## Limitations
- **Full OAuth key exchange not tested**: Could not complete the OpenRouter authentication flow (would require creating/logging into an OpenRouter account). Verified the popup opens correctly and the callback URL is properly encoded, but the actual key provisioning → .env save → config hot-reload → banner disappear flow was not exercised end-to-end.
- This is the primary risk area — the POST /api/auth/callback endpoint and the reload_settings() path should be tested with a real OpenRouter account before merging.
 
## CI Status
- 1 check passed, 0 failed
