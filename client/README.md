# CinemaConnect (Move-Booking) Client

Welcome to the frontend application for the CinemaConnect platform! This React + TypeScript + Vite project provides the user interface for booking movies, chatting, managing subscriptions, and much more.

## Table of Contents
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Available Scripts](#available-scripts)
- [API Interaction (cURL Examples)](#api-interaction-curl-examples)
- [Environment Variables](#environment-variables)

## Features

- **Modern UI:** Built with React 19, Tailwind CSS, and Framer Motion.
- **Real-Time Chat:** Integrated Socket.io for real-time messaging and notifications.
- **Subscriptions:** Full subscription management UI with tier-based access limits.
- **Fast Build Times:** Uses Vite for lightning-fast HMR and optimized production builds.

## Prerequisites

Make sure you have the following installed on your local machine:
- [Node.js](https://nodejs.org/en/) (v18 or higher recommended)
- `npm` (v9 or higher recommended)

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run the development server:**
   ```bash
   npm run dev
   ```
   This will start the local development server, typically at `http://localhost:5173`.

3. **Build for production:**
   ```bash
   npm run build
   ```
   This compiles TypeScript and builds the optimized assets into the `dist` folder.

## Available Scripts

- `npm run dev` - Starts the Vite development server.
- `npm run build` - Type-checks the code and creates a production build.
- `npm run lint` - Runs ESLint to check for code quality issues.
- `npm run preview` - Previews the production build locally.

## API Interaction (cURL Examples)

While the client uses `axios` and `react-query` to interact with the backend, you can test the backend API directly using `curl`. Here are some helpful examples to get you started:

### 1. Check Server Health
Verify that the backend server is running and responding.
```bash
curl -X GET http://localhost:5000/api/health
```

### 2. User Login
Authenticate a user and receive a JWT token.
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier": "user@example.com", "password": "yourpassword"}'
```
*Note: Make sure to extract the `token` from the JSON response to use in authenticated requests.*

### 3. Fetch User Profile
Retrieve the profile of the currently logged-in user.
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 4. Fetch Conversations
List all chat conversations for the authenticated user.
```bash
curl -X GET "http://localhost:5000/api/chat/conversations?limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 5. Create Public Chat Conversation (Body Payload)
Create a new public chat conversation by passing the API key and secret in the JSON body.
```bash
curl -X POST "http://localhost:5000/api/public/chat/conversation" \
  -H "Content-Type: application/json" \
  -d "{\"apiKey\":\"ak_2a****\",\"apiSecret\":\"as_yFC0-*****\",\"name\":\"Jane Cooper\",\"email\":\"jane@example.com\",\"expiryMinutes\":6000}"
```

### 6. Create Public Chat Conversation (Header Authentication)
Create a new public chat conversation by passing the API credentials in the request headers.
```bash
curl -X POST "http://localhost:5000/api/public/chat/conversation" \
  -H "Content-Type: application/json" \
  -H "x-api-key: ak_2a****" \
  -H "x-api-secret: as_yFC0-*****" \
  -d "{\"name\":\"Jane Cooper\",\"email\":\"jane@example.com\",\"expiryMinutes\":6000}"
```

## Environment Variables

To configure the client properly, create a `.env` file in the root of the `client` directory:

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```
