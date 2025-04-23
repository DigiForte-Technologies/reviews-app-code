// /web/server/api/reviews.js
import pool from '../db/connectToDb.js';

export default async function handler(req, res) {
  const { method } = req;

  if (method === 'GET') {
    const { productId, shop } = req.query;

    if (!productId || !shop) {
      return res.status(400).json({ error: 'Missing productId or shop' });
    }

    try {
      const { rows } = await pool.query(
        `SELECT r.reviewer_name, r.review_text, r.rating, r.image_url, r.verified, r.created_at
         FROM reviews r
         JOIN products p ON r.product_id = p.id
         JOIN stores s ON p.shop_id = s.id
         WHERE p.product_id = $1 AND s.shop = $2 AND r.published = true
         ORDER BY r.created_at DESC
         LIMIT 100`,
        [productId, shop]
      );

      res.status(200).json({ reviews: rows });
    } catch (error) {
      console.error('❌ Error fetching reviews:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  if (method === 'POST') {
    const {
      shop,
      product_id, // external Shopify product_id
      product_title,
      product_handle,
      reviewer_name,
      review_text,
      rating,
      image_url,
      verified
    } = req.body;

    if (!shop || !product_id || !review_text || !product_handle) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      // 🔹 Get or create store
      const storeResult = await pool.query(
        `INSERT INTO stores (shop)
         VALUES ($1)
         ON CONFLICT (shop) DO UPDATE SET shop = EXCLUDED.shop
         RETURNING id`,
        [shop]
      );
      const shopId = storeResult.rows[0].id;

      // 🔹 Get or create product
      const productResult = await pool.query(
        `INSERT INTO products (shop_id, product_id, handle, title)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (shop_id, product_id) DO UPDATE SET handle = EXCLUDED.handle
         RETURNING id`,
        [shopId, product_id, product_handle, product_title || product_handle]
      );
      const dbProductId = productResult.rows[0].id;

      // 🔹 Insert review
      await pool.query(
        `INSERT INTO reviews (
          shop_id, product_id, reviewer_name, review_text, rating,
          image_url, verified, published
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          shopId,
          dbProductId,
          reviewer_name || '',
          review_text,
          parseInt(rating || 5),
          image_url || null,
          verified === true || verified === 'true',
          true // published by default
        ]
      );

      res.status(201).json({ message: 'Review created' });
    } catch (error) {
      console.error('❌ Error saving review:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}
