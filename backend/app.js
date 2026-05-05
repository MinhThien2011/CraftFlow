import compression from 'compression';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import express from 'express';
import mainRouter from './routes/main.routes.js';
import cookieParser from 'cookie-parser';
import { redisConnect } from './config/redisClient.js';
import superLogger from './middleware/colorfulLogger.js';
import { setupGracefulShutdown } from './utils/processHandler.js';
import { connectToDatabase } from './config/db/mongoDB.js';

const app = express();
redisConnect();
connectToDatabase();
setupGracefulShutdown();
// logger.init('PET RESCUE').batch([
//     { cmd: 'step', args: [1, 5, 'Connect DB'] },
//     { cmd: 'step', args: [3, 5, 'Load Models'] },
//     { cmd: 'divider', args: ['Config'] },
//     { cmd: 'table', args: [[{ Port: 3000, Env: 'Dev' }], 'System Info'] },
//     { cmd: 'success', args: ['Server ready to fly!'] }
// ]);

// app.use(logger.handler);
superLogger.init('CRAB FLOW','Supreme System', 'left')
  .hook(true, true, true)
  .step(1, 3, 'Connecting to MongoDB...')
  .step(2, 3, 'Setting up Redis Cache...')
  .step(3, 3, 'Loading Routes...')
  .divider('System Online')
  .success('Server is ready to fly! 🚀');
app.use(superLogger.handler);

app.set('port', process.env.PORT || 4000);
app.set('env', process.env.NODE_ENV || 'development');
app.set("json spaces", 2);

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
}));

app.use(cookieParser());
app.use(compression());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', mainRouter);

app.use(/^\/api\/.*/, (req, res) => {
  res.status(404).json({
    status: "error",
    path: req.path,
    error: "Endpoint not found",
  });
});

app.use((err, req, res, next) => {
  console.log(err.stack);
  res.status(500).json({
    status: "error",
    error: "Internal Server Error",
    err: err.message,
  });
});

export default app;