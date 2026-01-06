# Render.com Deployment Guide

## Environment Variables Required

Set these in your Render.com dashboard under "Environment":

### Required Variables
```
JWT_SECRET=your-super-secure-jwt-secret-key-at-least-32-characters-long
NODE_ENV=production
```

### Optional Variables
```
JWT_SECRET_PREVIOUS=previous-secret-for-rotation
BCRYPT_ROUNDS=12
LOG_LEVEL=info
```

## Deployment Settings

### Service Configuration
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Node Version**: 18.x or higher
- **Environment**: Node.js

### Health Check
- **Health Check Path**: `/api/health`
- **Port**: Render.com will automatically set the PORT environment variable

## Troubleshooting

### Common Issues

1. **Port Binding Error**
   - Ensure server binds to `0.0.0.0:PORT`
   - Don't hardcode port numbers
   - Use `process.env.PORT`

2. **JWT Secret Missing**
   - Set JWT_SECRET in environment variables
   - Must be at least 32 characters long

3. **CORS Issues**
   - Frontend domain must be in CORS origins
   - Check allowed origins in server.js

### Logs to Check
- Server startup logs
- Port binding confirmation
- CORS configuration
- JWT secret validation

## Testing Deployment

1. Check health endpoint: `https://your-app.onrender.com/api/health`
2. Test login endpoint: `POST https://your-app.onrender.com/api/login`
3. Verify CORS with frontend requests

## Performance Tips

1. Use environment variables for all secrets
2. Enable gzip compression
3. Set proper cache headers
4. Monitor memory usage
5. Use PM2 for production (optional)