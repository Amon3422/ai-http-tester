# Online/Offline Mode Implementation Summary

## Overview
Added dual deployment support to AI HTTP Tester:
- **☁️ Online Mode**: Uses Groq API (cloud) - fast setup, no local requirements
- **🏠 Local Mode**: Uses Ollama (self-hosted) - privacy, unlimited usage

## Changes Made

### 1. Backend (server.js)

#### Added Default Configurations
```javascript
const DEFAULT_LOCAL_CONFIG = {
    smart: {
        endpoint: 'http://localhost:11434/v1/chat/completions',
        model: 'deepseek-r1:7b'
    },
    fast: {
        endpoint: 'http://localhost:11434/v1/chat/completions',
        model: 'deepseek-r1:1.5b'
    }
};

const DEFAULT_ONLINE_CONFIG = {
    smart: {
        endpoint: 'https://api.groq.com/openai/v1/chat/completions',
        model: 'llama-3.3-70b-versatile'
    },
    fast: {
        endpoint: 'https://api.groq.com/openai/v1/chat/completions',
        model: 'llama-3.1-8b-instant'
    }
};
```

#### Intelligent Mode Detection
```javascript
// Check if online mode based on API key or Groq endpoint
const isOnlineMode = config?.apiKey || (config?.endpoint && config.endpoint.includes('groq.com'));
```

#### Conditional Request Handling
- **Authorization Header**: Added only for online mode
  ```javascript
  if (isOnlineMode && llmConfig.apiKey) {
      headers['Authorization'] = `Bearer ${llmConfig.apiKey}`;
  }
  ```

- **VRAM Management**: `keep_alive` only for local mode
  ```javascript
  if (!isOnlineMode) {
      requestBody.keep_alive = "1m";
  }
  ```

- **JSON Enforcement**: `response_format` for Groq
  ```javascript
  if (isOnlineMode) {
      requestBody.response_format = { type: "json_object" };
  }
  ```

#### Enhanced Logging
```javascript
console.log(`${isOnlineMode ? '☁️ ONLINE' : '🏠 LOCAL'} MODE - Using ${modelType} model: ${llmConfig.model}`);
```

### 2. Frontend (script.js)

#### State Management
```javascript
let state = {
    config: {
        mode: 'local',  // 'local' or 'online'
        apiKey: '',     // For online mode
        smart: { endpoint, model },
        fast: { endpoint, model }
    }
};
```

#### Default Configuration Presets
Added `DEFAULT_LOCAL_CONFIG` and `DEFAULT_ONLINE_CONFIG` for quick switching.

#### Mode Change Handler
```javascript
function handleModeChange(e) {
    const mode = e.target.value;
    
    if (mode === 'online') {
        onlineSection.style.display = 'block';
        // Auto-fill Groq endpoints if still using localhost
        if (smartEndpointInput.value.includes('localhost')) {
            smartEndpointInput.value = DEFAULT_ONLINE_CONFIG.smart.endpoint;
            // ... apply online defaults
        }
    } else {
        onlineSection.style.display = 'none';
        // Auto-fill Ollama endpoints if using Groq
        if (smartEndpointInput.value.includes('groq.com')) {
            smartEndpointInput.value = DEFAULT_LOCAL_CONFIG.smart.endpoint;
            // ... apply local defaults
        }
    }
}
```

#### API Key Validation
```javascript
function saveConfiguration() {
    const mode = modeLocalRadio.checked ? 'local' : 'online';
    
    if (mode === 'online' && !apiKeyInput.value.trim()) {
        showStatus('⚠️ API Key is required for online mode', 'error');
        return;
    }
    // ... save config
}
```

#### Configuration Persistence
Saves mode and apiKey to localStorage along with model configs.

### 3. UI (index.html)

#### Mode Selector
```html
<div class="mode-selector">
    <label>
        <input type="radio" name="llmMode" value="local" id="modeLocal" checked>
        <span>🏠 Local (Ollama)</span>
    </label>
    <label>
        <input type="radio" name="llmMode" value="online" id="modeOnline">
        <span>☁️ Online (Groq API)</span>
    </label>
</div>
```

#### Online Mode Section
```html
<div class="config-section" id="onlineSection" style="display: none;">
    <div class="api-key-group">
        <label for="apiKey">🔑 Groq API Key:</label>
        <input type="password" id="apiKey" placeholder="gsk_..." />
        <small>Get free API key at <a href="https://console.groq.com">console.groq.com</a></small>
    </div>
</div>
```

### 4. Styling (style.css)

#### Mode Selector Styling
```css
.mode-selector {
    display: flex;
    gap: 20px;
    padding: 15px;
    background: #1e1e1e;
    border-radius: 6px;
}

.mode-selector label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    padding: 8px 15px;
    transition: background 0.2s;
}

.mode-selector input[type="radio"]:checked + span {
    color: #4ec9b0;
}
```

#### API Key Input Styling
```css
.api-key-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.api-key-group input {
    padding: 10px;
    background: #3c3c3c;
    border: 1px solid #3e3e42;
    border-radius: 4px;
    font-family: 'Consolas', monospace;
}
```

### 5. Documentation

#### DEPLOYMENT.md
Comprehensive guide comparing both modes:
- Requirements
- Setup instructions
- Advantages/disadvantages
- Mode comparison table
- Dual-model architecture explanation
- Switching between modes
- Recommendations

#### README.md
Updated Quick Start section:
- Clear presentation of both modes
- Online mode listed first (easier for new users)
- Step-by-step instructions for each
- Links to full deployment guide

## Technical Decisions

### Why Two Modes?

1. **Online Mode Benefits:**
   - Zero local setup (5-minute start)
   - No GPU/VRAM requirements
   - Fast inference (Groq LPU)
   - Great for evaluation and demos
   - 14,400 free requests/day

2. **Local Mode Benefits:**
   - Complete privacy (data never leaves machine)
   - No API rate limits
   - No ongoing costs
   - Works offline
   - Full control over models

### Mode Detection Logic

Detects online mode if:
- `config.apiKey` is present, OR
- `config.endpoint` contains "groq.com"

This allows flexible configuration without strict mode enforcement.

### Conditional Features

| Feature | Local Mode | Online Mode |
|---------|-----------|-------------|
| Authorization Header | ❌ | ✅ Bearer token |
| keep_alive | ✅ "1m" | ❌ |
| response_format | ❌ | ✅ {type: "json_object"} |
| Model Unloading | ✅ Auto-unload | ❌ N/A |

### Model Recommendations

**Local Mode:**
- Smart: `deepseek-r1:7b` (3.5-4GB VRAM)
- Fast: `deepseek-r1:1.5b` (1.5GB VRAM)
- Total: ~5GB VRAM needed

**Online Mode:**
- Smart: `llama-3.3-70b-versatile` (Groq)
- Fast: `llama-3.1-8b-instant` (Groq)
- Total: 0GB VRAM needed (cloud-based)

## User Experience Flow

### First-Time Setup (Online)
1. Clone repo
2. `npm install && npm start`
3. Click "⚙️ Configure LLM"
4. Select "☁️ Online (Groq API)"
5. Enter API key from console.groq.com
6. Click "💾 Save" then "🧪 Test"
7. Start testing immediately

### First-Time Setup (Local)
1. Install Ollama
2. Pull models (`ollama pull deepseek-r1:7b` + `deepseek-r1:1.5b`)
3. Clone repo
4. `npm install && npm start`
5. Click "⚙️ Configure LLM"
6. Keep "🏠 Local (Ollama)" selected (default)
7. Keep default settings
8. Click "💾 Save" then "🧪 Test"
9. Start testing

### Switching Modes
1. Open configuration panel
2. Select different mode
3. System auto-fills appropriate defaults
4. Add API key if switching to Online
5. Save and test

## Security Considerations

### API Key Storage
- Stored in browser localStorage (not in backend)
- Transmitted to backend only during requests
- Backend never persists the key
- User can clear by switching to local mode

### Request Privacy

**Local Mode:**
- All LLM requests stay on localhost
- HTTP requests go directly to target (via backend proxy)
- Zero data sent to third parties

**Online Mode:**
- LLM requests sent to Groq API
- HTTP requests still go directly to target
- System prompts and responses visible to Groq
- Review Groq's privacy policy before use with sensitive targets

## Testing

Verified functionality:
✅ Mode switching updates UI correctly
✅ API key validation prevents saving without key in online mode
✅ Default configs auto-fill when switching modes
✅ Backend detects online mode and adds Authorization header
✅ keep_alive only added for local mode
✅ response_format only added for online mode
✅ Configuration persists in localStorage
✅ Server starts without errors
✅ HTML/CSS renders correctly

## Future Enhancements

Potential improvements:
- [ ] Add OpenAI API support (in addition to Groq)
- [ ] Add Anthropic Claude API support
- [ ] Token usage tracking for online mode
- [ ] Cost estimation for different providers
- [ ] Multiple API key profiles
- [ ] Auto-detect Ollama running status
- [ ] Model download progress indicator
- [ ] Hybrid mode (local + online fallback)

## Migration Notes

For existing users:
- Old configs will default to local mode
- No API key required for local mode
- Existing localStorage configs remain valid
- Can switch to online mode at any time

## Support

Common issues:
- **"API key required" error**: Add API key in online mode or switch to local mode
- **Connection timeout**: Check Ollama running (`ollama serve`) for local mode
- **401 Unauthorized**: Verify API key is valid for Groq
- **Rate limit exceeded**: Switch to local mode or wait for limit reset

For more help, see [DEPLOYMENT.md](DEPLOYMENT.md).
