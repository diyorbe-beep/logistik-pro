# Production Deployment Guide

## Critical Security Setup

### 1. Environment Variables
Set these environment variables in your production environment:

```bash
# Generate a secure JWT secret (minimum 32 characters)
JWT_SECRET=$(openssl rand -base64 32)

# Optional: For secret rotation
JWT_SECRET_PREVIOUS=your-previous-secret

# Other settings
NODE_ENV=production
PORT=3001
```

### 2. JWT Secret Generation
```bash
# Generate a cryptographically secure secret
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 3. Secret Rotation Process
When rotating JWT secrets:

1. Set new secret in `JWT_SECRET`
2. Move old secret to `JWT_SECRET_PREVIOUS`
3. Deploy the application
4. After 24 hours (token expiry), remove `JWT_SECRET_PREVIOUS`

### 4. Monitoring
- Monitor authentication failures in logs
- Set up alerts for repeated 401 errors
- Track token refresh requests

## Troubleshooting

### Users Getting 401 Errors After Deployment
1. Check if JWT_SECRET changed without rotation
2. Verify environment variables are set correctly
3. Check server logs for specific error messages

### Frontend Actions Required
If JWT secret changes without rotation:
- Users need to log out and log back in
- Clear localStorage/sessionStorage
- Redirect to login page on 401 errors

## Security Best Practices
1. Never commit JWT secrets to version control
2. Use different secrets for different environments
3. Rotate secrets regularly (every 90 days)
4. Monitor for suspicious authentication patterns
5. Implement proper logging and alerting