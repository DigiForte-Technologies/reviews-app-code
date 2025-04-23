// /web/server/api/public/reviews-summary.js
import pool from '../../../db/connectToDb.js';

export default async function summaryHandler(req, res) {
  const externalProductId = req.query.productId;
  if (!externalProductId) {
    return res.status(400).json({ error: 'Missing productId' });
  }

  try {
    // find internal product
    const lookup = await pool.query(
      `SELECT id FROM products WHERE product_id = $1`,
      [externalProductId]
    );
    if (lookup.rowCount === 0) {
      return res.json({
        totalReviews: 0,
        average: 0,
        ratings: { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 }
      });
    }
    const pid = lookup.rows[0].id;

    // total count + average
    const agg = await pool.query(
      `SELECT
         COUNT(*)           AS total,
         COALESCE(AVG(rating),0)::numeric(10,2) AS avg
       FROM reviews
       WHERE product_id = $1
         AND published = true`,
      [pid]
    );
    const totalReviews = parseInt(agg.rows[0].total, 10);
    const average = parseFloat(agg.rows[0].avg);

    // breakdown by star
    const breakdown = await pool.query(
      `SELECT rating, COUNT(*) AS cnt
       FROM reviews
       WHERE product_id = $1
         AND published = true
       GROUP BY rating`,
      [pid]
    );
    // build a map { '5': 10, '4': 2, … }
    const ratings = { '5':0,'4':0,'3':0,'2':0,'1':0 };
    breakdown.rows.forEach(r => {
      ratings[r.rating] = parseInt(r.cnt, 10);
    });

    res.json({
      totalReviews,
      average,
      ratings
    });
  } catch (err) {
    console.error("❌ Error loading review summary:", err);
    res.status(500).json({ error: 'Error loading summary' });
  }
}
