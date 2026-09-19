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

## API
GET /api/expenses
POST /api/expenses
DELETE /api/expenses/:id
POST /api/ai/categorize
GET /api/ai/insight
