const express = require('express');
const router = express.Router();
const { protect } = require('../Middleware/authMiddleware');
const {
  getGroups,
  createGroup,
  getGroup,
  updateGroup,
  deleteGroup
} = require('../controllers/groupController');

// All group endpoints require session authentication
router.use(protect);

router.get('/', getGroups);
router.post('/', createGroup);
router.get('/:id', getGroup);
router.put('/:id', updateGroup);
router.delete('/:id', deleteGroup);

module.exports = router;
