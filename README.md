 AI Expense Tracker

A full-stack AI-powered Expense Tracker built with HTML, CSS, JavaScript, Node.js, Express, SQLite, Sequelize, JWT authentication, and OpenAI-compatible AI APIs.

The application allows users to create an account, log in securely, add and manage expenses, automatically categorize expenses using AI, and get AI-generated spending insights.

✨ Features

🔐 Authentication

User registration with email and password

Login with email and password

Password hashing with bcryptjs

JWT-based authentication

Persistent login using browser local storage

Logout functionality

Email validation and password length validation

💸 Expense Management

Add expenses with:

Amount

Description

Category

View all expenses

Delete expenses

Calculate total spending

Expense date display

Responsive expense dashboard

🤖 AI Features

Automatic expense category suggestion

AI-powered spending insights

Manual category selection is also available

AI requests are handled by the backend so the API key is not exposed in the frontend

👑 Premium Feature

Premium-user category/spending leaderboard

Premium access controlled through configured email addresses

Leaderboard ranks users according to total spending

🗄️ Database

SQLite database

Sequelize ORM

User and Expense models

Persistent expense and user data

🚀 Deployment

Vercel-compatible frontend build

Serverless API entry point

CORS configuration for deployed frontend/backend

Environment-variable based configuration

🛠️ Tech Stack

Frontend

HTML5

CSS3

Vanilla JavaScript

Vite

Backend

Node.js

Express.js

REST API

JWT

bcryptjs

Database

SQLite

Sequelize ORM

AI

OpenAI-compatible API

OpenRouter support

AI expense categorization

AI spending insights

Deployment

Vercel

GitHub

📁 Project Structure

AI-Expense-Tracker/
│
├── api/
│   └── index.js
│
├── backend/
│   ├── config/
│   │   └── database.js
│   ├── controllers/
│   │   ├── aiController.js
│   │   ├── authController.js
│   │   └── expenseController.js
│   ├── middleware/
│   │   └── auth.js
│   ├── models/
│   │   ├── Expense.js
│   │   └── User.js
│   ├── routes/
│   │   ├── aiRoutes.js
│   │   ├── authRoutes.js
│   │   └── expenseRoutes.js
│   ├── services/
│   │   └── aiService.js
│   ├── app.js
│   ├── server.js
│   └── .env.example
│
├── frontend/
│   ├── index.html
│   ├── script.js
│   └── style.css
│
├── .gitignore
├── package.json
├── package-lock.json
├── vercel.json
└── README.md

⚙️ Prerequisites

Make sure you have installed:

Node.js

npm

Git

A GitHub account

An OpenRouter/OpenAI-compatible API key for AI features

Check Node.js:

node --version

Check npm:

npm --version

🚀 Run Locally

1. Clone the repository

git clone https://github.com/Sujalyadav-150/Expense-tracker-app.git

Move into the project:

cd Expense-tracker-app

2. Install dependencies

npm install

3. Configure environment variables

Create:

backend/.env

Use backend/.env.example as a template:

OPENAI_API_KEY=your_api_key_here
OPENAI_BASE_URL=https://openrouter.ai/api/v1
OPENAI_MODEL=openai/gpt-4o-mini
PORT=5000
JWT_SECRET=replace_with_a_long_random_secret
PREMIUM_EMAILS=premium@example.com
CORS_ORIGINS=http://localhost:5173

Never commit .env or API keys to GitHub.

4. Start the backend

npm start

The backend will run on:

http://localhost:5000

5. Start the frontend

The frontend uses Vite. Run:

npm run build

For local frontend development, use a static/Vite development server as appropriate for your setup.

🔑 Authentication Flow

Registration

The user provides:

Email
Password

The password is hashed using bcryptjs before it is stored.

Login

The user provides:

Email
Password

After successful authentication, the backend returns a JWT token.

The frontend stores the authentication token in browser local storage and sends it with protected requests.

Example:

Authorization: Bearer <JWT_TOKEN>

🤖 AI Expense Categorization

If the user does not manually select a category, the application sends the expense description to the backend AI service.

Example:

Description:
"Pizza and cold drink"

AI Category:
Food

Another example:

Description:
"Uber ride to office"

AI Category:
Travel

If AI categorization fails, the application safely falls back to:

Other

📊 AI Spending Insight

The application can analyze stored expenses and generate an AI-based spending insight.

Example types of insights:

Spending patterns

Frequently used categories

High spending areas

General suggestions for managing expenses

👑 Premium Leaderboard

Premium users can access the spending leaderboard.

Premium access is configured using:

PREMIUM_EMAILS=premium@example.com

Multiple premium emails can be configured using commas:

PREMIUM_EMAILS=user1@example.com,user2@example.com

The leaderboard calculates total expenses per user and ranks them by spending.

🔌 REST API

Authentication

Register

POST /api/auth/register

Request:

{
  "email": "user@example.com",
  "password": "password123"
}

Login

POST /api/auth/login

Request:

{
  "email": "user@example.com",
  "password": "password123"
}

Expenses

Get Expenses

GET /api/expenses

Add Expense

POST /api/expenses

Request:

{
  "amount": 500,
  "description": "Lunch",
  "category": "Food"
}

Delete Expense

DELETE /api/expenses/:id

Premium Leaderboard

GET /api/expenses/leaderboard

Requires authentication and premium access.

AI

Categorize Expense

POST /api/ai/categorize

Request:

{
  "description": "Dinner at restaurant"
}

Spending Insight

GET /api/ai/insight

🌐 Deployment

The project includes a vercel.json configuration for Vercel deployment.

Build command:

npm run build

Output directory:

frontend/dist

The project also contains:

api/index.js

which provides the serverless API entry point for Vercel.

Environment Variables

Configure the required environment variables in the deployment platform:

OPENAI_API_KEY=your_api_key
OPENAI_BASE_URL=https://openrouter.ai/api/v1
OPENAI_MODEL=openai/gpt-4o-mini
JWT_SECRET=your_secure_secret
PREMIUM_EMAILS=premium@example.com
CORS_ORIGINS=https://your-frontend-domain.vercel.app

Do not expose private backend secrets in frontend environment variables.

🔒 Security

The project includes several security-related practices:

Password hashing with bcryptjs

JWT authentication

Backend-only AI API key

.env excluded from Git

SQLite database files excluded from Git

CORS configuration

Input validation

Protected premium API endpoint

Important

Do not upload:

.env
API keys
JWT secrets
database credentials

to GitHub.

📌 Future Improvements

Possible improvements include:

Edit expense functionality

Monthly/yearly expense reports

Expense charts and visual analytics

Budget limits and notifications

Password reset through email

Refresh-token based authentication

PostgreSQL/MySQL production database

More advanced AI financial recommendations

Export expenses to CSV/PDF

Improved role and permission management

👨‍💻 Author

Sujal Yadav

GitHub:
https://github.com/Sujalyadav-150

Project Repository:
https://github.com/Sujalyadav-150/Expense-tracker-app

⭐ Support

If you find this project useful, consider giving the repository a ⭐ on GitHub.
