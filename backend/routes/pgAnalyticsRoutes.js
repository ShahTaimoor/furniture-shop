const express = require('express');
const { isAuthorized, isSuperAdmin } = require('../middleware/pgAuthMiddleware');
const pgAnalyticsController = require('../controllers/pgAnalyticsController');

const router = express.Router();

router.get('/pg/analytics/financial', isAuthorized, isSuperAdmin, pgAnalyticsController.getFinancialSummary);

module.exports = router;
