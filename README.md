# 💰 AI Expense Tracker

An AI-powered expense management web application designed to help users manage their finances, track expenses, monitor transactions, and gain insights into their spending habits. The project also includes secure authentication, Premium Membership with Cashfree, and cloud deployment using AWS and Jenkins.

## 🌐 Live Demo

**Live Application:** [AI Expense Tracker](http://3.25.146.190/)

**GitHub Profile:** [Sujal Yadav](https://github.com/Sujalyadav-150)

## ✨ Features

- **User Authentication:** Secure user registration and login.
- **Expense Management:** Add, view, update, and delete expense records.
- **Expense Dashboard:** Organize and monitor financial transactions.
- **AI-Powered Insights:** Support for intelligent financial analysis, depending on the configured AI integration.
- **Premium Membership:** Payment integration using Cashfree.
- **Order Management:** Track payment orders and their statuses.
- **Forgot Password:** Account recovery functionality.
- **Responsive Interface:** Access the application through desktop and mobile browsers.
- **Cloud Deployment:** Hosted on an AWS server.
- **Automated Deployment:** Jenkins-based deployment workflow.

## 🛠️ Tech Stack

### Frontend
- HTML
- CSS
- JavaScript

### Backend
- Node.js
- Express.js
- REST APIs

### Database
- MongoDB

### Authentication and Payments
- JSON Web Token (JWT)
- Cashfree Payment Gateway

### Cloud and DevOps
- **AWS EC2** — Cloud hosting
- **Jenkins** — Deployment automation
- **GitHub** — Source code management
- **CI/CD** — Automated deployment workflow, depending on pipeline configuration

## ☁️ AWS Deployment & Jenkins

The application is deployed on AWS and uses Jenkins to streamline the deployment process.

### Deployment Workflow

1. Code changes are pushed to GitHub.
2. Jenkins executes the configured deployment pipeline.
3. The pipeline deploys the application to the AWS server.
4. Users access the application through its public endpoint.

### Live Server

[http://3.25.146.190/](http://3.25.146.190/)

> The live URL depends on the AWS server being active and its network and security configuration allowing access.

## 💳 Cashfree Payment Integration

The application includes a Premium Membership payment flow using Cashfree.

Typical payment workflow:

1. An authenticated user selects Premium Membership.
2. The backend creates a payment order.
3. The frontend opens the Cashfree checkout flow.
4. The backend verifies the payment status.
5. Premium access is activated only after successful server-side verification.

Use Cashfree sandbox credentials for testing and never expose payment secrets in the frontend or repository.

## 📂 Project Structure

```text
AI-Expense-Tracker/
├── backend/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── server.js
│   └── ...
├── frontend/
│   ├── css/
│   ├── js/
│   ├── index.html
│   └── ...
├── package.json
├── .gitignore
└── README.md
```

*Adjust this structure to match the actual folders and files in your repository.*

## ⚙️ Installation and Setup

### 1. Clone the repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd YOUR_PROJECT_FOLDER
```

### 2. Install dependencies

```bash
npm install
```

If the backend has its own `package.json`, install its dependencies separately:

```bash
cd backend
npm install
```

### 3. Configure environment variables

Create a `.env` file in the directory where the backend loads its environment configuration.

Example:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_strong_random_secret

CASHFREE_APP_ID=your_cashfree_app_id
CASHFREE_SECRET_KEY=your_cashfree_secret_key
CASHFREE_ENV=sandbox
```

Add any additional environment variables required by your actual project, including AI API keys and email credentials.

**Security:** Never commit `.env` files, API keys, database credentials, JWT secrets, or Cashfree secret keys to GitHub.

### 4. Start the application

Run the command configured in your `package.json`. For example:

```bash
npm start
```

If your frontend and backend run separately, start each using its configured command.

## 🔐 Security Considerations

- Store passwords securely using password hashing.
- Protect private expense APIs with authentication and authorization.
- Validate and authorize expense operations on the backend.
- Verify Cashfree payment status on the server.
- Keep all secrets in environment variables.
- Use HTTPS and appropriate server security settings in production.

## 🎯 Project Objectives

- Simplify personal finance management.
- Provide an organized interface for tracking expenses.
- Integrate secure online payments for premium features.
- Gain practical experience in backend development, cloud hosting, and deployment automation.
- Understand how GitHub and Jenkins can support a repeatable deployment workflow on AWS.

## 🚀 Future Enhancements

- Advanced spending analytics and interactive charts.
- Monthly budgets and expense category reports.
- More AI-driven financial insights.
- Automated testing and additional CI/CD pipeline stages.
- Improved monitoring and deployment notifications.

## 👨‍💻 Author

**Sujal Yadav**

GitHub: [Sujalyadav-150](https://github.com/Sujalyadav-150)

---

⭐ If you find this project useful, consider giving the repository a star.
