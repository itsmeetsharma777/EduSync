import { app } from './app.js';
import { env } from './config/env.js';

async function start() {
  app.listen(env.port, () => console.log(`EduSync API listening on port ${env.port}`));
}

start().catch((error) => {
  console.error('Unable to start EduSync API', error);
  process.exit(1);
});
