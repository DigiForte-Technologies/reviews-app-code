// web/server/api/admin/export-reviews.js
import pool from '../../../db/connectToDb.js';
import { Parser } from 'json2csv';

export default async function handler(req, res) {
  try {
    const result = await pool.query(`
      SELECT
        pr.product_id::text AS product_id,        -- Shopify product ID
        pr.handle AS product_handle,
        r.reviewer_name,
        r.review_text,
        r.rating,
        r.image_url,
        r.verified,
        r.created_at
      FROM reviews r
      JOIN products pr ON CAST(r.product_id AS INTEGER) = pr.id
      WHERE r.published = true
      ORDER BY r.created_at DESC
    `);

    const reviews = result.rows;

    const fields = [
      'product_id',
      'product_handle',
      'reviewer_name',
      'review_text',
      'rating',
      'image_url',
      'verified',
      'created_at',
    ];

    const parser = new Parser({ fields });
    const csv = parser.parse(reviews);

    res.setHeader('Content-Disposition', 'attachment; filename=published-reviews.csv');
    res.setHeader('Content-Type', 'text/csv');
    res.status(200).send(csv);
  } catch (err) {
    console.error('❌ Error exporting reviews:', err);
    res.status(500).json({ error: 'Failed to export reviews' });
  }
}
