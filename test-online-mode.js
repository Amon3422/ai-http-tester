#!/usr/bin/env node

/**
 * Test script to verify online mode with .env API key fallback
 */

const axios = require('axios');

async function testOnlineMode() {
    console.log('🧪 Testing Online Mode with .env API Key Fallback\n');
    
    try {
        // Test 1: Smart model (without providing API key - should use .env)
        console.log('Test 1: Testing smart model (llama-3.3-70b-versatile)...');
        const smartResponse = await axios.post('http://localhost:3000/api/ai-test', {
            endpoint: 'https://api.groq.com/openai/v1/chat/completions',
            model: 'llama-3.3-70b-versatile',
            type: 'smart'
            // No apiKey provided - should fallback to .env
        });
        
        console.log('✅ Smart model test passed:');
        console.log(`   Response: ${smartResponse.data.message}`);
        console.log();
        
        // Test 2: Fast model (without providing API key - should use .env)
        console.log('Test 2: Testing fast model (llama-3.1-8b-instant)...');
        const fastResponse = await axios.post('http://localhost:3000/api/ai-test', {
            endpoint: 'https://api.groq.com/openai/v1/chat/completions',
            model: 'llama-3.1-8b-instant',
            type: 'fast'
            // No apiKey provided - should fallback to .env
        });
        
        console.log('✅ Fast model test passed:');
        console.log(`   Response: ${fastResponse.data.message}`);
        console.log();
        
        console.log('🎉 All tests passed! .env API key fallback is working correctly.');
        
    } catch (error) {
        console.error('❌ Test failed:');
        if (error.response) {
            console.error(`   Status: ${error.response.status}`);
            console.error(`   Error: ${error.response.data.error}`);
            console.error(`   Message: ${error.response.data.message}`);
        } else {
            console.error(`   ${error.message}`);
        }
        process.exit(1);
    }
}

// Run test
testOnlineMode();
