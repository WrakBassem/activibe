import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const LOG_FILE = 'gemini_test_log.txt';
function log(msg) {
  console.log(msg);
  fs.appendFileSync(LOG_FILE, msg + '\n');
}

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  log('❌ GEMINI_API_KEY not found in .env');
  process.exit(1);
}

fs.writeFileSync(LOG_FILE, '--- GEMINI MODEL LIST TEST ---\n');

async function listModels() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  
  try {
    log(`Fetching models from: ${url.replace(apiKey, 'API_KEY')}...`);
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) {
      log(`❌ API Error: ${JSON.stringify(data.error, null, 2)}`);
      return;
    }
    
    if (!data.models || data.models.length === 0) {
      log('⚠️ No models found in response.');
      log(JSON.stringify(data, null, 2));
      return;
    }

    log(`✅ Found ${data.models.length} models:`);
    const modelNames = data.models.map(m => m.name.replace('models/', ''));
    log(modelNames.join('\n'));
    
    // Try generating with the first available generateContent model
    const genModel = data.models.find(m => m.supportedGenerationMethods?.includes('generateContent'));
    if (genModel) {
      const modelName = genModel.name.replace('models/', '');
      log(`\nTesting generation with first available model: ${modelName}...`);
      
      const genUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      const genRes = await fetch(genUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: "Hello" }] }] })
      });
      const genData = await genRes.json();
      
      if (genData.error) {
         log(`❌ Generation failed: ${JSON.stringify(genData.error, null, 2)}`);
      } else {
         log(`✅ Generation success! Response: ${JSON.stringify(genData.candidates?.[0]?.content?.parts?.[0]?.text)}`);
      }
    }

  } catch (error) {
    log(`❌ Network/Fetch Error: ${error.message}`);
  }
}

listModels();
