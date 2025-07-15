import { Router } from 'express';
const router = Router();
import Food from '../models/Food.js';

// Get all food items
router.get('/', async (req, res) => {
  const foods = await Food.find();
  res.json(foods);
});

// Add a food item
router.post('/', async (req, res) => {
  try {
    const food = new Food(req.body);
    await food.save();
    res.status(201).json(food);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update a food item
router.put('/:id', async (req, res) => {
  try {
    const food = await Food.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(food);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a food item
router.delete('/:id', async (req, res) => {
  try {
    await Food.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

export default router; 