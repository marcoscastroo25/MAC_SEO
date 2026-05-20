import { getDb } from './src/database/sqlite';

async function main() {
  try {
    const db = await getDb();
    console.log('Opened database successfully');

    const credentials = await db.all("SELECT * FROM credentials");
    console.log('CREDENTIALS:');
    console.log(credentials.map(r => ({ ...r, token: r.token ? r.token.slice(0, 10) + '...' : null })));

    const alerts = await db.all("SELECT * FROM alerts");
    console.log('ALERTS (last 10):');
    console.log(alerts.slice(-10));

    const seo = await db.all("SELECT * FROM seo_audit ORDER BY timestamp DESC LIMIT 3");
    console.log('SEO AUDITS (last 3):');
    console.log(seo);

    const perf = await db.all("SELECT * FROM web_performance ORDER BY timestamp DESC LIMIT 3");
    console.log('PERFORMANCE AUDITS (last 3):');
    console.log(perf);
  } catch (err) {
    console.error(err);
  }
}

main();
