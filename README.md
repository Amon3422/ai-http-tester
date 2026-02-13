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
* **AI Engine:** Groq API (`llama-3.3-70b-versatile`) - **Free tier: 14,400 requests/day**.
* **HTTP Client:** Axios.

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

### 1. Get Groq API Key (Free)
1. Visit [console.groq.com](https://console.groq.com)
2. Sign up (GitHub/Google login available)
3. Navigate to "API Keys" → Create new key
4. Copy your API key

### 2. Setup Project
```bash
# Clone or download the project
cd ai-http-tester

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env and add your API key:
# GROQ_API_KEY=gsk_your_actual_key_here

# Start server
npm start
```

### 3. Open Browser
Visit `http://localhost:3000` and start testing!

## ✨ Features

- 🎯 **AI-Powered Injection Point Detection** - Automatically finds vulnerable parameters
- 🔬 **Smart Payload Generation** - Creates 10-15 attack payloads with WAF bypass techniques  
- 📊 **Response Analysis** - AI analyzes responses for successful exploits
- 📜 **Request History** - Track all tests with verdict updates
- 💾 **Export History** - Save test results to JSON
- 🎨 **Dark Theme** - VS Code-inspired interface

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
