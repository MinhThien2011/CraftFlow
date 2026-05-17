import compression from 'compression';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import express from 'express';
import mainRouter from './routes/main.routes.js';
import cookieParser from 'cookie-parser';
import { redisConnect, redisDisconnect, getRedisHealth } from './config/redisClient.js';
import { slowBodyGuard, concurrentLimiter, subnetLimiter, logSecurityStatus } from './middleware/requestGuard.js';
import { logRateLimitStatus } from './middleware/rateLimit.js';
import superLogger from './middleware/colorfulLogger.js';
import { connectToDatabase } from './config/db/mongoDB.js';
import { logJwtAuthStatus } from './middleware/jwtAuth.js';
import { logSocketStatus } from './config/socket.js';
import { securityAgent } from './middleware/securityAgentKit.js';

const app = express();

// ─── Process Error Handlers ───────────────────────────────────────────────────
process.on('uncaughtException', (err) => {
  console.error('🔥 UNCAUGHT EXCEPTION! Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 UNHANDLED REJECTION at:', promise);
  console.error('Reason:', reason);
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
const shutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}. Gracefully shutting down...`);
  try {
    await redisDisconnect();
    console.log('✅ Redis disconnected cleanly');
  } catch (err) {
    console.error('⚠️ Error during Redis disconnect:', err.message);
  }
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ─── Service Initialization ───────────────────────────────────────────────────
export const initializeServices = async () => {
  try {
    await redisConnect();

    // Tăng thời gian chờ để chắc chắn Redis ready
    let attempts = 0;
    const maxAttempts = 15; // ~4.5 giây
    while (!getRedisHealth() && attempts < maxAttempts) {
      await new Promise(r => setTimeout(r, 300));
      attempts++;
    }

    if (getRedisHealth()) {
      console.log('✅ Redis healthy — rate limiting with RedisStore');
    } else {
      console.warn('⚠️ Redis not ready after wait — will use MemoryStore');
    }

    await connectToDatabase();
  } catch (err) {
    console.error('❌ Failed to initialize services:', err);
    throw err;
  }
};

// ─── App Config ───────────────────────────────────────────────────────────────
app.set('port', process.env.PORT || 4000);
app.set('env', process.env.NODE_ENV || 'development');
app.set('trust proxy', true);
if (process.env.NODE_ENV === 'development') {
  app.set('json spaces', 2);
}

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// ─── Middleware ───────────────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
}));

app.use(cookieParser());
app.use(compression());
app.use(helmet());
app.use(morgan('dev'));

// ─── Defense Layer 1: Request Guards (chạy trước body-parser) ─────────────────
app.use(slowBodyGuard);
app.use(subnetLimiter);

// ─── Defense Layer 2: Request Guards (chạy sau body-parser) ───────────────────
app.use(concurrentLimiter);
logSecurityStatus();
logRateLimitStatus();
logJwtAuthStatus();
logSocketStatus();
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

if (process.env.SECURITY_AGENT_ENABLED === 'true') {
  app.use(securityAgent);
}

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api', mainRouter);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use('/api/*path', (req, res) => {
  res.status(404).json({
    status: 'error',
    path: req.path,
    error: 'Endpoint not found',
  });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  const isDev = process.env.NODE_ENV === 'development';
  res.status(err.status || 500).json({
    status: 'error',
    error: 'Internal Server Error',
    ...(isDev && { message: err.message }),
  });
});

export default app;
