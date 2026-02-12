// State management
let state = {
    payloads: [],
    currentRequest: '',
    history: [],
    injectionPoints: [],
    lastSentRequest: null  // Store the actual request sent (with payload applied)
};

// DOM Elements
const chatInput = document.getElementById('chatInput');
const askAiBtn = document.getElementById('askAiBtn');
const chatMessages = document.getElementById('chatMessages');
const requestEditor = document.getElementById('requestEditor');
const responseEditor = document.getElementById('responseEditor');
const injectionPointSelect = document.getElementById('injectionPointSelect');
const payloadSelect = document.getElementById('payloadSelect');
const sendRequestBtn = document.getElementById('sendRequestBtn');
const analyzeBtn = document.getElementById('analyzeBtn');
const historyTableBody = document.getElementById('historyTableBody');
const analysisResult = document.getElementById('analysisResult');
const exportHistoryBtn = document.getElementById('exportHistoryBtn');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');

// Event Listeners
askAiBtn.addEventListener('click', handleAskAI);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleAskAI();
});

sendRequestBtn.addEventListener('click', handleSendRequest);
analyzeBtn.addEventListener('click', handleAnalyzeResponse);
exportHistoryBtn.addEventListener('click', exportHistory);
clearHistoryBtn.addEventListener('click', clearHistory);

// Initialize
console.log('AI HTTP Tester initialized');
console.log('Ready to start testing!');

// Placeholder functions for Step 1 (will implement in later steps)
async function handleAskAI() {
    const userMessage = chatInput.value.trim();
    if (!userMessage) return; 

    // Add user message to chat
    addChatMessage('user', userMessage);
    chatInput.value = '';

    // Show loading message
    addChatMessage('ai', '🤔 Thinking...');

    try {
        const request = requestEditor.value.trim();
        
        // Call AI API
        const response = await fetch('/api/ai-analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt: userMessage,
                context: request || null
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'AI request failed');
        }

        const data = await response.json();
        
        // Remove loading message
        chatMessages.removeChild(chatMessages.lastChild);

        // Log for debugging
        console.log('AI Response:', data);

        // Show warning if response was truncated/repaired
        if (data.warning) {
            addChatMessage('ai', `⚠️ ${data.warning}`);
        }

        // Check if there was a parse error
        if (data.data.parseError) {
            console.error('JSON Parse Error:', data.data.parseError);
            addChatMessage('ai', `❌ Failed to parse AI response as JSON.\n\nError: ${data.data.parseError}\n\n${data.data.hint || 'Please try rephrasing your question or check the console for details.'}`);
            
            // Show raw response in expandable section if available
            if (data.rawMessage) {
                console.log('Raw AI Response:', data.rawMessage);
                addChatMessage('ai', `📄 Raw response logged to console (F12 to view).`);
            }
            return;
        }

        // Handle different AI responses
        if (data.data.injectionPoints && data.data.payloads) {
            // Combined response: both injection points and payloads
            handleCombinedResponse(data.data);
        } else if (data.data.injectionPoints) {
            handleInjectionPointsResponse(data.data);
        } else if (data.data.payloads) {
            handlePayloadsResponse(data.data);
        } else if (data.data.verdict) {
            handleAnalysisResponse(data.data);
        } else if (data.data.explanation) {
            // Generic structured response with explanation field
            let message = data.data.explanation;
            
            // Add status if present
            if (data.data.status) {
                message += `\n\nStatus: ${data.data.status}`;
            }
            
            // Add any other fields that might be present
            for (const [key, value] of Object.entries(data.data)) {
                if (key !== 'explanation' && key !== 'status' && typeof value === 'string') {
                    message += `\n${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`;
                }
            }
            
            addChatMessage('ai', message);
        } else {
            // Generic response - check if it's markdown/JSON that wasn't parsed
            let displayMessage = data.data.message || data.rawMessage;
            
            // Try to clean up markdown code blocks for display
            if (displayMessage && displayMessage.includes('```json')) {
                displayMessage = '⚠️ Received JSON response but failed to parse. Check console for details.\n\nRaw response:\n' + displayMessage;
            }
            
            if (displayMessage) {
                addChatMessage('ai', displayMessage);
            } else {
                // Last fallback - show the entire data object as formatted JSON
                addChatMessage('ai', 'Received response:\n' + JSON.stringify(data.data, null, 2));
            }
        }

    } catch (error) {
        // Remove loading message
        if (chatMessages.lastChild?.textContent?.includes('Thinking')) {
            chatMessages.removeChild(chatMessages.lastChild);
        }
        addChatMessage('ai', `❌ Error: ${error.message}\n\nMake sure you've set up your GEMINI_API_KEY in the .env file.`);
        console.error('AI error:', error);
    }
}

async function handleSendRequest() {
    const request = requestEditor.value.trim();
    if (!request) {
        alert('Please enter an HTTP request first!');
        return;
    }
    // Hide analysis result when new request is sent
    analysisResult.classList.add('hidden');
    console.log(payloadSelect.value)
    console.log(injectionPointSelect.value)
    try {
        // Parse the raw HTTP request
        const parsedRequest = parseHttpRequest(request);
        
        // Apply payload if one is selected
        const selectedPayload = payloadSelect.value;
        const selectedInjectionPoint = injectionPointSelect.value;
        
        if (selectedPayload) {
            const result = applyPayload(parsedRequest, selectedPayload, selectedInjectionPoint);
            console.log('Payload application result:', result);
            parsedRequest.body = result.body;
            parsedRequest.headers = result.headers;
            parsedRequest.url = result.url;
        }
        
        // Store the actual request being sent (for AI analysis later)
        state.lastSentRequest = reconstructHttpRequest(parsedRequest);
        console.log('Stored request for analysis:', state.lastSentRequest.substring(0, 200));
        
        // Send the request
        responseEditor.value = 'Sending request...\n';
        const response = await sendHttpRequest(parsedRequest);
        
        // Display the response
        displayResponse(response);
        
        // Add to history
        const payload = selectedPayload || 'Original request';
        addHistoryEntry({
            request: state.lastSentRequest,  // Store actual sent request, not original
            response: responseEditor.value,
            payload: payload,
            status: response.status,
            statusClass: getStatusClass(response.status),
            size: formatBytes(response.size),
            verdict: 'Not analyzed'
        });
        
    } catch (error) {
        responseEditor.value = `❌ Error sending request:\n\n${error.message}\n\nTroubleshooting:\n- Check if the URL is correct\n- The target server may be blocking requests\n- Check browser console (F12) for detailed errors\n- Check server terminal for backend logs`;
        console.error('Request error:', error);
    }
}

async function handleAnalyzeResponse() {
    const response = responseEditor.value.trim();
    if (!response) {
        alert('Send a request first to get a response to analyze!');
        return;
    }

    // Check if we have the actual sent request
    if (!state.lastSentRequest) {
        alert('⚠️ No request found. Please send a request first before analyzing the response.');
        return;
    }

    try {
        // Show loading state
        analyzeBtn.textContent = '🔍 Analyzing...';
        analyzeBtn.disabled = true;

        // Call AI to analyze the response
        // IMPORTANT: Use state.lastSentRequest (with payload) instead of requestEditor.value (original)
        const aiResponse = await fetch('/api/ai-analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt: 'Analyze this HTTP response for security vulnerabilities. Was the attack successful?',
                context: `Request:\n${state.lastSentRequest}\n\nResponse:\n${response}`
            })
        });

        if (!aiResponse.ok) {
            const errorData = await aiResponse.json();
            throw new Error(errorData.message || 'Analysis failed');
        }

        const data = await aiResponse.json();
        
        console.log('Analysis response:', data);
        
        // Check if response has parse error
        if (data.data.parseError) {
            console.error('AI Response Parse Error:', data.data.parseError);
            alert(`❌ Failed to parse AI response:\n\n${data.data.parseError}\n\nThe AI returned invalid JSON. Check console for details.`);
            console.log('Raw AI message:', data.rawMessage);
            return;
        }
        
        // Display analysis result
        if (data.data.verdict) {
            displayAnalysisResult(data.data);
        } else if (data.data.message) {
            // Check if message looks like JSON that failed to parse
            const msg = data.data.message;
            if (msg.includes('"verdict"') || msg.includes('"explanation"') || msg.includes('"evidence"')) {
                console.error('AI returned JSON-like text but failed to parse as structured data');
                console.log('Raw message:', msg);
                alert(`❌ AI response format error\n\nThe AI returned what looks like JSON but it couldn't be parsed properly.\n\nCheck browser console (F12) for the raw response.`);
            } else {
                // Generic text response
                alert(msg);
            }
        } else {
            // Unknown response format
            console.error('Unexpected AI response format:', data);
            alert(`❌ Unexpected response format\n\nThe AI response doesn't contain the expected data structure.\n\nCheck console for details.`);
        }

    } catch (error) {
        alert(`❌ Analysis failed: ${error.message}`);
        console.error('Analysis error:', error);
    } finally {
        analyzeBtn.textContent = '🔍 Analyze Response';
        analyzeBtn.disabled = false;
    }
}

// ===== HTTP REQUEST PARSING AND SENDING =====

/**
 * Parse a raw HTTP request string into structured components
 */
function parseHttpRequest(rawRequest) {
    const lines = rawRequest.split('\n');
    
    // Parse request line (e.g., "POST /api/download HTTP/1.1")
    const requestLine = lines[0].trim();
    const [method, path, protocol] = requestLine.split(' ');
    
    if (!method || !path) {
        throw new Error('Invalid request format. First line should be: METHOD /path HTTP/1.1');
    }
    
    // Parse headers
    const headers = {};
    let i = 1;
    let host = '';
    
    while (i < lines.length && lines[i].trim() !== '') {
        const line = lines[i].trim();
        const colonIndex = line.indexOf(':');
        
        if (colonIndex > 0) {
            const headerName = line.substring(0, colonIndex).trim();
            const headerValue = line.substring(colonIndex + 1).trim();
            headers[headerName] = headerValue;
            
            if (headerName.toLowerCase() === 'host') {
                host = headerValue;
            }
        }
        i++;
    }
    
    // Parse body (everything after the blank line)
    let body = '';
    if (i < lines.length) {
        body = lines.slice(i + 1).join('\n').trim();
    }
    
    // Determine protocol from Referer/Origin headers or default to https
    let protocol_prefix = 'https';
    
    // Check if localhost or local IP
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
        protocol_prefix = 'http';
    }
    // Check Referer header for protocol
    else if (headers['Referer'] && headers['Referer'].startsWith('http://')) {
        protocol_prefix = 'http';
    }
    // Check Origin header for protocol
    else if (headers['Origin'] && headers['Origin'].startsWith('http://')) {
        protocol_prefix = 'http';
    }
    
    const url = `${protocol_prefix}://${host}${path}`;
    
    return {
        method: method.toUpperCase(),
        url,
        headers,
        body
    };
}

/**
 * Reconstruct raw HTTP request from parsed components
 */
function reconstructHttpRequest(parsedRequest) {
    const { method, url, headers, body } = parsedRequest;
    
    // Extract path from URL
    const urlObj = new URL(url);
    const path = urlObj.pathname + urlObj.search;
    
    // Build request line
    let rawRequest = `${method} ${path} HTTP/1.1\n`;
    
    // Add headers
    for (const [key, value] of Object.entries(headers)) {
        rawRequest += `${key}: ${value}\n`;
    }
    
    // Add blank line before body
    rawRequest += '\n';
    
    // Add body if present
    if (body) {
        rawRequest += body;
    }
    
    return rawRequest;
}

/**
 * Send an HTTP request via backend proxy
 */
async function sendHttpRequest(parsedRequest) {
    const { method, url, headers, body } = parsedRequest;
    
    console.log('Sending request:', { method, url, headers, body });
    
    // Send request to our Node.js backend proxy
    const response = await fetch('/api/send-request', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            method,
            url,
            headers,
            body
        })
    });
    
    // Check if backend returned an error
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Request failed');
    }
    
    // Get response from backend
    const data = await response.json();
    
    return {
        status: data.status,
        statusText: data.statusText,
        headers: data.headers,
        body: data.body,
        time: data.time,
        size: data.size
    };
}

/**
 * Display the HTTP response in the response editor
 */
function displayResponse(response) {
    let responseText = `HTTP/1.1 ${response.status} ${response.statusText}\n`;
    
    // Add response headers
    for (const [key, value] of Object.entries(response.headers)) {
        responseText += `${key}: ${value}\n`;
    }
    
    responseText += `\n${response.body}`;
    
    responseEditor.value = responseText;
    
    // Add metadata
    const metadata = `\n\n---\n⏱️ Time: ${response.time}ms | 📦 Size: ${formatBytes(response.size)}`;
    responseEditor.value += metadata;
}

/**
 * Apply a payload to the request at the specified injection point
 */
function applyPayload(parsedRequest, payload, targetParameter) {
    const { url, headers, body } = parsedRequest;
    
    console.log('Applying payload:', { payload, targetParameter, body: body?.substring(0, 100) });
    
    // If [INJECT] marker exists, use it
    if (body && body.includes('[INJECT]')) {
        console.log('Using [INJECT] marker');
        return {
            url,
            headers,
            body: body.replace(/\[INJECT\]/g, payload)
        };
    }
    
    // If a specific parameter is selected, inject there
    if (targetParameter) {
        console.log('Applying to specific parameter:', targetParameter);
        return applyToSpecificParameter(parsedRequest, payload, targetParameter);
    }
    
    console.log('Auto-injecting to first parameter');
    
    // Default: Auto-inject to first parameter
    if (body) {
        // Try JSON first
        try {
            const jsonBody = JSON.parse(body);
            const keys = Object.keys(jsonBody);
            if (keys.length > 0) {
                console.log('Found JSON body, injecting to:', keys[0]);
                jsonBody[keys[0]] = payload;
            }
            return {
                url,
                headers,
                body: JSON.stringify(jsonBody)
            };
        } catch (e) {
            // Not JSON, try form-encoded data
            const contentType = headers['Content-Type'] || headers['content-type'] || '';
            console.log('Not JSON for auto-inject, content-type:', contentType);
            if (contentType.includes('application/x-www-form-urlencoded')) {
                const params = new URLSearchParams(body);
                const firstParam = Array.from(params.keys())[0];
                console.log('Found form params, injecting to:', firstParam);
                if (firstParam) {
                    params.set(firstParam, payload);
                    return {
                        url,
                        headers,
                        body: params.toString()
                    };
                }
            }
            // Unknown format, return original
            console.log('Unknown body format, returning original');
            return { url, headers, body };
        }
    }
    
    return { url, headers, body };
}

/**
 * Apply payload to a specific parameter by name
 */
function applyToSpecificParameter(parsedRequest, payload, paramName) {
    const { url, headers, body } = parsedRequest;
    
    console.log('Trying to find parameter:', paramName);
    
    // Try to find the parameter in the body
    if (body) {
        // Try JSON first
        try {
            const jsonBody = JSON.parse(body);
            if (jsonBody.hasOwnProperty(paramName)) {
                console.log('Found in JSON body');
                jsonBody[paramName] = payload;
                return {
                    url,
                    headers,
                    body: JSON.stringify(jsonBody)
                };
            }
        } catch (e) {
            // Not JSON, try form-encoded data
            const contentType = headers['Content-Type'] || headers['content-type'] || '';
            console.log('Not JSON, content-type:', contentType);
            if (contentType.includes('application/x-www-form-urlencoded')) {
                const params = new URLSearchParams(body);
                console.log('Form params found:', Array.from(params.keys()));
                if (params.has(paramName)) {
                    console.log('Found in form-encoded body');
                    params.set(paramName, payload);
                    return {
                        url,
                        headers,
                        body: params.toString()
                    };
                }
            }
        }
    }
    
    // Try to find parameter in headers
    const headerKey = Object.keys(headers).find(key => key.toLowerCase() === paramName.toLowerCase());
    if (headerKey) {
        const newHeaders = { ...headers };
        newHeaders[headerKey] = payload;
        return {
            url,
            headers: newHeaders,
            body
        };
    }
    
    // Try to find parameter in URL query string
    if (url.includes('?')) {
        const [baseUrl, queryString] = url.split('?');
        const params = new URLSearchParams(queryString);
        if (params.has(paramName)) {
            params.set(paramName, payload);
            return {
                url: `${baseUrl}?${params.toString()}`,
                headers,
                body
            };
        }
    }
    
    // Parameter not found, return original
    return { url, headers, body };
}

/**
 * Format bytes to human-readable format
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Get status class based on HTTP status code
 */
function getStatusClass(status) {
    if (status >= 200 && status < 300) return 'success';
    if (status >= 400) return 'failure';
    return 'suspicious';
}

// ===== CHAT AND UI HELPERS =====

/**
 * Handle AI response with injection points
 */
function handleInjectionPointsResponse(data) {
    const { explanation, injectionPoints } = data;
    
    // 1. Display human-readable explanation to user in chat
    if (explanation) {
        addChatMessage('ai', explanation);
    }
    
    // 2. Process technical data in background
    state.injectionPoints = injectionPoints;
    
    // Update injection point selector
    updateInjectionPointSelector(injectionPoints);
    
    // Add additional details if no explanation provided
    if (!explanation) {
        let message = `Found ${injectionPoints.length} potential injection point(s):\n\n`;
        injectionPoints.forEach((point, idx) => {
            message += `${idx + 1}. **${point.name}** (${point.location}) - ${point.risk} risk\n   ${point.reason}\n\n`;
        });
        
        message += 'Ask me to "generate [vulnerability type] payloads" to start testing!';
        addChatMessage('ai', message);
    }
}

/**
 * Handle combined AI response with both injection points and payloads
 */
function handleCombinedResponse(data) {
    const { explanation, injectionPoints, payloads } = data;
    
    // 1. Display human-readable explanation to user in chat
    if (explanation) {
        addChatMessage('ai', explanation);
    }
    
    // Warn if too many payloads (might indicate truncation)
    if (payloads && payloads.length > 20) {
        console.warn(`[Warning] Received ${payloads.length} payloads (expected 10-15). Some may be incomplete.`);
        addChatMessage('ai', `⚠️ Note: Received ${payloads.length} payloads. The last few might be incomplete. Consider using the first 15-20.`);
    }
    
    // 2. Process technical data in background
    state.injectionPoints = injectionPoints;
    state.payloads = payloads;
    
    // Update both selectors
    updateInjectionPointSelector(injectionPoints);
    
    // Update payload dropdown
    payloadSelect.innerHTML = '<option value="">Select a payload...</option>';
    payloads.forEach((payload, idx) => {
        const option = document.createElement('option');
        option.value = payload;
        option.textContent = `${idx + 1}. ${payload.substring(0, 50)}${payload.length > 50 ? '...' : ''}`;
        payloadSelect.appendChild(option);
    });
    
    // Add additional status message if no explanation provided
    if (!explanation) {
        let message = `✅ Found ${injectionPoints.length} injection point(s) and generated ${payloads.length} payloads!\n\n`;
        message += 'Vulnerable parameters:\n';
        injectionPoints.forEach((point, idx) => {
            message += `${idx + 1}. **${point.name}** (${point.risk} risk)\n`;
        });
        message += `\nSelect a target parameter and payload, then click "Send Request" to test!`;
        addChatMessage('ai', message);
    }
}

/**
 * Update the injection point selector dropdown
 */
function updateInjectionPointSelector(injectionPoints) {
    injectionPointSelect.innerHTML = '<option value="">Auto (first parameter)</option>';
    injectionPoints.forEach((point, idx) => {
        const option = document.createElement('option');
        option.value = point.name;
        option.textContent = `${point.name} (${point.location}) - ${point.risk}`;
        injectionPointSelect.appendChild(option);
    });
}

/**
 * Handle AI response with payloads
 */
function handlePayloadsResponse(data) {
    const { explanation, payloads } = data;
    
    // 1. Display human-readable explanation to user in chat
    if (explanation) {
        addChatMessage('ai', explanation);
    }
    
    // Warn if too many payloads (might indicate truncation)
    if (payloads && payloads.length > 20) {
        console.warn(`[Warning] Received ${payloads.length} payloads (expected 10-15). Some may be incomplete.`);
        addChatMessage('ai', `⚠️ Note: Received ${payloads.length} payloads. The last few might be incomplete due to response size limits. Consider using the first 15-20 for best results.`);
    }
    
    // 2. Process technical data in background
    state.payloads = payloads;
    
    // Update payload dropdown
    payloadSelect.innerHTML = '<option value="">Select a payload...</option>';
    payloads.forEach((payload, idx) => {
        const option = document.createElement('option');
        option.value = payload;
        option.textContent = `${idx + 1}. ${payload.substring(0, 50)}${payload.length > 50 ? '...' : ''}`;
        payloadSelect.appendChild(option);
    });
    
    // Add status message if no explanation provided
    if (!explanation) {
        addChatMessage('ai', `✅ Generated ${payloads.length} payloads! Select one from the dropdown and click "Send Request" to test.`);
    }
}

/**
 * Handle AI response with vulnerability analysis
 */
function handleAnalysisResponse(data) {
    const { explanation } = data;
    
    // 1. Display human-readable explanation to user in chat
    if (explanation) {
        addChatMessage('ai', explanation);
    }
    
    // 2. Process technical data and display result panel
    displayAnalysisResult(data);
    
    // Add verdict summary if no explanation provided
    if (!explanation) {
        const verdictEmoji = {
            'success': '✅',
            'failure': '❌',
            'suspicious': '⚠️'
        }[data.verdict.toLowerCase()];
        
        addChatMessage('ai', `${verdictEmoji} Verdict: ${data.verdict.toUpperCase()} (${data.confidence}% confidence)`);
    }
}

/**
 * Display analysis result in the UI
 */
function displayAnalysisResult(data) {
    const { verdict, confidence, evidence } = data;
    
    // Show the analysis panel
    analysisResult.classList.remove('hidden');
    
    // Set verdict
    const verdictBadge = document.getElementById('verdictBadge');
    const verdictIcon = document.getElementById('verdictIcon');
    const verdictText = document.getElementById('verdictText');
    
    verdictBadge.className = 'verdict-badge ' + verdict.toLowerCase();
    
    const icons = {
        'success': '✅',
        'failure': '❌',
        'suspicious': '⚠️'
    };
    
    verdictIcon.textContent = icons[verdict.toLowerCase()] || '❓';
    verdictText.textContent = verdict.toUpperCase();
    
    // Add verdict description
    const verdictDescriptions = {
        'success': 'Attack was successful - vulnerability confirmed',
        'failure': 'Attack failed - no vulnerability detected',
        'suspicious': 'Unusual behavior detected - requires manual review'
    };
    
    // Set confidence with color coding
    const confidenceElement = document.getElementById('confidenceLevel');
    confidenceElement.textContent = `${confidence}%`;
    
    // Add subtitle with verdict description
    const verdictSubtitle = document.createElement('div');
    verdictSubtitle.style.fontSize = '12px';
    verdictSubtitle.style.color = '#888';
    verdictSubtitle.style.fontWeight = 'normal';
    verdictSubtitle.textContent = verdictDescriptions[verdict.toLowerCase()] || '';
    
    // Clear previous subtitle if exists
    const existingSubtitle = verdictBadge.querySelector('.verdict-subtitle');
    if (existingSubtitle) {
        existingSubtitle.remove();
    }
    verdictSubtitle.className = 'verdict-subtitle';
    verdictBadge.appendChild(verdictSubtitle);
    
    // Set evidence
    const evidenceList = document.getElementById('evidenceList');
    evidenceList.innerHTML = '';
    evidence.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        evidenceList.appendChild(li);
    });
    
    // Update the most recent history entry with the verdict
    updateLatestHistoryVerdict(verdict, confidence);
}

// Helper function to add messages to chat
function addChatMessage(type, message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    
    const prefix = type === 'user' ? 'You' : 'AI';
    messageDiv.innerHTML = `<strong>${prefix}:</strong> ${escapeHtml(message)}`;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Helper function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Helper function to add history entry
function addHistoryEntry(entry) {
    // Remove empty state if exists
    const emptyState = historyTableBody.querySelector('.empty-state');
    if (emptyState) {
        emptyState.remove();
    }

    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${state.history.length + 1}</td>
        <td>${escapeHtml(entry.payload.substring(0, 30))}...</td>
        <td><span class="status-badge status-${entry.statusClass}">${entry.status}</span></td>
        <td>${entry.size}</td>
        <td>${entry.verdict}</td>
        <td><button class="action-btn" onclick="viewHistoryItem(${state.history.length})">View</button></td>
    `;
    
    historyTableBody.appendChild(row);
    state.history.push(entry);
}

// Function to view history item
function viewHistoryItem(index) {
    const entry = state.history[index];
    if (entry) {
        // Load request and response
        requestEditor.value = entry.request;
        responseEditor.value = entry.response;
        
        // Hide analysis result (it's for the current test, not historical)
        analysisResult.classList.add('hidden');
        
        // Visual feedback with toast notification
        showToast(`📋 Loaded test #${index + 1} - ${entry.payload.substring(0, 30)}...`);
        
        // Scroll to request panel
        requestEditor.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// Helper function to show toast notifications
function showToast(message) {
    // Remove existing toast if any
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) {
        existingToast.remove();
    }
    
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Fade in
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Fade out and remove
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Function to update the latest history entry with AI verdict
function updateLatestHistoryVerdict(verdict, confidence) {
    if (state.history.length === 0) return;
    
    const latestIndex = state.history.length - 1;
    const verdictText = `${verdict} (${confidence}%)`;
    
    // Update the state
    state.history[latestIndex].verdict = verdictText;
    
    // Update the table row
    const rows = historyTableBody.querySelectorAll('tr:not(.empty-state)');
    if (rows.length > 0) {
        const lastRow = rows[rows.length - 1];
        const verdictCell = lastRow.cells[4]; // 5th column (0-indexed)
        if (verdictCell) {
            verdictCell.textContent = verdictText;
        }
    }
}

// Function to export history to JSON
function exportHistory() {
    if (state.history.length === 0) {
        alert('No history to export!');
        return;
    }
    
    const dataStr = JSON.stringify(state.history, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `http-test-history-${Date.now()}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    alert('History exported successfully!');
}

// Function to clear all history
function clearHistory() {
    if (state.history.length === 0) {
        alert('History is already empty!');
        return;
    }
    
    if (confirm(`Are you sure you want to clear all ${state.history.length} history entries?`)) {
        state.history = [];
        historyTableBody.innerHTML = `
            <tr class="empty-state">
                <td colspan="6">No tests run yet. Start by sending a request!</td>
            </tr>
        `;
        alert('History cleared!');
    }
}
