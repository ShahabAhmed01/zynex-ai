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
- Verify the "AI text is simulated in demo mode" banner appears at the top
- Verify /api/config returns `{"demo_mode":true,"has_api_key":false,"default_model":"google/gemma-4-31b-it:free"}`
- Send a chat message — should receive a structured demo response with sections, bullet points
- Demo responses should be clearly labelled in UI and report exports

### 2. Activation Flow
- Click "Activate free AI" button
- A popup should open to openrouter.ai/auth
- After successful authentication and key exchange, the key is saved to .env and config hot-reloads
- Demo banner and model menu reflect live mode

### 3. Model Switcher
- Click the model selector pill in the header (e.g., "Gemma 4 31B")
- It cycles through verified free models: Gemma 4 31B → Nemotron 3.5 Lightning → Nemotron 3 Ultra 550B

### 4. API Endpoints
- GET /api/config — returns demo_mode status, has_api_key, free_models list, and version
- GET /api/auth/url?callback_url=… — returns OpenRouter auth URL
- POST /api/auth/callback with {"code": "…"} — exchanges code for API key
 
## Common Issues
- **Port already in use**: The server might already be running from a previous attempt. Kill the process on port 8000 first.
- **Missing dependencies**: Run pip install -r requirements.txt if you get import errors. Key dependencies: fastapi, uvicorn, httpx, openai.
- **Stale config after key provisioning**: If reload_settings() doesn't seem to take effect, check that all modules use get_settings() instead of importing the settings object directly.
- **OAuth popup might open as a new tab** instead of a popup window depending on browser settings. The flow still works — it redirects back to the app with a ?code= parameter.
