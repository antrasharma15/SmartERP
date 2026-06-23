const CompanyModel = require('../models/CompanyModel');

/**
 * Create a new company (limit 5 per user).
 */
const createCompany = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Company name is required' });
    }

    // Enforce 5-company limit
    const existingCount = await CompanyModel.countCompaniesByUserId(userId);
    if (existingCount >= 5) {
      return res.status(400).json({ 
        message: 'Limit reached: You can manage a maximum of 5 companies per account.' 
      });
    }

    const company = await CompanyModel.createCompany(userId, req.body);
    res.status(201).json({ message: 'Company created successfully', company });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * List all companies associated with the logged-in user.
 */
const getCompanies = async (req, res) => {
  try {
    const userId = req.user.id;
    const companies = await CompanyModel.getCompaniesByUserId(userId);
    res.json({ companies });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * Get details of a specific company.
 */
const getCompany = async (req, res) => {
  try {
    const userId = req.user.id;
    const companyId = req.params.id;

    const company = await CompanyModel.getCompanyById(companyId, userId);
    if (!company) {
      return res.status(404).json({ message: 'Company not found or access denied' });
    }

    res.json({ company });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * Update details of a company.
 */
const updateCompany = async (req, res) => {
  try {
    const userId = req.user.id;
    const companyId = req.params.id;
    const { name } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Company name is required' });
    }

    const company = await CompanyModel.updateCompany(companyId, userId, req.body);
    res.json({ message: 'Company updated successfully', company });
  } catch (err) {
    // If it's an authorization error thrown by the model
    if (err.message.includes('Unauthorized')) {
      return res.status(403).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * Delete a company.
 */
const deleteCompany = async (req, res) => {
  try {
    const userId = req.user.id;
    const companyId = req.params.id;

    const company = await CompanyModel.deleteCompany(companyId, userId);
    res.json({ message: 'Company deleted successfully', company });
  } catch (err) {
    if (err.message.includes('Unauthorized')) {
      return res.status(403).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = {
  createCompany,
  getCompanies,
  getCompany,
  updateCompany,
  deleteCompany
};
