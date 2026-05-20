import express from 'express';
import cors from 'cors';
import { config } from './config/env';
import { initDb } from './database/sqlite';
import path from 'path';

import apiRoutes from './api/routes';
import { startAgentLoop } from './agent/loop';

async function bootstrap() {
  console.log('🚀 Starting Growth Optimizer Agent...');

  // Initialize DB
  await initDb();

  // Setup Express server for the UI and API
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Define API routes
  app.use('/api', apiRoutes);

  // Expose Dashboard
  // To view dashboard: go to http://localhost:PORT/dashboard
  app.use('/dashboard', express.static(path.resolve(process.cwd(), 'dashboard_ejecutivo')));

  app.listen(config.port, () => {
    console.log(`✅ Server listening on port ${config.port}`);
    console.log(`📊 Dashboard available at http://localhost:${config.port}/dashboard/code.html`);
  });

  // Start Background Agent Loop
  console.log('⏳ Starting background agent loop...');
  startAgentLoop();
}

bootstrap().catch(err => {
  console.error('❌ Failed to start Agent:', err);
  process.exit(1);
});
