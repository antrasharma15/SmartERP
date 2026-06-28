const StockModel = require('../models/StockModel');

// ==========================================
// 1. UNITS OF MEASURE CONTROLLERS
// ==========================================

const getUnits = async (req, res) => {
  const { company_id } = req.query;
  const userId = req.user.id;
  console.log(`[StockController] GET /api/units - Query:`, req.query, `User:`, userId);

  if (!company_id) {
    return res.status(400).json({ message: 'company_id query parameter is required' });
  }

  try {
    const units = await StockModel.getUnitsByCompanyId(userId, company_id);
    res.json({ units });
  } catch (err) {
    console.error(`[StockController Error] Error listing units:`, err);
    if (err.message.includes('Unauthorized')) return res.status(403).json({ message: err.message });
    res.status(500).json({ message: 'Server error listing units', error: err.message });
  }
};

const createUnit = async (req, res) => {
  const userId = req.user.id;
  const { company_id, name, symbol } = req.body;
  console.log(`[StockController] POST /api/units - Body:`, req.body, `User:`, userId);

  if (!company_id) return res.status(400).json({ message: 'company_id is required' });
  if (!name || name.trim() === '') return res.status(400).json({ message: 'Unit name is required' });
  if (!symbol || symbol.trim() === '') return res.status(400).json({ message: 'Unit symbol is required' });

  try {
    const unit = await StockModel.createUnit(userId, company_id, { name, symbol });
    res.status(201).json({ message: 'Unit created successfully', unit });
  } catch (err) {
    console.error(`[StockController Error] Error creating unit:`, err);
    if (err.message.includes('Unauthorized')) return res.status(403).json({ message: err.message });
    if (err.message.includes('already exists') || err.message.includes('required')) return res.status(400).json({ message: err.message });
    res.status(500).json({ message: 'Server error creating unit', error: err.message });
  }
};

const updateUnit = async (req, res) => {
  const unitId = req.params.id;
  const userId = req.user.id;
  const { name, symbol } = req.body;
  console.log(`[StockController] PUT /api/units/${unitId} - Body:`, req.body, `User:`, userId);

  if (!name || name.trim() === '') return res.status(400).json({ message: 'Unit name is required' });
  if (!symbol || symbol.trim() === '') return res.status(400).json({ message: 'Unit symbol is required' });

  try {
    const unit = await StockModel.updateUnit(userId, unitId, { name, symbol });
    res.json({ message: 'Unit updated successfully', unit });
  } catch (err) {
    console.error(`[StockController Error] Error updating unit ID ${unitId}:`, err);
    if (err.message.includes('Unauthorized')) return res.status(403).json({ message: err.message });
    if (err.message.includes('already exists') || err.message.includes('not found') || err.message.includes('required')) {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error updating unit', error: err.message });
  }
};

const deleteUnit = async (req, res) => {
  const unitId = req.params.id;
  const userId = req.user.id;
  console.log(`[StockController] DELETE /api/units/${unitId} - User:`, userId);

  try {
    const unit = await StockModel.deleteUnit(userId, unitId);
    res.json({ message: 'Unit deleted successfully', unit });
  } catch (err) {
    console.error(`[StockController Error] Error deleting unit ID ${unitId}:`, err);
    if (err.message.includes('Unauthorized')) return res.status(403).json({ message: err.message });
    if (err.message.includes('active stock items') || err.message.includes('not found')) {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error deleting unit', error: err.message });
  }
};

// ==========================================
// 2. STOCK GROUPS CONTROLLERS
// ==========================================

const getStockGroups = async (req, res) => {
  const { company_id } = req.query;
  const userId = req.user.id;
  console.log(`[StockController] GET /api/stock-groups - Query:`, req.query, `User:`, userId);

  if (!company_id) {
    return res.status(400).json({ message: 'company_id query parameter is required' });
  }

  try {
    const groups = await StockModel.getStockGroupsByCompanyId(userId, company_id);
    res.json({ groups });
  } catch (err) {
    console.error(`[StockController Error] Error listing stock groups:`, err);
    if (err.message.includes('Unauthorized')) return res.status(403).json({ message: err.message });
    res.status(500).json({ message: 'Server error listing stock groups', error: err.message });
  }
};

const createStockGroup = async (req, res) => {
  const userId = req.user.id;
  const { company_id, name, parent_id } = req.body;
  console.log(`[StockController] POST /api/stock-groups - Body:`, req.body, `User:`, userId);

  if (!company_id) return res.status(400).json({ message: 'company_id is required' });
  if (!name || name.trim() === '') return res.status(400).json({ message: 'Stock group name is required' });

  try {
    const group = await StockModel.createStockGroup(userId, company_id, { name, parent_id });
    res.status(201).json({ message: 'Stock group created successfully', group });
  } catch (err) {
    console.error(`[StockController Error] Error creating stock group:`, err);
    if (err.message.includes('Unauthorized')) return res.status(403).json({ message: err.message });
    if (err.message.includes('already exists') || err.message.includes('not found') || err.message.includes('required')) {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error creating stock group', error: err.message });
  }
};

const updateStockGroup = async (req, res) => {
  const groupId = req.params.id;
  const userId = req.user.id;
  const { name, parent_id } = req.body;
  console.log(`[StockController] PUT /api/stock-groups/${groupId} - Body:`, req.body, `User:`, userId);

  if (!name || name.trim() === '') return res.status(400).json({ message: 'Stock group name is required' });

  try {
    const group = await StockModel.updateStockGroup(userId, groupId, { name, parent_id });
    res.json({ message: 'Stock group updated successfully', group });
  } catch (err) {
    console.error(`[StockController Error] Error updating stock group ID ${groupId}:`, err);
    if (err.message.includes('Unauthorized')) return res.status(403).json({ message: err.message });
    if (
      err.message.includes('already exists') || 
      err.message.includes('Circular reference') || 
      err.message.includes('not found') || 
      err.message.includes('required')
    ) {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error updating stock group', error: err.message });
  }
};

const deleteStockGroup = async (req, res) => {
  const groupId = req.params.id;
  const userId = req.user.id;
  console.log(`[StockController] DELETE /api/stock-groups/${groupId} - User:`, userId);

  try {
    const group = await StockModel.deleteStockGroup(userId, groupId);
    res.json({ message: 'Stock group deleted successfully', group });
  } catch (err) {
    console.error(`[StockController Error] Error deleting stock group ID ${groupId}:`, err);
    if (err.message.includes('Unauthorized')) return res.status(403).json({ message: err.message });
    if (err.message.includes('subgroups') || err.message.includes('active stock items') || err.message.includes('not found')) {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error deleting stock group', error: err.message });
  }
};

// ==========================================
// 3. STOCK ITEMS CONTROLLERS
// ==========================================

const getStockItems = async (req, res) => {
  const { company_id } = req.query;
  const userId = req.user.id;
  console.log(`[StockController] GET /api/stock-items - Query:`, req.query, `User:`, userId);

  if (!company_id) {
    return res.status(400).json({ message: 'company_id query parameter is required' });
  }

  try {
    const items = await StockModel.getStockItemsByCompanyId(userId, company_id);
    res.json({ items });
  } catch (err) {
    console.error(`[StockController Error] Error listing stock items:`, err);
    if (err.message.includes('Unauthorized')) return res.status(403).json({ message: err.message });
    res.status(500).json({ message: 'Server error listing stock items', error: err.message });
  }
};

const createStockItem = async (req, res) => {
  const userId = req.user.id;
  const { company_id, name, sku, stock_group_id, unit_id, purchase_price, selling_price, gst_percentage, quantity, reorder_level } = req.body;
  console.log(`[StockController] POST /api/stock-items - Body:`, req.body, `User:`, userId);

  if (!company_id) return res.status(400).json({ message: 'company_id is required' });
  if (!name || name.trim() === '') return res.status(400).json({ message: 'Stock item name is required' });

  try {
    const item = await StockModel.createStockItem(userId, company_id, {
      name, sku, stock_group_id, unit_id, purchase_price, selling_price, gst_percentage, quantity, reorder_level
    });
    res.status(201).json({ message: 'Stock item created successfully', item });
  } catch (err) {
    console.error(`[StockController Error] Error creating stock item:`, err);
    if (err.message.includes('Unauthorized')) return res.status(403).json({ message: err.message });
    if (err.message.includes('already exists') || err.message.includes('not found') || err.message.includes('required')) {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error creating stock item', error: err.message });
  }
};

const getStockItem = async (req, res) => {
  const itemId = req.params.id;
  const userId = req.user.id;
  console.log(`[StockController] GET /api/stock-items/${itemId} - User:`, userId);

  try {
    const item = await StockModel.getStockItemById(userId, itemId);
    if (!item) return res.status(404).json({ message: 'Stock item not found' });
    res.json({ item });
  } catch (err) {
    console.error(`[StockController Error] Error retrieving stock item details for ID ${itemId}:`, err);
    if (err.message.includes('Unauthorized')) return res.status(403).json({ message: err.message });
    res.status(500).json({ message: 'Server error retrieving stock item', error: err.message });
  }
};

const updateStockItem = async (req, res) => {
  const itemId = req.params.id;
  const userId = req.user.id;
  const { name, sku, stock_group_id, unit_id, purchase_price, selling_price, gst_percentage, quantity, reorder_level } = req.body;
  console.log(`[StockController] PUT /api/stock-items/${itemId} - Body:`, req.body, `User:`, userId);

  if (!name || name.trim() === '') return res.status(400).json({ message: 'Stock item name is required' });

  try {
    const item = await StockModel.updateStockItem(userId, itemId, {
      name, sku, stock_group_id, unit_id, purchase_price, selling_price, gst_percentage, quantity, reorder_level
    });
    res.json({ message: 'Stock item updated successfully', item });
  } catch (err) {
    console.error(`[StockController Error] Error updating stock item ID ${itemId}:`, err);
    if (err.message.includes('Unauthorized')) return res.status(403).json({ message: err.message });
    if (err.message.includes('already exists') || err.message.includes('not found') || err.message.includes('required')) {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error updating stock item', error: err.message });
  }
};

const deleteStockItem = async (req, res) => {
  const itemId = req.params.id;
  const userId = req.user.id;
  console.log(`[StockController] DELETE /api/stock-items/${itemId} - User:`, userId);

  try {
    const item = await StockModel.deleteStockItem(userId, itemId);
    res.json({ message: 'Stock item deleted successfully', item });
  } catch (err) {
    console.error(`[StockController Error] Error deleting stock item ID ${itemId}:`, err);
    if (err.message.includes('Unauthorized')) return res.status(403).json({ message: err.message });
    if (err.message.includes('not found')) return res.status(404).json({ message: err.message });
    res.status(500).json({ message: 'Server error deleting stock item', error: err.message });
  }
};

module.exports = {
  getUnits,
  createUnit,
  updateUnit,
  deleteUnit,
  getStockGroups,
  createStockGroup,
  updateStockGroup,
  deleteStockGroup,
  getStockItems,
  createStockItem,
  getStockItem,
  updateStockItem,
  deleteStockItem
};
