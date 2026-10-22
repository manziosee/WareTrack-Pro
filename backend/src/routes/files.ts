import { Router } from 'express';
import { auth } from '../middleware/auth';
import { readStoredFile } from '../services/fileStorage';

/** Serve photos, signatures and receipts to signed-in users of the same company. Mounted at /api/files. */
const router = Router();

/**
 * @swagger
 * /api/files/{id}:
 *   get:
 *     tags: [Files]
 *     summary: Download a stored photo, signature or receipt
 *     description: Records reference files as "file:<id>". Only users of the company that owns the file can read it.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200: { description: The file bytes }
 *       404: { description: Not found (or another company's file) }
 */
router.get('/:id', auth, async (req, res, next) => {
  try {
    if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'File not found' } });
    const file = await readStoredFile(req.params.id);
    if (!file) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'File not found' } });
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(file.body);
  } catch (error) {
    next(error);
  }
});

export default router;
