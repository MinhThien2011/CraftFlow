import compression from 'compression';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import express from 'express';
import mainRouter from './routes/main.routes.js';
import { connectToDatabase } from './config/mongoDB.js';

const app = express();
connectToDatabase()

app.set('port', process.env.PORT || 4000);
app.set('env', process.env.NODE_ENV || 'development');
app.set("json spaces", 2);

app.use(cors({
  origin: '*',
  credentials: true,
}));
app.use(compression());
app.use(helmet());
app.use(morgan('dev'));

app.use('/api', mainRouter);

app.use(/^\/api\/.*/, (req, res) => {
  res.status(404).json({
    status: "error",
    path: req.path,
    error: "Endpoint not found",
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: "error",
    error: "Internal Server Error",
    err: err.message,
  });
});

export default app;