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
      // Usar modelos actuales con la API estable v1
      const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash-001'];
      let lastError = null;
      for (const model of modelsToTry) {
        try {
          const fullPrompt = `${systemPrompt}\n\n${prompt}`;
          const res = await axios.post(`https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${config.apiKey}`, {
            contents: [
              { role: 'user', parts: [{ text: fullPrompt }] }
            ]
          }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 30000
          });
          if (res.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
            return res.data.candidates[0].content.parts[0].text;
          }
          // Si no hay texto en la respuesta, log y probar siguiente
          console.warn(`⚠️ Modelo ${model}: respuesta sin contenido de texto. Probando el siguiente...`);
        } catch (err: any) {
          lastError = err;
          const errMsg = err.response?.data?.error?.message || err.message;
          console.warn(`⚠️ Intento fallido con modelo Gemini: ${model}. Error: ${errMsg}. Probando el siguiente...`);
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

function cleanJsonString(str: string): string {
  return str.replace(/```json/g, '').replace(/```/g, '').trim();
}

// Autodetecta el nicho y palabras clave a partir del texto de la web del usuario
export async function autodetectNicheAndKeywords(url: string, pageText: string): Promise<{ niche: string; keywords: string[]; reasoning: string }> {
  const prompt = `
Analiza el siguiente extracto de contenido textual del sitio web "${url}" y determina:
1. El nicho o giro exacto del negocio (ej. "Seguridad Electrónica", "Clínica Dental").
2. Una lista de hasta 6 palabras clave recomendadas de alto volumen/intención de compra para rankear #1 en motores de búsqueda, con foco específico en Panamá.
3. Un razonamiento breve sobre por qué elegiste este nicho y palabras clave.

Texto extraído de la web:
${pageText.substring(0, 4000)}

Responde ESTRICTAMENTE con un objeto JSON válido con la siguiente estructura (no agregues texto fuera del JSON, sin Markdown code blocks):
{
  "niche": "Nombre del nicho",
  "keywords": ["keyword 1", "keyword 2", ...],
  "reasoning": "Razón del análisis en español..."
}
`;
  try {
    const rawRes = await askLLM(prompt, "Eres un consultor experto en SEO y marketing digital en Panamá.");
    const cleanStr = cleanJsonString(rawRes);
    return JSON.parse(cleanStr);
  } catch (err: any) {
    console.error('Error autodetectando nicho:', err.message);
    return {
      niche: "Seguridad Electrónica",
      keywords: ["seguridad electrónica", "cámaras de seguridad", "monitoreo de alarmas", "brazos para portones", "cercas eléctricas"],
      reasoning: "Se utilizaron las palabras clave por defecto debido a un problema con el análisis del contenido."
    };
  }
}

// Sugiere competidores en base al nicho y palabras clave
export async function detectCompetitorsInNiche(niche: string, keywords: string[], country: string = "Panamá"): Promise<{ name: string; url: string }[]> {
  const prompt = `
Basándote en el nicho de negocio "${niche}" y las palabras clave objetivo [${keywords.join(', ')}], identifica 3 empresas reales o representativas que sean competidores directos en Internet en el territorio de "${country}".
Proporciona el nombre de la empresa y su URL aproximada.

Responde ESTRICTAMENTE con una lista en formato JSON (sin texto adicional, sin Markdown code blocks) con esta estructura:
[
  { "name": "Nombre Competidor 1", "url": "https://competidor1.com" },
  { "name": "Nombre Competidor 2", "url": "https://competidor2.com" }
]
`;
  try {
    const rawRes = await askLLM(prompt, "Eres un analista de mercado experto en posicionamiento competitivo.");
    const cleanStr = cleanJsonString(rawRes);
    return JSON.parse(cleanStr);
  } catch (err: any) {
    console.error('Error sugiriendo competidores:', err.message);
    return [
      { name: "Seguridad Segura Panamá", url: "https://www.seguridadsegura.com" },
      { name: "Cámaras y Alarmas del Istmo", url: "https://www.alarmasdelistmo.com" }
    ];
  }
}

// Genera informe de brechas y plan táctico para superar competidores
export async function generateCompetitorComparisonStrategy(
  userUrl: string,
  userSeoScore: number,
  userPerfScore: number,
  userIssues: string[],
  competitors: any[],
  country: string = "Panamá",
  keywords: string[] = []
): Promise<string> {
  const prompt = `
Realiza un análisis comparativo en profundidad ("Gap Analysis") entre el sitio web principal y sus competidores en el mercado de "${country}" para las palabras clave de nicho: [${keywords.join(', ')}].

Datos de Nuestro Sitio Web (${userUrl}):
- Puntaje SEO Técnico: ${userSeoScore}/100
- Puntaje de Rendimiento: ${userPerfScore}/100
- Problemas técnicos detectados: ${userIssues.join(', ') || 'Ninguno'}

Competidores analizados:
${competitors.map((c, i) => `
Competidor #${i+1}: ${c.name} (${c.url})
- Puntaje SEO: ${c.seo_score || 'Sin evaluar'}/100
- Puntaje Rendimiento: ${c.performance_score || 'Sin evaluar'}/100
- Detalles técnicos: ${JSON.stringify(c.details || {})}
`).join('\n')}

Genera una estrategia SEO táctica redactada en español formal en formato Markdown con las siguientes secciones:
1. **Resumen de la Competencia**: Breve diagnóstico de la situación actual frente a los rivales del nicho.
2. **Análisis de Brechas (Gaps)**: Qué fallas técnicas o de contenido tienen tus competidores que puedes explotar (ej. si no usan HTTPS, tienen peor rendimiento, o carecen de keywords clave).
3. **Estrategia de Palabras Clave de Competidores**: Lista de palabras clave que tus competidores están aprovechando o de las cuales carecen.
4. **Plan de Acción para ser el #1**: Pasos exactos y prioritarios para que nuestro sitio web domine las búsquedas en Google en ${country} para keywords como "${keywords.join(', ')}".
`;
  return await askLLM(prompt, "Eres un estratega de posicionamiento SEO especializado en superar competencia directa.");
}
