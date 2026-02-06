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

* **Frontend:** React (Vite), Tailwind CSS (3-panel dashboard).
* **Backend:** Node.js, Express (Acts as a Proxy to handle CORS and hide API Keys).
* **AI Engine:** OpenAI API (`gpt-4o-mini`).
* **HTTP Client:** Axios.

## 📂 Project Structure

The project is divided into two main folders:

```bash
ai-http-tester/
├── client/     # Frontend (React + Vite) running on port 5173
└── server/     # Backend (Node.js + Express) running on port 3000
