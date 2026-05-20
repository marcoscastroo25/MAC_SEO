import dotenv from 'dotenv';
import path from 'path';

// Load .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  schedule: {
    web: process.env.SCHEDULE_WEB || '0 3 * * *',
    social: process.env.SCHEDULE_SOCIAL || '0 4 * * 1',
    report: process.env.SCHEDULE_REPORT || '0 6 1 * *',
  },
  
  thresholds: {
    performanceMs: parseInt(process.env.THRESHOLD_PERFORMANCE_MS || '3000', 10),
    seoScore: parseInt(process.env.THRESHOLD_SEO_SCORE || '70', 10),
    engagement: parseFloat(process.env.THRESHOLD_ENGAGEMENT || '2.5'),
  },
  
  apiKeys: {
    pagespeed: process.env.GOOGLE_PAGESPEED_API_KEY,
    analyticsViewId: process.env.GOOGLE_ANALYTICS_VIEW_ID,
    metaAccessToken: process.env.META_ACCESS_TOKEN,
    igBusinessId: process.env.META_IG_BUSINESS_ID,
    fbPageId: process.env.META_FB_PAGE_ID,
  }
};
