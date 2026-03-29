import app from './app.js';

app.listen(app.get('port'), () => {
  console.log(`Server is running on port ${app.get('port')}`);
}).on('error', (err) => {
  console.error('Server startup error:', err);
});