import Food from './models/Food.js';
import { connectToDatabase } from './db.js';

export default async function handler(req, res) {
  await connectToDatabase();
  const { method, query, body } = req;
  const { id } = query;

  if (method === 'GET') {
    // Get all food items
    const foods = await Food.find();
    return res.status(200).json(foods);
  }

  if (method === 'POST') {
    // Add a food item
    try {
      const food = new Food(body);
      await food.save();
      return res.status(201).json(food);
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }
  }

  if (method === 'PUT') {
    // Update a food item
    try {
      const food = await Food.findByIdAndUpdate(id, body, { new: true });
      return res.status(200).json(food);
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }
  }

  if (method === 'DELETE') {
    // Delete a food item
    try {
      await Food.findByIdAndDelete(id);
      return res.status(200).json({ message: 'Deleted' });
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }
  }

  return res.status(405).json({ message: 'Method Not Allowed' });
} 