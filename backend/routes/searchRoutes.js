const express = require('express');
const {
  searchProducts,
  getPredictiveSuggestions,
  getSearchFilters,
} = require('../controllers/searchController');

const router = express.Router();

router.get('/search/products', searchProducts);
router.get('/search/filters', getSearchFilters);
router.get('/search/suggest', getPredictiveSuggestions);

module.exports = router;

