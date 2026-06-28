const CustomerModel = require('../models/CustomerModel');

const getCustomers = async (req, res) => {
  const { company_id } = req.query;
  const userId = req.user.id;

  console.log(`[CustomerController] GET /api/customers - Query:`, req.query, `User:`, userId);

  if (!company_id) {
    return res.status(400).json({ message: 'company_id query parameter is required' });
  }

  try {
    const customers = await CustomerModel.getCustomersByCompanyId(userId, company_id);
    res.json({ customers });
  } catch (err) {
    console.error(`[CustomerController Error] Error listing customers:`, err);
    if (err.message.includes('Unauthorized')) {
      return res.status(403).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error listing customers', error: err.message });
  }
};

const createCustomer = async (req, res) => {
  const userId = req.user.id;
  const { company_id, name, mobile, email, gst_number, address } = req.body;

  console.log(`[CustomerController] POST /api/customers - Body:`, req.body, `User:`, userId);

  if (!company_id) return res.status(400).json({ message: 'company_id is required' });
  if (!name) return res.status(400).json({ message: 'name is required' });

  try {
    const customer = await CustomerModel.createCustomer(userId, company_id, {
      name,
      mobile,
      email,
      gst_number,
      address
    });
    res.status(201).json({
      message: 'Customer created successfully',
      customer
    });
  } catch (err) {
    console.error(`[CustomerController Error] Error creating customer:`, err);
    if (err.message.includes('Unauthorized')) {
      return res.status(403).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error creating customer', error: err.message });
  }
};

const deleteCustomer = async (req, res) => {
  const customerId = req.params.id;
  const userId = req.user.id;

  console.log(`[CustomerController] DELETE /api/customers/${customerId} - User:`, userId);

  try {
    const result = await CustomerModel.deleteCustomer(userId, customerId);
    res.json({ message: 'Customer deleted successfully', customer: result });
  } catch (err) {
    console.error(`[CustomerController Error] Error deleting customer ID ${customerId}:`, err);
    if (err.message.includes('Unauthorized')) {
      return res.status(403).json({ message: err.message });
    }
    if (err.message.includes('not found')) {
      return res.status(404).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error deleting customer', error: err.message });
  }
};

module.exports = {
  getCustomers,
  createCustomer,
  deleteCustomer
};
