# ElectroMart Backend Deployment Guide

## Quick Deployment to Render

### 1. Prerequisites
- ✅ GitHub repository with this backend code
- ✅ MongoDB Atlas account (or other MongoDB hosting)
- ✅ Render account

### 2. Database Setup (MongoDB Atlas)

1. **Create MongoDB Atlas Account**
   - Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
   - Sign up/login and create new project

2. **Create Database Cluster**
   - Click "Build a Database" → "Shared" (free tier)
   - Choose cloud provider and region
   - Create cluster (takes 3-5 minutes)

3. **Configure Database Access**
   - Go to "Database Access" → "Add New Database User"
   - Create username/password (save these!)
   - Grant "Read and write to any database" permissions

4. **Configure Network Access**
   - Go to "Network Access" → "Add IP Address"
   - Add `0.0.0.0/0` (allow access from anywhere - for Render)
   - Click "Confirm"

5. **Get Connection String**
   - Go to "Databases" → "Connect" → "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password
   - Example: `mongodb+srv://user:password@cluster0.xxxxx.mongodb.net/electromart`

### 3. Deploy to Render

1. **Create Render Service**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New +" → "Web Service"
   - Connect your GitHub account and repository

2. **Configure Service Settings**
   ```
   Name: electromart-backend
   Region: Oregon (US West) or closest to your users
   Branch: main
   Root Directory: (leave empty if backend is in repo root)
   Environment: Node
   Build Command: npm ci && npm run build
   Start Command: npm start
   ```

3. **Add Environment Variables**
   In the "Environment" section, add:
   
   | Key | Value |
   |-----|-------|
   | `NODE_ENV` | `production` |
   | `MONGODB_URI` | `mongodb+srv://user:password@cluster0.xxxxx.mongodb.net/electromart` |
   | `JWT_SECRET` | Generate a strong secret (e.g., use [this tool](https://randomkeygen.com/)) |
   | `CLIENT_URL` | `https://your-frontend-domain.com` (your frontend URL) |
   | `BCRYPT_ROUNDS` | `12` |
   | `RATE_LIMIT_WINDOW_MS` | `900000` |
   | `RATE_LIMIT_MAX` | `100` |
   | `AUTH_RATE_LIMIT_MAX` | `5` |

4. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment (5-10 minutes)
   - Monitor logs for any errors

### 4. Test Deployment

1. **Health Check**
   ```bash
   curl https://your-service-name.onrender.com/api/health
   ```
   Should return:
   ```json
   {
     "status": "success",
     "message": "ElectroMart API is running",
     "timestamp": "2024-01-01T00:00:00.000Z",
     "environment": "production"
   }
   ```

2. **API Endpoints**
   Your backend will be available at:
   ```
   https://your-service-name.onrender.com/api
   ```

### 5. Connect Frontend

Update your frontend configuration to use the new backend URL:

```javascript
// In your frontend config
const API_BASE_URL = 'https://your-service-name.onrender.com/api';

// Or in environment variables
VITE_API_URL=https://your-service-name.onrender.com/api
```

### 6. Create Admin User

Since the backend is now deployed, you'll need to create an admin user:

1. **Temporarily modify registration endpoint** (or use MongoDB Compass):
   - Connect to your MongoDB Atlas database
   - Create a user document in the `users` collection:
   ```json
   {
     "name": "Admin User",
     "email": "admin@yourdomain.com",
     "password": "$2b$12$hashedPasswordHere",
     "role": "admin",
     "isActive": true,
     "createdAt": "2024-01-01T00:00:00.000Z",
     "updatedAt": "2024-01-01T00:00:00.000Z"
   }
   ```

2. **Or create a one-time script**:
   ```bash
   # Test login
   curl -X POST https://your-service-name.onrender.com/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@yourdomain.com","password":"your-password"}'
   ```

## Alternative Deployment Options

### Vercel (if you prefer)
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in the backend directory
3. Configure environment variables in Vercel dashboard

### Railway
1. Connect GitHub repository
2. Add environment variables
3. Deploy automatically

### Heroku
1. Create Heroku app
2. Add MongoDB Atlas add-on or use external MongoDB
3. Configure environment variables
4. Deploy via Git

## Production Considerations

### 1. Security
- ✅ Use strong JWT secrets (32+ characters)
- ✅ Set proper CORS origins (don't use '*' in production)
- ✅ Enable rate limiting
- ✅ Use HTTPS (automatic with Render)

### 2. Monitoring
- ✅ Set up uptime monitoring (Render provides basic monitoring)
- ✅ Monitor database performance
- ✅ Set up error tracking (optional: Sentry integration)

### 3. Scaling
- ✅ Render automatically scales with traffic
- ✅ MongoDB Atlas automatically scales
- ✅ Consider adding Redis for session storage (future enhancement)

### 4. Backup
- ✅ MongoDB Atlas provides automatic backups
- ✅ Export important data regularly
- ✅ Test restore procedures

## Troubleshooting

### Common Issues

1. **Build Fails**
   - Check Node.js version (should be 18+)
   - Verify all dependencies in package.json
   - Check TypeScript compilation errors

2. **Database Connection Issues**
   - Verify MongoDB URI format
   - Check network access settings (0.0.0.0/0)
   - Confirm database user permissions

3. **CORS Errors**
   - Update CLIENT_URL environment variable
   - Ensure frontend URL is correct
   - Check for trailing slashes

4. **Authentication Issues**
   - Verify JWT_SECRET is set
   - Check if admin user exists
   - Verify password hashing

### Getting Help

1. **Render Support**: Check Render docs and community
2. **MongoDB Atlas**: MongoDB University and documentation
3. **Code Issues**: Review logs in Render dashboard

## Next Steps

After successful deployment:

1. ✅ Test all API endpoints
2. ✅ Connect frontend
3. ✅ Create admin user
4. ✅ Add sample data
5. ✅ Monitor performance
6. ✅ Set up regular backups
7. ✅ Document API for team use

Your backend is now ready for production use! 🚀
