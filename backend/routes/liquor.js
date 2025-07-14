import express from 'express';
import Liquor from '../models/Liquor.js';

const router = express.Router();

// Add a new liquor
router.post('/', async (req, res) => {
  const { brand, size, barcode, price, shotPrices } = req.body;
  if (!brand || !size || !barcode || !price || !shotPrices || typeof shotPrices !== 'object') {
    return res.status(400).json({ message: 'All fields are required, including shotPrices' });
  }
  try {
    const existing = await Liquor.findOne({ barcode });
    if (existing) return res.status(400).json({ message: 'Barcode already exists' });
    // Validate shotPrices values are numbers
    for (const key in shotPrices) {
      if (isNaN(Number(shotPrices[key]))) {
        return res.status(400).json({ message: 'Shot prices must be numbers' });
      }
    }
    const liquor = new Liquor({ brand, size, barcode, price, shotPrices });
    await liquor.save();
    res.status(201).json({ message: 'Liquor added', liquor });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// List all liquors
router.get('/', async (req, res) => {
  try {
    const liquors = await Liquor.find();
    res.json(liquors);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update liquor
router.put('/:id', async (req, res) => {
  const { brand, size, barcode, price, shotPrices } = req.body;
  try {
    // Validate shotPrices values are numbers
    for (const key in shotPrices) {
      if (isNaN(Number(shotPrices[key]))) {
        return res.status(400).json({ message: 'Shot prices must be numbers' });
      }
    }
    const liquor = await Liquor.findByIdAndUpdate(
      req.params.id,
      { brand, size, barcode, price, shotPrices },
      { new: true }
    );
    if (!liquor) return res.status(404).json({ message: 'Liquor not found' });
    res.json({ message: 'Liquor updated', liquor });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete liquor
router.delete('/:id', async (req, res) => {
  try {
    const liquor = await Liquor.findByIdAndDelete(req.params.id);
    if (!liquor) return res.status(404).json({ message: 'Liquor not found' });
    res.json({ message: 'Liquor deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router; 