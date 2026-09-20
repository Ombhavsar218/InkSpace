import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { put } from '@vercel/blob';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

router.post(
  '/',
  upload.single('file'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No image file uploaded' });
        return;
      }

      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        res.status(503).json({ error: 'BLOB_READ_WRITE_TOKEN is not configured' });
        return;
      }

      const ext = path.extname(req.file.originalname);
      const key = `images/img-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      const blob = await put(key, req.file.buffer, {
        access: 'public',
        contentType: req.file.mimetype,
      });

      res.json({
        url: blob.url,
        filename: blob.pathname,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'Upload failed' });
    }
  }
);

export default router;