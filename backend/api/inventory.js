import Inventory from '../models/Inventory.js';
import Liquor from '../models/Liquor.js';
import { connectToDatabase } from './db.js';

export default async function handler(req, res) {
  await connectToDatabase();
  const { method, query, body } = req;
  const { id, store } = query;

  if (method === 'POST' && req.url.endsWith('/add')) {
    const { liquorId, store, bottles } = body;
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
      return res.status(200).json({ message: 'Inventory updated', inventory: inv });
    } catch (err) {
      return res.status(500).json({ message: 'Server error' });
    }
  }

  if (method === 'GET') {
    try {
      const queryObj = store ? { store: Number(store) } : {};
      const inventory = await Inventory.find(queryObj).populate('liquor');
      return res.json(inventory);
    } catch (err) {
      return res.status(500).json({ message: 'Server error' });
    }
  }

  if (method === 'PUT') {
    const { bottles, openVolume } = body;
    try {
      const inv = await Inventory.findByIdAndUpdate(id, { bottles, openVolume }, { new: true });
      if (!inv) return res.status(404).json({ message: 'Inventory not found' });
      return res.json({ message: 'Inventory updated', inventory: inv });
    } catch (err) {
      return res.status(500).json({ message: 'Server error' });
    }
  }

  if (method === 'DELETE') {
    try {
      const inv = await Inventory.findByIdAndDelete(id);
      if (!inv) return res.status(404).json({ message: 'Inventory not found' });
      return res.json({ message: 'Inventory deleted' });
    } catch (err) {
      return res.status(500).json({ message: 'Server error' });
    }
  }

  return res.status(405).json({ message: 'Method Not Allowed' });
} 