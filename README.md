# 💰 AI Expense Tracker

An expense management web application designed to help users track expenses, manage transactions, and explore smarter financial insights. The project also includes a Premium Membership payment flow and cloud deployment using AWS EC2 and Jenkins.

## 🌐 Live Demo

**Live Application:** [http://3.25.146.190/](http://3.25.146.190/)

**GitHub Profile:** [Sujal Yadav](https://github.com/Sujalyadav-150)

> The live demo depends on the AWS instance being active and its network configuration allowing access. The URL currently uses HTTP; configure HTTPS before using real sensitive data.

## ✨ Features

- **User Authentication:** Sign-up and login functionality.
- **Expense Management:** Add, view, update, and delete expense records, where implemented.
- **Expense Dashboard:** View and organize financial transactions.
- **Premium Membership:** Cashfree payment gateway integration.
- **Order Management:** Create and track payment orders according to the implemented payment flow.
- **Password Recovery:** Forgot-password functionality, if configured.
- **AI-Enabled Insights:** AI-related functionality depends on the API integration and configuration in the current codebase.
- **Cloud Hosting:** Application hosted on an AWS server.
- **Deployment Automation:** Jenkins deployment workflow.

## 🛠️ Tech Stack

### Application
- HTML, CSS, JavaScript
- Node.js
- Express.js
- REST APIs
- MongoDB

### Authentication and Payments
- JSON Web Token (JWT), if enabled in the application
- Cashfree Payment Gateway

### DevOps and Deployment
- AWS EC2 — cloud server hosting
- Jenkins — deployment automation
- GitHub — source code management
- PM2 — process management, if configured on the server

## 🏗️ Architecture

```text
User Browser
    |
    v
Frontend (HTML, CSS, JavaScript)
    |
    v
Backend API (Node.js + Express)
    |
    v
MongoDB Database

Source Code: GitHub
       |
       v
Jenkins Deployment Job
       |
       v
AWS EC2 Server
       |
       v
Live Application: http://3.25.146.190/
```

## 🔄 Deployment Workflow

1. Update the application code.
2. Commit and push changes to the GitHub repository.
3. Run the configured Jenkins job.
4. Jenkins fetches the configured branch and runs the deployment commands.
5. The application process is restarted on the AWS EC2 instance, if configured in the pipeline.
6. Open the live URL and verify that the updated version works.

**Pipeline note:** Describe this as an automated deployment pipeline. Claim automated tests or a complete CI/CD pipeline only if those stages are actually configured and working in Jenkins.

## 📂 Project Structure

The exact layout may differ in your repository. Update this example to match the real folders:

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

## ⚙️ Local Setup

### Prerequisites

- Node.js and npm
- MongoDB local instance or MongoDB Atlas database
- Git

### 1. Clone the repository

Replace the placeholder with your actual GitHub repository URL:

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd YOUR_PROJECT_FOLDER
```

### 2. Install dependencies

```bash
npm install
```

If the backend has a separate `package.json`, install its dependencies from that directory as well:

```bash
cd backend
npm install
```

### 3. Configure environment variables

Create a `.env` file in the directory from which the backend loads environment variables. Example variable names (use the names expected by your code):

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=replace_with_a_long_random_secret

CASHFREE_APP_ID=your_cashfree_app_id
CASHFREE_SECRET_KEY=your_cashfree_secret_key
CASHFREE_ENV=sandbox
```

Add any other variables your project needs, such as AI provider keys or SMTP settings. Do not commit real values.

### 4. Start the application

Use the scripts defined in your `package.json`. For example:

```bash
npm start
```

If frontend and backend are served separately, start each using its configured script or local HTTP server. Then open the local URL shown by your setup.

## 💳 Cashfree Payment Flow

A typical Premium Membership flow is:

1. The signed-in user selects Premium Membership.
2. The backend creates a payment order.
3. The frontend opens the Cashfree checkout.
4. The backend verifies the payment status with Cashfree.
5. Premium access is granted only after the backend confirms successful payment.

Use Cashfree sandbox credentials for testing. Never grant paid access based only on a frontend success message.

## 🔐 Security Notes

- Keep `.env` files, API keys, database credentials, and payment secrets out of Git.
- Use strong, unique secrets in production.
- Validate and authorize expense operations on the backend.
- Verify payments server-side before activating Premium Membership.
- Restrict database access and configure server/network rules carefully.
- Configure HTTPS before sending credentials or financial data over the public internet.

## 🧪 Testing Before a Demo

- [ ] Open the live application URL.
- [ ] Test sign-up and login.
- [ ] Add an expense and confirm it appears in the dashboard.
- [ ] Test editing and deleting an expense if supported.
- [ ] Confirm records persist after refreshing.
- [ ] Test Cashfree using sandbox credentials.
- [ ] Run the Jenkins deployment job and check its console output.
- [ ] Verify the updated application after deployment.

## 🎯 What I Learned

- Full-stack web application development.
- REST API design and database integration.
- User authentication and payment workflow concepts.
- Hosting a web application on AWS EC2.
- Managing source code with Git and GitHub.
- Automating application deployment with Jenkins.

## 👨‍💻 Author

**Sujal Yadav**  
GitHub: [Sujalyadav-150](https://github.com/Sujalyadav-150)

---

If you find this project useful, consider starring the repository.
