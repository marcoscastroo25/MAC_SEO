import axios from 'axios';
import { getDb } from '../database/sqlite';

export type LLMProvider = 'gemini' | 'openai' | 'claude';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
}

export async function getActiveLLMConfig(): Promise<LLMConfig | null> {
  const db = await getDb();
  const rows = await db.all('SELECT service, token FROM credentials WHERE token IS NOT NULL AND token != ""');
  const creds: Record<string, string> = {};
  rows.forEach(r => creds[r.service] = r.token);

  // Prioritize Gemini, then OpenAI, then Claude
  if (creds.gemini_key) return { provider: 'gemini', apiKey: creds.gemini_key };
  if (creds.openai_key) return { provider: 'openai', apiKey: creds.openai_key };
  if (creds.claude_key) return { provider: 'claude', apiKey: creds.claude_key };
  
  return null;
}

export async function askLLM(prompt: string, systemPrompt: string = 'Eres un experto en Marketing Digital y SEO técnico.'): Promise<string> {
  const config = await getActiveLLMConfig();
  if (!config) {
    throw new Error('No hay una API Key configurada. Por favor, añade la key de Gemini, OpenAI o Claude en la configuración.');
  }

  try {
    if (config.provider === 'openai') {
      const res = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-4o-mini', // Or gpt-4o
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ]
      }, {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      return res.data.choices[0].message.content;
    }

    if (config.provider === 'gemini') {
      const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
      let lastError = null;
      for (const model of modelsToTry) {
        try {
          const res = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`, {
            systemInstruction: {
              parts: [{ text: systemPrompt }]
            },
            contents: [
              { role: 'user', parts: [{ text: prompt }] }
            ]
          }, {
            headers: { 'Content-Type': 'application/json' }
          });
          if (res.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
            return res.data.candidates[0].content.parts[0].text;
          }
        } catch (err: any) {
          lastError = err;
          console.warn(`⚠️ Intento fallido con modelo Gemini: ${model}. Probando el siguiente...`);
        }
      }
      throw lastError || new Error('No se pudo comunicar con ningún modelo de Gemini.');
    }

    if (config.provider === 'claude') {
      const res = await axios.post('https://api.anthropic.com/v1/messages', {
        model: 'claude-3-haiku-20240307',
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1024
      }, {
        headers: {
          'x-api-key': config.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        }
      });
      return res.data.content[0].text;
    }
  } catch (error: any) {
    console.error(`❌ LLM API Error (${config.provider}):`, error.response?.data || error.message);
    throw new Error(`Error al comunicarse con ${config.provider}`);
  }

  return '';
}

// Genera Insights ("Quick Wins") a partir de una auditoría
export async function generateInsightsFromAudit(seoIssues: string[], perfIssues: string[]): Promise<string> {
  const prompt = `
Por favor, analiza los siguientes problemas técnicos encontrados en la web y proporciona 3 a 5 "Quick Wins" (acciones rápidas y de alto impacto) para mejorar el SEO y el rendimiento.
Responde en formato Markdown, con un tono profesional, claro y directo.

Problemas SEO:
${seoIssues.length ? seoIssues.map(i => '- ' + i).join('\n') : 'Ninguno detectado'}

Problemas de Rendimiento:
${perfIssues.length ? perfIssues.map(i => '- ' + i).join('\n') : 'Ninguno detectado'}
`;
  return await askLLM(prompt);
}
