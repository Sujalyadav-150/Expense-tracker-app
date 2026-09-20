# AI Expense Tracker
Node.js + Express Expense Tracker with AI-powered automatic categorization.

## Features
- Add expense amount and description
- AI automatically suggests a category
- Optional manual category
- SQLite persistence
- View and delete expenses
- AI spending insight
- OpenAI API key stays on backend

## Setup
cd backend
npm install
Create `.env`:
OPENAI_API_KEY=your_api_key_here
PORT=5000

Then:
npm start

Open `frontend/index.html` with VS Code Live Server.

## Deployment
Deploy the frontend to Vercel with `npm install` as the Install Command, `npm run build` as the Build Command, and `frontend/dist` as the Output Directory. Add `VITE_API_URL` to Vercel with the public URL of the separately deployed backend, for example `https://your-backend.example.com`.

Deploy the backend as a Node service from this repository using `npm install` and `npm start`. Set `PORT` from the hosting provider, `CORS_ORIGINS` to the Vercel frontend URL, and keep `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL`, and `JWT_SECRET` backend-only.

## API
GET /api/expenses
POST /api/expenses
DELETE /api/expenses/:id
POST /api/ai/categorize
GET /api/ai/insight
