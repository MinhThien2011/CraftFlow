import app from './app.js';
import { createServer } from 'http';
import { initSocket } from './config/socket.js';
import { handleRequisitionTimeouts } from './services/materialRequisitionService.js';

const httpServer = createServer(app);
initSocket(httpServer);

process.on('unhandledRejection', (reason, promise) => {
  if (!reason?.message?.includes('redis client') && !reason?.message?.includes('Redis timeout')) {
    console.error('🔥 UNHANDLED REJECTION!', reason);
  }
});

process.on('uncaughtException', (error) => {
  console.error('💥 UNCAUGHT EXCEPTION! Shutting down...', error);
  setTimeout(() => process.exit(1), 1000);
});

setInterval(async () => {
  console.log('[BackgroundJob] Checking for material requisition timeouts...');
  await handleRequisitionTimeouts();
}, 15 * 60 * 1000);

httpServer.listen(app.get('port'), () => {
  console.log(`Server is running on port ${app.get('port')}`);
}).on('error', (err) => {
  console.log('Server startup error:', err);
});