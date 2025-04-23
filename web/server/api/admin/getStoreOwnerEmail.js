export async function getStoreOwnerEmail(session) {
    try {
      const response = await fetch(`https://${session.shop}/admin/api/2024-07/shop.json`, {
        method: 'GET',
        headers: {
          'X-Shopify-Access-Token': session.accessToken,
          'Content-Type': 'application/json',
        },
      });
  
      const data = await response.json();
      return data.shop?.email || null;
    } catch (err) {
      console.error('❌ Error fetching store email:', err);
      return null;
    }
  }
  