import app from './app.js';
import { createServer } from 'http';
import { initSocket } from './config/socket.js';
import { handleRequisitionTimeouts } from './services/materialRequisitionService.js';

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.io
initSocket(httpServer);

// Global error handling to prevent process crashes from unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
    // Only log if it's not a known Redis error we're already handling
    if (!reason?.message?.includes('redis client') && !reason?.message?.includes('Redis timeout')) {
        console.error('🔥 UNHANDLED REJECTION!', reason);
    }
});

process.on('uncaughtException', (error) => {
    console.error('💥 UNCAUGHT EXCEPTION! Shutting down...', error);
    // Give some time for logs to be written before exiting
    setTimeout(() => process.exit(1), 1000);
});

// Run background job to check for requisition timeouts every 15 minutes
setInterval(async () => {
  console.log('[BackgroundJob] Checking for material requisition timeouts...');
  await handleRequisitionTimeouts();
}, 15 * 60 * 1000);

httpServer.listen(app.get('port'), () => {
  console.log(`Server is running on port ${app.get('port')}`);
}).on('error', (err) => {
  console.log('Server startup error:', err);
});