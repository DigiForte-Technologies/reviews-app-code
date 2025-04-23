// web/server/api/admin/toggle-review-status.js
import pool from '../../../db/connectToDb.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { id, newStatus } = req.body;
  if (!id || typeof newStatus !== 'boolean') {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  try {
    const result = await pool.query(
      'UPDATE reviews SET published = $1 WHERE id = $2 RETURNING *',
      [newStatus, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('❌ Error updating review status:', err);
    res.status(500).json({ error: 'Database error while toggling status' });
  }
}
