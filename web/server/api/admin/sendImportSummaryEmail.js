// This is a helper module for sending import result emails using SMTP2GO
// and logging import activity in the database

import nodemailer from 'nodemailer';
import fs from 'fs';
import os from 'os';
import path from 'path';
import pool from '../../../db/connectToDb.js';


// Create reusable transporter using SMTP2GO
const transporter = nodemailer.createTransport({
  host: 'mail.smtp2go.com',
  port: 2525,
  secure: false,
  auth: {
    user: 'no-reply@codestream.ca',
    pass: 'p7Y2WIUwRc2wEhyK',
  },
});

function generateIssuesCSV(issues) {
  if (!issues.length) return '';

  const headers = [
    ...Object.keys(issues[0]?.row || {}),
    ...Object.keys(issues[0]?.errors || {}).filter(
      (key) => !Object.keys(issues[0].row).includes(key)
    )
  ];

  const rows = issues.map(({ row, errors }) => {
    return headers.map((key) => row[key] || errors[key] || '').join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

export async function sendImportSummaryEmail({ to, shop, validCount, issueCount, issues = [] }) {
  const subject = `📦 Your Review Import Summary (${shop})`;
  const text = `Hello,

Your recent CSV review import has completed.

✅ ${validCount} review(s) were successfully imported.
❌ ${issueCount} row(s) were skipped due to formatting issues.

Thank you,
Team`;

  const html = `
    <p>Hello,</p>
    <p>Your recent <strong>CSV review import</strong> has completed for <b>${shop}</b>.</p>
    <ul>
      <li>✅ <strong>${validCount}</strong> review(s) successfully imported</li>
      <li>❌ <strong>${issueCount}</strong> row(s) skipped due to formatting issues</li>
    </ul>
    <p>Thank you,<br/>Team</p>
  `;

  let attachments = [];
  if (issues.length > 0) {
    try {
      const csvData = generateIssuesCSV(issues);
      const tempPath = path.join(os.tmpdir(), `import-errors-${Date.now()}.csv`);
      fs.writeFileSync(tempPath, csvData);

      attachments.push({
        filename: 'Import_Errors.csv',
        path: tempPath,
      });
    } catch (err) {
      console.warn('⚠️ Failed to generate CSV attachment:', err);
    }
  }

  try {
    await transporter.sendMail({ from: 'no-reply@codestream.ca', to, subject, text, html, attachments });
    console.log(`📧 Email sent to ${to}`);
  } catch (err) {
    console.error('❌ Failed to send email:', err);
  } finally {
    if (attachments.length) {
      fs.unlink(attachments[0].path, (err) => {
        if (err) console.warn('⚠️ Could not delete temp CSV:', err);
      });
    }
  }
}

export async function saveImportLog({ shop, product_id, validCount, issueCount, fileName }) {
  try {
    // Get store ID
    const storeRes = await pool.query(
      'SELECT id FROM stores WHERE shop = $1',
      [shop]
    );
    const shopId = storeRes.rows[0]?.id;

    if (!shopId) {
      throw new Error(`Shop not found for ${shop}`);
    }

    // Get product ID (internal ID)
    const productRes = await pool.query(
      'SELECT id FROM products WHERE shop_id = $1 AND product_id = $2',
      [shopId, product_id]
    );
    const internalProductId = productRes.rows[0]?.id;

    if (!internalProductId) {
      throw new Error(`Product not found for product_id=${product_id}, shop_id=${shopId}`);
    }

    // Save import log
    await pool.query(
      `INSERT INTO import_logs (shop_id, product_id, valid_count, issue_count, file_name, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [shopId, internalProductId, validCount, issueCount, fileName || 'unknown']
    );

    console.log('🗂️ Import log saved.');
  } catch (err) {
    console.error('❌ Failed to save import log:', err);
  }
}

