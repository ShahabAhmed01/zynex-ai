---
name: testing-zynex-ai
description: Test the Zynex AI chat application end-to-end. Use when verifying UI changes, OAuth flow, demo mode, or model switcher.
---
 
# Testing Zynex AI
 
## Prerequisites
- Python 3.x with dependencies from requirements.txt installed
- No .env file needed for demo mode testing (app auto-detects and runs in demo mode)
 
## Devin Secrets Needed
- **OPENROUTER_API_KEY** (optional): Only needed to test the full OAuth key exchange flow end-to-end. Without it, you can still verify demo mode, banner UI, popup trigger, and model switching.
 
## Starting the Server
```bash
cd /home/ubuntu/repos/zynex-ai
pip install -r requirements.txt
python run.py
# Server runs on http://localhost:8000
```
 
If port 8000 is already in use, kill the existing process first:
```bash
lsof -ti:8000 | xargs kill -9 2>/dev/null
python run.py
```
 
## Key Test Areas
 
### 1. Demo Mode (No API Key)
- Navigate to http://localhost:8000 
- Verify the "Activate Free AI" banner appears at the top with a "FREE" badge
- Verify /api/config returns `{"demo_mode":true,"has_api_key":false,"default_model":"google/gemini-2.0-flash-001"}`
- Send a chat message — should receive a structured demo response with sections, bullet points
- Demo response should end with italic text: "Running in demo mode — activate free AI via the setup banner for real responses."
 
### 2. OAuth Flow
- Click "Activate Free AI" button
- A popup should open to openrouter.ai/auth (or openrouter.ai/sign-up with redirect)
- The callback URL in the popup URL should be URL-encoded (look for %253A, %252F)
- The button should change to "Connecting…" (disabled) while the popup is open
- After closing the popup without authenticating, the button should revert to "Activate Free AI"
- **Full OAuth test** (requires OpenRouter account): Complete the auth flow, verify key is saved to .env, config hot-reloads, and the banner disappears
 
### 3. Model Switcher
- Click the model selector pill in the header (e.g., "Gemini 2.0 (Free)")
- It should cycle through: Gemini 2.0 → Llama 3.3 → DeepSeek R1 → Gemini 2.0
- A toast notification should appear for each switch (e.g., "Switched to Llama 3.3 (Free)")
 
### 4. API Endpoints
- GET /api/config — returns demo_mode status and default model
- GET /api/auth/url?callback_url=http://localhost:8000/?oauth=callback — returns OpenRouter auth URL
- POST /api/auth/callback with {"code": "test"} — exchanges code for key (will fail with invalid code, but verifies endpoint exists)
 
## Common Issues
- **Port already in use**: The server might already be running from a previous attempt. Kill the process on port 8000 first.
- **Missing dependencies**: Run pip install -r requirements.txt if you get import errors. Key dependencies: fastapi, uvicorn, httpx, openai.
- **Stale config after key provisioning**: If reload_settings() doesn't seem to take effect, check that all modules use get_settings() instead of importing the settings object directly.
- **OAuth popup might open as a new tab** instead of a popup window depending on browser settings. The flow still works — it redirects back to the app with a ?code= parameter.
