#!/usr/bin/env node

/**
 * Ollama Diagnostics Script
 * Checks if Ollama is running and which models are available
 */

const axios = require('axios');

const OLLAMA_BASE = 'http://localhost:11434';
const REQUIRED_MODELS = [
    { name: 'deepseek-r1:7b', alt: 'deepseek-r1:8b', purpose: 'Smart Model (Discovery)', vram: '~3.5-4GB' },
    { name: 'deepseek-r1:1.5b', alt: null, purpose: 'Fast Model (Analysis)', vram: '~1.5GB' }
];

console.log('\n╔═══════════════════════════════════════╗');
console.log('║  🔍 Ollama Diagnostics               ║');
console.log('╚═══════════════════════════════════════╝\n');

async function checkOllamaRunning() {
    console.log('1️⃣  Checking if Ollama is running...');
    try {
        const response = await axios.get(`${OLLAMA_BASE}/api/version`, { timeout: 3000 });
        console.log('   ✅ Ollama is running');
        console.log(`   📦 Version: ${response.data.version || 'unknown'}\n`);
        return true;
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.log('   ❌ Ollama is NOT running');
            console.log('   💡 Start it with: ollama serve\n');
            return false;
        }
        console.log(`   ⚠️  Error: ${error.message}\n`);
        return false;
    }
}

async function listModels() {
    console.log('2️⃣  Checking installed models...');
    try {
        const response = await axios.get(`${OLLAMA_BASE}/api/tags`, { timeout: 5000 });
        const models = response.data.models || [];
        
        if (models.length === 0) {
            console.log('   ⚠️  No models installed\n');
            return [];
        }
        
        console.log(`   📊 Found ${models.length} model(s):\n`);
        models.forEach(model => {
            const sizeGB = (model.size / 1024 / 1024 / 1024).toFixed(2);
            console.log(`   • ${model.name}`);
            console.log(`     Size: ${sizeGB} GB`);
            console.log(`     Modified: ${new Date(model.modified_at).toLocaleString()}`);
        });
        console.log('');
        
        return models.map(m => m.name);
    } catch (error) {
        console.log(`   ❌ Failed to list models: ${error.message}\n`);
        return [];
    }
}

async function checkRequiredModels(installedModels) {
    console.log('3️⃣  Checking required models for AI HTTP Tester...\n');
    
    const missing = [];
    
    for (const required of REQUIRED_MODELS) {
        // Check if primary or alternate model is installed
        const primaryFound = installedModels.some(m => m === required.name || m.startsWith(required.name + ':'));
        const altFound = required.alt ? installedModels.some(m => m === required.alt || m.startsWith(required.alt + ':')) : false;
        
        if (primaryFound || altFound) {
            const foundModel = primaryFound ? required.name : required.alt;
            console.log(`   ✅ ${foundModel} - ${required.purpose}`);
            console.log(`      VRAM: ${required.vram}`);
        } else {
            console.log(`   ❌ ${required.name} ${required.alt ? `or ${required.alt}` : ''} - Not installed`);
            console.log(`      Purpose: ${required.purpose}`);
            console.log(`      VRAM: ${required.vram}`);
            missing.push(required);
        }
    }
    
    console.log('');
    return missing;
}

async function testOpenAICompatibility(installedModels) {
    console.log('4️⃣  Testing OpenAI-compatible API endpoint...');
    
    // Find the first available required model
    let testModel = null;
    for (const required of REQUIRED_MODELS) {
        const primaryFound = installedModels.some(m => m === required.name);
        const altFound = required.alt ? installedModels.some(m => m === required.alt) : false;
        
        if (primaryFound) {
            testModel = required.name;
            break;
        } else if (altFound) {
            testModel = required.alt;
            break;
        }
    }
    
    if (!testModel) {
        console.log('   ⚠️  No required models installed to test\n');
        return false;
    }
    
    try {
        const response = await axios.post(
            `${OLLAMA_BASE}/v1/chat/completions`,
            {
                model: testModel,
                messages: [{ role: 'user', content: 'Hi' }],
                max_tokens: 5
            },
            { 
                timeout: 15000,
                headers: { 'Content-Type': 'application/json' }
            }
        );
        
        if (response.data.choices && response.data.choices[0]) {
            console.log(`   ✅ OpenAI-compatible endpoint working (tested with ${testModel})`);
            console.log(`   📝 Response: ${response.data.choices[0].message.content}\n`);
            return true;
        }
        return false;
    } catch (error) {
        if (error.response?.status === 404) {
            console.log(`   ❌ Model ${testModel} not found in Ollama`);
            console.log(`   💡 Pull it with: ollama pull ${testModel}\n`);
        } else {
            console.log(`   ❌ API test failed: ${error.message}\n`);
        }
        return false;
    }
}

async function runDiagnostics() {
    const isRunning = await checkOllamaRunning();
    
    if (!isRunning) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('❌ Ollama is not running!');
        console.log('\n📋 To fix:');
        console.log('   1. Open a new terminal');
        console.log('   2. Run: ollama serve');
        console.log('   3. Run this diagnostic script again\n');
        process.exit(1);
    }
    
    const installedModels = await listModels();
    const missing = await checkRequiredModels(installedModels);
    
    if (missing.length > 0) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('⚠️  Missing required models!');
        console.log('\n📋 To install missing models (choose one of each):');
        missing.forEach(model => {
            if (model.alt) {
                console.log(`   ollama pull ${model.name}  # ${model.purpose} (${model.vram})`);
                console.log(`   OR`);
                console.log(`   ollama pull ${model.alt}  # Alternative (slightly larger)`);
            } else {
                console.log(`   ollama pull ${model.name}  # ${model.purpose} (${model.vram})`);
            }
        });
        console.log('\n💡 This will download the models (may take a few minutes)\n');
    }
    
    // Only test API if at least one required model is installed
    if (missing.length < REQUIRED_MODELS.length) {
        await testOpenAICompatibility(installedModels);
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (missing.length === 0) {
        console.log('🎉 All checks passed! Ready to use AI HTTP Tester');
        console.log('\n📚 Next steps:');
        console.log('   1. Run: node server.js');
        console.log('   2. Open: http://localhost:3000');
        console.log('   3. Click ⚙️ Configuration and test connection\n');
        process.exit(0);
    } else {
        console.log('⚠️  Please install missing models before starting');
        console.log('\n📚 After installing models:');
        console.log('   1. Run this diagnostic again to verify');
        console.log('   2. Then run: node server.js\n');
        process.exit(1);
    }
}

// Run diagnostics
runDiagnostics().catch(error => {
    console.error('\n❌ Diagnostic failed:', error.message);
    process.exit(1);
});
