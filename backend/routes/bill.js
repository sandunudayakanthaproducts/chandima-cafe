import express from 'express';
import Bill from '../models/Bill.js';
import Inventory from '../models/Inventory.js';
import Cocktail from '../models/Cocktail.js';

const router = express.Router();

// Save a new bill
router.post('/', async (req, res) => {
  try {
    // Defensive: parse items if it's a string or if items[0] is a stringified array/object
    if (typeof req.body.items === 'string') {
      try {
        req.body.items = JSON.parse(req.body.items);
      } catch (e) {
        return res.status(400).json({ message: 'Invalid items format' });
      }
    } else if (Array.isArray(req.body.items) && typeof req.body.items[0] === 'string') {
      try {
        // Try parsing items[0] as an array
        let parsed = null;
        try {
          parsed = JSON.parse(req.body.items[0]);
        } catch (e) {
          // fallback: try parsing as a single object
          try {
            parsed = [JSON.parse(req.body.items[0])];
          } catch (e2) {
            return res.status(400).json({ message: 'Invalid items[0] format' });
          }
        }
        if (Array.isArray(parsed)) {
          req.body.items = parsed;
        } else {
          req.body.items = [parsed];
        }
      } catch (e) {
        return res.status(400).json({ message: 'Invalid items[0] format' });
      }
    }
    // Deduct inventory for cocktails
    for (const item of req.body.items) {
      if (item.type === 'cocktail' && item.cocktailId) {
        // Get cocktail ingredients
        let ingredients = item.ingredients;
        if (!ingredients || !Array.isArray(ingredients)) {
          // fallback: fetch from DB
          const cocktailDoc = await Cocktail.findById(item.cocktailId);
          ingredients = cocktailDoc ? cocktailDoc.ingredients : [];
        }
        for (const ing of ingredients) {
          // For each ingredient, deduct (volume * qty) from Store 2 inventory
          const inv = await Inventory.findOne({ liquor: ing.liquorId, store: 2 });
          if (!inv) continue; // skip if not found
          let openVolume = inv.openVolume || 0;
          let bottles = inv.bottles || 0;
          let liquorSize = inv.liquor && inv.liquor.size ? inv.liquor.size : 750; // fallback size
          // Try to get liquor size from population if not present
          if (!liquorSize && inv.liquor && inv.liquor.size) liquorSize = inv.liquor.size;
          const totalVol = ing.volume * (item.qty || 1);
          let remaining = totalVol;
          while (remaining > 0) {
            if (openVolume >= remaining) {
              openVolume -= remaining;
              remaining = 0;
            } else {
              remaining -= openVolume;
              if (bottles < 1) throw new Error(`Not enough bottles for ${ing.brand}`);
              openVolume = liquorSize;
              bottles -= 1;
            }
          }
          // Save updated inventory
          await Inventory.findByIdAndUpdate(inv._id, { openVolume, bottles });
        }
      }
    }
    const bill = new Bill(req.body);
    await bill.save();
    res.status(201).json({ message: 'Bill saved', bill });
  } catch (err) {
    console.error('Bill save error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// List all bills (optionally filter by month)
router.get('/', async (req, res) => {
  try {
    const { month } = req.query; // e.g., '2024-06'
    let query = {};
    if (month) {
      const [year, mon] = month.split('-');
      const start = new Date(year, mon - 1, 1);
      const end = new Date(year, mon, 1);
      query.time = { $gte: start, $lt: end };
    }
    const bills = await Bill.find(query).sort({ time: -1 });
    res.json(bills);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get bill by billId
router.get('/:billId', async (req, res) => {
  try {
    const bill = await Bill.findOne({ billId: req.params.billId });
    res.json(bill);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete bill by billId
router.delete('/:billId', async (req, res) => {
  try {
    const deleted = await Bill.findOneAndDelete({ billId: req.params.billId });
    if (!deleted) return res.status(404).json({ message: 'Bill not found' });
    res.json({ message: 'Bill deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router; 