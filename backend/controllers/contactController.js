const User = require('../models/User');

// @desc    Get emergency contacts
// @route   GET /api/contacts
exports.getContacts = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('emergencyContacts');
    res.status(200).json({ success: true, contacts: user.emergencyContacts });
  } catch (error) {
    next(error);
  }
};

// @desc    Add emergency contact
// @route   POST /api/contacts
exports.addContact = async (req, res, next) => {
  try {
    const { name, phone, relation, email, notifyBySMS, notifyByEmail } = req.body;

    if (!name || !phone || !relation) {
      return res.status(400).json({ success: false, message: 'Name, phone, and relation are required' });
    }

    const user = await User.findById(req.user._id);

    if (user.emergencyContacts.length >= 5) {
      return res.status(400).json({ success: false, message: 'Maximum 5 emergency contacts allowed' });
    }

    user.emergencyContacts.push({ name, phone, relation, email, notifyBySMS, notifyByEmail });
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Emergency contact added',
      contacts: user.emergencyContacts,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update emergency contact
// @route   PUT /api/contacts/:contactId
exports.updateContact = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const contact = user.emergencyContacts.id(req.params.contactId);

    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contact not found' });
    }

    const { name, phone, relation, email, notifyBySMS, notifyByEmail } = req.body;
    if (name) contact.name = name;
    if (phone) contact.phone = phone;
    if (relation) contact.relation = relation;
    if (email !== undefined) contact.email = email;
    if (notifyBySMS !== undefined) contact.notifyBySMS = notifyBySMS;
    if (notifyByEmail !== undefined) contact.notifyByEmail = notifyByEmail;

    await user.save();
    res.status(200).json({ success: true, message: 'Contact updated', contacts: user.emergencyContacts });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete emergency contact
// @route   DELETE /api/contacts/:contactId
exports.deleteContact = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    user.emergencyContacts = user.emergencyContacts.filter(
      c => c._id.toString() !== req.params.contactId
    );
    await user.save();
    res.status(200).json({ success: true, message: 'Contact removed', contacts: user.emergencyContacts });
  } catch (error) {
    next(error);
  }
};
