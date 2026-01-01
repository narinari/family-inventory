import express, { type Express } from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import itemTypesRoutes from './routes/item-types.js';
import itemsRoutes from './routes/items.js';
import boxesRoutes from './routes/boxes.js';
import locationsRoutes from './routes/locations.js';
import tagsRoutes from './routes/tags.js';

const app: Express = express();
const PORT = process.env.PORT || 8080;

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/auth', authRoutes);
app.use('/item-types', itemTypesRoutes);
app.use('/items', itemsRoutes);
app.use('/boxes', boxesRoutes);
app.use('/locations', locationsRoutes);
app.use('/tags', tagsRoutes);

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'エンドポイントが見つかりません' },
  });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: '内部エラーが発生しました' },
  });
});

app.listen(PORT, () => {
  console.log(`🚀 API Server running on port ${PORT}`);
});

export default app;
