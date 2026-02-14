const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

/**
 * ═══════════════════════════════════════════════════════════════
 * AI HTTP TESTER - DUAL-MODEL ARCHITECTURE
 * ═══════════════════════════════════════════════════════════════
 * 
 * This backend implements a specialized dual-model system optimized
 * for security testing workflows:
 * 
 * 🧠 SMART MODEL (e.g., deepseek-r1:8b)
 *    Purpose: Discovery & Weaponization
 *    - Finding injection points
 *    - Generating attack payloads
 *    - Complex security analysis
 *    Temperature: 0.6 (creative payload generation)
 *    VRAM: ~4GB
 * 
 * ⚡ FAST MODEL (e.g., deepseek-r1:1.5b)
 *    Purpose: Response Analysis & Triage
 *    - Quick vulnerability verdicts
 *    - Evidence extraction
 *    - Pattern matching
 *    Temperature: 0.1 (precise, deterministic)
 *    VRAM: ~1.5GB
 * 
 * KEY FEATURES:
 * - Automatic model selection based on prompt keywords
 * - Specialized system prompts for each task
 * - DeepSeek-R1 <think> tag stripping
 * - VRAM management with keep_alive: "1m"
 * - JSON repair and extraction logic
 * 
 * COMPATIBILITY:
 * - Ollama (recommended for local deployment)
 * - LM Studio, LocalAI
 * - Any OpenAI-compatible API endpoint
 * 
 * See DUAL_MODEL_GUIDE.md for complete documentation
 * ═══════════════════════════════════════════════════════════════
 */

const app = express();
const PORT = 3000;

// Default configuration (can be overridden by client)
const DEFAULT_CONFIG = {
    endpoint: 'http://localhost:11434/v1/chat/completions',
    model: 'deepseek-r1:7b'  // 7b is optimal for RTX 3050 4GB
};

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.text({ limit: '10mb' }));

// Serve static files (frontend)
app.use(express.static(__dirname));

// Serve index.html at root (important for Vercel)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Explicitly serve CSS with correct MIME type
app.get('/style.css', (req, res) => {
    res.contentType('text/css');
    res.sendFile(path.join(__dirname, 'style.css'));
});

// Explicitly serve JavaScript with correct MIME type
app.get('/script.js', (req, res) => {
    res.contentType('application/javascript');
    res.sendFile(path.join(__dirname, 'script.js'));
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'AI HTTP Tester Backend Running' });
});

// Proxy endpoint to send HTTP requests
app.post('/api/send-request', async (req, res) => {
    try {
        const { method, url, headers, body } = req.body;
        
        console.log(`\n[${new Date().toISOString()}] ${method} ${url}`);
        console.log('Headers:', JSON.stringify(headers, null, 2));
        console.log('Body:', body ? body.substring(0, 100) : '(empty)');

        // Remove Content-Length header - let Axios calculate it automatically
        // This is crucial when payloads change the body size
        const cleanHeaders = { ...headers };
        delete cleanHeaders['Content-Length'];
        delete cleanHeaders['content-length'];
        
        if (body && (headers['Content-Length'] || headers['content-length'])) {
            console.log(`[!] Removed Content-Length header. Axios will calculate: ${Buffer.byteLength(body, 'utf8')} bytes`);
        }

        // Prepare axios request config
        const config = {
            method: method.toLowerCase(),
            url: url,
            headers: cleanHeaders,
            validateStatus: () => true, // Accept any status code
            maxRedirects: 5,
            timeout: 30000 // 30 second timeout
        };

        // Add body for non-GET/HEAD requests
        if (body && method !== 'GET' && method !== 'HEAD') {
            config.data = body;
        }

        // Make the request
        const startTime = Date.now();
        const response = await axios(config);
        const endTime = Date.now();

        // Calculate response size
        const responseBody = typeof response.data === 'string' 
            ? response.data 
            : JSON.stringify(response.data);
        
        const responseSize = Buffer.byteLength(responseBody, 'utf8');

        // Return response details
        res.json({
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            body: responseBody,
            time: endTime - startTime,
            size: responseSize
        });

    } catch (error) {
        console.error('Request error:', error.message);
        
        // Handle different error types
        if (error.code === 'ENOTFOUND') {
            return res.status(400).json({
                error: 'Host not found',
                message: `Could not resolve hostname: ${error.hostname}`,
                details: 'Check if the URL is correct'
            });
        }
        
        if (error.code === 'ECONNREFUSED') {
            return res.status(400).json({
                error: 'Connection refused',
                message: 'Target server refused the connection',
                details: 'Server may be down or blocking connections'
            });
        }

        if (error.code === 'ETIMEDOUT') {
            return res.status(408).json({
                error: 'Request timeout',
                message: 'Request took too long to complete',
                details: 'Server may be slow or unresponsive'
            });
        }

        // Generic error
        res.status(500).json({
            error: 'Request failed',
            message: error.message,
            details: error.code || 'Unknown error'
        });
    }
});

// Helper function to extract and clean JSON from AI responses
function extractAndCleanJSON(text) {
    // CRITICAL: Remove DeepSeek-R1 thinking tags first
    // DeepSeek-R1 outputs reasoning in <think>...</think> tags
    let cleanedText = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    
    // Remove markdown code block markers (```json or ```)
    cleanedText = cleanedText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
    
    // First try to extract from markdown blocks (if any remain)
    const jsonMatch = cleanedText.match(/```json\s*([\s\S]*?)```/) || cleanedText.match(/```\s*([\s\S]*?)```/);
    let jsonString = jsonMatch ? jsonMatch[1].trim() : cleanedText.trim();
    
    // If no markdown blocks, try to find JSON object
    if (!jsonMatch && !jsonString.startsWith('{')) {
        // Try to find a JSON object in the text
        const objectMatch = cleanedText.match(/\{[\s\S]*\}/);
        if (objectMatch) {
            jsonString = objectMatch[0];
        }
    }
    
    // Remove common AI prefixes like "json" or "```" that might slip through
    jsonString = jsonString.replace(/^(json|```json?)\s*/i, '');
    jsonString = jsonString.replace(/```\s*$/i, '');
    
    // Additional cleaning: remove any text before the first {
    const firstBrace = jsonString.indexOf('{');
    if (firstBrace > 0) {
        console.log('[AI] Removing text before JSON object:', jsonString.substring(0, firstBrace));
        jsonString = jsonString.substring(firstBrace);
    }
    
    // Remove any text after the last }
    const lastBrace = jsonString.lastIndexOf('}');
    if (lastBrace !== -1 && lastBrace < jsonString.length - 1) {
        console.log('[AI] Removing text after JSON object');
        jsonString = jsonString.substring(0, lastBrace + 1);
    }
    
    return jsonString.trim();
}

// Helper function to attempt JSON repair
function attemptJSONRepair(jsonString, originalError) {
    console.log('[AI] Attempting JSON repair...');
    
    let workingString = jsonString;
    
    // ALWAYS FIRST: Remove invalid \' escape sequences
    // Single quotes don't need escaping in JSON strings (which use double quotes)
    const hasInvalidEscapes = workingString.includes("\\'");
    if (hasInvalidEscapes) {
        console.log("[AI] Removing invalid \\' escape sequences...");
        workingString = workingString.replace(/\\'/g, "'");
        console.log('[AI] Cleaned up escape sequences');
    }
    
    // Strategy 0.5: Fix problematic inline examples causing quote issues
    // Example: "reason": "Parameter: POST /url?x=alert('test')" breaks parsing
    if (originalError.message.includes("Unexpected token '") || 
        originalError.message.includes("Unexpected string")) {
        console.log('[AI] Detected quote/string issues, cleaning problematic patterns...');
        
        // Find and clean strings that contain HTTP methods with quotes/params
        // Pattern: "key": "text (POST|GET) /path?x=value('...')" 
        workingString = workingString.replace(
            /"([^"]*?)"\s*:\s*"([^"]*?)(POST|GET|PUT|DELETE|PATCH)[^"]*?\([^)]*?\)[^"]*?"/gi,
            (match, key, prefix, method) => {
                // Simplify to remove the problematic part
                return `"${key}": "${prefix}${method} request parameter"`;
            }
        );
        
        console.log('[AI] Cleaned inline HTTP examples from strings');
    }
    
    // Try parsing the cleaned version
    try {
        const parsed = JSON.parse(workingString);
        console.log('[AI] ✓ Successfully parsed after cleanup');
        return { 
            success: true, 
            data: parsed, 
            warning: hasInvalidEscapes || originalError.message.includes("Unexpected token '") 
                ? 'Response was auto-repaired due to formatting issues.' 
                : undefined 
        };
    } catch (e) {
        console.log('[AI] ✗ Still invalid after cleanup:', e.message);
    }
    
    // Strategy 1: Fix truncated JSON by closing brackets/braces
    if (workingString.includes('"payloads": [') || workingString.includes('"evidence": [')) {
        console.log('[AI] Attempting to fix truncated JSON...');
        const openBraces = (workingString.match(/{/g) || []).length;
        const closeBraces = (workingString.match(/}/g) || []).length;
        const openBrackets = (workingString.match(/\[/g) || []).length;
        const closeBrackets = (workingString.match(/\]/g) || []).length;
        
        let repaired = workingString;
        
        // Close arrays
        for (let i = 0; i < (openBrackets - closeBrackets); i++) {
            repaired += ']';
        }
        // Close objects
        for (let i = 0; i < (openBraces - closeBraces); i++) {
            repaired += '}';
        }
        
        try {
            const parsed = JSON.parse(repaired);
            console.log('[AI] ✓ Successfully repaired truncated JSON');
            return { success: true, data: parsed, warning: 'Response was truncated but repaired. Some data may be incomplete.' };
        } catch (e) {
            console.log('[AI] ✗ Truncation repair failed:', e.message);
        }
    }
    
    // Strategy 2: Try to extract just the first complete JSON object
    console.log('[AI] Attempting to extract first complete JSON object...');
    try {
        const firstBrace = workingString.indexOf('{');
        if (firstBrace !== -1) {
            let braceCount = 0;
            let endIndex = -1;
            
            for (let i = firstBrace; i < workingString.length; i++) {
                if (workingString[i] === '{') braceCount++;
                if (workingString[i] === '}') braceCount--;
                
                if (braceCount === 0) {
                    endIndex = i + 1;
                    break;
                }
            }
            
            if (endIndex !== -1) {
                const extracted = workingString.substring(firstBrace, endIndex);
                const parsed = JSON.parse(extracted);
                console.log('[AI] ✓ Successfully extracted complete JSON object');
                return { success: true, data: parsed, warning: 'Extracted first complete JSON object from response.' };
            }
        }
    } catch (e) {
        console.log('[AI] ✗ JSON extraction failed:', e.message);
    }
    
    // If all repairs fail, return null
    return { success: false };
}

// AI Test endpoint
app.post('/api/ai-test', async (req, res) => {
    try {
        const { endpoint, model, type } = req.body;

        if (!endpoint || !model) {
            return res.status(400).json({
                error: 'Missing configuration',
                message: 'Please provide endpoint and model'
            });
        }

        console.log(`[AI Test] Testing ${type} model: ${model} at ${endpoint}`);

        // Simple test prompt - Include keep_alive for consistency
        const testResponse = await axios.post(
            endpoint,
            {
                model: model,
                messages: [
                    {
                        role: 'user',
                        content: 'Reply with just "OK" if you can read this.'
                    }
                ],
                temperature: 0.1,
                max_tokens: 10,
                stream: false,
                keep_alive: "1m"
            },
            {
                timeout: 10000,
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log(`[AI Test] ${type} model responded successfully`);
        
        res.json({
            success: true,
            message: `${type} model connected successfully`,
            response: testResponse.data.choices[0].message.content
        });

    } catch (error) {
        console.error('AI Test error:', error.message);
        
        // Log detailed error information
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response data:', JSON.stringify(error.response.data, null, 2));
        }
        
        if (error.code === 'ECONNREFUSED') {
            return res.status(500).json({
                error: 'Connection refused',
                message: 'Could not connect to the endpoint. Make sure Ollama is running (ollama serve).'
            });
        }

        if (error.response?.status === 404) {
            return res.status(404).json({
                error: 'Model not found',
                message: `Model "${model}" not found. Pull it with: ollama pull ${model}`,
                details: error.response.data
            });
        }

        res.status(500).json({
            error: 'Test failed',
            message: error.message,
            details: error.response?.data || 'Check if Ollama is running and model exists'
        });
    }
});

// SYSTEM PROMPT FOR DISCOVERY (Smart Model - 7b)
// Focuses on intelligence: finding vulnerabilities and generating sophisticated payloads
const systemPromptDiscovery = `You are a Senior Security Engineer and Pentesting Assistant. Your goal is to identify vulnerabilities and generate high-quality payloads.

CRITICAL OUTPUT FORMAT:
1. Return ONLY pure JSON - no markdown, no code blocks, no preamble, no thinking
2. Start your response with { and end with }
3. Include detailed "explanation" field in English

JSON STRING SAFETY RULES:
- When writing explanations or reasons, DO NOT include example URLs or request snippets
- Keep explanations technical and descriptive only
- Single quotes in strings are safe: "payload": "alert('XSS')" is correct
- NEVER put unescaped double quotes inside strings

CORRECT JSON EXAMPLES:
✓ "reason": "Query parameter accepts unfiltered user input"
✓ "explanation": "XSS payloads can be injected through the search parameter"
✓ "payloads": ["<script>alert(1)</script>", "<img src=x onerror=alert(1)>"]

WRONG - CAUSES PARSE ERRORS:
✗ "reason": "Parameter: POST /search?q=alert('x')" ← NO request examples in strings
✗ "explanation": "The URL /test?id=<script> allows XSS" ← NO URL examples

ACTIONS:

1. FIND INJECTION POINTS:
   - Scan parameters in Body (JSON/Form), Query strings, and Headers
   - Categorize risk: HIGH/MEDIUM/LOW
   - Return structure:
   {
     "explanation": "Deep analysis of attack surface and why these points are vulnerable",
     "injectionPoints": [
       {"name": "paramName", "location": "Body (JSON)/Query/Header", "risk": "HIGH", "reason": "Technical explanation"}
     ]
   }

2. GENERATE PAYLOADS:
   - Create EXACTLY 10-15 payloads (Max 15, Quality over Quantity)
   - Range from basic detection to advanced WAF-evasion techniques
   - Return structure:
   {
     "explanation": "Payload strategy summary. Explain basic vs advanced payloads and bypass techniques",
     "payloads": ["payload1", "payload2", ... max 15]
   }

3. COMBINED ACTION (test for [vulnerability]):
   - Both discovery and weaponization in one pass
   - Maximum 12-15 payloads
   - Return structure:
   {
     "explanation": "Comprehensive testing roadmap",
     "injectionPoints": [...],
     "payloads": [... max 15]
   }

Return pure JSON only. No thinking process, no markdown.`;

// SYSTEM PROMPT FOR ANALYSIS (Fast Model - 1.5b)
// Focuses on speed and accuracy: quick vulnerability triage
const systemPromptAnalysis = `You are a Forensic Security Analyst performing Vulnerability Triage. Analyze HTTP responses quickly and accurately.

CRITICAL OUTPUT FORMAT:
1. Return ONLY pure JSON - no markdown, no code blocks, no thinking
2. Start your response with { and end with }
3. When quoting evidence, keep quotes simple

ANALYSIS LOGIC:

1. XSS Testing:
   - SUCCESS: EXACT payload appears UNESCAPED in response HTML
   - SUSPICIOUS: Payload reflected but may be filtered/encoded
   - FAILURE: Payload not present, blocked, or encoded

2. SQL Injection:
   - SUCCESS: Database error messages (syntax errors, table/column names)
   - SUSPICIOUS: Response time delay (>5s) or different response structure
   - FAILURE: Normal response, no errors

3. Path Traversal/LFI:
   - SUCCESS: File contents revealed (/etc/passwd, win.ini, source code)
   - FAILURE: Error pages, access denied, normal response

4. Authentication Bypass:
   - SUCCESS: Access to restricted resources, admin panels
   - FAILURE: Login prompts, 401/403 errors, redirects

EVIDENCE REQUIREMENTS:
- Quote EXACT strings from response that prove your verdict
- For XSS: Show where payload appears
- For SQLi: Quote error message
- For path traversal: Quote file contents
- Be CONSERVATIVE: if no clear evidence → mark as FAILURE

JSON STRUCTURE:
{
  "explanation": "Brief forensic summary with quoted evidence from response",
  "verdict": "success/suspicious/failure",
  "confidence": 0-100,
  "evidence": ["Exact quote from response", "Specific indicator", "..."]
}

Return pure JSON only.`;

// AI Analysis endpoint
app.post('/api/ai-analyze', async (req, res) => {
    try {
        const { prompt, context, config } = req.body;

        // Use provided config or fall back to default
        const llmConfig = config || DEFAULT_CONFIG;

        if (!llmConfig.endpoint || !llmConfig.model) {
            return res.status(400).json({
                error: 'Configuration missing',
                message: 'Please configure your LLM endpoint and model in the Configuration panel'
            });
        }

        // Determine if this is a DISCOVERY or ANALYSIS request
        const isAnalysisRequest = prompt.toLowerCase().includes('analyze') || 
                                 context?.toLowerCase().includes('response:');
        
        const systemPrompt = isAnalysisRequest ? systemPromptAnalysis : systemPromptDiscovery;
        const modelType = isAnalysisRequest ? 'ANALYSIS (Fast)' : 'DISCOVERY (Smart)';
        const temperature = isAnalysisRequest ? 0.1 : 0.6; // Analysis needs precision, Discovery needs creativity

        console.log(`[AI] Mode: ${modelType}`);
        console.log(`[AI] Using model: ${llmConfig.model} at ${llmConfig.endpoint}`);
        console.log(`[AI] Temperature: ${temperature}`);
        console.log(`[AI] Prompt: ${prompt.substring(0, 50)}...`);

        const userMessage = context 
            ? `User: ${prompt}\n\nContext:\n${context}` 
            : prompt;

        // Prepare request body
        const requestBody = {
            model: llmConfig.model,
            messages: [
                {
                    role: 'system',
                    content: systemPrompt
                },
                {
                    role: 'user',
                    content: userMessage
                }
            ],
            temperature: temperature,
            max_tokens: 4096,
            stream: false,
            // CRITICAL for VRAM management on RTX 3050 4GB
            // Unload model from VRAM after 1 minute of inactivity
            // This allows switching between 8b and 1.5b models smoothly
            keep_alive: "1m"
        };

        // Add response_format if the endpoint supports it (OpenAI-compatible)
        // Ollama might not support this, so we'll handle JSON parsing ourselves
        if (llmConfig.forceJson !== false) {
            // Most OpenAI-compatible APIs support this
            // requestBody.response_format = { type: 'json_object' };
        }

        // Call LLM API (OpenAI-compatible format)
        const response = await axios.post(
            llmConfig.endpoint,
            requestBody,
            {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 60000 // 60 second timeout for local models
            }
        );

        const aiMessage = response.data.choices[0].message.content;
        console.log('[AI] Response length:', aiMessage.length, 'characters');
        console.log('[AI] Raw response preview:', aiMessage.substring(0, 200));
        
        // Extract and clean JSON
        let jsonString = extractAndCleanJSON(aiMessage);
        console.log('[AI] Extracted JSON preview:', jsonString.substring(0, 200));
        
        // Try to parse as JSON, with multiple fallback strategies
        let parsedResponse;
        let warning = null;
        
        try {
            // Direct parse attempt
            parsedResponse = JSON.parse(jsonString);
            console.log('[AI] ✓ Successfully parsed JSON response');
            
        } catch (parseError) {
            console.log('[AI] ✗ Initial JSON parse failed:', parseError.message);
            
            // Show problematic area for debugging
            const errorPos = parseInt(parseError.message.match(/position (\d+)/)?.[1]) || 0;
            if (errorPos > 0 && errorPos < jsonString.length) {
                const start = Math.max(0, errorPos - 50);
                const end = Math.min(jsonString.length, errorPos + 50);
                console.log('[AI] Error near:', jsonString.substring(start, end));
                console.log('[AI] Character at error:', JSON.stringify(jsonString[errorPos]));
            }
            
            // Attempt repair
            const repairResult = attemptJSONRepair(jsonString, parseError);
            if (repairResult.success) {
                parsedResponse = repairResult.data;
                warning = repairResult.warning;
            } else {
                // Final fallback: return as plain message
                console.log('[AI] ✗ All parsing attempts failed, returning as plain text');
                parsedResponse = {
                    message: aiMessage,
                    parseError: parseError.message,
                    hint: 'The AI response could not be parsed as JSON. The full response is shown above.'
                };
            }
        }
        
        // Build response
        const responseData = {
            success: true,
            data: parsedResponse,
            rawMessage: aiMessage
        };
        
        if (warning) {
            responseData.warning = warning;
        }
        
        res.json(responseData);

    } catch (error) {
        console.error('AI API error:', error.response?.data || error.message);
        
        if (error.code === 'ECONNREFUSED') {
            return res.status(500).json({
                error: 'Connection refused',
                message: 'Could not connect to LLM endpoint. Make sure your local LLM service (e.g., Ollama) is running.'
            });
        }

        if (error.code === 'ETIMEDOUT') {
            return res.status(408).json({
                error: 'Request timeout',
                message: 'The LLM took too long to respond. Try using a faster model or increase timeout.'
            });
        }

        res.status(500).json({
            error: 'AI request failed',
            message: error.message,
            details: error.response?.data?.error?.message || 'Check if your LLM endpoint and model are configured correctly'
        });
    }
});

// Start server (only when running locally, not on Vercel)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`
╔════════════════════════════════════════╗
║   🔐 AI HTTP Tester Backend           ║
║   Server running on port ${PORT}         ║
║                                        ║
║   Frontend: http://localhost:${PORT}      ║
║   API: http://localhost:${PORT}/api       ║
╚════════════════════════════════════════╝
        `);
    });
}

// Export for Vercel serverless
module.exports = app;
