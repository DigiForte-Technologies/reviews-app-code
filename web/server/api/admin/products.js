import shopify from '../../../shopify.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const session = res.locals.shopify.session;
    const client = new shopify.api.clients.Rest({ session });

    const products = await client.get({
      path: 'products',
    });

    res.status(200).json({ products: products.body.products });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Error fetching products' });
  }
}
