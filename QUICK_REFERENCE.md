# 🎯 Quick Reference Card - Dual-Model System

## Model Selection Logic

```
┌─────────────────────────────────────────────────────────────┐
│  User Action                    →  Model Used               │
├─────────────────────────────────────────────────────────────┤
│  "find injection points"        →  Smart (8b) - Discovery   │
│  "generate payloads"            →  Smart (8b) - Discovery   │
│  "test for SQL injection"       →  Smart (8b) - Discovery   │
│  "what vulnerabilities exist?"  →  Smart (8b) - Discovery   │
│                                                              │
│  "Analyze Response" button      →  Fast (1.5b) - Analysis   │
│  Prompt contains "analyze"      →  Fast (1.5b) - Analysis   │
│  Context has "Response:"        →  Fast (1.5b) - Analysis   │
└─────────────────────────────────────────────────────────────┘
```

## Configuration Values

### Smart Model (Discovery)
```javascript
{
  endpoint: "http://localhost:11434/v1/chat/completions",
  model: "deepseek-r1:8b",
  temperature: 0.6,      // Creative
  keep_alive: "1m"       // Auto-unload
}
```

### Fast Model (Analysis)
```javascript
{
  endpoint: "http://localhost:11434/v1/chat/completions",
  model: "deepseek-r1:1.5b",
  temperature: 0.1,      // Precise
  keep_alive: "1m"       // Auto-unload
}
```

## Workflow Example

```
1. User pastes HTTP request
   ↓
2. User types: "find injection points"
   ↓
3. Backend detects: DISCOVERY mode
   ↓
4. Loads: deepseek-r1:8b (~4GB VRAM)
   ↓
5. Uses: systemPromptDiscovery
   ↓
6. Temp: 0.6 (creative payloads)
   ↓
7. Returns: Injection points + payloads
   ↓
8. [60 seconds pass - model unloads]
   ↓
9. User clicks: "Analyze Response"
   ↓
10. Backend detects: ANALYSIS mode
    ↓
11. Loads: deepseek-r1:1.5b (~1.5GB VRAM)
    ↓
12. Uses: systemPromptAnalysis
    ↓
13. Temp: 0.1 (precise verdict)
    ↓
14. Returns: Verdict + Evidence
```

## Response Structures

### Discovery Response
```json
{
  "explanation": "Attack surface analysis...",
  "injectionPoints": [
    {
      "name": "filename",
      "location": "Body (JSON)",
      "risk": "HIGH",
      "reason": "User-controlled path parameter"
    }
  ],
  "payloads": [
    "../../etc/passwd",
    "../../../windows/win.ini",
    "....//....//etc/passwd"
  ]
}
```

### Analysis Response
```json
{
  "explanation": "SQL error found: MySQL syntax error",
  "verdict": "success",
  "confidence": 95,
  "evidence": [
    "Error: You have an error in your SQL syntax",
    "near ''1'='1'' at line 1"
  ]
}
```

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| `Connection refused` | Run `ollama serve` |
| `Model not found` | Run `ollama pull deepseek-r1:8b` |
| `JSON parse error` | Already handled by `<think>` tag removal |
| `VRAM full` | Wait 60s for `keep_alive` timeout |
| `Wrong model used` | Check prompt contains correct keywords |

## Testing Commands

```bash
# Start Ollama
ollama serve

# Pull models (one-time)
ollama pull deepseek-r1:8b
ollama pull deepseek-r1:1.5b

# Start server
node server.js

# Run tests
node test-config.js

# Monitor VRAM (optional)
watch -n 1 nvidia-smi
```

## API Endpoints

### Test Configuration
```bash
POST /api/ai-test
Body: {
  "endpoint": "http://localhost:11434/v1/chat/completions",
  "model": "deepseek-r1:8b",
  "type": "smart"
}
```

### AI Analysis (Auto-selects model)
```bash
POST /api/ai-analyze
Body: {
  "prompt": "find injection points",
  "context": "POST /api/...",
  "config": {
    "endpoint": "...",
    "model": "..."
  }
}
```

## Log Output Examples

### Discovery Mode
```
[AI] Mode: DISCOVERY (Smart)
[AI] Using model: deepseek-r1:8b at http://localhost:11434/v1/chat/completions
[AI] Temperature: 0.6
[AI] Prompt: find injection points...
[AI] Response length: 1234 characters
[AI] ✓ Successfully parsed JSON response
```

### Analysis Mode
```
[AI] Mode: ANALYSIS (Fast)
[AI] Using model: deepseek-r1:1.5b at http://localhost:11434/v1/chat/completions
[AI] Temperature: 0.1
[AI] Prompt: Analyze this HTTP response...
[AI] Response length: 567 characters
[AI] ✓ Successfully parsed JSON response
```

## Keyboard Shortcuts (Frontend)

| Key | Action |
|-----|--------|
| `Enter` in chat | Send AI prompt (uses smart model) |
| `Ctrl+Enter` in request editor | Send HTTP request |
| `Ctrl+Shift+A` | Analyze Response (uses fast model) |

## Browser Console Logs

```javascript
// Check current config
console.log(state.config);

// Output:
{
  smart: {
    endpoint: "http://localhost:11434/v1/chat/completions",
    model: "deepseek-r1:8b"
  },
  fast: {
    endpoint: "http://localhost:11434/v1/chat/completions",
    model: "deepseek-r1:1.5b"
  }
}
```

## Performance Benchmarks (RTX 3050 4GB)

| Task | Smart (8b) | Fast (1.5b) |
|------|-----------|-------------|
| Find injection points | ~5s | N/A |
| Generate 15 payloads | ~6s | N/A |
| Analyze response | N/A | ~2s |
| VRAM usage | 4GB | 1.5GB |
| Model load time | ~3s | ~1s |
| Model unload time | ~1s | ~0.5s |

## Troubleshooting Checklist

- [ ] Ollama is running (`ollama serve`)
- [ ] Models are pulled (`ollama list`)
- [ ] Server is running (`node server.js`)
- [ ] Configuration is saved (click 💾 Save)
- [ ] Browser console has no errors (F12)
- [ ] Backend logs show correct model
- [ ] VRAM is below 4GB limit

## URLs

- Frontend: `http://localhost:3000`
- API Health: `http://localhost:3000/api/health`
- Ollama API: `http://localhost:11434/api/tags`

## Model Alternatives

### For 6GB+ VRAM
```javascript
Smart: deepseek-r1:14b  // ~6GB
Fast: deepseek-r1:3b    // ~2GB
```

### For 2GB VRAM (CPU/iGPU)
```javascript
Smart: deepseek-r1:3b   // ~2GB
Fast: deepseek-r1:1b    // ~800MB
```

### For Cloud API
```javascript
Smart: llama-3.3-70b-versatile  // Groq
Fast: llama-3.1-8b-instant      // Groq
```

---

**Last Updated:** February 14, 2026  
**Documentation:** [DUAL_MODEL_GUIDE.md](DUAL_MODEL_GUIDE.md)  
**Full Details:** [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)
