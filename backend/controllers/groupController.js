const GroupModel = require('../models/GroupModel');

/**
 * List all groups for a company.
 * Expects company_id in query params.
 */
const getGroups = async (req, res) => {
  const { company_id } = req.query;
  const userId = req.user.id;

  console.log(`[GroupController] GET /api/groups - Query:`, req.query, `User:`, userId);

  if (!company_id) {
    console.warn(`[GroupController Warning] Missing company_id query parameter.`);
    return res.status(400).json({ message: 'company_id query parameter is required' });
  }

  try {
    const groups = await GroupModel.getGroupsByCompanyId(userId, company_id);
    res.json({ groups });
  } catch (err) {
    console.error(`[GroupController Error] Error listing groups:`, err);
    if (err.message.includes('Unauthorized')) {
      return res.status(403).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error listing groups', error: err.message });
  }
};

/**
 * Create a new group.
 */
const createGroup = async (req, res) => {
  const userId = req.user.id;
  const { company_id, name, type, parent_id } = req.body;

  console.log(`[GroupController] POST /api/groups - Body:`, req.body, `User:`, userId);

  if (!company_id) {
    return res.status(400).json({ message: 'company_id is required' });
  }

  if (!name || name.trim() === '') {
    return res.status(400).json({ message: 'Group name is required' });
  }

  if (!type || type.trim() === '') {
    return res.status(400).json({ message: 'Group type is required' });
  }

  try {
    const group = await GroupModel.createGroup(userId, company_id, {
      name,
      type,
      parent_id
    });
    res.status(201).json({ message: 'Group created successfully', group });
  } catch (err) {
    console.error(`[GroupController Error] Error creating group:`, err);
    if (err.message.includes('Unauthorized')) {
      return res.status(403).json({ message: err.message });
    }
    if (
      err.message.includes('already exists') || 
      err.message.includes('must be one of') ||
      err.message.includes('parent group') ||
      err.message.includes('required')
    ) {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error creating group', error: err.message });
  }
};

/**
 * Get details of a single group.
 */
const getGroup = async (req, res) => {
  const groupId = req.params.id;
  const userId = req.user.id;

  console.log(`[GroupController] GET /api/groups/${groupId} - User:`, userId);

  try {
    const group = await GroupModel.getGroupById(userId, groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    res.json({ group });
  } catch (err) {
    console.error(`[GroupController Error] Error retrieving group ID ${groupId}:`, err);
    if (err.message.includes('Unauthorized')) {
      return res.status(403).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error retrieving group details', error: err.message });
  }
};

/**
 * Update an existing group.
 */
const updateGroup = async (req, res) => {
  const groupId = req.params.id;
  const userId = req.user.id;
  const { name, type, parent_id } = req.body;

  console.log(`[GroupController] PUT /api/groups/${groupId} - Body:`, req.body, `User:`, userId);

  if (!name || name.trim() === '') {
    return res.status(400).json({ message: 'Group name is required' });
  }

  try {
    const group = await GroupModel.updateGroup(userId, groupId, {
      name,
      type,
      parent_id
    });
    res.json({ message: 'Group updated successfully', group });
  } catch (err) {
    console.error(`[GroupController Error] Error updating group ID ${groupId}:`, err);
    if (err.message.includes('Unauthorized')) {
      return res.status(403).json({ message: err.message });
    }
    if (
      err.message.includes('already exists') || 
      err.message.includes('Circular reference') ||
      err.message.includes('parent group') ||
      err.message.includes('not found') ||
      err.message.includes('required')
    ) {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error updating group', error: err.message });
  }
};

/**
 * Delete a group.
 */
const deleteGroup = async (req, res) => {
  const groupId = req.params.id;
  const userId = req.user.id;

  console.log(`[GroupController] DELETE /api/groups/${groupId} - User:`, userId);

  try {
    const group = await GroupModel.deleteGroup(userId, groupId);
    res.json({ message: 'Group deleted successfully', group });
  } catch (err) {
    console.error(`[GroupController Error] Error deleting group ID ${groupId}:`, err);
    if (err.message.includes('Unauthorized')) {
      return res.status(403).json({ message: err.message });
    }
    if (err.message.includes('contains sub-groups') || err.message.includes('active ledger accounts')) {
      return res.status(400).json({ message: err.message });
    }
    if (err.message.includes('not found')) {
      return res.status(404).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error deleting group', error: err.message });
  }
};

module.exports = {
  getGroups,
  createGroup,
  getGroup,
  updateGroup,
  deleteGroup
};
