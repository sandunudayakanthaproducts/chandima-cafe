import Inventory from '../models/Inventory.js';
import Transfer from '../models/Transfer.js';
import { connectToDatabase } from './db.js';

export default async function handler(req, res) {
  await connectToDatabase();
  const { method, query, body } = req;
  const { id } = query;

  if (method === 'POST') {
    const { liquorId, quantity, user } = body;
    if (!liquorId || !quantity) {
      return res.status(400).json({ message: 'Liquor and quantity required' });
    }
    try {
      let inv1 = await Inventory.findOne({ liquor: liquorId, store: 1 });
      if (!inv1 || inv1.bottles < quantity) {
        return res.status(400).json({ message: 'Not enough bottles in Store 1' });
      }
      inv1.bottles -= quantity;
      await inv1.save();
      let inv2 = await Inventory.findOne({ liquor: liquorId, store: 2 });
      if (inv2) {
        inv2.bottles += quantity;
        await inv2.save();
      } else {
        inv2 = new Inventory({ liquor: liquorId, store: 2, bottles: quantity });
        await inv2.save();
      }
      const transfer = new Transfer({ liquor: liquorId, fromStore: 1, toStore: 2, quantity, user });
      await transfer.save();
      return res.json({ message: 'Transfer complete', transfer });
    } catch (err) {
      return res.status(500).json({ message: 'Server error' });
    }
  }

  if (method === 'GET') {
    try {
      const transfers = await Transfer.find().populate('liquor');
      return res.json(transfers);
    } catch (err) {
      return res.status(500).json({ message: 'Server error' });
    }
  }

  if (method === 'DELETE') {
    try {
      const result = await Transfer.findByIdAndDelete(id);
      if (!result) return res.status(404).json({ message: 'Transfer not found' });
      return res.json({ message: 'Transfer deleted' });
    } catch (err) {
      return res.status(500).json({ message: 'Server error' });
    }
  }

  return res.status(405).json({ message: 'Method Not Allowed' });
} 