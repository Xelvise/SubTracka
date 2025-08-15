# Subscription Tracker

A comprehensive subscription management API built with Node.js, Express, and PostgreSQL. This application helps users track their various subscriptions, manage renewal dates, and receive timely reminders through email notifications.

## 🎯 Project Aim

The Subscription Tracker is designed to help users:

-   **Track multiple subscriptions** across different categories (sports, news, entertainment, lifestyle, technology, finance, politics, etc.)
-   **Monitor subscription costs** with support for multiple currencies (USD, EUR, GBP)
-   **Manage renewal dates** and receive automated reminders
-   **Organize subscriptions** by frequency (daily, weekly, monthly, yearly)
-   **Track payment methods** (credit card, PayPal, Bitcoin)
-   **Receive email notifications** for upcoming renewals

## 🛠️ Technologies & Tools

### Backend Stack

-   **Runtime**: Node.js 20.x
-   **Framework**: Express.js 5.x
-   **Language**: TypeScript
-   **Database**: PostgreSQL 16
-   **ORM**: Drizzle
-   **Authentication**: JWT (JSON Web Tokens)
-   **Password Hashing**: bcrypt

### Cloud & Infrastructure

-   **Serverless**: AWS Lambda (via Serverless Framework) & Vercel functions
-   **API Gateway**: AWS API Gateway
-   **Database**: PostgreSQL (local development) / Supabase (production)
-   **Caching**: Upstash Redis
-   **Task Queue**: Upstash QStash
-   **Email Service**: Nodemailer with Gmail

### Development Tools

-   **Package Manager**: npm
-   **Process Manager**: nodemon (development)
-   **Database Migrations**: Drizzle Kit
-   **Containerization**: Docker & Docker Compose
-   **Database Admin**: Adminer

### Security & Performance

-   **Rate Limiting**: Express Rate Limit + Upstash Redis
-   **Input Validation**: Express Validator
-   **CORS**: Cross-Origin Resource Sharing enabled
-   **Environment Management**: dotenv

## 🚀 Live Demo

The application is deployed as a serverless function on AWS Lambda. You can test the API using the following base URL:

**Base URL**: `https://sub-tracka.vercel.app/`

Give it a quick try [here](https://sub-tracka.vercel.app/)

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

-   **Node.js** (v18 or higher)
-   **npm** (comes with Node.js)
-   **Docker** and **Docker Compose**
-   **Git**

## 🛠️ Local Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd sub-track
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env.dev` file in the root directory with the following template:

```env
# Database Configuration
POSTGRES_USER=your_postgres_username
POSTGRES_PASSWORD=your_postgres_password
POSTGRES_DB=subscription_tracker
POSTGRES_PORT=5432
DATABASE_URL=postgresql://your_postgres_username:your_postgres_password@localhost:5432/subscription_tracker

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_here
JWT_EXPIRY=30m

# QStash Configuration (for background tasks)
QSTASH_URL=https://qstash.upstash.io
QSTASH_TOKEN=your_qstash_token_here

# Server Configuration
SERVER_PORT=3000

# Nodemailer Configuration (for email notifications)
GMAIL_USER=your_gmail_address@gmail.com
GMAIL_PASSWORD=your_gmail_app_password
```

### 4. Database Setup

Start the PostgreSQL database using Docker Compose:

```bash
npm run docker_compose_up
```

This command will:

-   Create a PostgreSQL database container
-   Start Adminer (database admin interface) on port 8080
-   Set up the database with your environment variables

### 5. Database Migrations

Run the database migrations to create the necessary tables:

```bash
npm run migrate_schema
```

### 6. Start Development Server

```bash
npm run dev
```

The development server will start on `http://localhost:3000`

## 📚 API Endpoints

### Authentication

-   `POST /api/v1/auth/signup` - User registration
-   `POST /api/v1/auth/login` - User login
-   `DELETE /api/v1/auth/logout` - User logout
-   `GET /api/v1/auth/refresh-jwt` - Refresh JWT token
-   `POST /api/v1/auth/password/reset` - Request password reset
-   `POST /api/v1/auth/:id/password/reset/:resetToken` - Reset password

### Subscriptions

-   `GET /api/v1/subscriptions` - Get user's subscriptions
-   `GET /api/v1/subscriptions/:id` - Get specific subscription
-   `POST /api/v1/subscriptions/create` - Create new subscription
-   `PUT /api/v1/subscriptions/:id` - Update subscription
-   `DELETE /api/v1/subscriptions/:id` - Delete subscription
-   `PUT /api/v1/subscriptions/:id/cancel` - Cancel subscription
-   `GET /api/v1/subscriptions/upcoming-renewals` - Get upcoming renewals

### Webhooks

-   `POST /api/v1/webhooks/subscription/reminder` - Schedule reminder
-   `POST /api/v1/webhooks/subscription/send-email` - Send email notification

## 🗄️ Database Schema

### Users Table

-   `id` (UUID, Primary Key)
-   `username` (Text, Unique)
-   `email` (Text, Unique)
-   `password` (Text, Hashed)
-   `passwordResetToken` (Text, Optional)
-   `passwordResetTokenExpiry` (Timestamp)
-   `jwtRefreshToken` (Text)
-   `createdAt` (Timestamp)
-   `updatedAt` (Timestamp)

### Subscriptions Table

-   `id` (UUID, Primary Key)
-   `userId` (UUID, Foreign Key)
-   `name` (Text)
-   `price` (Decimal)
-   `currency` (Enum: USD, EUR, GBP)
-   `frequency` (Enum: daily, weekly, monthly, yearly)
-   `category` (Enum: sports, news, entertainment, lifestyle, technology, finance, politics, other)
-   `paymentMethod` (Enum: credit card, paypal, bitcoin)
-   `status` (Enum: active, cancelled, expired)
-   `startDate` (Date)
-   `nextRenewalDate` (Date)
-   `createdAt` (Timestamp)
-   `updatedAt` (Timestamp)
-   `messageId` (Text)

## 🔧 Available Scripts

```bash
# Development
npm run dev                    # Start development server
npm run prod                   # Build and start production server

# Database Management
npm run introspect_db         # Pull database schema
npm run generate_migration    # Generate new migration
npm run migrate_schema        # Run migrations
npm run push_migration        # Push schema changes
npm run create_custom_migration # Create custom migration

# Docker
npm run docker_compose_up     # Start database with Docker

# QStash (Background Tasks)
npm run qstash:local         # Start QStash CLI for local development
```

<!-- ## 🏗️ Project Structure

```
subscription-tracker/
├── app.ts                    # Main application entry point
├── serverless.yml           # Serverless configuration
├── docker-compose.yml       # Docker services configuration
├── drizzle.config.ts        # Database ORM configuration
├── package.json             # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── .env.dev                # Development environment variables
├── db/
│   ├── index.ts            # Database connection
│   ├── schema.ts           # Database schema definition
│   └── migrations/         # Database migration files
├── routes/
│   ├── auth/               # Authentication routes
│   ├── subscription/       # Subscription management routes
│   ├── user/              # User management routes
│   ├── webhook/           # Webhook handlers
│   └── error/             # Error handling middleware
├── utils/
│   ├── middlewares.ts      # Custom middleware functions
│   └── ratelimiter.ts     # Rate limiting configuration
└── clients/               # External service clients
``` -->

## 🔐 Security Features

-   **JWT Authentication** with refresh tokens
-   **Password Hashing** using bcrypt
-   **Rate Limiting** to prevent abuse
-   **Input Validation** for all endpoints
-   **CORS** configuration for cross-origin requests
-   **Environment Variable** management

## 📧 Email Notifications

The application uses Nodemailer with Gmail to send:

-   Subscription cancellation confirmations
-   Password reset emails
-   Subscription renewal reminders
-   Welcome emails

## 🚀 Deployment

The application is configured for deployment on AWS Lambda using the Serverless Framework. The production environment uses:

-   AWS Lambda for serverless execution
-   AWS API Gateway for HTTP routing
-   AWS Systems Manager for secure environment variable storage
-   Upstash Redis for caching and rate limiting
-   Upstash QStash for background task processing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 👨‍💻 Author

**Elvis Gideon**

_For any questions or support, please open an issue in the repository._
