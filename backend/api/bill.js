import Bill from './models/Bill.js';
import { connectToDatabase } from './db.js';

export default async function handler(req, res) {
  await connectToDatabase();
  const { method, query, body } = req;
  const { billId, month } = query;

  if (method === 'POST') {
    try {
      if (typeof body.items === 'string') {
        try { body.items = JSON.parse(body.items); } catch (e) { return res.status(400).json({ message: 'Invalid items format' }); }
      } else if (Array.isArray(body.items) && typeof body.items[0] === 'string') {
        let parsed = null;
        try { parsed = JSON.parse(body.items[0]); } catch (e) { try { parsed = [JSON.parse(body.items[0])]; } catch (e2) { return res.status(400).json({ message: 'Invalid items[0] format' }); } }
        if (Array.isArray(parsed)) { body.items = parsed; } else { body.items = [parsed]; }
      }
      const bill = new Bill(body);
      await bill.save();
      return res.status(201).json({ message: 'Bill saved', bill });
    } catch (err) {
      return res.status(500).json({ message: 'Server error', error: err.message });
    }
  }

  if (method === 'GET') {
    try {
      if (billId) {
        const bill = await Bill.findOne({ billId });
        return res.json(bill);
      }
      let queryObj = {};
      if (month) {
        const [year, mon] = month.split('-');
        const start = new Date(year, mon - 1, 1);
        const end = new Date(year, mon, 1);
        queryObj.time = { $gte: start, $lt: end };
      }
      const bills = await Bill.find(queryObj).sort({ time: -1 });
      return res.json(bills);
    } catch (err) {
      return res.status(500).json({ message: 'Server error' });
    }
  }

  if (method === 'DELETE') {
    try {
      const deleted = await Bill.findOneAndDelete({ billId });
      if (!deleted) return res.status(404).json({ message: 'Bill not found' });
      return res.json({ message: 'Bill deleted' });
    } catch (err) {
      return res.status(500).json({ message: 'Server error' });
    }
  }

  return res.status(405).json({ message: 'Method Not Allowed' });
} 