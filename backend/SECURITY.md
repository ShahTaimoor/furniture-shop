# Security Implementation Guide

## 🔒 Security Features Implemented

### 1. **Helmet.js - HTTP Headers Security**
- **Content Security Policy (CSP)**: Prevents XSS attacks
- **HSTS**: Forces HTTPS connections
- **X-Frame-Options**: Prevents clickjacking
- **X-Content-Type-Options**: Prevents MIME type sniffing
- **Referrer-Policy**: Controls referrer information

### 2. **Rate Limiting & Brute Force Protection**
- **General API**: 100 requests per 15 minutes per IP
- **Authentication**: 5 login attempts per 15 minutes per IP
- **Password Reset**: 3 attempts per hour per IP
- **File Uploads**: 10 uploads per 15 minutes per IP

### 3. **Input Validation**
- **Joi Schemas**: Complex validation rules
- **Express-Validator**: Request validation middleware
- **MongoDB Injection Protection**: Sanitizes NoSQL injection attempts
- **HTTP Parameter Pollution**: Prevents parameter pollution attacks

### 4. **CORS Configuration**
- **Origin Validation**: Only allows specific domains
- **Credential Support**: Secure cookie handling
- **Method Restrictions**: Limited to necessary HTTP methods
- **Header Validation**: Controlled allowed headers

### 5. **Additional Security Measures**
- **Compression**: Reduces bandwidth usage
- **Body Size Limits**: Prevents large payload attacks
- **Error Handling**: Secure error responses
- **Health Checks**: Monitoring endpoints

## 🛡️ Usage Examples

### Basic Route with Validation
```javascript
const { userValidation } = require('../middleware/validation');

router.post('/signup', userValidation.register, async (req, res) => {
  // Your route logic here
});
```

### Rate Limited Routes
```javascript
// Already applied in index.js
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
```

### Input Validation Example
```javascript
const { body, validationResult } = require('express-validator');

const validateProduct = [
  body('title').trim().isLength({ min: 3, max: 100 }),
  body('price').isNumeric().isFloat({ min: 0 }),
  body('stock').isInt({ min: 0 }),
  // ... more validations
];
```

## 🔧 Environment Variables

Add these to your `.env` file:

```env
# Security
JWT_SECRET=your-super-secret-jwt-key-here
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CLIENT_URL=http://localhost:3000

# Database
MONGODB_URI=mongodb://localhost:27017/gul-autos
```

## 🚨 Security Best Practices

### 1. **Password Security**
- Minimum 6 characters
- Must contain uppercase, lowercase, and numbers
- Bcrypt with 12 rounds
- No password reuse

### 2. **JWT Security**
- Short expiration times (7 days)
- Secure cookie storage
- HttpOnly cookies
- SameSite protection

### 3. **Input Sanitization**
- All user inputs validated
- MongoDB injection prevention
- XSS protection
- SQL injection prevention

### 4. **Rate Limiting**
- Different limits for different endpoints
- IP-based limiting
- Graceful error handling
- Retry-after headers

## 🔍 Monitoring & Logging

### Security Events Logged:
- Rate limit violations
- MongoDB injection attempts
- CORS violations
- Authentication failures
- Input validation errors

### Health Check Endpoint:
```
GET /health
```
Returns server status, uptime, and environment info.

## 🚀 Deployment Security

### Production Checklist:
- [ ] Set `NODE_ENV=production`
- [ ] Use HTTPS
- [ ] Secure JWT secrets
- [ ] Configure CORS origins
- [ ] Enable Helmet
- [ ] Set up monitoring
- [ ] Regular security updates

### Environment Variables for Production:
```env
NODE_ENV=production
JWT_SECRET=very-long-random-secret-key
CLIENT_URL=https://your-domain.com
MONGODB_URI=mongodb+srv://...
```

## 📊 Security Headers

Your API now includes these security headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000`
- `Content-Security-Policy: default-src 'self'`

## 🛠️ Testing Security

### Test Rate Limiting:
```bash
# Test general rate limit
for i in {1..101}; do curl http://localhost:5000/api/health; done

# Test auth rate limit
for i in {1..6}; do curl -X POST http://localhost:5000/api/auth/login; done
```

### Test Input Validation:
```bash
# Test invalid email
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"invalid-email","password":"123"}'

# Test SQL injection
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":{"$ne":null}}'
```

## 🔄 Regular Security Updates

1. **Update Dependencies**: `npm audit fix`
2. **Review Rate Limits**: Adjust based on usage
3. **Monitor Logs**: Check for attack patterns
4. **Update Secrets**: Rotate JWT secrets regularly
5. **Security Headers**: Keep Helmet updated

## 📞 Security Incident Response

If you detect suspicious activity:
1. Check rate limit logs
2. Review authentication attempts
3. Monitor for injection attempts
4. Update security rules if needed
5. Consider IP blocking for severe cases

---

**Note**: This security implementation provides a strong foundation, but security is an ongoing process. Regular updates and monitoring are essential.
