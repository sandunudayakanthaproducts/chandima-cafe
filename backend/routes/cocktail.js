import { Router } from 'express';
import Cocktail from '../models/Cocktail.js';

const router = Router();

// Get all cocktails or by id
router.get('/', async (req, res) => {
  const { id } = req.query;
  try {
    if (id) {
      const cocktail = await Cocktail.findById(id);
      if (!cocktail) return res.status(404).json({ message: 'Cocktail not found' });
      return res.json(cocktail);
    }
    const cocktails = await Cocktail.find();
    res.json(cocktails);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create cocktail
router.post('/', async (req, res) => {
  try {
    const cocktail = new Cocktail(req.body);
    await cocktail.save();
    res.status(201).json({ message: 'Cocktail created', cocktail });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update cocktail
router.put('/', async (req, res) => {
  const { id } = req.query;
  try {
    const cocktail = await Cocktail.findByIdAndUpdate(id, req.body, { new: true });
    if (!cocktail) return res.status(404).json({ message: 'Cocktail not found' });
    res.json({ message: 'Cocktail updated', cocktail });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete cocktail
router.delete('/', async (req, res) => {
  const { id } = req.query;
  try {
    const cocktail = await Cocktail.findByIdAndDelete(id);
    if (!cocktail) return res.status(404).json({ message: 'Cocktail not found' });
    res.json({ message: 'Cocktail deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router; 