const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
require('dotenv').config();


const app = express();
const PORT = 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.text({ limit: '10mb' }));

// Serve static files (frontend)
app.use(express.static(__dirname));

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
    // First try to extract from markdown blocks
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) || text.match(/```\s*([\s\S]*?)```/);
    let jsonString = jsonMatch ? jsonMatch[1].trim() : text.trim();
    
    // If no markdown blocks, try to find JSON object
    if (!jsonMatch && !jsonString.startsWith('{')) {
        // Try to find a JSON object in the text
        const objectMatch = text.match(/\{[\s\S]*\}/);
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
    
    // Try parsing the cleaned version
    try {
        const parsed = JSON.parse(workingString);
        console.log('[AI] ✓ Successfully parsed after cleanup');
        return { 
            success: true, 
            data: parsed, 
            warning: hasInvalidEscapes ? 'Response contained invalid escape sequences and was auto-repaired.' : undefined 
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

// AI Analysis endpoint
app.post('/api/ai-analyze', async (req, res) => {
    try {
        const { prompt, context } = req.body;

        if (!GEMINI_API_KEY) {
            return res.status(500).json({
                error: 'API key not configured',
                message: 'Please set GEMINI_API_KEY in .env file'
            });
        }

        console.log(`[AI] Analyzing: ${prompt.substring(0, 50)}...`);

        const systemPrompt = `You are a Senior Security Engineer and Pentesting Assistant. Your goal is to provide actionable intelligence for security testing.

⚠️ CRITICAL JSON FORMATTING RULES - READ CAREFULLY ⚠️

JSON strings use DOUBLE QUOTES ("). Inside double-quoted strings:
- Single quotes (') are REGULAR CHARACTERS - they need NO escaping
- Double quotes (") MUST be escaped as \\"
- Backslashes (\\) MUST be escaped as \\\\

CORRECT WAY to write payloads in JSON:
✓ "explanation": "The payload alert('XSS') was tested"
✓ "explanation": "Found SQL: SELECT * FROM users WHERE id='1'"
✓ "explanation": "The script tag <script>alert('test')</script> was blocked"
✓ "explanation": "SQL code: OR '1'='1' was detected"

WRONG - NEVER DO THIS:
✗ "explanation": "The payload alert(\\'XSS\\') was tested"
✗ "explanation": "Found SQL: SELECT * FROM users WHERE id=\\'1\\'"
✗ "explanation": "The script tag <script>alert(\\'test\\')</script> was blocked"

Rule: If you're writing text inside "..." in JSON, single quotes ' are just regular characters. DO NOT put backslash before them.

When quoting SQL or XSS payloads containing single quotes:
- ✓ CORRECT: "explanation": "The payload OR '1'='1' succeeded"
- ✗ WRONG: "explanation": "The payload OR \\'1\\'=\\'1\\' succeeded"

MANDATORY STRUCTURE:
1. Respond with pure JSON only (no markdown, no code blocks)
2. Use double quotes for all keys and string values
3. Every response MUST include "explanation" field

CRITICAL: Every response MUST include a detailed "explanation" field in English. This field should act as a "Security Consultant's Summary," explaining the logic behind your findings, why certain parameters were chosen, or how specific payloads reveal a vulnerability.

When asked to find injection points:
- Scan for vulnerable parameters in JSON/Form-encoded bodies, Query strings, and Headers.
- Categorize and prioritize based on impact (HIGH/MEDIUM/LOW).
- Return this JSON structure:
{
  "explanation": "A deep-dive summary into the request's attack surface. Explain why specific locations are prioritized and the potential impact of the identified vulnerabilities.",
  "injectionPoints": [
    {"name": "paramName", "location": "Body (Form)/Body (JSON)/Header/Query", "risk": "HIGH/MEDIUM/LOW", "reason": "Detailed technical explanation"}
  ]
}

When asked to generate payloads:
- Create EXACTLY 10-15 payloads ONLY. DO NOT generate more than 15 payloads.
- Range from basic detection to advanced WAF-evasion techniques.
- STOP at 15 payloads maximum. Quality over quantity.
- Return this JSON structure:
{
  "explanation": "Summarize the payload strategy. Explain the difference between the basic and advanced payloads provided and what specific filters they are designed to bypass.",
  "payloads": ["payload1", "payload2", ... up to 15 maximum]
}

When asked to "test for [vulnerability]" (Combined Action):
- Perform both discovery and weaponization in one pass.
- Generate MAXIMUM 12-15 payloads ONLY. Do not exceed this limit.
- Return this JSON structure:
{
  "explanation": "A comprehensive testing roadmap. Summarize the target parameters and how the generated payloads should be interpreted based on the injection points.",
  "injectionPoints": [...],
  "payloads": [... maximum 15 items]
}

When asked to analyze responses:
CRITICAL ANALYSIS RULES - READ CAREFULLY:

1. XSS Testing Analysis:
   - SUCCESS: ONLY if the EXACT payload from the request appears UNESCAPED in the response HTML/body
   - Check if payload like <script>alert('XSS')</script> appears literally in the response
   - Do NOT count legitimate website <script> tags as reflection
   - FAILURE: If payload is encoded (e.g., &lt;script&gt;), filtered, or not present at all
   - Even with 200 OK status, if payload is NOT reflected = FAILURE

2. SQL Injection Testing Analysis:
   - SUCCESS: Database error messages (MySQL/MSSQL/PostgreSQL syntax errors, column names, table names)
   - SUSPICIOUS: Significant response time delay (>5s), different response length/structure
   - FAILURE: Normal response, no errors, no behavioral changes

3. Path Traversal / LFI Testing Analysis:
   - SUCCESS: File contents revealed (e.g., /etc/passwd, C:\\windows\\win.ini, source code)
   - FAILURE: Error pages, access denied, or normal application response

4. Authentication Bypass Testing Analysis:
   - SUCCESS: Access to restricted resources, admin panels, or privileged data
   - FAILURE: Login prompts, 401/403 errors, or redirects to login

EVIDENCE REQUIREMENTS:
- Quote exact strings from the response that prove your verdict
- For XSS: Show where payload appears in response
- For SQLi: Quote the exact error message
- For path traversal: Quote file contents from response
- DO NOT make assumptions - BASE VERDICT ON ACTUAL RESPONSE CONTENT

Return this JSON structure:
{
  "explanation": "A forensic analysis of the response. Quote specific evidence from the response that supports your verdict. Be conservative - if you don't see clear evidence of exploitation, mark as failure.",
  "verdict": "success/failure/suspicious",
  "confidence": 0-100,
  "evidence": ["Exact quote 1 from response", "Exact quote 2 from response", "Specific technical indicator"]
}

Always prioritize technical depth in the 'explanation' field. Technical fields are for machine processing. Return raw JSON only.`;

        const fullPrompt = context 
            ? `${systemPrompt}\n\nUser: ${prompt}\n\nContext:\n${context}` 
            : `${systemPrompt}\n\nUser: ${prompt}`;

        // Call Google Gemini API
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
            {
                contents: [{
                    parts: [{
                        text: fullPrompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 4096,
                }
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        const aiMessage = response.data.candidates[0].content.parts[0].text;
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
        
        if (error.response?.status === 400 && error.response?.data?.error?.message?.includes('API_KEY')) {
            return res.status(401).json({
                error: 'Invalid API key',
                message: 'Please check your GEMINI_API_KEY in .env file'
            });
        }

        res.status(500).json({
            error: 'AI request failed',
            message: error.message,
            details: error.response?.data?.error?.message || 'Unknown error'
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
