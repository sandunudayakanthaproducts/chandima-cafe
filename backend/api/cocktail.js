import Cocktail from '../models/Cocktail.js';
import { connectToDatabase } from './db.js';

export default async function handler(req, res) {
  await connectToDatabase();
  const { method, query, body } = req;
  const { id } = query;

  if (method === 'GET') {
    try {
      if (id) {
        const cocktail = await Cocktail.findById(id);
        if (!cocktail) return res.status(404).json({ message: 'Cocktail not found' });
        return res.json(cocktail);
      }
      const cocktails = await Cocktail.find();
      return res.json(cocktails);
    } catch (err) {
      return res.status(500).json({ message: 'Server error' });
    }
  }

  if (method === 'POST') {
    try {
      const cocktail = new Cocktail(body);
      await cocktail.save();
      return res.status(201).json({ message: 'Cocktail created', cocktail });
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }
  }

  if (method === 'PUT') {
    try {
      const cocktail = await Cocktail.findByIdAndUpdate(id, body, { new: true });
      if (!cocktail) return res.status(404).json({ message: 'Cocktail not found' });
      return res.json({ message: 'Cocktail updated', cocktail });
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }
  }

  if (method === 'DELETE') {
    try {
      const cocktail = await Cocktail.findByIdAndDelete(id);
      if (!cocktail) return res.status(404).json({ message: 'Cocktail not found' });
      return res.json({ message: 'Cocktail deleted' });
    } catch (err) {
      return res.status(500).json({ message: 'Server error' });
    }
  }

  return res.status(405).json({ message: 'Method Not Allowed' });
} 