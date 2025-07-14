import express from 'express';
import Inventory from '../models/Inventory.js';
import Liquor from '../models/Liquor.js';

const router = express.Router();

// Add bottles to Store 1
router.post('/add', async (req, res) => {
  const { liquorId, store, bottles } = req.body;
  if (!liquorId || !store || !bottles) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  try {
    let inv = await Inventory.findOne({ liquor: liquorId, store });
    if (inv) {
      inv.bottles += Number(bottles);
      await inv.save();
    } else {
      inv = new Inventory({ liquor: liquorId, store, bottles });
      await inv.save();
    }
    res.status(200).json({ message: 'Inventory updated', inventory: inv });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// List inventory for a store
router.get('/', async (req, res) => {
  const { store } = req.query;
  try {
    const query = store ? { store: Number(store) } : {};
    const inventory = await Inventory.find(query).populate('liquor');
    res.json(inventory);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update inventory (quantity)
router.put('/:id', async (req, res) => {
  const { bottles, openVolume } = req.body;
  try {
    const inv = await Inventory.findByIdAndUpdate(
      req.params.id,
      { bottles, openVolume },
      { new: true }
    );
    if (!inv) return res.status(404).json({ message: 'Inventory not found' });
    res.json({ message: 'Inventory updated', inventory: inv });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete inventory record
router.delete('/:id', async (req, res) => {
  try {
    const inv = await Inventory.findByIdAndDelete(req.params.id);
    if (!inv) return res.status(404).json({ message: 'Inventory not found' });
    res.json({ message: 'Inventory deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router; 