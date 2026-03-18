const express = require('express');
const router = express.Router();
const { getContacts, addContact, updateContact, deleteContact } = require('../controllers/contactController');
const { protect } = require('../middleware/auth');

router.route('/').get(protect, getContacts).post(protect, addContact);
router.route('/:contactId').put(protect, updateContact).delete(protect, deleteContact);

module.exports = router;
