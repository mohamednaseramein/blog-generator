import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import blogRoutes from './routes/blog-routes.js';
import { errorHandler } from './middleware/error-handler.js';
import { getAppVersion, getGitSha } from './version.js';

const app = express();
const port = process.env['PORT'] ?? 3000;

app.use(cors({ origin: process.env['FRONTEND_URL'] ?? 'http://localhost:5173' }));
app.use(express.json());

app.get('/health', (_req, res) =>
  res.json({ status: 'ok', version: getAppVersion() })
);
app.get('/version', (_req, res) =>
  res.json({ version: getAppVersion(), gitSha: getGitSha() })
);
app.use('/api/blogs', blogRoutes);

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Blog Generator API running on port ${port}`);
});

export default app;
