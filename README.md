# 🛡️ AI HTTP Tester

> A smart web tool that automates HTTP vulnerability testing using AI.
> **Status:** MVP in Development 🚧

## 📖 Overview

**AI HTTP Tester** is a web-based utility designed to bridge the gap between manual security testing and automation. It allows security testers (and developers) to:
1.  Paste a **Raw HTTP Request** (from Burp Suite or DevTools).
2.  Use AI to automatically identify **injection points**.
3.  Generate and execute malicious payloads (SQLi, XSS, Path Traversal, etc.).
4.  Analyze responses to verify if an exploit was successful.

This tool solves the "boring part" of pentesting: manually modifying and repeating requests dozens of times.

## 🏗️ Tech Stack

* **Frontend:** Vanilla JavaScript, HTML5, CSS3 (Dark VS Code theme).
* **Backend:** Node.js, Express (Acts as CORS proxy and API gateway).
* **AI Engine:** Configurable - supports local LLMs (Ollama, LM Studio) or cloud APIs (Groq, OpenAI).
* **HTTP Client:** Axios.

## 🆕 Dual-Model Configuration

The tool now supports **two separate AI models** for optimal performance:

- 🧠 **Smart Model** - For complex tasks like injection point detection and payload generation
  - Recommended: `deepseek-r1:8b` or similar 7B+ parameter models
  - Higher accuracy and creativity for security analysis
  - Specialized prompt: Focuses on discovery and weaponization
  - Temperature: 0.6 (creative payload generation)

- ⚡ **Fast Model** - For quick response analysis
  - Recommended: `deepseek-r1:1.5b` or similar lightweight models
  - Faster response times for verdict analysis
  - Specialized prompt: Focuses on evidence-based triage
  - Temperature: 0.1 (precise verdicts)

**VRAM Optimization:** Models auto-unload after 1 minute (`keep_alive: "1m"`), enabling smooth switching on GPUs with limited VRAM (e.g., RTX 3050 4GB).

📘 **[Read the complete Dual-Model System Guide →](DUAL_MODEL_GUIDE.md)**

## 📂 Project Structure

Single-page application with backend proxy:

```bash
ai-http-tester/
├── index.html      # Main UI (3-panel layout)
├── script.js       # Frontend logic
├── style.css       # Dark theme styling
├── server.js       # Backend proxy + AI integration
├── package.json    # Dependencies
└── .env           # API keys (create from .env.example)
```

## 🚀 Quick Start

### Option 1: Local LLM (Recommended - Ollama)

1. **Install Ollama:**
   ```bash
   # Visit https://ollama.ai to download and install
   # Or use: curl https://ollama.ai/install.sh | sh
   ```

2. **Pull Models:**
   ```bash
   # Smart model (for injection points & payloads)
   ollama pull deepseek-r1:8b
   
   # Fast model (for response analysis)
   ollama pull deepseek-r1:1.5b
   ```

3. **Start Ollama:**
   ```bash
   ollama serve
   # Runs on http://localhost:11434 by default
   ```

4. **Verify Setup (Recommended):**
   ```bash
   node diagnose-ollama.js
   # This will check if Ollama is running and models are installed
   ```

5. **Setup Project:**
   ```bash
   cd ai-http-tester
   npm install
   npm start
   ```

5. **Configure in Browser:**
   - Open http://localhost:3000
   - Click **⚙️ Configuration** button
   - Set Smart Model:
     - Endpoint: `http://localhost:11434/v1/chat/completions`
     - Model: `deepseek-r1:8b`
   - Set Fast Model:
     - Endpoint: `http://localhost:11434/v1/chat/completions`
     - Model: `deepseek-r1:1.5b`
   - Click **💾 Save Configuration**
   - Click **🧪 Test Connection** to verify

### Option 2: Cloud API (Groq)

1. **Get API Key:**
   - Visit [console.groq.com](https://console.groq.com)
   - Sign up and create an API key

2. **Configure in Browser:**
   - Smart Model Endpoint: `https://api.groq.com/openai/v1/chat/completions`
   - Smart Model: `llama-3.3-70b-versatile`
   - Fast Model: Same endpoint and model (or use `llama-3.1-8b-instant`)
   
   Note: You'll need to modify the backend to include Authorization header for cloud APIs.

### 3. Start Testing!
Visit `http://localhost:3000` and start testing!

## ✨ Features

- ⚙️ **Dual-Model Configuration** - Separate smart and fast models for optimal performance
- 🏠 **Local LLM Support** - Use Ollama, LM Studio, or any OpenAI-compatible endpoint
- 🎯 **AI-Powered Injection Point Detection** - Automatically finds vulnerable parameters
- 🔬 **Smart Payload Generation** - Creates 10-15 attack payloads with WAF bypass techniques  
- 📊 **Response Analysis** - AI analyzes responses for successful exploits
- 📜 **Request History** - Track all tests with verdict updates
- 💾 **Export History** - Save test results to JSON
- 🎨 **Dark Theme** - VS Code-inspired interface

## 🧪 Testing the Configuration

Run the test suite to verify your setup:

```bash
node test-config.js
```

This will test:
- Configuration endpoint connectivity
- Smart model response (injection point detection)
- Fast model response (vulnerability analysis)

## 🎯 Usage Example

1. **Paste HTTP Request**: Copy raw request from Burp/DevTools
2. **Ask AI**: Type "test for SQL injection" 
3. **Select Payload**: Choose from generated payloads dropdown
4. **Send Request**: Click "Send Request" with payload applied
5. **Analyze**: Click "Analyze Response" for AI verdict

## ⚠️ Legal Disclaimer

This tool is for **authorized security testing only**. Only test applications you own or have written permission to test.

## 📝 License

MIT License - Free to use for educational and professional security testing purposes.
