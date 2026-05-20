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
}

export async function runSeoAudit(url: string): Promise<SeoAuditResult> {
  console.log(`🔍 Iniciando auditoría SEO (Puppeteer) para: ${url}`);
  const issues: string[] = [];
  let score = 100;

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
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
      score -= (imagesWithoutAlt / totalImages) * 20; 
    }

    // Normalizar score
    score = Math.max(0, Math.round(score));

    const result: SeoAuditResult = {
      url,
      title,
      description,
      h1Count,
      h2Count,
      imagesWithoutAlt,
      totalImages,
      score,
      issues
    };

    // Save to Database
    const db = await getDb();
    await db.run(
      'INSERT INTO seo_audit (score, findings) VALUES (?, ?)',
      [score, JSON.stringify(result)]
    );

    console.log(`✅ Auditoría SEO completada. Score: ${score}/100`);
    return result;

  } catch (error: any) {
    console.error(`❌ Error al auditar SEO en ${url}:`, error.message);
    throw new Error(`Failed to audit ${url}: ${error.message}`);
  } finally {
    await browser.close();
  }
}
