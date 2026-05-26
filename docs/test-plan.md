# Test Plan: Zero-Config OAuth API Key Provisioning
 
## What Changed
The app now auto-detects when no API key is configured and shows an "Activate Free AI" banner with a one-click OAuth flow. The backend was fixed to properly route through OpenRouter, and config supports hot-reload after key provisioning.
 
## Primary End-to-End Flow
 
### Test 1: Setup banner appears in demo mode
**Steps:**
1. Open http://localhost:8000 in the browser
2. Wait for the page to fully load
 
**Pass criteria:**
- The "Activate Free AI" banner is visible at the top of the main content area
- The banner contains the text "Activate Free AI" and a "FREE" badge
- The banner contains descriptive text mentioning "Gemini, Llama, DeepSeek"
- The model selector in the header shows "Gemini 2.0 (Free)"
 
### Test 2: /api/config endpoint returns correct demo mode state
**Steps:**
1. Navigate to http://localhost:8000/api/config in browser
 
**Pass criteria:**
- Response JSON shows "demo_mode": true 
- Response JSON shows "has_api_key": false 
- Response JSON shows "default_model": "google/gemini-2.0-flash-001" 
 
### Test 3: Demo mode chat streaming works
**Steps:**
1. Navigate back to http://localhost:8000
2. Type "Hello, how are you?" in the chat input
3. Press Enter to send
 
**Pass criteria:**
- The demo response streams in token-by-token (typing animation visible)
- The response contains the demo mode marker text: "Running in demo mode"
- The response includes structured content (bold headings, bullet points)
- The conversation appears in the sidebar history
 
### Test 4: Activate AI button triggers OpenRouter popup
**Steps:**
1. Click the "Activate Free AI" button in the setup banner
 
**Pass criteria:**
- A popup window opens pointing to https://openrouter.ai/auth?callback_url=... 
- The callback_url parameter in the popup URL is URL-encoded (contains %3A, %2F etc.)
- The button changes to show "Connecting..." with a spinner animation
 
### Test 5: Model switcher cycles through free models
**Steps:**
1. Close the popup (we can't complete OAuth without credentials)
2. Click the model selector pill in the header
 
**Pass criteria:**
- Model label changes from "Gemini 2.0 (Free)" to "Llama 3.3 (Free)"
- A toast notification appears saying "Switched to Llama 3.3 (Free)"
- Click again: changes to "DeepSeek R1 (Free)"
- Click again: cycles back to "Gemini 2.0 (Free)"
