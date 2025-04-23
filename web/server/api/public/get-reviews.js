// /web/server/api/public/get-reviews.js
import pool from '../../../db/connectToDb.js';

export default async function handler(req, res) {
  console.log("✅ /proxy/reviews called!", req.query);

  const externalProductId = req.query.productId;
  if (!externalProductId) {
    return res.status(400).json({ error: 'Missing productId' });
  }

  // look up our internal product ID
  let lookup;
  try {
    lookup = await pool.query(
      `SELECT id FROM products WHERE product_id = $1`,
      [externalProductId]
    );
  } catch (err) {
    console.error("❌ Error finding product:", err);
    return res.status(500).json({ error: 'DB lookup failed' });
  }

  if (lookup.rowCount === 0) {
    // if they requested summary, return zeros; otherwise empty reviews
    if (req.query.summary === 'true') {
      return res.json({
        totalReviews: 0,
        average: 0,
        ratings: { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 }
      });
    }
    return res.json({ reviews: [], hasMore: false, page: 1, limit: 0 });
  }

  const pid = lookup.rows[0].id;

  // ─── SUMMARY BRANCH ─────────────────────────────────────────────────────────
  if (req.query.summary === 'true') {
    try {
      // total + average
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
      const average     = parseFloat(agg.rows[0].avg);

      // breakdown by star
      const breakdown = await pool.query(
        `SELECT rating, COUNT(*) AS cnt
         FROM reviews
         WHERE product_id = $1
           AND published = true
         GROUP BY rating`,
        [pid]
      );
      const ratings = { '5':0,'4':0,'3':0,'2':0,'1':0 };
      breakdown.rows.forEach(r => {
        ratings[r.rating] = parseInt(r.cnt, 10);
      });

      return res.json({ totalReviews, average, ratings });
    } catch (err) {
      console.error("❌ Error loading summary:", err);
      return res.status(500).json({ error: 'Error loading summary' });
    }
  }

  // ─── REVIEWS BRANCH ─────────────────────────────────────────────────────────
  // pagination params
  const page   = Math.max(1, parseInt(req.query.page, 10)   || 1);
  const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const offset = (page - 1) * limit;

  try {
    const result = await pool.query(
      `SELECT reviewer_name,
              review_text,
              rating,
              image_url,
              verified,
              created_at
         FROM reviews
        WHERE product_id = $1
          AND published = true
     ORDER BY
       (image_url IS NOT NULL) DESC,  -- show image reviews first
       created_at DESC                -- then newest
       LIMIT $2
      OFFSET $3`,
      [pid, limit, offset]
    );

    const hasMore = result.rows.length >= limit;
    return res.json({
      reviews: result.rows,
      hasMore,
      page,
      limit
    });
  } catch (err) {
    console.error('❌ Error fetching reviews:', err);
    return res.status(500).json({ error: 'Error loading reviews' });
  }
}
