// /web/server/api/admin/reviews.js
import pool from '../../../db/connectToDb.js';

export default async function handler(req, res) {
  const { method } = req;

  if (method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { rows } = await pool.query(`
      SELECT
        r.id,
        s.shop,
        r.shop_id, 
        p.handle AS product_handle,
        r.reviewer_name,
        r.review_text,
        r.rating,
        r.image_url,
        r.verified,
        r.featured,
        r.published,
        r.created_at
      FROM reviews r
      JOIN products p ON CAST(r.product_id AS INTEGER) = p.id
      JOIN stores s ON r.shop_id = s.id
      ORDER BY r.created_at DESC
    `);
    
    res.status(200).json({ reviews: rows });
  } catch (error) {
    console.error('❌ Error fetching admin reviews:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
