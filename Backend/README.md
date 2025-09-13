# FinanceAI Backend

This is the backend service for the FinanceAI application, built with Node.js, Express, and MongoDB. It provides APIs for managing financial data, user authentication, and AI-powered financial insights.

## Features

- **User Authentication**: JWT-based authentication with email/password
- **Financial Data Management**: Track assets, liabilities, transactions, and investments
- **AI-Powered Insights**: Get personalized financial advice using OpenAI
- **Real-time Updates**: Server-Sent Events (SSE) for real-time data synchronization
- **Data Privacy**: Granular permission control for different financial categories
- **Report Generation**: Generate PDF reports and export data in multiple formats

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **AI Integration**: OpenAI API
- **PDF Generation**: Puppeteer
- **Real-time**: Server-Sent Events (SSE)
- **Validation**: Express Validator
- **Security**: Helmet, CORS, rate limiting, XSS protection

## Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or MongoDB Atlas)
- OpenAI API key
- npm or yarn

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/financeai-backend.git
   cd financeai-backend
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Create a `.env` file in the root directory and configure the environment variables (see [Configuration](#configuration) section)

4. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

## Configuration

Create a `.env` file in the root directory with the following variables:

```env
# Server
NODE_ENV=development
PORT=5000

# MongoDB
MONGODB_URI=mongodb://localhost:27017/financeai

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=90d
JWT_COOKIE_EXPIRES_IN=90

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

## API Endpoints

### Authentication

- `POST /api/auth/signup` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `PATCH /api/auth/update-password` - Update user password

### Financial Data

- `GET /api/data/dashboard` - Get dashboard summary
- `GET /api/data/transactions` - Get transactions
- `GET /api/data/assets` - Get assets
- `GET /api/data/liabilities` - Get liabilities
- `GET /api/data/investments` - Get investments
- `GET /api/data/epf` - Get EPF data
- `GET /api/data/credit-score` - Get credit score

### AI Features

- `POST /api/ai/chat` - Chat with AI financial assistant
- `GET /api/ai/insights` - Get financial insights
- `GET /api/ai/forecast` - Generate financial forecast

### Permissions

- `GET /api/permissions` - Get user permissions
- `PATCH /api/permissions` - Update user permissions

### Reports

- `GET /api/report/generate` - Generate financial report (PDF)
- `GET /api/report/statement` - Generate financial statement (PDF)
- `GET /api/report/export` - Export data (JSON, CSV)

### Real-time Updates

- `GET /api/stream` - SSE endpoint for real-time updates

## Real-time Events

The server emits the following events via SSE:

- `permissions_updated` - When user permissions are updated
- `transaction_created` - When a new transaction is created
- `asset_updated` - When an asset is updated
- `liability_updated` - When a liability is updated
- `investment_updated` - When an investment is updated

## Error Handling

The API uses standard HTTP status codes to indicate the success or failure of requests:

- `200 OK` - Request was successful
- `201 Created` - Resource was successfully created
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

Error responses include a JSON object with the following structure:

```json
{
  "status": "error",
  "message": "Error message",
  "errors": [
    {
      "field": "field_name",
      "message": "Error message for this field"
    }
  ]
}
```

## Security

- All API endpoints (except auth) require a valid JWT token in the `Authorization` header
- Passwords are hashed using bcrypt before storage
- Rate limiting is implemented to prevent abuse
- Helmet.js is used to secure HTTP headers
- XSS protection is enabled
- CORS is properly configured

## Testing

To run tests:

```bash
npm test
# or
yarn test
```

## Deployment

### Production

1. Set `NODE_ENV=production` in your environment variables
2. Make sure to use a production-ready MongoDB instance (e.g., MongoDB Atlas)
3. Use a process manager like PM2 to keep the application running:
   ```bash
   npm install -g pm2
   pm2 start server.js --name "financeai-backend"
   ```

### Docker

1. Build the Docker image:
   ```bash
   docker build -t financeai-backend .
   ```

2. Run the container:
   ```bash
   docker run -p 5000:5000 --env-file .env financeai-backend
   ```

## Contributing

1. Fork the repository
2. Create a new branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -am 'Add some feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Create a new Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, please open an issue in the GitHub repository or contact the maintainers.
