import EmbeddedPostgres from 'embedded-postgres';
import path from 'path';
import fs from 'fs';

const dataDir = path.resolve('.postgres-data');

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: 'postgres',
  password: 'postgres',
  port: 5432,
  persistent: true,
  autoRehydrateSymlinks: true,
});

async function main() {
  if (!fs.existsSync(dataDir)) {
    console.log('[Postgres] Initializing local database cluster in .postgres-data...');
    await pg.initialise();
  }

  console.log('[Postgres] Starting PostgreSQL service on port 5432...');
  await pg.start();
  console.log('[Postgres] PostgreSQL engine is READY and listening on 127.0.0.1:5432.');

  try {
    await pg.createDatabase('brightloop_subscriptions');
    console.log('[Postgres] Created database "brightloop_subscriptions".');
  } catch (err) {
    // Database likely already exists
  }

  const shutdown = async () => {
    console.log('\n[Postgres] Shutting down PostgreSQL...');
    try {
      await pg.stop();
      console.log('[Postgres] PostgreSQL stopped cleanly.');
    } catch (e) {
      console.error('[Postgres] Error stopping PostgreSQL:', e);
    }
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Keep alive
  setInterval(() => {}, 1000 * 60 * 60);
}

main().catch((err) => {
  console.error('[Postgres] Fatal error starting PostgreSQL:', err);
  process.exit(1);
});
