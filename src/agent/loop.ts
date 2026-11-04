import cron from 'node-cron';
import nodemailer from 'nodemailer';
import { config } from '../config/env';
import { runSeoAudit } from '../analysis/web/seo';
import { runPerformanceAudit } from '../analysis/web/performance';
import { getDb } from '../database/sqlite';
import { generateInsightsFromAudit } from './llm';

/**
 * Envía una notificación HTML formal por SMTP cuando se completa una auditoría.
 */
export async function sendEmailAlert(
  url: string,
  seoScore: number,
  perfScore: number,
  seoIssues: string[],
  perfIssues: string[],
  insights: string
) {
  try {
    const db = await getDb();
    const rows = await db.all('SELECT service, token FROM credentials');
    const creds: Record<string, string> = {};
    rows.forEach(r => creds[r.service] = r.token);

    if (creds.smtp_enabled !== 'true') {
      console.log('ℹ️ Alertas por email no habilitadas. Saltando envío.');
      return;
    }

    const host = creds.smtp_host || '';
    const port = parseInt(creds.smtp_port || '587');
    const user = creds.smtp_user || '';
    const pass = creds.smtp_password || '';
    const to = creds.smtp_recipient || '';

    if (!host || !user || !pass || !to) {
      console.warn('⚠️ SMTP habilitado pero faltan credenciales obligatorias. Verifica la configuración.');
      return;
    }

    const scoreGlobal = Math.round((seoScore + perfScore) / 2);

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
        <h2 style="color: #0f172a; border-bottom: 2px solid #2dd4bf; padding-bottom: 10px;">Growth Optimizer Agent</h2>
        <p style="font-size: 15px; color: #334155;">Se ha ejecutado la auditoría técnica de tu sitio web:</p>
        
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #2f3aa3;">
          <p style="margin: 4px 0; font-size: 14px;"><strong>Sitio Web:</strong> <a href="${url}" style="color: #2dd4bf; text-decoration: none;">${url}</a></p>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Puntaje Global:</strong> <span style="font-size: 16px; color: ${scoreGlobal >= 80 ? '#10b981' : scoreGlobal >= 50 ? '#f59e0b' : '#ef4444'}; font-weight: bold;">${scoreGlobal}/100</span></p>
          <p style="margin: 4px 0; font-size: 14px;"><strong>SEO Técnico:</strong> ${seoScore}/100</p>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Velocidad/Performance:</strong> ${perfScore}/100</p>
        </div>

        <h3 style="color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">Problemas Detectados</h3>
        <ul style="color: #475569; font-size: 14px; padding-left: 20px;">
          ${[...seoIssues, ...perfIssues].map(i => `<li style="margin-bottom: 6px;">${i}</li>`).join('') || '<li>No se detectaron problemas críticos. ¡Felicidades!</li>'}
        </ul>

        <h3 style="color: #1e293b; margin-top: 25px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">Recomendaciones de IA ("Quick Wins")</h3>
        <div style="background-color: #f0fdfa; border-left: 4px solid #2dd4bf; padding: 15px; color: #0f766e; font-size: 14px; line-height: 1.6; border-radius: 4px;">
          ${insights.replace(/\n/g, '<br>')}
        </div>

        <p style="font-size: 11px; color: #94a3b8; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 10px; text-align: center;">
          Este correo fue generado de manera autónoma por el Growth Optimizer Agent.
        </p>
      </div>
    `;

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false // Permite SMTP con certificados auto-firmados
      }
    });

    await transporter.sendMail({
      from: `"Growth Optimizer Agent" <${user}>`,
      to,
      subject: `[Growth Optimizer] Reporte de Auditoría: ${url} (Score: ${scoreGlobal}/100)`,
      html: htmlContent
    });

    console.log(`✉️ Correo de alerta enviado exitosamente a: ${to}`);
  } catch (err: any) {
    console.error('❌ Fallo al enviar notificación por SMTP:', err.message);
  }
}

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
    let insights = '';
    
    if (allIssuesCount > 0) {
      console.log(`🧠 Evaluando ${allIssuesCount} problemas encontrados con IA...`);
      try {
        insights = await generateInsightsFromAudit(seo.issues, perf.issues);
        
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

    // 4. Enviar notificación por correo
    await sendEmailAlert(url, seo.score, perf.score, seo.issues, perf.issues, insights || 'Tu sitio web está optimizado de manera óptima.');
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
