import { Router } from 'express';
import { runSeoAudit } from '../analysis/web/seo';
import { runPerformanceAudit } from '../analysis/web/performance';
import { getDb } from '../database/sqlite';

const router = Router();

// Test Endpoints
router.get('/status', (req, res) => {
  res.json({ status: 'nominal', timestamp: new Date() });
});

import { evaluateAndGenerateInsights } from '../agent/loop';

// Trigger Web Audit On-Demand (SEO + Performance + LLM)
router.post('/run/web', async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'Falta el parámetro "url" en el body' });
  }

  try {
    // Run the full cycle
    await evaluateAndGenerateInsights(url);
    res.json({ message: 'Auditoría completada exitosamente. Revisa el dashboard.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get Dashboard Data
router.get('/dashboard', async (req, res) => {
  try {
    const db = await getDb();
    const seoLatest = await db.get('SELECT * FROM seo_audit ORDER BY timestamp DESC LIMIT 1');
    const perfLatest = await db.get('SELECT * FROM web_performance ORDER BY timestamp DESC LIMIT 1');
    const insights = await db.all("SELECT * FROM alerts WHERE severity = 'insight' ORDER BY timestamp DESC LIMIT 5");
    const activities = await db.all("SELECT * FROM alerts WHERE severity != 'insight' ORDER BY timestamp DESC LIMIT 5");

    let globalScore = 100;
    if (seoLatest && perfLatest) {
      globalScore = Math.round((seoLatest.score + perfLatest.score) / 2);
    }

    res.json({
      globalScore: globalScore,
      seoScore: seoLatest ? seoLatest.score : 0,
      loadSpeed: perfLatest ? JSON.parse(perfLatest.metrics).largestContentfulPaintMs / 1000 : 0,
      insights: insights,
      activities: activities
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get Latest History
router.get('/history/web', async (req, res) => {
  try {
    const db = await getDb();
    const seoHistory = await db.all('SELECT * FROM seo_audit ORDER BY timestamp DESC LIMIT 10');
    const perfHistory = await db.all('SELECT * FROM web_performance ORDER BY timestamp DESC LIMIT 10');
    
    // Parse JSON fields
    res.json({
      seo: seoHistory.map(r => ({ ...r, findings: JSON.parse(r.findings) })),
      performance: perfHistory.map(r => ({ ...r, metrics: JSON.parse(r.metrics) }))
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get Credentials
router.get('/credentials', async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all('SELECT service, token FROM credentials');
    const credentials: Record<string, string> = {};
    rows.forEach((r: any) => {
      credentials[r.service] = r.token;
    });
    res.json(credentials);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Save Credentials
router.post('/credentials', async (req, res) => {
  try {
    const { type, ...data } = req.body;
    const db = await getDb();
    
    const updateCred = async (service: string, token: string) => {
      if (!token) return;
      await db.run(
        'INSERT INTO credentials (service, token, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(service) DO UPDATE SET token = excluded.token, updated_at = CURRENT_TIMESTAMP',
        [service, token]
      );
    };

    if (type === 'google_analytics') {
       await updateCred('ga_view_id', data.viewId);
       await updateCred('ga_credentials', JSON.stringify(data.credentials));
    } else if (type === 'meta_business') {
       await updateCred('meta_token', data.accessToken);
       await updateCred('meta_page_id', data.pageId);
    } else if (type === 'llm') {
       if (data.openai_key !== undefined) await updateCred('openai_key', data.openai_key);
       if (data.gemini_key !== undefined) await updateCred('gemini_key', data.gemini_key);
       if (data.claude_key !== undefined) await updateCred('claude_key', data.claude_key);
    } else if (type === 'automation') {
       if (data.auditTime !== undefined) await updateCred('audit_time', data.auditTime);
       if (data.auditUrls !== undefined) await updateCred('audit_urls', data.auditUrls);
    } else {
       // Fallback for old generic submission
       if (req.body.ga_id) await updateCred('ga_id', req.body.ga_id);
       if (req.body.meta_token) await updateCred('meta_token', req.body.meta_token);
       if (req.body.openai_key) await updateCred('openai_key', req.body.openai_key);
    }

    res.json({ message: 'Credentials updated successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET Brief by ID
router.get('/briefs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    const brief = await db.get('SELECT * FROM briefs WHERE id = ?', [id]);
    if (brief) {
      res.json(brief);
    } else {
      // Default templates
      let title = '';
      let description = '';
      let justification = '';
      if (id === 'lcp') {
        title = 'Brief: Resolver cuello de botella de LCP en inicio';
        description = 'La imagen principal del hero (hero-main-v4.jpg) se sirve actualmente sin comprimir con un tamaño de 2.4MB. Este recurso está bloqueando la ruta de renderizado principal, haciendo que el LCP (Renderizado de la Mayor Pintura de Contenido) se eleve a 3.2 segundos en conexiones móviles 4G.';
        justification = '"Mejorar el LCP por debajo de 2.5 segundos recuperará una tasa de rebote estimada del 8% que se pierde actualmente durante la carga inicial. Esto se correlaciona directamente con una mayor conversión en el embudo principal."';
      } else if (id === 'h1') {
        title = 'Brief: Añadir etiquetas H1 faltantes en Páginas de Productos';
        description = 'La plantilla \'product-v2\' depende de etiquetas H2 para renderizar el título, afectando la indexación. Se requiere cambiar la etiqueta contenedora del título a un H1 semántico único por página.';
        justification = '"Una estructura de encabezados correcta con un único H1 mejora drásticamente el SEO on-page y facilita el rastreo de palabras clave relevantes por los motores de búsqueda."';
      } else if (id === 'contrast') {
        title = 'Brief: Corregir Relación de Contraste en el Pie de Página';
        description = 'Los enlaces legales en el pie de página tienen una relación de contraste de 3.1:1, lo cual no cumple con las directrices de accesibilidad WCAG 2.1 AA (mínimo 4.5:1). Se requiere oscurecer/aclarar los textos para cumplir el estándar.';
        justification = '"Garantizar la accesibilidad web no solo evita penalizaciones legales y de reputación, sino que mejora la legibilidad para todos los usuarios y favorece el posicionamiento SEO."';
      }
      res.json({ id, title, description, justification });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST Save Brief
router.post('/briefs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, justification } = req.body;
    const db = await getDb();
    await db.run(
      `INSERT INTO briefs (id, title, description, justification, updated_at) 
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP) 
       ON CONFLICT(id) DO UPDATE SET 
         title = excluded.title, 
         description = excluded.description, 
         justification = excluded.justification,
         updated_at = CURRENT_TIMESTAMP`,
      [id, title, description, justification]
    );
    res.json({ message: 'Brief saved successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
