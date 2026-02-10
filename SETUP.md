# 🚀 Setup Guide - AI HTTP Tester

## Step 3 Complete! AI Integration ✅

All AI features are now implemented and ready to use.

---

## 🔧 Installation

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Google Gemini API Key

1. **Get API Key**: Visit [Google AI Studio](https://aistudio.google.com/app/apikey) and create an API key
2. **Create .env file**:
   ```bash
   cp .env.example .env
   ```
3. **Add your key** to `.env`:
   ```env
   GEMINI_API_KEY=your-actual-key-here
   ```

### 3. Start the Server
```bash
npm start
```

The server will start on **http://localhost:3000**

---

## 📖 Quick Tutorial

### Example 1: Path Traversal Testing

1. **Paste this request** in the left panel:
```
POST /api/download HTTP/1.1
Host: jsonplaceholder.typicode.com
Content-Type: application/json

{"filename": "report.pdf"}
```

2. **In the chat, type**: `"find injection points"`
   - AI will identify `filename` as a vulnerable parameter

3. **Type**: `"generate path traversal payloads"`
   - AI will create 10-15 payloads like `../../etc/passwd`, `../../../windows/win.ini`

4. **Select a payload** from the dropdown and click **Send Request**

5. **Click "Analyze Response"** to see if the attack succeeded

---

### Example 2: SQL Injection Testing

1. **Paste**:
```
GET /api/user?id=123 HTTP/1.1
Host: jsonplaceholder.typicode.com
```

2. **Chat**: `"find injection points"`

3. **Chat**: `"generate sql injection payloads"`

4. **Test payloads** one by one

---

## 💬 AI Commands You Can Use

### Finding Vulnerabilities
- `"find injection points"`
- `"analyze this request for vulnerabilities"`
- `"what parameters are vulnerable?"`

### Generating Payloads
- `"generate path traversal payloads"`
- `"generate SQLi payloads"`
- `"generate XSS payloads"`
- `"give me command injection payloads"`
- `"create IDOR test cases"`

### General Questions
- `"explain this vulnerability"`
- `"what should I test next?"`
- `"how does path traversal work?"`

---

## 🎯 What Works Now (Step 3 Complete)

✅ **HTTP Request Sending** - No CORS issues, full header control
✅ **AI Chat Integration** - Natural language interaction
✅ **Injection Point Detection** - AI identifies vulnerable parameters
✅ **Payload Generation** - 10-15 attack payloads per vulnerability type
✅ **Response Analysis** - AI determines success/failure with confidence
✅ **Test History** - Color-coded tracking of all attempts
✅ **Smart Payload Application** - Auto-replaces values in requests

---

## 🐛 Troubleshooting

### Error: "API key not configured"
- Make sure you created a `.env` file (not `.env.example`)
- Check that your API key is correct
- Restart the server after adding the key

### Error: "Invalid API key"
- Verify your Google Gemini API key is active
- Check for extra spaces in the `.env` file
- Make sure you're using GEMINI_API_KEY (not OPENAI_API_KEY)

### Request Timeout
- The backend has a 30-second timeout
- Some servers may be slow or blocking requests

### CORS Errors (shouldn't happen anymore)
- The Node.js backend acts as a proxy to bypass CORS
- Make sure you're accessing via `http://localhost:3000`

---

## 🔒 Security Note

- **API Key Safety**: Never commit `.env` to git (it's in `.gitignore`)
- **Testing Permission**: Only test systems you're authorized to test
- **Rate Limits**: Google Gemini has API rate limits - avoid rapid-fire requests

---

## 📊 Testing Tips

1. **Start Simple**: Test with known vulnerable practice sites first
2. **Read Responses**: Look for error messages, path disclosures
3. **Try Variations**: If one payload fails, try others
4. **Check History**: Compare successful vs failed attempts
5. **Use AI Analysis**: Don't just guess - let AI verify results

---

## 🎓 Good Practice Sites for Testing

- **JSONPlaceholder** - `jsonplaceholder.typicode.com` (safe API for testing)
- **OWASP WebGoat** - Practice vulnerable web apps
- **HackTheBox** - Legal penetration testing challenges
- **TryHackMe** - Guided security challenges

**Never test production systems without written permission!**

---

## 🚀 What's Next?

Future improvements could include:
- Export test reports
- Automated testing sequences
- Custom payload templates
- More vulnerability types
- Browser extension version
- Local LLM support

---

Happy Testing! 🔐
