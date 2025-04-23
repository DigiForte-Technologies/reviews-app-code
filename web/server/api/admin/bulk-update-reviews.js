// web/server/api/admin/bulk-update-reviews.js
import pool from '../../../db/connectToDb.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { ids, published } = req.body;

  if (!Array.isArray(ids) || ids.length === 0 || typeof published !== 'boolean') {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  try {
    await pool.query(
      'UPDATE reviews SET published = $1 WHERE id = ANY($2::int[])',
      [published, ids]
    );
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('❌ Error in bulk update:', err);
    res.status(500).json({ error: 'Failed to update reviews' });
  }
}
