import path from 'path';
import { createReadStream } from 'fs';

export default async function handler(req, res) {
  const filePath = path.resolve(process.cwd(), './templates/reviews-import.csv');

  try {
    res.setHeader('Content-Disposition', 'attachment; filename="reviews-import.csv"');
    res.setHeader('Content-Type', 'text/csv');
    const fileStream = createReadStream(filePath);
    fileStream.pipe(res);
  } catch (err) {
    console.error('❌ Error serving CSV template:', err);
    res.status(500).json({ error: 'Failed to serve template' });
  }
}
