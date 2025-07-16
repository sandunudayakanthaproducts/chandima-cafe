import express from 'express';
import Sale from '../models/Sale.js';

const router = express.Router();

// Log a sale
router.post('/', async (req, res) => {
  const { liquorId, cocktailId, store, type, quantity, price, user, billId } = req.body;
  if (type === 'cocktail') {
    if (!cocktailId || !store || !type || !quantity || !price) {
      return res.status(400).json({ message: 'All fields are required for cocktail sale' });
    }
    try {
      const sale = new Sale({ cocktail: cocktailId, store, type, quantity, price, user, billId });
      await sale.save();
      res.status(201).json({ message: 'Sale logged', sale });
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
    return;
  }
  // Non-cocktail sales
  if (!liquorId || !store || !type || !quantity || !price) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  try {
    const sale = new Sale({ liquor: liquorId, store, type, quantity, price, user, billId });
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

// List all unique bills
router.get('/bills', async (req, res) => {
  try {
    const bills = await Sale.aggregate([
      { $match: { billId: { $exists: true, $ne: null } } },
      { $group: { _id: "$billId", count: { $sum: 1 }, total: { $sum: "$price" }, timestamp: { $first: "$timestamp" } } },
      { $sort: { timestamp: -1 } }
    ]);
    res.json(bills);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all sales for a given billId
router.get('/bill/:billId', async (req, res) => {
  try {
    const sales = await Sale.find({ billId: req.params.billId }).populate('liquor');
    res.json(sales);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router; 