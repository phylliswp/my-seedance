import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { taskRouter } from './routes/tasks.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json({ limit: '50mb' }));

app.get('/', (_req, res) => {
  res.status(200).json({
    service: 'Seedance API Server',
    status: 'ok',
    frontend: 'http://localhost:5173',
    endpoints: {
      health: '/health',
      models: '/api/tasks/models',
      createTask: 'POST /api/tasks',
      taskDetail: 'GET /api/tasks/:id',
      taskList: 'GET /api/tasks',
    },
  });
});

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api/tasks', taskRouter);

app.listen(PORT, () => {
  console.log(`🚀 Seedance server running at http://localhost:${PORT}`);
});
