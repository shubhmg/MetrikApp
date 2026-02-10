import env from './config/env.js';
import { connectDB } from './config/db.js';
import app from './app.js';

async function start() {
  await connectDB();

  app.listen(env.port, env.host, () => {
    console.log(`API server running on http://${env.host}:${env.port} [${env.nodeEnv}]`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
