import express from 'express';
import Inventory from '../models/Inventory.js';
import Transfer from '../models/Transfer.js';

const router = express.Router();

// Transfer bottles from Store 1 to Store 2
router.post('/', async (req, res) => {
  const { liquorId, quantity, user } = req.body;
  if (!liquorId || !quantity) {
    return res.status(400).json({ message: 'Liquor and quantity required' });
  }
  try {
    // Deduct from Store 1
    let inv1 = await Inventory.findOne({ liquor: liquorId, store: 1 });
    if (!inv1 || inv1.bottles < quantity) {
      return res.status(400).json({ message: 'Not enough bottles in Store 1' });
    }
    inv1.bottles -= quantity;
    await inv1.save();
    // Add to Store 2
    let inv2 = await Inventory.findOne({ liquor: liquorId, store: 2 });
    if (inv2) {
      inv2.bottles += quantity;
      await inv2.save();
    } else {
      inv2 = new Inventory({ liquor: liquorId, store: 2, bottles: quantity });
      await inv2.save();
    }
    // Log transfer
    const transfer = new Transfer({ liquor: liquorId, fromStore: 1, toStore: 2, quantity, user });
    await transfer.save();
    res.json({ message: 'Transfer complete', transfer });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// List transfers
router.get('/', async (req, res) => {
  try {
    const transfers = await Transfer.find().populate('liquor');
    res.json(transfers);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router; 