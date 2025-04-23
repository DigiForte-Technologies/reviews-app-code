import formidable from 'formidable';
import fs from 'fs';
import csvParser from 'csv-parser';
import pool from '../../../db/connectToDb.js';
import nodemailer from 'nodemailer';
import { saveImportLog, sendImportSummaryEmail } from './sendImportSummaryEmail.js';
import { getStoreOwnerEmail } from './getStoreOwnerEmail.js';

export default async function uploadReviewsHandler(req, res) {
  if (req.method !== 'POST') {
    console.log('❌ Invalid method:', req.method);
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const form = formidable({ multiples: false });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('❌ Formidable error:', err);
      res.status(500).json({ error: 'Error parsing uploaded file' });
      return;
    }

    const file = files.file?.[0];
    if (!file || !file.filepath) {
      console.error('❌ No file uploaded or file path missing.');
      res.status(400).json({ error: 'No file uploaded.' });
      return;
    }

    const session = res.locals.shopify?.session;
    if (!session) {
      console.error('❌ No Shopify session found.');
      res.status(400).json({ error: 'No shop provided' });
      return;
    }

    const shop = session.shop;
    const productId = Array.isArray(fields.product_id) ? fields.product_id[0] : fields.product_id;
    const cleanedProductId = productId.toString().replace(/[^\d]/g, '');

    const productHandle = Array.isArray(fields.product_handle)
      ? fields.product_handle[0]
      : fields.product_handle;

    const validatedData = Array.isArray(fields.validated_data)
      ? fields.validated_data[0]
      : fields.validated_data;

    console.log('✅ Cleaned Product Handle:', productHandle);

    if (!productId || !productHandle || !shop) {
      console.error('❌ Missing product_id, product_handle, or shop.');
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const results = [];
    let importedCount = 0;

    try {
      console.log('📥 Reading uploaded CSV file:', file.filepath);

      const useValidated = validatedData ? JSON.parse(validatedData) : null;
      const importRows = useValidated || [];

      if (!useValidated) {
        await new Promise((resolve, reject) => {
          fs.createReadStream(file.filepath)
            .pipe(csvParser())
            .on('data', (data) => results.push(data))
            .on('end', () => resolve())
            .on('error', (err) => reject(err));
        });
        importRows.push(...results);
      }

      // ✅ Create or get the store
      const storeResult = await pool.query(
        `INSERT INTO stores (shop) VALUES ($1) ON CONFLICT (shop) DO UPDATE SET shop = EXCLUDED.shop RETURNING id`,
        [shop]
      );
      const shopId = storeResult.rows[0].id;

      // ✅ Create or get the product for this store
      const productResult = await pool.query(
        `INSERT INTO products (shop_id, product_id, handle)
         VALUES ($1, $2, $3)
         ON CONFLICT (shop_id, product_id) DO UPDATE SET handle = EXCLUDED.handle
         RETURNING id`,
        [shopId, cleanedProductId, productHandle]
      );
      const dbProductId = productResult.rows[0].id;

      for (const review of importRows) {
        await pool.query(
          `INSERT INTO reviews (
            shop_id, product_id,
            reviewer_name, review_text, rating, image_url, verified, created_at, published
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            shopId,
            dbProductId,
            review.reviewer_name || '',
            review.review_text || '',
            parseInt(review.rating || 5),
            review.image_url || null,
            String(review.verified).toLowerCase() === 'true',
            review.created_at ? new Date(review.created_at) : new Date(),
            true
          ]
        );

        importedCount++;
      }

      await saveImportLog({
        shop,
        product_id: cleanedProductId,
        validCount: importedCount,
        issueCount: parseInt(fields.issue_count?.[0] || '0'),
        fileName: file.originalFilename || 'reviews-import.csv'
      });

      const email = await getStoreOwnerEmail(session);
      const issues = Array.isArray(fields.validation_issues)
        ? JSON.parse(fields.validation_issues[0])
        : [];

      const issueCount = parseInt(fields.issue_count?.[0] || '0');
      if (email) {
        await sendImportSummaryEmail({
          to: email,
          shop,
          validCount: importedCount,
          issueCount,
          issues,
        });
      }

      console.log('✅ All reviews inserted successfully.');
      res.status(200).json({ success: true });
    } catch (err) {
      console.error('❌ Upload Reviews Error:', err);
      res.status(500).json({ error: 'Failed to process review upload' });
    }
  });
}
