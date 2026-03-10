const path = require('path');
const { put } = require('@vercel/blob');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rawFilename = req.query?.filename;
  const filename = Array.isArray(rawFilename) ? rawFilename[0] : rawFilename;

  if (!filename) {
    return res.status(400).json({ error: 'Missing filename query parameter' });
  }

  const safeFilename = path.basename(filename).replace(/[^\w.-]/g, '_');
  const blobPath = `uploads/${Date.now()}-${safeFilename}`;

  try {
    const blob = await put(blobPath, req, { access: 'public' });
    return res.status(200).json(blob);
  } catch (error) {
    return res.status(500).json({
      error: 'Upload failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
