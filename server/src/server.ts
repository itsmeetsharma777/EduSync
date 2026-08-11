import { app } from './app.js';
import { connectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { User } from './models/User.js';
import bcrypt from 'bcryptjs';

async function ensureAdministrator() {
  if (!env.adminEmail || !env.adminPassword) return;
  const passwordHash = await bcrypt.hash(env.adminPassword, 12);
  await User.findOneAndUpdate(
    { email: env.adminEmail },
    { $set: { fullName: 'EduSync Administrator', passwordHash, role: 'admin', isEmailVerified: true } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

async function start() {
  await connectDatabase();
  await ensureAdministrator();
  app.listen(env.port, () => console.log(`EduSync API listening on port ${env.port}`));
}

start().catch((error) => {
  console.error('Unable to start EduSync API', error);
  process.exit(1);
});
