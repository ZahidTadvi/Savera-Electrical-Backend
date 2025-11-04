# ElectroMart Backend API

A robust Node.js/Express backend for the ElectroMart electronics billing system with TypeScript, MongoDB, and comprehensive business logic.

## Features

- **Authentication & Authorization**: JWT-based auth with role-based permissions
- **Billing System**: Advanced GST billing with automatic calculations
- **User Management**: Multi-role user system (admin, manager, cashier)
- **Product Management**: Inventory tracking with low stock alerts
- **Customer Management**: Complete customer profiles and purchase history
- **MongoDB Integration**: Mongoose ODM with proper schemas and validations
- **Security**: Rate limiting, CORS, Helmet, bcrypt password hashing
- **TypeScript**: Full type safety and better development experience

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Language**: TypeScript
- **Authentication**: JWT
- **Security**: Helmet, CORS, bcrypt, express-rate-limit
- **Validation**: Express-validator, Zod

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - Register new user (admin only)
- `GET /api/auth/me` - Get current user profile

### Users
- `GET /api/users` - Get all users (admin only)
- `POST /api/users` - Create user (admin only)
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (admin only)

### Products
- `GET /api/products` - Get all products
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Customers
- `GET /api/customers` - Get all customers
- `POST /api/customers` - Create customer
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

### Bills
- `GET /api/bills` - Get all bills with filtering
- `POST /api/bills` - Create new bill
- `PUT /api/bills/:id` - Update bill
- `DELETE /api/bills/:id` - Delete bill
- `GET /api/bills/:id/pdf` - Generate PDF

### Billing (Advanced)
- `GET /api/billing/dashboard` - Dashboard statistics
- `POST /api/billing/calculate` - Calculate bill amounts
- `GET /api/billing/returns` - Sales returns

## Environment Variables

Create a `.env` file based on `.env.example`:

```env
# Server Configuration
PORT=5000
NODE_ENV=production

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/electromart

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d

# Client URL (for CORS)
CLIENT_URL=https://your-frontend-domain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
AUTH_RATE_LIMIT_MAX=5

# Security
BCRYPT_ROUNDS=12
```

## Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   ```

5. **Start production server:**
   ```bash
   npm start
   ```

## Deployment to Render

### Prerequisites
- [Render account](https://render.com)
- MongoDB Atlas database (or other MongoDB hosting)
- Frontend deployed (for CORS configuration)

### Step 1: Prepare Your Code
1. Push this backend code to a GitHub repository
2. Ensure all dependencies are in `package.json`
3. Verify `render.yaml` configuration

### Step 2: Create Render Service
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `electromart-backend`
   - **Region**: Choose closest to your users
   - **Branch**: `main` (or your preferred branch)
   - **Build Command**: `npm ci && npm run build`
   - **Start Command**: `npm start`

### Step 3: Configure Environment Variables
Add these environment variables in Render dashboard:

| Variable | Value | Notes |
|----------|-------|-------|
| `NODE_ENV` | `production` | |
| `MONGODB_URI` | `mongodb+srv://...` | Your MongoDB connection string |
| `JWT_SECRET` | `your-secret-key` | Generate a strong secret |
| `CLIENT_URL` | `https://your-frontend.com` | Your frontend URL for CORS |
| `BCRYPT_ROUNDS` | `12` | Password hashing strength |
| `RATE_LIMIT_WINDOW_MS` | `900000` | 15 minutes in milliseconds |
| `RATE_LIMIT_MAX` | `100` | Max requests per window |
| `AUTH_RATE_LIMIT_MAX` | `5` | Max auth attempts per window |

### Step 4: Deploy
1. Click "Create Web Service"
2. Render will automatically build and deploy
3. Monitor logs for any issues
4. Test the `/api/health` endpoint

### Step 5: Connect Frontend
Update your frontend API configuration to point to:
```
https://your-backend-name.onrender.com/api
```

## Database Setup

### MongoDB Atlas (Recommended)
1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Create database user
4. Whitelist IP addresses (0.0.0.0/0 for Render)
5. Get connection string and add to `MONGODB_URI`

### Local MongoDB (Development)
```bash
# Install MongoDB locally
brew install mongodb/brew/mongodb-community

# Start MongoDB
brew services start mongodb/brew/mongodb-community

# Use local connection string
MONGODB_URI=mongodb://localhost:27017/electromart
```

## Security Features

- **JWT Authentication**: Secure token-based auth
- **Rate Limiting**: Prevent abuse and DoS attacks
- **CORS Protection**: Controlled cross-origin access
- **Helmet**: Security headers
- **Password Hashing**: bcrypt with configurable rounds
- **Input Validation**: Express-validator and Mongoose validation
- **Role-based Access**: Admin, manager, cashier roles

## API Testing

Use tools like Postman or curl to test endpoints:

```bash
# Health check
curl https://your-backend.onrender.com/api/health

# Login
curl -X POST https://your-backend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'

# Get products (with auth)
curl https://your-backend.onrender.com/api/products \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Monitoring and Logs

- **Render Logs**: Available in Render dashboard
- **Health Endpoint**: `/api/health` for uptime monitoring
- **Error Handling**: Comprehensive error responses
- **Request Logging**: Built-in Express logging

## Support

For deployment issues:
- Check Render logs in dashboard
- Verify environment variables
- Ensure MongoDB connection
- Test locally first

For development questions:
- Review API documentation
- Check TypeScript types
- Validate database schemas
