const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const pgCategoryRoutes = require('./routes/pgCategoryRoutes')
const pgTagRoutes = require('./routes/pgTagRoutes')
const pgProductRoutes = require('./routes/pgProductRoutes')
const pgCartRoutes = require('./routes/pgCartRoutes')
const pgWishlistRoutes = require('./routes/pgWishlistRoutes')
const pgOrderRoutes = require('./routes/pgOrderRoutes')
const pgAddressRoutes = require('./routes/pgAddressRoutes')
const pgCouponRoutes = require('./routes/pgCouponRoutes')
const pgPaymentRoutes = require('./routes/pgPaymentRoutes')
const pgAnalyticsRoutes = require('./routes/pgAnalyticsRoutes')
const pgUserRoutes = require('./routes/pgUserRoutes')
const pgSearchRoutes = require('./routes/pgSearchRoutes')
const pgAdminCustomerRoutes = require('./routes/pgAdminCustomerRoutes')
const pgChatRoutes = require('./routes/pgChatRoutes');
const pgMediaRoutes = require('./routes/pgMediaRoutes');
const pgBannerRoutes = require('./routes/pgBannerRoutes');
const pgNotificationRoutes = require('./routes/pgNotificationRoutes');
const cookieParser = require('cookie-parser')
const { notFound, errorHandler } = require('./middleware/errorHandler')
const { initSocketServer } = require('./socket');

const app = express();

app.use(express.static('public'));
// Middleware
const corsOptions = {
  origin: process.env.CLIENT_URL, // e.g., 'https://your-frontend.com'
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cache-Control'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser())

// API Routes
app.use('/api', pgCategoryRoutes);
app.use('/api', pgTagRoutes);
app.use('/api', pgProductRoutes);
app.use('/api', pgCartRoutes);
app.use('/api', pgWishlistRoutes);
app.use('/api', pgOrderRoutes);
app.use('/api', pgAddressRoutes);
app.use('/api', pgCouponRoutes);
app.use('/api', pgPaymentRoutes);
app.use('/api', pgAnalyticsRoutes);
app.use('/api', pgUserRoutes);
app.use('/api', pgSearchRoutes);
app.use('/api', pgAdminCustomerRoutes);
app.use('/api', pgChatRoutes);
app.use('/api', pgMediaRoutes);
app.use('/api', pgBannerRoutes);
app.use('/api', pgNotificationRoutes);


// Test Route
app.get('/', (req, res) => {
    res.send('Welcome to backend API');
});

// Global error handling
app.use(notFound)
app.use(errorHandler)

// Start the server
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);
initSocketServer(server);

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
