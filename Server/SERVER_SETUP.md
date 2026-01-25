# OG Gainz Server Setup

## ✅ Server Configuration Complete

The Express server has been successfully configured with:

### Core Features
- ✅ Express.js application setup
- ✅ MongoDB connection with Mongoose
- ✅ CORS enabled for client communication
- ✅ Environment configuration
- ✅ Global error handling
- ✅ Request logging
- ✅ Health check endpoint
- ✅ Graceful shutdown handling

### Project Structure
```
Server/
├── src/
│   ├── config/         # Configuration files
│   ├── controllers/    # Route controllers
│   ├── middlewares/    # Express middlewares
│   ├── models/         # Mongoose models
│   ├── routes/         # API routes
│   ├── services/       # Business logic
│   ├── utils/          # Utility functions
│   ├── app.js         # Express app setup
│   └── server.js      # Server entry point
├── .env.example       # Environment variables template
└── package.json
```

## 🚀 Getting Started

### 1. Install Dependencies
```bash
cd Server
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env` and update values:
```bash
cp .env.example .env
```

On Windows PowerShell:
```powershell
Copy-Item .env.example .env
```

Required variables:
- `SERVER_PORT` (or legacy `PORT`) - Server port
- `CLIENT_ORIGIN` (or legacy `CLIENT_URL`) - Client origin for CORS
- `MONGO_URI` (or legacy `MONGODB_URI`) - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens

Optional variables:
- `GOOGLE_CLIENT_ID` - Google OAuth client ID (Phase 2B uses ID-token flow)
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` - Enable image uploads (if missing, upload endpoints return 503)

### 3. Start MongoDB
Make sure MongoDB is running locally or use a cloud instance (MongoDB Atlas).

### 4. Run the Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will start on `http://localhost:<SERVER_PORT>`

## 📡 API Endpoints

### Health Check
```
GET /health
```

### API Routes (Base: `/api`)
- `/api/auth` - Authentication routes
- `/api/users` - User management
- `/api/meals` - Meal packs
- `/api/addons` - Add-ons management
- `/api/cart` - Shopping cart
- `/api/checkout` - Checkout process
- `/api/subscriptions` - Subscription management
- `/api/deliveries` - Delivery tracking
- `/api/wallet` - Wallet & credits
- `/api/consultations` - Free consultations
- `/api/locations` - Location validation
- `/api/notifications` - User notifications
- `/api/admin` - Admin operations
- `/api/reports` - Analytics & reports

## 🛠️ Configuration Files

### `env.config.js`
Environment variables and application configuration

### `db.config.js`
MongoDB connection setup with error handling and reconnection logic

### `logger.util.js`
Colored console logging utility for better debugging

### `error.middleware.js`
Global error handler with support for:
- Mongoose validation errors
- Duplicate key errors
- Cast errors
- JWT errors
- Custom application errors

## 📝 Next Steps

1. **Implement Route Controllers**: Add business logic to each controller
2. **Create Mongoose Models**: Define schemas for all entities
3. **Add Authentication**: Implement Google OAuth flow
4. **Set up Redis**: Configure caching layer
5. **Add Email Service**: Configure email templates and sending
6. **Payment Integration**: Set up Stripe payment processing
7. **Add Testing**: Create unit and integration tests

## 🔒 Security Features

- Environment-based configuration
- CORS protection
- Request size limiting (10mb)
- Error message sanitization in production
- Graceful shutdown handling
- MongoDB connection retry logic

## 📊 Monitoring

The server includes:
- Colored logging with timestamps
- Request logging middleware
- Error tracking and reporting
- Health check endpoint

## 🐛 Troubleshooting

**MongoDB Connection Issues:**
- Verify MongoDB is running
- Check `MONGO_URI` (or legacy `MONGODB_URI`) in `.env`
- Ensure network connectivity

**Port Already in Use:**
- Change `SERVER_PORT` (or legacy `PORT`) in `.env`
- Kill process using the port: `lsof -ti:5000 | xargs kill -9` (Mac/Linux)

**Cloudinary Uploads Return 503:**
- Configure `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- Restart the server after updating `.env`

**Security Reminder:**
- Never commit `.env` files (they contain secrets). Only commit `.env.example`.

**Module Not Found:**
- Run `npm install` to install dependencies
- Check import paths are correct

---

**Ready to develop!** The server is now configured and ready for feature implementation.
