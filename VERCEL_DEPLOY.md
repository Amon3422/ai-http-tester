# Vercel Deployment Guide

## Prerequisites
- [Vercel account](https://vercel.com/signup) (free tier works)
- [Vercel CLI](https://vercel.com/docs/cli) installed: `npm i -g vercel`
- Google Gemini API key

## Deployment Steps

### Option 1: Deploy via Vercel CLI (Recommended)

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy from project directory**:
   ```bash
   vercel
   ```
   
   Follow the prompts:
   - Set up and deploy? **Y**
   - Which scope? Select your account
   - Link to existing project? **N**
   - What's your project's name? **ai-http-tester** (or keep default)
   - In which directory is your code located? **.**
   - Want to override settings? **N**

4. **Add Environment Variable** (CRITICAL):
   ```bash
   vercel env add GEMINI_API_KEY
   ```
   - Select: **Production, Preview, Development**
   - Paste your Gemini API key

5. **Redeploy with environment variables**:
   ```bash
   vercel --prod
   ```

### Option 2: Deploy via Vercel Dashboard

1. **Push code to GitHub**:
   ```bash
   git add .
   git commit -m "Add Vercel deployment config"
   git push
   ```

2. **Import project on Vercel**:
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your GitHub repository
   - Click "Deploy"

3. **Add Environment Variable**:
   - Go to Project Settings → Environment Variables
   - Add: `GEMINI_API_KEY` = `your-api-key`
   - Select: Production, Preview, Development
   - Save and trigger new deployment

## Configuration Files

### vercel.json
Configures Vercel build and routing:
- Routes API calls to `server.js`
- Serves static files (HTML/CSS/JS)
- Sets environment variable reference

### .vercelignore
Excludes files from deployment:
- `node_modules` (Vercel installs fresh)
- `.env` (use Vercel env vars instead)
- Documentation files

## Post-Deployment

### Test Your Deployment:
```bash
# Your app will be at:
https://ai-http-tester-xxx.vercel.app
```

### View Logs:
```bash
vercel logs
```

### Update Deployment:
```bash
# Make changes, then:
vercel --prod
```

## Troubleshooting

### Issue: "GEMINI_API_KEY not configured"
**Solution**: Add environment variable via CLI or dashboard (see step 4 above)

### Issue: "Function exceeds maximum size"
**Solution**: Increase function size limit in vercel.json:
```json
{
  "functions": {
    "api/**/*.js": {
      "maxDuration": 60
    }
  }
}
```

### Issue: API calls failing with CORS errors
**Solution**: Vercel deployment automatically handles CORS via `cors()` middleware in server.js

### Issue: Static files not loading
**Solution**: Ensure files are in root directory (index.html, style.css, script.js)

## Local vs Production

The server automatically detects the environment:
- **Local**: Runs on `http://localhost:3000`
- **Vercel**: Runs as serverless function

No code changes needed between environments!

## Updating API Key

To update your Gemini API key on Vercel:
```bash
vercel env rm GEMINI_API_KEY
vercel env add GEMINI_API_KEY
vercel --prod
```

## Free Tier Limits

Vercel Free Tier includes:
- ✅ Unlimited deployments
- ✅ 100GB bandwidth/month
- ✅ Automatic SSL
- ✅ Serverless functions
- ⚠️ 10-second function timeout

For production use with heavy traffic, consider Vercel Pro.

## Support

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Community](https://github.com/vercel/vercel/discussions)
