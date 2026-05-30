import app, { initializeServices } from './app.js';
import { createServer } from 'http';
import { initSocket } from './config/socket.js';
import { checkAndCreateLowStockNotifications } from './services/inventoryService.js';

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

try {
  await initializeServices();

  // Run once on server startup, then periodically
  checkAndCreateLowStockNotifications().catch((error) => {
    console.error('[BackgroundJob] Initial low stock alerts check failed:', error);
  });

  setInterval(async () => {
    try {
      await checkAndCreateLowStockNotifications();
    } catch (error) {
      console.error('[BackgroundJob] Low stock alerts check failed:', error);
    }
  }, 15 * 60 * 1000);

  httpServer.listen(app.get('port'), () => {
    console.log(`Server is running on port ${app.get('port')}`);
  }).on('error', (err) => {
    console.log('Server startup error:', err);
  });
} catch (error) {
  console.error('Server startup aborted:', error);
  process.exit(1);
}
