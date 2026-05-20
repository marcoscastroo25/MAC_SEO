import puppeteer from 'puppeteer';
import { getDb } from '../../database/sqlite';
import { config } from '../../config/env';

export interface PerformanceResult {
  url: string;
  timeToFirstByteMs: number;
  firstContentfulPaintMs: number;
  largestContentfulPaintMs: number;
  totalTimeMs: number;
  score: number;
  issues: string[];
}

export async function runPerformanceAudit(url: string): Promise<PerformanceResult> {
  console.log(`⏱️ Iniciando auditoría de rendimiento (Puppeteer) para: ${url}`);
  const issues: string[] = [];
  let score = 100;
  
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    
    // Simulate mobile viewport
    await page.setViewport({ width: 375, height: 812, isMobile: true });
    
    const startTime = Date.now();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    const totalTimeMs = Date.now() - startTime;
    
    // Extract Performance API metrics
    const perfData = await page.evaluate(() => {
      const timing = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      
      let fcp = 0;
      const fcpEntry = paint.find(p => p.name === 'first-contentful-paint');
      if (fcpEntry) fcp = fcpEntry.startTime;
      
      return {
        ttfb: timing.responseStart - timing.requestStart,
        fcp: fcp
      };
    });
    
    // Try to get LCP
    const lcp = await page.evaluate(async () => {
      return new Promise<number>((resolve) => {
        let lcpValue = 0;
        try {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            lcpValue = lastEntry.startTime;
          });
          observer.observe({ type: 'largest-contentful-paint', buffered: true });
        } catch(e) {
          // LCP not supported or failed
        }
        setTimeout(() => resolve(lcpValue), 1500); // Wait briefly for LCP
      });
    });

    const { ttfb, fcp } = perfData;
    
    // Scoring logic based on Google Core Web Vitals
    if (ttfb > 600) {
      issues.push(`Time-to-First-Byte (TTFB) muy lento: ${Math.round(ttfb)}ms`);
      score -= 15;
    }
    if (fcp > 1800) {
      issues.push(`First Contentful Paint (FCP) necesita mejora: ${Math.round(fcp)}ms`);
      score -= 20;
    }
    if (lcp > 2500) {
      issues.push(`Largest Contentful Paint (LCP) pobre: ${Math.round(lcp)}ms`);
      score -= 25;
    }
    if (totalTimeMs > config.thresholds.performanceMs) {
      issues.push(`Tiempo total de carga excedió umbral: ${totalTimeMs}ms`);
      score -= 10;
    }

    score = Math.max(0, Math.round(score));

    const result: PerformanceResult = {
      url,
      timeToFirstByteMs: Math.round(ttfb || 0),
      firstContentfulPaintMs: Math.round(fcp || 0),
      largestContentfulPaintMs: Math.round(lcp || 0),
      totalTimeMs,
      score,
      issues
    };

    const db = await getDb();
    await db.run(
      'INSERT INTO web_performance (score, metrics) VALUES (?, ?)',
      [score, JSON.stringify(result)]
    );

    console.log(`✅ Rendimiento (Puppeteer) completado. Score: ${score}/100, FCP: ${Math.round(fcp)}ms`);
    return result;

  } catch (error: any) {
    console.error(`❌ Error al auditar rendimiento en ${url}:`, error.message);
    throw new Error(`Failed to audit performance for ${url}: ${error.message}`);
  } finally {
    await browser.close();
  }
}
