const InvoiceModel = require('../models/InvoiceModel');

const getInvoices = async (req, res) => {
  const { company_id, invoice_type } = req.query;
  const userId = req.user.id;

  console.log(`[InvoiceController] GET /api/invoices - Query:`, req.query, `User:`, userId);

  if (!company_id) {
    return res.status(400).json({ message: 'company_id query parameter is required' });
  }

  try {
    const invoices = await InvoiceModel.getInvoicesByCompanyId(userId, company_id, { invoice_type });
    res.json({ invoices });
  } catch (err) {
    console.error(`[InvoiceController Error] Error listing invoices:`, err);
    if (err.message.includes('Unauthorized')) {
      return res.status(403).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error listing invoices', error: err.message });
  }
};

const getInvoice = async (req, res) => {
  const invoiceId = req.params.id;
  const userId = req.user.id;

  console.log(`[InvoiceController] GET /api/invoices/${invoiceId} - User:`, userId);

  try {
    const invoice = await InvoiceModel.getInvoiceById(userId, invoiceId);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    res.json({ invoice });
  } catch (err) {
    console.error(`[InvoiceController Error] Error loading invoice ID ${invoiceId}:`, err);
    if (err.message.includes('Unauthorized')) {
      return res.status(403).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error loading invoice details', error: err.message });
  }
};

const createInvoice = async (req, res) => {
  const userId = req.user.id;
  const { company_id, customer_id, invoice_type, invoice_date, items } = req.body;

  console.log(`[InvoiceController] POST /api/invoices - Body:`, req.body, `User:`, userId);

  if (!company_id) return res.status(400).json({ message: 'company_id is required' });
  if (!customer_id) return res.status(400).json({ message: 'customer_id is required' });
  if (!invoice_type) return res.status(400).json({ message: 'invoice_type is required' });
  if (!invoice_date) return res.status(400).json({ message: 'invoice_date is required' });

  try {
    const result = await InvoiceModel.createInvoice(userId, company_id, {
      customer_id,
      invoice_type,
      invoice_date,
      items
    });
    res.status(201).json({
      message: 'Invoice created successfully',
      invoice: result.invoice,
      invoice_number: result.invoiceNumber
    });
  } catch (err) {
    console.error(`[InvoiceController Error] Error creating invoice:`, err);
    if (err.message.includes('Unauthorized')) {
      return res.status(403).json({ message: err.message });
    }
    if (
      err.message.includes('required') || 
      err.message.includes('must be greater than zero') ||
      err.message.includes('not found') ||
      err.message.includes('stock not available') ||
      err.message.includes('Invalid')
    ) {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error creating invoice', error: err.message });
  }
};

const deleteInvoice = async (req, res) => {
  const invoiceId = req.params.id;
  const userId = req.user.id;

  console.log(`[InvoiceController] DELETE /api/invoices/${invoiceId} - User:`, userId);

  try {
    const result = await InvoiceModel.deleteInvoice(userId, invoiceId);
    res.json({ message: 'Invoice deleted and stock rolled back successfully', invoice: result });
  } catch (err) {
    console.error(`[InvoiceController Error] Error deleting invoice ID ${invoiceId}:`, err);
    if (err.message.includes('Unauthorized')) {
      return res.status(403).json({ message: err.message });
    }
    if (err.message.includes('not found')) {
      return res.status(404).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error deleting invoice', error: err.message });
  }
};

module.exports = {
  getInvoices,
  getInvoice,
  createInvoice,
  deleteInvoice
};
