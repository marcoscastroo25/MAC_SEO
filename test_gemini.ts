import axios from 'axios';
import { getDb } from './src/database/sqlite';

async function testModel(modelName: string, apiKey: string) {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    const res = await axios.post(url, {
      contents: [
        { role: 'user', parts: [{ text: 'Hola, di "hola"' }] }
      ]
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(`✅ Model ${modelName} worked! Response:`, res.data?.candidates?.[0]?.content?.parts?.[0]?.text);
    return true;
  } catch (err: any) {
    console.log(`❌ Model ${modelName} failed. Error:`, err.response?.data || err.message);
    return false;
  }
}

async function main() {
  const db = await getDb();
  const row = await db.get('SELECT token FROM credentials WHERE service = "gemini_key"');
  if (!row || !row.token) {
    console.log('No Gemini key found in DB!');
    return;
  }
  const apiKey = row.token.trim();
  console.log('Using API Key:', apiKey.slice(0, 10) + '...');

  const models = [
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro',
    'gemini-2.0-flash',
    'gemini-2.5-flash',
    'gemini-pro'
  ];

  for (const model of models) {
    await testModel(model, apiKey);
  }
}

main();
