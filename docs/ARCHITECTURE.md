# Architecture Design

## Overview
AIProjecTy is a lightweight, single-screen AI chat application. It's designed to be robust, self-hosted, and maintainable. The application leverages a backend written in Python using FastAPI, and a frontend built with pure HTML, CSS, and Vanilla JavaScript.

## Frontend
The frontend follows a zero-dependency architecture. 
- **`index.html`**: Defines the main layout, sidebar, and message areas.
- **`js/app.js`**: Handles user interactions, SSE (Server-Sent Events) streaming, rendering markdown content, and managing state in `localStorage`. 

By strictly adhering to Vanilla JS, the application ensures high performance and an extremely quick loading time, keeping the developer footprint low.

## Backend
The backend runs on FastAPI and acts as a gateway to the OpenAI API.
- **`main.py`**: The entrypoint to the FastAPI app. Responsible for setting up CORS, static file mounts, and connecting routers.
- **`routes/chat.py`**: A dedicated API route for processing chat inputs and connecting to the OpenAI streaming endpoint.
- **`services/openai_service.py`**: Handles direct communication with the OpenAI API. It yields SSE responses token-by-token directly to the client.

## Data Flow
1. **User input**: The user types a message and clicks send.
2. **Client request**: The frontend sends an HTTP POST request to `/api/chat` with the entire conversation history.
3. **Backend proxy**: The backend forwards the request to OpenAI API asynchronously.
4. **SSE Streaming**: As the OpenAI API streams the response back to the backend, the backend forwards the tokens as an Event Stream.
5. **Real-time update**: The frontend receives the chunks and dynamically updates the DOM. Markdown is processed and rendered on the fly.
