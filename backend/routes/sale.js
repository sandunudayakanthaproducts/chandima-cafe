import express from 'express';
import Sale from '../models/Sale.js';

const router = express.Router();

// Log a sale
router.post('/', async (req, res) => {
  const { liquorId, store, type, quantity, price, user } = req.body;
  if (!liquorId || !store || !type || !quantity || !price) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  try {
    const sale = new Sale({ liquor: liquorId, store, type, quantity, price, user });
    await sale.save();
    res.status(201).json({ message: 'Sale logged', sale });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// List all sales
router.get('/', async (req, res) => {
  try {
    const sales = await Sale.find().populate('liquor');
    res.json(sales);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router; 