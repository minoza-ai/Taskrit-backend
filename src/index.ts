import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { database } from './models/database';

// 환경변수 로드
dotenv.config();

// 라우터 임포트
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import walletRoutes from './routes/wallets';
import testRoutes from './routes/test';
import projectRoutes from './routes/projects';

const app = express();
const port = process.env.PORT || 3000;

// 미들웨어
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// 헬스 체크
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// API 라우트
app.use('/user', authRoutes);
app.use('/user', userRoutes);
app.use('/wallets', walletRoutes);
app.use('/projects', projectRoutes);
app.use('/test', testRoutes);

// 404 핸들러
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// 에러 핸들러
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// 서버 시작
async function startServer() {
  try {
    // MongoDB에 연결
    await database.initialize();
    console.log('Database initialized successfully');

    // 서버 실행
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
      console.log(`Health check: http://localhost:${port}/health`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await database.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await database.close();
  process.exit(0);
});

startServer();

export default app;
