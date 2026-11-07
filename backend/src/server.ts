import { app } from './app.js';
import { connectDatabase } from './config/database.js';
import { env } from './config/env.js';

async function start() {
  await connectDatabase();
  console.log('MongoDB connected successfully.');
  app.listen(env.port, () => console.log(`EduSync API listening on port ${env.port}`));
}

start().catch((error) => {
  console.error('Unable to start EduSync API or connect to MongoDB', error);
  process.exit(1);
});
