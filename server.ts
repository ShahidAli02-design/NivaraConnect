import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { apiRouter } from './server/routes';
import { db } from './server/db';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Persist data after every write request (POST/PATCH/PUT/DELETE)
  app.use('/api', (req, res, next) => {
    if (req.method !== 'GET') res.on('finish', () => db.scheduleSave());
    next();
  });

  // API Routes Mounted FIRST
  app.use('/api', apiRouter);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', app: 'NivaraConnect', timestamp: new Date().toISOString() });
  });

  // API 404 handler for missing API routes (under /api only)
  app.use('/api', (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
  });

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Global Error Handler for API routes
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Server error:', err);
    if (req.path.startsWith('/api') || res.headersSent) {
      return res.status(500).json({ error: err?.message || 'Internal Server Error' });
    }
    next(err);
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NivaraConnect server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Error starting server:', err);
});
