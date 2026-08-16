const express = require('express');
const pgSearchController = require('../controllers/pgSearchController');

const router = express.Router();

router.get('/pg/search/products', pgSearchController.searchProducts);
router.get('/pg/search/filters', pgSearchController.getSearchFilters);
router.get('/pg/search/suggest', pgSearchController.getPredictiveSuggestions);

module.exports = router;
