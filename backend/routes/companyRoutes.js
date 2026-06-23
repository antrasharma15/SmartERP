const express = require('express');
const router = express.Router();
const { protect } = require('../Middleware/authMiddleware');
const {
  createCompany,
  getCompanies,
  getCompany,
  updateCompany,
  deleteCompany
} = require('../controllers/companyController');

// All routes are protected under the auth check
router.use(protect);

router.post('/', createCompany);
router.get('/', getCompanies);
router.get('/:id', getCompany);
router.put('/:id', updateCompany);
router.delete('/:id', deleteCompany);

module.exports = router;
