# Render.com Deployment Guide - SENIOR LEVEL

## Quick Setup (5 minutes)

### 1. Environment Variables (CRITICAL)
In your Render.com dashboard, set these **EXACTLY**:

```
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6A1B2C3D4E5F6
NODE_ENV=production
```

### 2. Service Configuration
- **Build Command**: `cd backend && npm install`
- **Start Command**: `cd backend && npm start`
- **Health Check Path**: `/api/health`
- **Environment**: Node.js
- **Node Version**: 18.x

### 3. Repository Settings
- **Root Directory**: Leave empty (auto-detect)
- **Branch**: main

## Deployment Process

1. **Connect Repository**: Link your GitHub repo to Render.com
2. **Set Environment Variables**: Add JWT_SECRET and NODE_ENV=production
3. **Deploy**: Render.com will automatically build and deploy
4. **Test**: Check https://your-app.onrender.com/api/health

## Troubleshooting

### Server Won't Start
- Check JWT_SECRET is set and at least 32 characters
- Verify NODE_ENV=production
- Check build logs for npm install errors

### Port Binding Issues
- Server automatically binds to 0.0.0.0:PORT
- Render.com sets PORT automatically
- Health check endpoint: /api/health

### CORS Errors
- Frontend domain must match CORS origins
- Check server logs for CORS configuration

## Testing Endpoints

```bash
# Health check
curl https://your-app.onrender.com/api/health

# Login test
curl -X POST https://your-app.onrender.com/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

## Performance Optimization

1. **Free Tier Limitations**:
   - 512MB RAM
   - Sleeps after 15 minutes of inactivity
   - Cold start delay (~30 seconds)

2. **Paid Tier Benefits**:
   - No sleep mode
   - More RAM and CPU
   - Faster cold starts

## Security Checklist

- ✅ JWT_SECRET is 32+ characters
- ✅ NODE_ENV=production
- ✅ CORS origins match frontend domains
- ✅ No sensitive data in logs
- ✅ Health check responds correctly

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "Port scan timeout" | Check server binds to 0.0.0.0:PORT |
| "JWT_SECRET required" | Set JWT_SECRET in environment variables |
| "CORS error" | Add frontend domain to CORS origins |
| "Module not found" | Check package.json dependencies |

## Success Indicators

✅ Build completes without errors  
✅ Health check returns 200 OK  
✅ Server logs show "Server running on port X"  
✅ Frontend can connect to API  
✅ Login/register endpoints work