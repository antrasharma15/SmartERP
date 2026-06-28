const pool = require('../config/db');

/**
 * Helper to check company access for user.
 */
const checkUserCompanyAccess = async (companyId, userId) => {
  console.log(`[StockModel Debug] Checking company access. companyId: ${companyId}, userId: ${userId}`);
  try {
    const result = await pool.query(
      `SELECT role FROM company_users WHERE company_id = $1 AND user_id = $2`,
      [companyId, userId]
    );
    const hasAccess = result.rows.length > 0;
    console.log(`[StockModel Debug] Access check: ${hasAccess ? 'GRANTED' : 'DENIED'}`);
    return hasAccess;
  } catch (err) {
    console.error(`[StockModel Error] Database error in checkUserCompanyAccess:`, err);
    throw new Error(`Database error verifying company access: ${err.message}`);
  }
};

/**
 * Cycle check validation for stock groups.
 */
const checkCircularStockGroup = async (groupId, newParentId) => {
  console.log(`[StockModel Debug] Running Stock Group Cycle Check. groupId: ${groupId}, targetParentId: ${newParentId}`);
  if (!newParentId) return false;
  if (groupId === newParentId) {
    console.warn(`[StockModel Warning] Cycle detected: Stock group cannot be its own parent.`);
    return true;
  }

  let currentParentId = newParentId;
  const visited = new Set([groupId]);

  try {
    while (currentParentId) {
      if (visited.has(currentParentId)) {
        console.warn(`[StockModel Warning] Cycle detected. Visited ancestor chain contains node: ${currentParentId}`);
        return true;
      }
      visited.add(currentParentId);

      console.log(`[StockModel Debug] Checking ancestor node ID: ${currentParentId}`);
      const parentRes = await pool.query(
        `SELECT parent_id FROM stock_groups WHERE id = $1`,
        [currentParentId]
      );

      if (parentRes.rows.length === 0) {
        break;
      }

      currentParentId = parentRes.rows[0].parent_id;
    }
    console.log(`[StockModel Debug] Cycle Check complete. No circular references detected.`);
    return false;
  } catch (err) {
    console.error(`[StockModel Error] Error in checkCircularStockGroup parent chain traversal:`, err);
    throw err;
  }
};

// ==========================================
// 1. UNITS OF MEASURE OPERATIONS
// ==========================================

const getUnitsByCompanyId = async (userId, companyId) => {
  console.log(`[StockModel Debug] Listing units for company ID: ${companyId}`);
  const hasAccess = await checkUserCompanyAccess(companyId, userId);
  if (!hasAccess) {
    throw new Error('Unauthorized: You do not have access to this company');
  }

  try {
    const result = await pool.query(
      `SELECT * FROM units WHERE company_id = $1 ORDER BY symbol ASC`,
      [companyId]
    );
    console.log(`[StockModel Debug] Retrieved ${result.rows.length} units.`);
    return result.rows;
  } catch (err) {
    console.error(`[StockModel Error] Database error in getUnitsByCompanyId:`, err);
    throw err;
  }
};

const createUnit = async (userId, companyId, unitData) => {
  const { name, symbol } = unitData;
  console.log(`[StockModel Debug] Creating unit in company: ${companyId}. Symbol: "${symbol}", Name: "${name}"`);

  const hasAccess = await checkUserCompanyAccess(companyId, userId);
  if (!hasAccess) {
    throw new Error('Unauthorized: You do not have access to this company');
  }

  if (!symbol || symbol.trim() === '') throw new Error('Unit symbol is required');
  if (!name || name.trim() === '') throw new Error('Unit name is required');

  try {
    // Check duplicates
    const dupCheck = await pool.query(
      `SELECT id FROM units WHERE company_id = $1 AND (LOWER(symbol) = LOWER($2) OR LOWER(name) = LOWER($3))`,
      [companyId, symbol.trim(), name.trim()]
    );

    if (dupCheck.rows.length > 0) {
      console.warn(`[StockModel Warning] Duplicate unit symbol/name found for "${symbol}" / "${name}"`);
      throw new Error(`A unit with symbol "${symbol}" or name "${name}" already exists`);
    }

    const result = await pool.query(
      `INSERT INTO units (company_id, name, symbol)
       VALUES ($1, $2, $3) RETURNING *`,
      [companyId, name.trim(), symbol.trim().toUpperCase()]
    );

    console.log(`[StockModel Debug] Unit created successfully. ID: ${result.rows[0].id}`);
    return result.rows[0];
  } catch (err) {
    console.error(`[StockModel Error] Database error in createUnit:`, err);
    throw err;
  }
};

const updateUnit = async (userId, unitId, unitData) => {
  const { name, symbol } = unitData;
  console.log(`[StockModel Debug] Updating unit ID: ${unitId}. Symbol: "${symbol}", Name: "${name}"`);

  try {
    const currentUnit = await pool.query(`SELECT company_id FROM units WHERE id = $1`, [unitId]);
    if (currentUnit.rows.length === 0) throw new Error('Unit not found');

    const companyId = currentUnit.rows[0].company_id;
    const hasAccess = await checkUserCompanyAccess(companyId, userId);
    if (!hasAccess) throw new Error('Unauthorized: You do not have access to this company');

    if (!symbol || symbol.trim() === '') throw new Error('Unit symbol is required');
    if (!name || name.trim() === '') throw new Error('Unit name is required');

    // Duplicate check
    const dupCheck = await pool.query(
      `SELECT id FROM units WHERE company_id = $1 AND (LOWER(symbol) = LOWER($2) OR LOWER(name) = LOWER($3)) AND id != $4`,
      [companyId, symbol.trim(), name.trim(), unitId]
    );

    if (dupCheck.rows.length > 0) {
      throw new Error(`A unit with symbol "${symbol}" or name "${name}" already exists`);
    }

    const result = await pool.query(
      `UPDATE units SET name = $1, symbol = $2 WHERE id = $3 RETURNING *`,
      [name.trim(), symbol.trim().toUpperCase(), unitId]
    );

    console.log(`[StockModel Debug] Unit ID ${unitId} updated successfully.`);
    return result.rows[0];
  } catch (err) {
    console.error(`[StockModel Error] Database error in updateUnit:`, err);
    throw err;
  }
};

const deleteUnit = async (userId, unitId) => {
  console.log(`[StockModel Debug] Deleting unit ID: ${unitId}`);
  try {
    const currentUnit = await pool.query(`SELECT company_id, symbol FROM units WHERE id = $1`, [unitId]);
    if (currentUnit.rows.length === 0) throw new Error('Unit not found');

    const { company_id, symbol } = currentUnit.rows[0];
    const hasAccess = await checkUserCompanyAccess(company_id, userId);
    if (!hasAccess) throw new Error('Unauthorized: You do not have access to this company');

    // Check item references
    console.log(`[StockModel Debug] Checking item references for unit: ${unitId}`);
    const refCheck = await pool.query(`SELECT COUNT(*) FROM stock_items WHERE unit_id = $1`, [unitId]);
    const refCount = parseInt(refCheck.rows[0].count, 10);
    if (refCount > 0) {
      console.warn(`[StockModel Warning] Cannot delete unit ID ${unitId}. It is used by ${refCount} items.`);
      throw new Error('Cannot delete unit: it is used by active stock items');
    }

    const result = await pool.query(`DELETE FROM units WHERE id = $1 RETURNING *`, [unitId]);
    console.log(`[StockModel Debug] Unit "${symbol}" deleted successfully.`);
    return result.rows[0];
  } catch (err) {
    console.error(`[StockModel Error] Database error in deleteUnit:`, err);
    throw err;
  }
};

// ==========================================
// 2. STOCK GROUPS OPERATIONS
// ==========================================

const getStockGroupsByCompanyId = async (userId, companyId) => {
  console.log(`[StockModel Debug] Listing stock groups for company ID: ${companyId}`);
  const hasAccess = await checkUserCompanyAccess(companyId, userId);
  if (!hasAccess) {
    throw new Error('Unauthorized: You do not have access to this company');
  }

  try {
    const result = await pool.query(
      `SELECT sg.*, psg.name as parent_name 
       FROM stock_groups sg 
       LEFT JOIN stock_groups psg ON sg.parent_id = psg.id 
       WHERE sg.company_id = $1 
       ORDER BY sg.name ASC`,
      [companyId]
    );
    console.log(`[StockModel Debug] Retrieved ${result.rows.length} stock groups.`);
    return result.rows;
  } catch (err) {
    console.error(`[StockModel Error] Database error in getStockGroupsByCompanyId:`, err);
    throw err;
  }
};

const createStockGroup = async (userId, companyId, groupData) => {
  const { name, parent_id } = groupData;
  console.log(`[StockModel Debug] Creating stock group in company: ${companyId}. Name: "${name}", Parent: ${parent_id}`);

  const hasAccess = await checkUserCompanyAccess(companyId, userId);
  if (!hasAccess) {
    throw new Error('Unauthorized: You do not have access to this company');
  }

  if (!name || name.trim() === '') throw new Error('Stock group name is required');

  try {
    // Check duplicate
    const dupCheck = await pool.query(
      `SELECT id FROM stock_groups WHERE company_id = $1 AND LOWER(name) = LOWER($2)`,
      [companyId, name.trim()]
    );
    if (dupCheck.rows.length > 0) {
      throw new Error(`A stock group with the name "${name}" already exists`);
    }

    if (parent_id) {
      const parentRes = await pool.query(`SELECT company_id FROM stock_groups WHERE id = $1`, [parent_id]);
      if (parentRes.rows.length === 0) throw new Error('Parent stock group not found');
      if (parentRes.rows[0].company_id !== companyId) throw new Error('Parent stock group must belong to the same company');
    }

    const result = await pool.query(
      `INSERT INTO stock_groups (company_id, name, parent_id)
       VALUES ($1, $2, $3) RETURNING *`,
      [companyId, name.trim(), parent_id || null]
    );

    console.log(`[StockModel Debug] Stock group created. ID: ${result.rows[0].id}`);
    return result.rows[0];
  } catch (err) {
    console.error(`[StockModel Error] Database error in createStockGroup:`, err);
    throw err;
  }
};

const updateStockGroup = async (userId, groupId, groupData) => {
  const { name, parent_id } = groupData;
  console.log(`[StockModel Debug] Updating stock group ID: ${groupId}. Name: "${name}", Parent: ${parent_id}`);

  try {
    const currentGroup = await pool.query(`SELECT company_id FROM stock_groups WHERE id = $1`, [groupId]);
    if (currentGroup.rows.length === 0) throw new Error('Stock group not found');

    const companyId = currentGroup.rows[0].company_id;
    const hasAccess = await checkUserCompanyAccess(companyId, userId);
    if (!hasAccess) throw new Error('Unauthorized: You do not have access to this company');

    if (!name || name.trim() === '') throw new Error('Stock group name is required');

    // Duplicate check
    const dupCheck = await pool.query(
      `SELECT id FROM stock_groups WHERE company_id = $1 AND LOWER(name) = LOWER($2) AND id != $3`,
      [companyId, name.trim(), groupId]
    );
    if (dupCheck.rows.length > 0) {
      throw new Error(`A stock group with the name "${name}" already exists`);
    }

    if (parent_id) {
      const parentRes = await pool.query(`SELECT company_id FROM stock_groups WHERE id = $1`, [parent_id]);
      if (parentRes.rows.length === 0) throw new Error('Parent stock group not found');
      if (parentRes.rows[0].company_id !== companyId) throw new Error('Parent stock group must belong to the same company');

      // Cycle check
      const isCircular = await checkCircularStockGroup(groupId, parent_id);
      if (isCircular) {
        throw new Error('Invalid parenting: Circular reference/dependency detected');
      }
    }

    const result = await pool.query(
      `UPDATE stock_groups SET name = $1, parent_id = $2 WHERE id = $3 RETURNING *`,
      [name.trim(), parent_id || null, groupId]
    );

    console.log(`[StockModel Debug] Stock group ID ${groupId} updated successfully.`);
    return result.rows[0];
  } catch (err) {
    console.error(`[StockModel Error] Database error in updateStockGroup:`, err);
    throw err;
  }
};

const deleteStockGroup = async (userId, groupId) => {
  console.log(`[StockModel Debug] Deleting stock group ID: ${groupId}`);
  try {
    const currentGroup = await pool.query(`SELECT company_id, name FROM stock_groups WHERE id = $1`, [groupId]);
    if (currentGroup.rows.length === 0) throw new Error('Stock group not found');

    const { company_id, name } = currentGroup.rows[0];
    const hasAccess = await checkUserCompanyAccess(company_id, userId);
    if (!hasAccess) throw new Error('Unauthorized: You do not have access to this company');

    // Check subgroups
    console.log(`[StockModel Debug] Checking subgroups for stock group: ${groupId}`);
    const subCheck = await pool.query(`SELECT COUNT(*) FROM stock_groups WHERE parent_id = $1`, [groupId]);
    const subCount = parseInt(subCheck.rows[0].count, 10);
    if (subCount > 0) {
      throw new Error('Cannot delete stock group: it contains subgroups');
    }

    // Check items
    console.log(`[StockModel Debug] Checking item references for stock group: ${groupId}`);
    const itemCheck = await pool.query(`SELECT COUNT(*) FROM stock_items WHERE stock_group_id = $1`, [groupId]);
    const itemCount = parseInt(itemCheck.rows[0].count, 10);
    if (itemCount > 0) {
      throw new Error('Cannot delete stock group: it has active stock items associated with it');
    }

    const result = await pool.query(`DELETE FROM stock_groups WHERE id = $1 RETURNING *`, [groupId]);
    console.log(`[StockModel Debug] Stock group "${name}" deleted successfully.`);
    return result.rows[0];
  } catch (err) {
    console.error(`[StockModel Error] Database error in deleteStockGroup:`, err);
    throw err;
  }
};

// ==========================================
// 3. STOCK ITEMS OPERATIONS
// ==========================================

const getStockItemsByCompanyId = async (userId, companyId) => {
  console.log(`[StockModel Debug] Listing stock items for company ID: ${companyId}`);
  const hasAccess = await checkUserCompanyAccess(companyId, userId);
  if (!hasAccess) {
    throw new Error('Unauthorized: You do not have access to this company');
  }

  try {
    const result = await pool.query(
      `SELECT si.*, sg.name as group_name, u.symbol as unit_symbol 
       FROM stock_items si 
       LEFT JOIN stock_groups sg ON si.stock_group_id = sg.id 
       LEFT JOIN units u ON si.unit_id = u.id 
       WHERE si.company_id = $1 
       ORDER BY si.name ASC`,
      [companyId]
    );
    console.log(`[StockModel Debug] Retrieved ${result.rows.length} stock items.`);
    return result.rows;
  } catch (err) {
    console.error(`[StockModel Error] Database error in getStockItemsByCompanyId:`, err);
    throw err;
  }
};

const createStockItem = async (userId, companyId, itemData) => {
  const { name, sku, stock_group_id, unit_id, purchase_price, selling_price, gst_percentage, quantity, reorder_level } = itemData;
  console.log(`[StockModel Debug] Creating stock item in company: ${companyId}. Name: "${name}", SKU: "${sku}"`);

  const hasAccess = await checkUserCompanyAccess(companyId, userId);
  if (!hasAccess) {
    throw new Error('Unauthorized: You do not have access to this company');
  }

  if (!name || name.trim() === '') throw new Error('Stock item name is required');

  try {
    // Check duplicates
    const dupCheck = await pool.query(
      `SELECT id FROM stock_items 
       WHERE company_id = $1 AND (LOWER(name) = LOWER($2) OR (sku IS NOT NULL AND LOWER(sku) = LOWER($3)))`,
      [companyId, name.trim(), sku ? sku.trim() : '']
    );
    if (dupCheck.rows.length > 0) {
      throw new Error(`A stock item with the name "${name}" or SKU "${sku}" already exists`);
    }

    if (stock_group_id) {
      const gRes = await pool.query(`SELECT company_id FROM stock_groups WHERE id = $1`, [stock_group_id]);
      if (gRes.rows.length === 0) throw new Error('Stock group not found');
      if (gRes.rows[0].company_id !== companyId) throw new Error('Stock group must belong to the same company');
    }

    if (unit_id) {
      const uRes = await pool.query(`SELECT company_id FROM units WHERE id = $1`, [unit_id]);
      if (uRes.rows.length === 0) throw new Error('Unit of measure not found');
      if (uRes.rows[0].company_id !== companyId) throw new Error('Unit of measure must belong to the same company');
    }

    const result = await pool.query(
      `INSERT INTO stock_items (
        company_id, stock_group_id, unit_id, name, sku, 
        purchase_price, selling_price, gst_percentage, quantity, reorder_level, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()) RETURNING *`,
      [
        companyId,
        stock_group_id || null,
        unit_id || null,
        name.trim(),
        sku && sku.trim() !== '' ? sku.trim() : null,
        purchase_price || 0,
        selling_price || 0,
        gst_percentage || 0,
        quantity || 0,
        reorder_level || 0
      ]
    );

    console.log(`[StockModel Debug] Stock item created. ID: ${result.rows[0].id}`);
    return result.rows[0];
  } catch (err) {
    console.error(`[StockModel Error] Database error in createStockItem:`, err);
    throw err;
  }
};

const updateStockItem = async (userId, itemId, itemData) => {
  const { name, sku, stock_group_id, unit_id, purchase_price, selling_price, gst_percentage, quantity, reorder_level } = itemData;
  console.log(`[StockModel Debug] Updating stock item ID: ${itemId}. Name: "${name}"`);

  try {
    const currentItem = await pool.query(`SELECT company_id FROM stock_items WHERE id = $1`, [itemId]);
    if (currentItem.rows.length === 0) throw new Error('Stock item not found');

    const companyId = currentItem.rows[0].company_id;
    const hasAccess = await checkUserCompanyAccess(companyId, userId);
    if (!hasAccess) throw new Error('Unauthorized: You do not have access to this company');

    if (!name || name.trim() === '') throw new Error('Stock item name is required');

    // Duplicate check
    const dupCheck = await pool.query(
      `SELECT id FROM stock_items 
       WHERE company_id = $1 AND (LOWER(name) = LOWER($2) OR (sku IS NOT NULL AND LOWER(sku) = LOWER($3))) AND id != $4`,
      [companyId, name.trim(), sku ? sku.trim() : '', itemId]
    );
    if (dupCheck.rows.length > 0) {
      throw new Error(`A stock item with the name "${name}" or SKU "${sku}" already exists`);
    }

    if (stock_group_id) {
      const gRes = await pool.query(`SELECT company_id FROM stock_groups WHERE id = $1`, [stock_group_id]);
      if (gRes.rows.length === 0) throw new Error('Stock group not found');
      if (gRes.rows[0].company_id !== companyId) throw new Error('Stock group must belong to the same company');
    }

    if (unit_id) {
      const uRes = await pool.query(`SELECT company_id FROM units WHERE id = $1`, [unit_id]);
      if (uRes.rows.length === 0) throw new Error('Unit of measure not found');
      if (uRes.rows[0].company_id !== companyId) throw new Error('Unit of measure must belong to the same company');
    }

    const result = await pool.query(
      `UPDATE stock_items SET 
        name = $1, sku = $2, stock_group_id = $3, unit_id = $4,
        purchase_price = $5, selling_price = $6, gst_percentage = $7,
        quantity = $8, reorder_level = $9, updated_at = NOW()
       WHERE id = $10 RETURNING *`,
      [
        name.trim(),
        sku && sku.trim() !== '' ? sku.trim() : null,
        stock_group_id || null,
        unit_id || null,
        purchase_price || 0,
        selling_price || 0,
        gst_percentage || 0,
        quantity || 0,
        reorder_level || 0,
        itemId
      ]
    );

    console.log(`[StockModel Debug] Stock item ID ${itemId} updated successfully.`);
    return result.rows[0];
  } catch (err) {
    console.error(`[StockModel Error] Database error in updateStockItem:`, err);
    throw err;
  }
};

const deleteStockItem = async (userId, itemId) => {
  console.log(`[StockModel Debug] Deleting stock item ID: ${itemId}`);
  try {
    const currentItem = await pool.query(`SELECT company_id, name FROM stock_items WHERE id = $1`, [itemId]);
    if (currentItem.rows.length === 0) throw new Error('Stock item not found');

    const { company_id, name } = currentItem.rows[0];
    const hasAccess = await checkUserCompanyAccess(company_id, userId);
    if (!hasAccess) throw new Error('Unauthorized: You do not have access to this company');

    const result = await pool.query(`DELETE FROM stock_items WHERE id = $1 RETURNING *`, [itemId]);
    console.log(`[StockModel Debug] Stock item "${name}" deleted successfully.`);
    return result.rows[0];
  } catch (err) {
    console.error(`[StockModel Error] Database error in deleteStockItem:`, err);
    throw err;
  }
};

module.exports = {
  getUnitsByCompanyId,
  createUnit,
  updateUnit,
  deleteUnit,
  getStockGroupsByCompanyId,
  createStockGroup,
  updateStockGroup,
  deleteStockGroup,
  getStockItemsByCompanyId,
  createStockItem,
  updateStockItem,
  deleteStockItem
};
