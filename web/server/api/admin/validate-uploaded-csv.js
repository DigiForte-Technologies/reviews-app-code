import fs from 'fs';
import csvParser from 'csv-parser';
import formidable from 'formidable';

export default async function validateUploadedCSV(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const form = formidable({ multiples: false });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({ error: 'File parsing failed' });
    }

    const file = files.file?.[0];
    if (!file || !file.filepath) {
      return res.status(400).json({ error: 'CSV file missing' });
    }

    const issues = [];
    const validRows = [];

    // still enforce MM/DD/YYYY …
    const validDateRegex = /^(0?[1-9]|1[0-2])\/(0?[1-9]|[12][0-9]|3[01])\/\d{4}$/;

    fs.createReadStream(file.filepath)
      .pipe(csvParser())
      .on('data', (row) => {
        const rowIssues = {};
        const rating = parseInt(row.rating);
        const verified = String(row.verified).toLowerCase();
        let createdAt = row.created_at;

        // rating check
        if (!(rating >= 1 && rating <= 5)) {
          rowIssues.rating = `Invalid rating: ${row.rating}`;
        }

        // verified check
        if (!(verified === 'true' || verified === 'false')) {
          rowIssues.verified = `Invalid verified value: ${row.verified}`;
        }

        // date check: allow MM/DD/YYYY or ISO‑8601
        if (!validDateRegex.test(createdAt)) {
          const parsedTs = Date.parse(createdAt);
          if (!isNaN(parsedTs)) {
            // normalize ISO into MM/DD/YYYY
            const d = new Date(parsedTs);
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            const yyyy = d.getFullYear();
            createdAt = `${mm}/${dd}/${yyyy}`;
            row.created_at = createdAt;
          } else {
            rowIssues.created_at = `Invalid date format: ${createdAt}`;
          }
        }

        if (Object.keys(rowIssues).length > 0) {
          issues.push({ row, errors: rowIssues });
        } else {
          validRows.push(row);
        }
      })
      .on('end', () => {
        res.status(200).json({
          valid: issues.length === 0,
          issues,
          validRows,
          validCount: validRows.length,
          totalCount: validRows.length + issues.length
        });
      })
      .on('error', () => {
        return res.status(500).json({ error: 'Failed to parse CSV' });
      });
  });
}
