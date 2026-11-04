import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import { getDb } from '../../database/sqlite';

export interface SeoAuditResult {
  url: string;
  title: string;
  description: string;
  h1Count: number;
  h2Count: number;
  imagesWithoutAlt: number;
  totalImages: number;
  score: number;
  issues: string[];
  sslActive: boolean;
  securityHeaders: {
    hsts: boolean;
    csp: boolean;
    xfo: boolean;
    xcto: boolean;
  };
  securityScore: number;
  securityIssues: string[];
  keywordsFound: string[];
  localSeoScore: number;
}

export async function runSeoAudit(url: string): Promise<SeoAuditResult> {
  console.log(`🔍 Iniciando auditoría SEO (Puppeteer) para: ${url}`);
  const issues: string[] = [];
  let score = 100;

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    const response = await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Get headers
    const headers = response ? response.headers() : {};
    
    // Get fully rendered HTML
    const html = await page.content();
    const $ = cheerio.load(html);

    const title = $('title').text().trim();
    if (!title) {
      issues.push('Falta la etiqueta <title>');
      score -= 20;
    } else if (title.length < 10 || title.length > 70) {
      issues.push(`La longitud del título (${title.length} chars) no es óptima (recomendado 10-70)`);
      score -= 5;
    }

    const description = $('meta[name="description"]').attr('content') || '';
    if (!description) {
      issues.push('Falta la etiqueta <meta name="description">');
      score -= 15;
    } else if (description.length < 50 || description.length > 160) {
      issues.push(`La longitud de la descripción (${description.length} chars) no es óptima (recomendado 50-160)`);
      score -= 5;
    }

    const h1Count = $('h1').length;
    if (h1Count === 0) {
      issues.push('No se encontró ninguna etiqueta <h1>');
      score -= 15;
    } else if (h1Count > 1) {
      issues.push('Se encontró más de una etiqueta <h1>');
      score -= 5;
    }

    const h2Count = $('h2').length;
    
    let imagesWithoutAlt = 0;
    const totalImages = $('img').length;
    $('img').each((_, el) => {
      const alt = $(el).attr('alt');
      if (!alt || alt.trim() === '') {
        imagesWithoutAlt++;
      }
    });

    if (imagesWithoutAlt > 0) {
      issues.push(`Falta el atributo alt en ${imagesWithoutAlt} de ${totalImages} imágenes`);
      score -= Math.round((imagesWithoutAlt / totalImages) * 20); 
    }

    // Normalizar score
    score = Math.max(0, Math.round(score));

    // --- SECURITY CHECKS ---
    const securityIssues: string[] = [];
    let securityScore = 100;
    
    const sslActive = url.toLowerCase().startsWith('https');
    if (!sslActive) {
      securityIssues.push('El sitio web no está utilizando HTTPS (conexión no encriptada).');
      securityScore -= 40;
    }

    const hsts = !!(headers['strict-transport-security']);
    const csp = !!(headers['content-security-policy']);
    const xfo = !!(headers['x-frame-options']);
    const xcto = !!(headers['x-content-type-options']);

    if (!hsts) {
      securityIssues.push('Falta la cabecera Strict-Transport-Security (HSTS).');
      securityScore -= 15;
    }
    if (!csp) {
      securityIssues.push('Falta la cabecera Content-Security-Policy (CSP).');
      securityScore -= 15;
    }
    if (!xfo) {
      securityIssues.push('Falta la cabecera X-Frame-Options (protección contra clickjacking).');
      securityScore -= 15;
    }
    if (!xcto) {
      securityIssues.push('Falta la cabecera X-Content-Type-Options (protección contra MIME-sniffing).');
      securityScore -= 15;
    }

    securityScore = Math.max(0, securityScore);

    // --- LOCAL SEO KEYWORD CHECKS ---
    const db = await getDb();
    const keywordsRow = await db.get('SELECT token FROM credentials WHERE service = "niche_keywords"');
    const keywordsList: string[] = keywordsRow && keywordsRow.token 
      ? keywordsRow.token.split(',').map((k: string) => k.trim().toLowerCase()).filter(Boolean)
      : ["seguridad electrónica", "cámaras", "monitoreo web", "brazo cerco eléctricos"]; // Defaults

    const pageText = $('body').text().toLowerCase();
    const keywordsFound = keywordsList.filter((kw: string) => pageText.includes(kw));
    
    const localSeoScore = keywordsList.length > 0 
      ? Math.round((keywordsFound.length / keywordsList.length) * 100) 
      : 100;

    const result: SeoAuditResult = {
      url,
      title,
      description,
      h1Count,
      h2Count,
      imagesWithoutAlt,
      totalImages,
      score,
      issues,
      sslActive,
      securityHeaders: { hsts, csp, xfo, xcto },
      securityScore,
      securityIssues,
      keywordsFound,
      localSeoScore
    };

    // Save to Database
    await db.run(
      'INSERT INTO seo_audit (score, findings) VALUES (?, ?)',
      [score, JSON.stringify(result)]
    );

    console.log(`✅ Auditoría SEO completada. Score: ${score}/100. Seguridad: ${securityScore}/100. SEO Local: ${localSeoScore}/100`);
    return result;

  } catch (error: any) {
    console.error(`❌ Error al auditar SEO en ${url}:`, error.message);
    throw new Error(`Failed to audit ${url}: ${error.message}`);
  } finally {
    await browser.close();
  }
}
