import cron from 'node-cron';
import { config } from '../config/env';
import { runSeoAudit } from '../analysis/web/seo';
import { runPerformanceAudit } from '../analysis/web/performance';
import { getDb } from '../database/sqlite';
import { generateInsightsFromAudit } from './llm';

/**
 * Combina Puppeteer con el Cerebro de IA para generar y guardar el reporte
 */
export async function evaluateAndGenerateInsights(url: string) {
  console.log(`🤖 Iniciando ciclo completo del agente para: ${url}`);
  try {
    // 1. Ejecuta Puppeteer (Extracción de errores)
    const [seo, perf] = await Promise.all([runSeoAudit(url), runPerformanceAudit(url)]);

    const db = await getDb();
    
    // Guardar alertas críticas técnicas
    if (seo.score < config.thresholds.seoScore) {
      await db.run('INSERT INTO alerts (severity, message) VALUES (?, ?)', ['high', `SEO score crítico (${seo.score}) en ${url}`]);
    }
    if (perf.score < 70) {
      await db.run('INSERT INTO alerts (severity, message) VALUES (?, ?)', ['medium', `Performance score crítico (${perf.score}) en ${url}`]);
    }

    // 2. Extraer errores y enviar al LLM
    const allIssuesCount = seo.issues.length + perf.issues.length;
    
    if (allIssuesCount > 0) {
      console.log(`🧠 Evaluando ${allIssuesCount} problemas encontrados con IA...`);
      try {
        const insights = await generateInsightsFromAudit(seo.issues, perf.issues);
        
        // 3. Devuelve y guarda el reporte final (Insight) en la base de datos
        await db.run(
          'INSERT INTO alerts (severity, message) VALUES (?, ?)',
          ['insight', `**Quick Wins generados por IA para ${url}:**\n\n${insights}`]
        );
        console.log(`✅ Insights de IA generados y guardados exitosamente.`);
      } catch (llmError: any) {
        console.error('⚠️ No se pudieron generar insights con IA:', llmError.message);
      }
    } else {
      console.log('✅ Web en estado perfecto. No hay problemas que el LLM deba evaluar.');
    }
  } catch (e: any) {
    console.error('❌ Error general en el ciclo del agente para', url, e.message);
  }
}

let isRunning = false;
let lastRunDate: string = ''; // Formato: YYYY-MM-DD

/**
 * Configura el Cron Job para que corra en automático a la hora definida por el usuario
 */
export function startAgentLoop() {
  cron.schedule('* * * * *', async () => {
    try {
      const db = await getDb();
      const timeRow = await db.get('SELECT token FROM credentials WHERE service = "audit_time"');
      const urlsRow = await db.get('SELECT token FROM credentials WHERE service = "audit_urls"');
      
      if (!timeRow || !urlsRow || !timeRow.token || !urlsRow.token) {
        return; // No configurado aún
      }
      
      const configuredTime = timeRow.token.trim(); // e.g. "08:00"
      const now = new Date();
      const currentHourMin = now.toTimeString().slice(0, 5); // "08:00"
      const todayStr = now.toISOString().slice(0, 10); // "2026-05-20"
      
      if (currentHourMin === configuredTime && lastRunDate !== todayStr && !isRunning) {
        isRunning = true;
        lastRunDate = todayStr;
        console.log(`🕒 [Cron Job] Iniciando auditoría automática programada a las ${configuredTime} para las URLs configuradas...`);
        
        const urls = urlsRow.token.split(',').map((u: string) => u.trim()).filter(Boolean);
        for (const url of urls) {
          await evaluateAndGenerateInsights(url);
        }
        isRunning = false;
      }
    } catch (e: any) {
      console.error('❌ Error en el cron job de automatización:', e.message);
      isRunning = false;
    }
  });

  console.log(`✅ Agente automatizado en línea. El cron job comprobará cada minuto si debe iniciar una auditoría.`);
}
