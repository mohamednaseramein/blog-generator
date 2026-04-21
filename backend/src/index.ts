import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import blogRoutes from './routes/blog-routes.js';
import { errorHandler } from './middleware/error-handler.js';

const app = express();
const port = process.env['PORT'] ?? 3000;

app.use(cors({ origin: process.env['FRONTEND_URL'] ?? 'http://localhost:5173' }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/blogs', blogRoutes);

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Blog Generator API running on port ${port}`);
});

export default app;
