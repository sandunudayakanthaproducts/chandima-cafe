import Liquor from '../models/Liquor.js';
import { connectToDatabase } from './db.js';

export default async function handler(req, res) {
  await connectToDatabase();
  const { method, query, body } = req;
  const { id } = query;

  if (method === 'POST') {
    const { brand, size, barcode, price, shotPrices } = body;
    if (!brand || !size || !barcode || !price || !shotPrices || typeof shotPrices !== 'object') {
      return res.status(400).json({ message: 'All fields are required, including shotPrices' });
    }
    try {
      const existing = await Liquor.findOne({ barcode });
      if (existing) return res.status(400).json({ message: 'Barcode already exists' });
      for (const key in shotPrices) {
        if (isNaN(Number(shotPrices[key]))) {
          return res.status(400).json({ message: 'Shot prices must be numbers' });
        }
      }
      const liquor = new Liquor({ brand, size, barcode, price, shotPrices });
      await liquor.save();
      return res.status(201).json({ message: 'Liquor added', liquor });
    } catch (err) {
      return res.status(500).json({ message: 'Server error' });
    }
  }

  if (method === 'GET') {
    try {
      const liquors = await Liquor.find();
      return res.json(liquors);
    } catch (err) {
      return res.status(500).json({ message: 'Server error' });
    }
  }

  if (method === 'PUT') {
    const { brand, size, barcode, price, shotPrices } = body;
    try {
      for (const key in shotPrices) {
        if (isNaN(Number(shotPrices[key]))) {
          return res.status(400).json({ message: 'Shot prices must be numbers' });
        }
      }
      const liquor = await Liquor.findByIdAndUpdate(id, { brand, size, barcode, price, shotPrices }, { new: true });
      if (!liquor) return res.status(404).json({ message: 'Liquor not found' });
      return res.json({ message: 'Liquor updated', liquor });
    } catch (err) {
      return res.status(500).json({ message: 'Server error' });
    }
  }

  if (method === 'DELETE') {
    try {
      const liquor = await Liquor.findByIdAndDelete(id);
      if (!liquor) return res.status(404).json({ message: 'Liquor not found' });
      return res.json({ message: 'Liquor deleted' });
    } catch (err) {
      return res.status(500).json({ message: 'Server error' });
    }
  }

  return res.status(405).json({ message: 'Method Not Allowed' });
} 