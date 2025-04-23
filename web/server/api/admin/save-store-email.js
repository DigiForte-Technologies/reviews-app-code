import pool from '../../../db/connectToDb.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const session = res.locals.shopify?.session;

  if (!session || !session.shop || !session.accessToken) {
    return res.status(400).json({ error: 'Missing or invalid Shopify session' });
  }

  try {
    // Fetch store info from Shopify Admin API
    const response = await fetch(`https://${session.shop}/admin/api/2024-07/shop.json`, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': session.accessToken,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    const email = data.shop?.email;

    if (!email) {
      return res.status(400).json({ error: 'Email not found in shop response' });
    }

    // Save to database if email is not already set
    await pool.query(
      `UPDATE stores SET email = $1 WHERE shop = $2 AND (email IS NULL OR email = '')`,
      [email, session.shop]
    );

    console.log(`✅ Store email saved: ${email}`);
    return res.status(200).json({ success: true, email });
  } catch (err) {
    console.error('❌ Error saving store email:', err);
    return res.status(500).json({ error: 'Failed to fetch or save email' });
  }
}
