import express from 'express';
import Restaurant from '../models/Restaurant.js';

const router = express.Router();

// Get restaurant details
router.get('/', async (req, res) => {
  try {
    const doc = await Restaurant.findOne();
    if (!doc) return res.json({ name: '', phone: '', address: '', email: '' });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update or create restaurant details
router.put('/', async (req, res) => {
  try {
    const { name, phone, address, email } = req.body;
    if (!name || !phone || !address || !email) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    let doc = await Restaurant.findOne();
    if (doc) {
      doc.name = name;
      doc.phone = phone;
      doc.address = address;
      doc.email = email;
      await doc.save();
    } else {
      doc = new Restaurant({ name, phone, address, email });
      await doc.save();
    }
    res.json({ message: 'Details saved', restaurant: doc });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete restaurant details
router.delete('/', async (req, res) => {
  try {
    await Restaurant.deleteMany({});
    res.json({ message: 'Restaurant details deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router; 