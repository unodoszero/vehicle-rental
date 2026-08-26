import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Secure Server-Side Admin PIN Verification
  // The real secret PIN is read from process.env.ADMIN_PIN and NEVER sent to the browser
  app.post('/api/admin/verify-pin', (req, res) => {
    const { pin } = req.body;
    
    // Server environment PIN (Defaults to 1234 if not yet configured in environment variables)
    const serverPin = (process.env.ADMIN_PIN || '1234').trim();

    if (!pin || typeof pin !== 'string') {
      return res.status(400).json({ success: false, message: 'PIN is required' });
    }

    // Constant-time comparison to prevent timing attacks
    const pinBuffer = Buffer.from(pin.trim());
    const targetBuffer = Buffer.from(serverPin);

    let isMatch = false;
    if (pinBuffer.length === targetBuffer.length) {
      isMatch = crypto.timingSafeEqual(pinBuffer, targetBuffer);
    }

    if (isMatch) {
      // Generate a secure, temporary server session token
      const sessionToken = crypto.randomBytes(32).toString('hex');
      return res.json({
        success: true,
        message: 'Admin authentication verified',
        token: sessionToken,
      });
    } else {
      return res.status(401).json({
        success: false,
        message: 'Incorrect Admin PIN',
      });
    }
  });

  // Vite middleware for development
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Miranda Rentals Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
