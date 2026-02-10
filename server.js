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

        const systemPrompt = `You are a security testing assistant that helps identify vulnerabilities in HTTP requests.

IMPORTANT: Always respond with valid, complete JSON only. Do not truncate arrays or objects.

When asked to find injection points:
- Identify parameters that could be vulnerable (in JSON body, form-encoded body, query string, headers)
- Recognize form-encoded data (application/x-www-form-urlencoded) like: searchFor=value&param=value
- Recognize JSON data like: {"param": "value"}
- Recognize URL query parameters like: ?param=value
- Rate each by risk level (HIGH, MEDIUM, LOW)
- Explain why each is vulnerable
- Return ONLY this JSON structure:
{
  "injectionPoints": [
    {"name": "paramName", "location": "Body (Form)/Body (JSON)/Header/Query", "risk": "HIGH/MEDIUM/LOW", "reason": "explanation"}
  ]
}

When asked to generate payloads:
- Create 10-15 payloads for the specified vulnerability type
- Include classic and advanced variations
- Return ONLY this JSON structure:
{
  "payloads": ["payload1", "payload2", "payload3", ...]
}

When asked to "test for [vulnerability]" (combined request):
- First identify injection points
- Then generate payloads for that vulnerability type
- Return BOTH in this JSON structure:
{
  "injectionPoints": [{"name": "...", "location": "...", "risk": "...", "reason": "..."}],
  "payloads": ["payload1", "payload2", ...]
}

When asked to analyze responses:
- Determine if the attack succeeded, failed, or is suspicious
- Look for error messages, path disclosures, SQL errors, XSS reflections, etc.
- Provide confidence percentage (0-100)
- Return ONLY this JSON structure:
{
  "verdict": "success",
  "confidence": 85,
  "evidence": ["evidence point 1", "evidence point 2"]
}

Do not use markdown code blocks. Return raw JSON only.`;

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
                    maxOutputTokens: 2000,
                }
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        const aiMessage = response.data.candidates[0].content.parts[0].text;
        console.log(aiMessage) //Debug
        // Try to parse as JSON, fallback to plain text
        let parsedResponse;
        try {
            // Extract JSON from markdown code blocks if present
            const jsonMatch = aiMessage.match(/```json\s*([\s\S]*?)```/) || aiMessage.match(/```\s*([\s\S]*?)```/);
            const jsonString = jsonMatch ? jsonMatch[1].trim() : aiMessage.trim();
            
            // Try to parse the JSON
            parsedResponse = JSON.parse(jsonString);
            console.log('[AI] Successfully parsed JSON response');
        } catch (e) {
            console.log('[AI] Failed to parse as JSON, returning raw message:', e.message);
            
            // Try to find JSON object in the text without markdown blocks
            const jsonObjectMatch = aiMessage.match(/\{[\s\S]*\}/);
            if (jsonObjectMatch) {
                try {
                    parsedResponse = JSON.parse(jsonObjectMatch[0]);
                    console.log('[AI] Successfully extracted and parsed JSON object');
                } catch (e2) {
                    parsedResponse = { message: aiMessage };
                }
            } else {
                parsedResponse = { message: aiMessage };
            }
        }

        res.json({
            success: true,
            data: parsedResponse,
            rawMessage: aiMessage
        });

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

// Start server
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
