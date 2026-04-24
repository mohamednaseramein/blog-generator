import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import blogRoutes from './routes/blog-routes.js';
import { errorHandler } from './middleware/error-handler.js';
import { getAppVersion, getGitSha } from './version.js';
import { validateAndLogRuntimeEnv } from './config/env.js';

const { port, frontendUrl } = validateAndLogRuntimeEnv();

const app = express();

app.use(cors({ origin: frontendUrl }));
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
  console.log(`[config] Blog Generator API listening on port ${port}`);
});

export default app;
