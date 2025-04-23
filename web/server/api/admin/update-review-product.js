// File: /pages/api/admin/update-review-product.js
import pool from '../../../db/connectToDb.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { reviewId, newProductHandle, shopId } = req.body;

  if (!reviewId || !newProductHandle || !shopId) {
    return res.status(400).json({ error: 'Missing reviewId, shopId or newProductHandle' });
  }

  try {
    // Check if product with this handle exists
    const productRes = await pool.query(
      `SELECT id FROM products WHERE handle = $1 AND shop_id = $2 LIMIT 1`,
      [newProductHandle, shopId]
    );

    let productId;

    if (productRes.rows.length === 0) {
      // Insert it if not exists
      const insertRes = await pool.query(
        `INSERT INTO products (shop_id, product_id, handle)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [shopId, Date.now(), newProductHandle] // You can generate a dummy Shopify product_id or use real one
      );
      productId = insertRes.rows[0].id;
    } else {
      productId = productRes.rows[0].id;
    }

    // Update the review
    await pool.query(
      `UPDATE reviews SET product_id = $1 WHERE id = $2`,
      [productId, reviewId]
    );
    

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('❌ Error updating review product handle:', err);
    return res.status(500).json({ error: 'Database error' });
  }
}
