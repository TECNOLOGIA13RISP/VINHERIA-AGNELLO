const { BlobNotFoundError, head, put } = require('@vercel/blob');

const CATALOG_BLOB_PATH = 'data/catalog.json';

const parseRequestBody = (body) => {
  if (!body) {
    return {};
  }

  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return null;
    }
  }

  if (typeof body === 'object') {
    return body;
  }

  return null;
};

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'GET') {
    try {
      const blob = await head(CATALOG_BLOB_PATH);
      const response = await fetch(blob.url, { cache: 'no-store' });

      if (!response.ok) {
        return res.status(502).json({ error: 'Unable to read catalog blob' });
      }

      const payload = await response.json();
      const catalog = Array.isArray(payload?.catalog) ? payload.catalog : [];
      const updatedAt = typeof payload?.updatedAt === 'string' ? payload.updatedAt : null;

      return res.status(200).json({ catalog, updatedAt });
    } catch (error) {
      if (error instanceof BlobNotFoundError) {
        return res.status(404).json({ error: 'Catalog not found', catalog: [] });
      }

      return res.status(500).json({
        error: 'Failed to load catalog',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  if (req.method === 'PUT') {
    const parsedBody = parseRequestBody(req.body);
    if (!parsedBody || !Array.isArray(parsedBody.catalog)) {
      return res.status(400).json({ error: 'Body must include a catalog array' });
    }

    const updatedAt = typeof parsedBody.updatedAt === 'string' ? parsedBody.updatedAt : new Date().toISOString();
    const payload = {
      catalog: parsedBody.catalog,
      updatedAt,
    };

    try {
      const blob = await put(CATALOG_BLOB_PATH, JSON.stringify(payload), {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'application/json; charset=utf-8',
        cacheControlMaxAge: 60,
      });

      return res.status(200).json({
        ok: true,
        updatedAt,
        url: blob.url,
      });
    } catch (error) {
      return res.status(500).json({
        error: 'Failed to save catalog',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  res.setHeader('Allow', 'GET, PUT');
  return res.status(405).json({ error: 'Method not allowed' });
};
