import Sale from './models/Sale.js';
import { connectToDatabase } from './db.js';

export default async function handler(req, res) {
  await connectToDatabase();
  const { method, query, body, url } = req;
  const { billId } = query;

  if (method === 'POST') {
    const { liquorId, store, type, quantity, price, user } = body;
    if (!liquorId || !store || !type || !quantity || !price) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    try {
      const sale = new Sale({ liquor: liquorId, store, type, quantity, price, user });
      await sale.save();
      return res.status(201).json({ message: 'Sale logged', sale });
    } catch (err) {
      return res.status(500).json({ message: 'Server error' });
    }
  }

  if (method === 'GET' && url.endsWith('/bills')) {
    try {
      const bills = await Sale.aggregate([
        { $match: { billId: { $exists: true, $ne: null } } },
        { $group: { _id: "$billId", count: { $sum: 1 }, total: { $sum: "$price" }, timestamp: { $first: "$timestamp" } } },
        { $sort: { timestamp: -1 } }
      ]);
      return res.json(bills);
    } catch (err) {
      return res.status(500).json({ message: 'Server error' });
    }
  }

  if (method === 'GET' && url.includes('/bill/')) {
    try {
      const billId = url.split('/bill/')[1];
      const sales = await Sale.find({ billId }).populate('liquor');
      return res.json(sales);
    } catch (err) {
      return res.status(500).json({ message: 'Server error' });
    }
  }

  if (method === 'GET') {
    try {
      const sales = await Sale.find().populate('liquor');
      return res.json(sales);
    } catch (err) {
      return res.status(500).json({ message: 'Server error' });
    }
  }

  return res.status(405).json({ message: 'Method Not Allowed' });
} 