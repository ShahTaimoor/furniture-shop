const express = require('express');
const { isAuthorized } = require('../middleware/pgAuthMiddleware');
const pgAddressController = require('../controllers/pgAddressController');

const router = express.Router();

// NOTE: isAuthorized is applied per-route (not via router.use) because every pg*Routes
// file shares the same '/api' mount prefix — an unconditional router.use() here would
// intercept requests meant for routers registered later in index.js.
router.get('/pg/addresses', isAuthorized, pgAddressController.getAddresses);
router.get('/pg/addresses/:id', isAuthorized, pgAddressController.getAddress);
router.post('/pg/addresses', isAuthorized, pgAddressController.createAddress);
router.put('/pg/addresses/:id', isAuthorized, pgAddressController.updateAddress);
router.delete('/pg/addresses/:id', isAuthorized, pgAddressController.deleteAddress);
router.patch('/pg/addresses/:id/set-default', isAuthorized, pgAddressController.setDefaultAddress);

module.exports = router;
