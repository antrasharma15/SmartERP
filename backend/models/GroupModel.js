const pool = require('../config/db');

/**
 * Helper to check company access for user.
 */
const checkUserCompanyAccess = async (companyId, userId) => {
  console.log(`[GroupModel Debug] Checking company access. companyId: ${companyId}, userId: ${userId}`);
  try {
    const result = await pool.query(
      `SELECT role FROM company_users WHERE company_id = $1 AND user_id = $2`,
      [companyId, userId]
    );
    const hasAccess = result.rows.length > 0;
    console.log(`[GroupModel Debug] Access check: ${hasAccess ? 'GRANTED' : 'DENIED'}`);
    return hasAccess;
  } catch (err) {
    console.error(`[GroupModel Error] Database error in checkUserCompanyAccess:`, err);
    throw new Error(`Database error verifying company access: ${err.message}`);
  }
};

/**
 * Detect circular reference in parent-child hierarchy.
 * Traverses ancestors upwards. Returns true if a cycle is detected.
 */
const checkCircularReference = async (groupId, newParentId) => {
  console.log(`[GroupModel Debug] Running Cycle Check. groupId: ${groupId}, targetParentId: ${newParentId}`);
  if (!newParentId) return false;
  if (groupId === newParentId) {
    console.warn(`[GroupModel Warning] Cycle detected: Group cannot be its own parent.`);
    return true;
  }

  let currentParentId = newParentId;
  const visited = new Set([groupId]);

  try {
    while (currentParentId) {
      if (visited.has(currentParentId)) {
        console.warn(`[GroupModel Warning] Cycle detected. Visited ancestor path contains group: ${currentParentId}`);
        return true;
      }
      visited.add(currentParentId);

      console.log(`[GroupModel Debug] Checking ancestor node ID: ${currentParentId}`);
      const parentRes = await pool.query(
        `SELECT parent_id FROM groups WHERE id = $1`,
        [currentParentId]
      );

      if (parentRes.rows.length === 0) {
        console.log(`[GroupModel Debug] Ancestor chain ended: Node ${currentParentId} not found.`);
        break;
      }

      currentParentId = parentRes.rows[0].parent_id;
    }
    console.log(`[GroupModel Debug] Cycle Check complete. No circular references detected.`);
    return false;
  } catch (err) {
    console.error(`[GroupModel Error] Error traversing parent chain:`, err);
    throw err;
  }
};

/**
 * Get all groups for a company.
 */
const getGroupsByCompanyId = async (userId, companyId) => {
  console.log(`[GroupModel Debug] Listing groups for companyId: ${companyId} requested by userId: ${userId}`);
  
  const hasAccess = await checkUserCompanyAccess(companyId, userId);
  if (!hasAccess) {
    throw new Error('Unauthorized: You do not have access to this company');
  }

  try {
    const result = await pool.query(
      `SELECT g.*, pg.name as parent_name 
       FROM groups g 
       LEFT JOIN groups pg ON g.parent_id = pg.id 
       WHERE g.company_id = $1 
       ORDER BY g.name ASC`,
      [companyId]
    );
    console.log(`[GroupModel Debug] Found ${result.rows.length} groups for company: ${companyId}`);
    return result.rows;
  } catch (err) {
    console.error(`[GroupModel Error] Failed to retrieve groups:`, err);
    throw new Error(`Database error fetching groups: ${err.message}`);
  }
};

/**
 * Create a new group.
 */
const createGroup = async (userId, companyId, groupData) => {
  const { name, type, parent_id } = groupData;
  console.log(`[GroupModel Debug] Creating group in company: ${companyId} by user: ${userId}. Input:`, { name, type, parent_id });

  const hasAccess = await checkUserCompanyAccess(companyId, userId);
  if (!hasAccess) {
    throw new Error('Unauthorized: You do not have access to this company');
  }

  if (!name || name.trim() === '') {
    throw new Error('Group name is required');
  }

  const allowedTypes = ['asset', 'liability', 'income', 'expense'];
  const formattedType = type ? type.trim().toLowerCase() : '';
  if (!allowedTypes.includes(formattedType)) {
    console.warn(`[GroupModel Warning] Invalid type provided: "${type}". Allowed: ${allowedTypes.join(', ')}`);
    throw new Error(`Group type must be one of: ${allowedTypes.join(', ')}`);
  }

  try {
    // Check duplicate name in same company
    console.log(`[GroupModel Debug] Verifying uniqueness for name: "${name}"`);
    const dupCheck = await pool.query(
      `SELECT id FROM groups WHERE company_id = $1 AND LOWER(name) = LOWER($2)`,
      [companyId, name.trim()]
    );

    if (dupCheck.rows.length > 0) {
      console.warn(`[GroupModel Warning] Group duplicate found: "${name}" (ID: ${dupCheck.rows[0].id})`);
      throw new Error(`A group with the name "${name}" already exists in this company`);
    }

    // Verify parent group exists, matches company and matches type
    if (parent_id) {
      console.log(`[GroupModel Debug] Verifying parent group ID: ${parent_id}`);
      const parentRes = await pool.query(
        `SELECT type, company_id FROM groups WHERE id = $1`,
        [parent_id]
      );

      if (parentRes.rows.length === 0) {
        throw new Error('Specified parent group not found');
      }

      const parent = parentRes.rows[0];
      if (parent.company_id !== companyId) {
        throw new Error('Parent group must belong to the same company');
      }

      if (parent.type !== formattedType) {
        throw new Error(`Parent group type "${parent.type}" must match child group type "${formattedType}"`);
      }
    }

    const result = await pool.query(
      `INSERT INTO groups (company_id, name, type, parent_id, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [companyId, name.trim(), formattedType, parent_id || null]
    );

    const newGroup = result.rows[0];
    console.log(`[GroupModel Debug] Group created successfully. ID: ${newGroup.id}`);
    return newGroup;
  } catch (err) {
    console.error(`[GroupModel Error] Failed to create group:`, err);
    throw err;
  }
};

/**
 * Get details of a single group.
 */
const getGroupById = async (userId, groupId) => {
  console.log(`[GroupModel Debug] Retrieving group ID: ${groupId} requested by userId: ${userId}`);
  try {
    const result = await pool.query(
      `SELECT * FROM groups WHERE id = $1`,
      [groupId]
    );

    if (result.rows.length === 0) {
      console.warn(`[GroupModel Warning] Group not found. ID: ${groupId}`);
      return null;
    }

    const group = result.rows[0];
    const hasAccess = await checkUserCompanyAccess(group.company_id, userId);
    if (!hasAccess) {
      throw new Error('Unauthorized: You do not have access to this group');
    }

    return group;
  } catch (err) {
    console.error(`[GroupModel Error] Failed to fetch group:`, err);
    throw err;
  }
};

/**
 * Update an existing group.
 */
const updateGroup = async (userId, groupId, groupData) => {
  const { name, type, parent_id } = groupData;
  console.log(`[GroupModel Debug] Updating group ID: ${groupId} requested by user: ${userId}. Input:`, { name, type, parent_id });

  try {
    const currentRes = await pool.query(`SELECT company_id, type FROM groups WHERE id = $1`, [groupId]);
    if (currentRes.rows.length === 0) {
      throw new Error('Group not found');
    }

    const currentGroup = currentRes.rows[0];
    const companyId = currentGroup.company_id;

    const hasAccess = await checkUserCompanyAccess(companyId, userId);
    if (!hasAccess) {
      throw new Error('Unauthorized: You do not have access to this company');
    }

    if (!name || name.trim() === '') {
      throw new Error('Group name is required');
    }

    const allowedTypes = ['asset', 'liability', 'income', 'expense'];
    const formattedType = type ? type.trim().toLowerCase() : currentGroup.type;
    if (!allowedTypes.includes(formattedType)) {
      throw new Error(`Group type must be one of: ${allowedTypes.join(', ')}`);
    }

    // Check duplicate name
    const dupCheck = await pool.query(
      `SELECT id FROM groups WHERE company_id = $1 AND LOWER(name) = LOWER($2) AND id != $3`,
      [companyId, name.trim(), groupId]
    );
    if (dupCheck.rows.length > 0) {
      throw new Error(`A group with the name "${name}" already exists in this company`);
    }

    // Validate parent
    if (parent_id) {
      const parentRes = await pool.query(`SELECT type, company_id FROM groups WHERE id = $1`, [parent_id]);
      if (parentRes.rows.length === 0) {
        throw new Error('Specified parent group not found');
      }

      const parent = parentRes.rows[0];
      if (parent.company_id !== companyId) {
        throw new Error('Parent group must belong to the same company');
      }

      if (parent.type !== formattedType) {
        throw new Error(`Parent group type "${parent.type}" must match child group type "${formattedType}"`);
      }

      // Cycle Check!
      const isCircular = await checkCircularReference(groupId, parent_id);
      if (isCircular) {
        throw new Error('Invalid parenting: Circular reference/dependency detected');
      }
    }

    const result = await pool.query(
      `UPDATE groups 
       SET name = $1, type = $2, parent_id = $3
       WHERE id = $4
       RETURNING *`,
      [name.trim(), formattedType, parent_id || null, groupId]
    );

    console.log(`[GroupModel Debug] Group ID ${groupId} updated successfully.`);
    return result.rows[0];
  } catch (err) {
    console.error(`[GroupModel Error] Failed to update group ID ${groupId}:`, err);
    throw err;
  }
};

/**
 * Delete a group.
 * Checks for subgroups and active ledgers.
 */
const deleteGroup = async (userId, groupId) => {
  console.log(`[GroupModel Debug] Deleting group ID: ${groupId} requested by user: ${userId}`);
  try {
    const groupRes = await pool.query(`SELECT company_id, name FROM groups WHERE id = $1`, [groupId]);
    if (groupRes.rows.length === 0) {
      throw new Error('Group not found');
    }

    const { company_id, name } = groupRes.rows[0];
    const hasAccess = await checkUserCompanyAccess(company_id, userId);
    if (!hasAccess) {
      throw new Error('Unauthorized: You do not have access to this company');
    }

    // Dependency check 1: Subgroups
    console.log(`[GroupModel Debug] Checking subgroup dependency for group: ${groupId}`);
    const subRes = await pool.query(
      `SELECT COUNT(*) FROM groups WHERE parent_id = $1`,
      [groupId]
    );
    const subgroupCount = parseInt(subRes.rows[0].count, 10);
    if (subgroupCount > 0) {
      console.warn(`[GroupModel Warning] Cannot delete group ID ${groupId}. It contains ${subgroupCount} subgroups.`);
      throw new Error('Cannot delete group: it contains sub-groups');
    }

    // Dependency check 2: Ledger Accounts
    console.log(`[GroupModel Debug] Checking ledger accounts dependency for group: ${groupId}`);
    const ledgerRes = await pool.query(
      `SELECT COUNT(*) FROM ledgers WHERE group_id = $1`,
      [groupId]
    );
    const ledgerCount = parseInt(ledgerRes.rows[0].count, 10);
    if (ledgerCount > 0) {
      console.warn(`[GroupModel Warning] Cannot delete group ID ${groupId}. It has ${ledgerCount} active ledger accounts.`);
      throw new Error('Cannot delete group: it has active ledger accounts associated with it');
    }

    const result = await pool.query(
      `DELETE FROM groups WHERE id = $1 RETURNING *`,
      [groupId]
    );

    console.log(`[GroupModel Debug] Group "${name}" (ID: ${groupId}) deleted successfully.`);
    return result.rows[0];
  } catch (err) {
    console.error(`[GroupModel Error] Failed to delete group ID ${groupId}:`, err);
    throw err;
  }
};

module.exports = {
  getGroupsByCompanyId,
  createGroup,
  getGroupById,
  updateGroup,
  deleteGroup
};
