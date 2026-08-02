# IDN Live Mirror – Clean Live Streaming Platform

**IDN Live Mirror** is a clean, distraction-free web application for viewing JKT48 IDN Live streaming. Built with FastAPI (Python) backend and a lightweight, responsive HTML/CSS/JS frontend powered by `hls.js`.

## Features
- **2-Column Layout**: 70% Video Player, 30% Live Chat Comment panel (Desktop).
- **Responsive Design**: Stacks video and comments seamlessly on Mobile devices (< 768px).
- **Dark/Light Mode**: Smooth theme toggle with persistent user preference in `localStorage`.
- **FastAPI Proxy**: Protects API Keys and caches stream info for optimal performance.
- **Mock Fallback Mode**: Works out-of-the-box locally even without an active JKT48Connect API Key.

## Project Structure
```text
idn-live-mirror/
├── apps/
│   ├── frontend/          # Clean Static Frontend (HTML, CSS, JS, hls.js)
│   │   ├── index.html
│   │   ├── css/style.css
│   │   └── js/app.js
│   └── backend/           # Python FastAPI Serverless Backend
│       ├── api/index.py
│       ├── requirements.txt
│       └── .env.example
├── vercel.json            # Vercel Monorepo deployment config
├── pnpm-workspace.yaml
└── package.json
```

## Running Locally

### Backend (FastAPI)
1. Navigate to `apps/backend` or install requirements:
   ```bash
   pip install -r apps/backend/requirements.txt
   ```
2. Set `JKT48_API_KEY` in environment or create a `.env` file in `apps/backend/`. (Optional: if omitted, Mock Mode activates automatically).
3. Start uvicorn:
   ```bash
   uvicorn apps.backend.api.index:app --reload --port 8000
   ```

### Frontend
Serve `apps/frontend` using any static web server, or via python:
```bash
python -m http.server 3000 --directory apps/frontend
```
Open `http://localhost:3000` in your browser.

## Deployment
Deploy directly to [Vercel](https://vercel.com) by connecting your Git repository. `vercel.json` automatically configures Python serverless API functions and static frontend hosting.
