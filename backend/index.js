import app from './app.js';
import { handleRequisitionTimeouts } from './services/materialRequisitionService.js';

// Run background job to check for requisition timeouts every 15 minutes
setInterval(async () => {
  console.log('[BackgroundJob] Checking for material requisition timeouts...');
  await handleRequisitionTimeouts();
}, 15 * 60 * 1000);

app.listen(app.get('port'), () => {
  console.log(`Server is running on port ${app.get('port')}`);
}).on('error', (err) => {
  console.error('Server startup error:', err);
});