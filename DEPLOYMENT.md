# Deployment Guide

This tool supports two deployment modes to fit different use cases:

## 🏠 Local Mode (Self-Hosted with Ollama)

**Best for:** Privacy-focused users, technical teams, unlimited usage without API costs

**Requirements:**
- Ollama installed locally
- Downloaded models (deepseek-r1:7b + deepseek-r1:1.5b recommended)
- 4-6GB VRAM or CPU resources

**Setup:**
1. Install Ollama: https://ollama.com
2. Pull models:
   ```bash
   ollama pull deepseek-r1:7b
   ollama pull deepseek-r1:1.5b
   ```
3. Clone repository and install dependencies:
   ```bash
   git clone <repo-url>
   cd ai-http-tester
   npm install
   ```
4. Start server:
   ```bash
   npm start
   ```
5. Configure in UI:
   - Select "🏠 Local (Ollama)" mode
   - Keep default endpoints (http://localhost:11434/v1/chat/completions)
   - Save configuration

**Advantages:**
- Complete privacy - no data leaves your machine
- No API rate limits
- No costs after initial setup
- Works offline
- Full control over models

**Disadvantages:**
- Requires local setup
- Needs GPU/CPU resources
- Model download sizes (7GB+ for both models)
- Slower inference on lower-end hardware

---

## ☁️ Online Mode (Groq API)

**Best for:** Quick start, non-technical users, testing without local setup

**Requirements:**
- Free Groq API key
- Internet connection

**Setup:**
1. Get free API key at https://console.groq.com
   - 14,400 requests per day
   - No credit card required
2. Download the pre-built release or clone repository:
   ```bash
   git clone <repo-url>
   cd ai-http-tester
   npm install
   npm start
   ```
3. Configure in UI:
   - Select "☁️ Online (Groq)" mode
   - Enter your API key
   - Keep default models (llama-3.3-70b-versatile + llama-3.1-8b-instant)
   - Save configuration

**Advantages:**
- No local setup required
- No GPU/VRAM needed
- Fast inference (Groq's LPU technology)
- Works on any device
- Free tier is generous (14,400 req/day)

**Disadvantages:**
- Requires internet connection
- Data sent to Groq API (review their privacy policy)
- Rate limits apply (generous but finite)
- Depends on external service availability

---

## Mode Comparison

| Feature | Local Mode | Online Mode |
|---------|-----------|-------------|
| Privacy | ✅ Complete | ⚠️ Depends on provider |
| Setup Time | 30min - 1hr | 5 minutes |
| Cost | Free (after setup) | Free tier available |
| Speed | Depends on hardware | Fast (LPU) |
| Offline | ✅ Yes | ❌ No |
| Rate Limits | ❌ None | ✅ 14,400/day |
| GPU Required | Recommended | ❌ No |

---

## Dual Model Architecture

Both modes use a dual-model approach for optimal performance:

**Smart Model (Injection + Payloads):**
- Local: deepseek-r1:7b (3.5-4GB VRAM)
- Online: llama-3.3-70b-versatile
- Purpose: Find injection points, generate creative payloads
- Temperature: 0.6 (balanced creativity)

**Fast Model (Response Analysis):**
- Local: deepseek-r1:1.5b (1.5GB VRAM)
- Online: llama-3.1-8b-instant
- Purpose: Quick response analysis and triage
- Temperature: 0.1 (consistent, factual)

---

## Switching Between Modes

You can switch modes anytime in the configuration panel:

1. Click "⚙️ Configure LLM" button
2. Select desired mode (Local/Online)
3. Enter API key if switching to Online mode
4. Click "💾 Save Configuration"
5. Click "🧪 Test Connection" to verify

Configurations are saved in browser localStorage and persist between sessions.

---

## Recommendations

**Choose Local Mode if:**
- You have GPU with 4GB+ VRAM
- Privacy is critical
- You'll use the tool frequently
- You're comfortable with technical setup

**Choose Online Mode if:**
- You want to try the tool quickly
- You don't have GPU resources
- You need it to work on multiple devices
- Setup time is a constraint

**Hybrid Approach:**
- Use Online mode during evaluation
- Switch to Local mode for production security testing
- Keep both configurations saved for flexibility
