# 🚀 Dual-Model System Guide

## 📋 Overview

This project implements a **specialized dual-model architecture** optimized for RTX 3050 4GB VRAM. The system automatically selects the appropriate model and prompt based on the task.

## 🎯 Model Assignment

### Smart Model (deepseek-r1:8b)
**Purpose:** Discovery & Weaponization  
**Tasks:**
- Finding injection points
- Generating attack payloads
- Vulnerability discovery
- Creative exploit generation

**Configuration:**
- Temperature: `0.6` (Allows creativity for diverse payloads)
- Max Tokens: `4096`
- VRAM Usage: ~4GB
- Keep Alive: `1m` (Unloads after 1 minute of inactivity)

**Used for prompts containing:**
- "find injection points"
- "generate payloads"
- "test for [vulnerability]"
- General security analysis requests

---

### Fast Model (deepseek-r1:1.5b)
**Purpose:** Response Analysis & Triage  
**Tasks:**
- Analyzing HTTP responses
- Vulnerability verdict (Success/Suspicious/Failure)
- Evidence extraction
- Quick pattern matching

**Configuration:**
- Temperature: `0.1` (Precision mode for accurate verdicts)
- Max Tokens: `4096`
- VRAM Usage: ~1.5GB
- Keep Alive: `1m` (Unloads after 1 minute of inactivity)

**Used for prompts containing:**
- "analyze" keyword
- Context with "Response:" section
- Vulnerability triage requests

---

## 🧠 System Prompts

### Discovery Prompt (Smart Model)
Focuses on:
- Comprehensive attack surface analysis
- High-quality payload generation (10-15 max)
- WAF bypass techniques
- Risk categorization (HIGH/MEDIUM/LOW)
- Detailed explanations

### Analysis Prompt (Fast Model)
Focuses on:
- Quick vulnerability triage
- Evidence-based verdicts
- Exact quote extraction from responses
- Conservative assessment (if unclear → FAILURE)
- Brief forensic summaries

---

## 💾 VRAM Management

### The Problem
RTX 3050 has only 4GB VRAM. Running both models simultaneously would cause:
- GPU memory overflow
- System crashes
- Slow performance

### The Solution
**`keep_alive: "1m"` Parameter**

```javascript
// After 1 minute of inactivity, the model is unloaded from VRAM
keep_alive: "1m"
```

**Workflow Example:**
1. User asks "find injection points" → 8b model loads (~4GB VRAM)
2. After analysis completes, user waits ~60s
3. 8b model unloads automatically
4. User clicks "Analyze Response" → 1.5b model loads (~1.5GB VRAM)
5. Fast analysis completes
6. Cycle repeats smoothly without manual intervention

**Monitor VRAM Usage:**
```bash
# Terminal 1: Run server
node server.js

# Terminal 2: Monitor GPU
watch -n 1 nvidia-smi
```

You'll see VRAM jump between ~4GB (8b) and ~1.5GB (1.5b) as you switch tasks!

---

## 🔧 DeepSeek-R1 Specific Handling

### The Challenge
DeepSeek-R1 models output "thinking process" in `<think>` tags before the actual JSON response:

```xml
<think>
Let me analyze this request...
The filename parameter could be vulnerable...
</think>
{
  "explanation": "...",
  "injectionPoints": [...]
}
```

### The Fix
Server automatically strips `<think>` tags before JSON parsing:

```javascript
// In extractAndCleanJSON()
let cleanedText = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
```

This ensures `JSON.parse()` never fails due to reasoning text.

---

## 📊 Performance Characteristics

### Smart Model (8b)
- **Speed:** ~3-8 seconds per request
- **Quality:** Excellent (sophisticated payloads)
- **Use Case:** When quality matters more than speed
- **Best For:** Initial vulnerability discovery, payload generation

### Fast Model (1.5b)
- **Speed:** ~1-3 seconds per request
- **Quality:** Good (accurate verdicts)
- **Use Case:** When speed matters (analyzing 50+ responses)
- **Best For:** Bulk testing, quick triage, CI/CD integration

---

## 🎯 Example Usage Patterns

### Pattern 1: Single Target Deep Dive
```
1. Paste HTTP request
2. "find injection points" → 8b analyzes (4GB VRAM)
3. "generate SQL injection payloads" → 8b generates (4GB VRAM)
4. Wait 60s (8b unloads)
5. Send request with payload
6. "Analyze Response" → 1.5b triages (1.5GB VRAM)
```

### Pattern 2: Bulk Testing
```
1. "find injection points" once → 8b (4GB VRAM)
2. "generate payloads" once → 8b (4GB VRAM)
3. Wait 60s (8b unloads)
4. Test all 15 payloads → 1.5b analyzes each (1.5GB VRAM)
```

---

## ⚙️ Configuration in UI

```javascript
// Configuration Panel Settings
Smart Model (Discovery):
  Endpoint: http://localhost:11434/v1/chat/completions
  Model: deepseek-r1:8b

Fast Model (Analysis):
  Endpoint: http://localhost:11434/v1/chat/completions
  Model: deepseek-r1:1.5b
```

---

## 🧪 Testing the System

Run the included test suite:

```bash
node test-config.js
```

**Expected Output:**
```
🧪 Testing Configuration Endpoint
✅ Smart model: smart model connected successfully
✅ Fast model: fast model connected successfully

🧠 Testing Smart Model (Injection Points & Payloads)
   Model: deepseek-r1:8b
   Temperature: 0.6 (Creative)
✅ Smart model responded in 4523ms
✓ Found 2 injection points

⚡ Testing Fast Model (Response Analysis)
   Model: deepseek-r1:1.5b
   Temperature: 0.1 (Precise)
✅ Fast model responded in 1847ms
✓ Verdict: success
✓ Confidence: 85%

🎉 All tests passed!
```

---

## 🐛 Troubleshooting

### Issue: "Connection refused"
**Solution:** Make sure Ollama is running
```bash
ollama serve
```

### Issue: VRAM still at 4GB after switching
**Solution:** Wait the full 60 seconds for `keep_alive` timeout

### Issue: Slow response times
**Solutions:**
- Reduce `max_tokens` to 2048
- Use smaller models (3b/1b)
- Increase `keep_alive` to keep models loaded longer

### Issue: JSON parse errors
**Solution:** Already handled! The system:
1. Strips `<think>` tags automatically
2. Extracts JSON from markdown blocks
3. Repairs truncated JSON
4. Shows helpful error messages

---

## 🎓 Technical Deep Dive

### Why Temperature Matters

**Discovery (0.6):**
- Allows model to be creative
- Generates diverse payloads (not just basic ones)
- Produces WAF bypass variants
- Trade-off: Slight risk of invalid JSON (handled by repair logic)

**Analysis (0.1):**
- Enforces deterministic output
- Same input → same verdict (good for testing)
- Reduces hallucination risk
- Ensures accurate verdicts

### Why Separate Prompts Matter

**Size Comparison:**
- Combined prompt: ~2800 tokens → Slower inference
- Discovery prompt: ~800 tokens → Faster, focused
- Analysis prompt: ~600 tokens → Even faster

**Benefits:**
- Models focus on specific task
- Less confusion about expected output format
- Better JSON compliance
- Faster response times (less context to process)

---

## 🚀 Advanced Optimization

### For 6GB+ VRAM
Increase `keep_alive` to keep models loaded:
```javascript
keep_alive: "5m"  // Models stay loaded 5 minutes
```

### For 2GB VRAM (Integrated graphics)
Use even smaller models:
```javascript
Smart Model: deepseek-r1:3b  // ~2GB
Fast Model: deepseek-r1:1b   // ~800MB
```

### For Multiple GPUs
Configure Ollama to use specific GPU:
```bash
CUDA_VISIBLE_DEVICES=0 ollama serve  # First GPU
CUDA_VISIBLE_DEVICES=1 ollama serve  # Second GPU
```

---

## 📚 References

- [Ollama Documentation](https://github.com/ollama/ollama)
- [DeepSeek-R1 Model Card](https://huggingface.co/deepseek-ai/DeepSeek-R1)
- [OpenAI API Compatibility](https://platform.openai.com/docs/api-reference)

---

## 💡 Pro Tips

1. **Monitor VRAM during testing** - Use `nvidia-smi` to verify model swapping works
2. **Batch payload testing** - Generate payloads once, analyze many responses with fast model
3. **Adjust keep_alive based on workflow** - If you're slow between requests, decrease it
4. **Use tmux/screen** - Run Ollama in persistent session
5. **Pre-load models** - Run `ollama run deepseek-r1:8b` once to pull model before testing

---

**System Status:** ✅ Production Ready  
**Optimized For:** RTX 3050 4GB VRAM  
**Compatible With:** Any OpenAI-compatible endpoint (Ollama, LM Studio, LocalAI)
