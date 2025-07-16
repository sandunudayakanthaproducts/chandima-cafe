import Restaurant from '../models/Restaurant.js';
import { connectToDatabase } from './db.js';

export default async function handler(req, res) {
  await connectToDatabase();
  const { method, body } = req;

  if (method === 'GET') {
    try {
      const doc = await Restaurant.findOne();
      if (!doc) return res.json({ name: '', phone: '', address: '', email: '' });
      return res.json(doc);
    } catch (err) {
      return res.status(500).json({ message: 'Server error' });
    }
  }

  if (method === 'PUT') {
    try {
      const { name, phone, address, email } = body;
      if (!name || !phone || !address || !email) {
        return res.status(400).json({ message: 'All fields are required' });
      }
      let doc = await Restaurant.findOne();
      if (doc) {
        doc.name = name;
        doc.phone = phone;
        doc.address = address;
        doc.email = email;
        await doc.save();
      } else {
        doc = new Restaurant({ name, phone, address, email });
        await doc.save();
      }
      return res.json({ message: 'Details saved', restaurant: doc });
    } catch (err) {
      return res.status(500).json({ message: 'Server error' });
    }
  }

  if (method === 'DELETE') {
    try {
      await Restaurant.deleteMany({});
      return res.json({ message: 'Restaurant details deleted' });
    } catch (err) {
      return res.status(500).json({ message: 'Server error' });
    }
  }

  return res.status(405).json({ message: 'Method Not Allowed' });
} 