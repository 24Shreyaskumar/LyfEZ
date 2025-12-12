# LyfEZ Deployment Guide

## Overview
- **Frontend**: Deployed to Vercel
- **Backend**: Deployed to Railway.app
- **Database**: SQLite (can migrate to PostgreSQL later)

---

## Step 1: Deploy Frontend to Vercel

### 1.1 Go to Vercel
- Visit [vercel.com](https://vercel.com)
- Sign in with GitHub
- Click "Add New..." → "Project"
- Select your `24Shreyaskumar/LyfEZ` repository

### 1.2 Configure Vercel Project
- **Root Directory**: Leave empty (Vercel will auto-detect)
- **Framework**: Vite
- **Build Command**: `cd frontend && npm run build`
- **Output Directory**: `frontend/dist`
- **Install Command**: `cd frontend && npm install`

### 1.3 Environment Variables (in Vercel dashboard)
Add under "Settings" → "Environment Variables":
```
VITE_API_URL=https://lyfez-backend.railway.app
```
(Replace with your actual Railway backend URL once deployed)

### 1.4 Deploy
- Click "Deploy"
- Wait ~2 minutes
- Vercel will give you a URL like `https://lyfez.vercel.app`

---

## Step 2: Deploy Backend to Railway

### 2.1 Go to Railway
- Visit [railway.app](https://railway.app)
- Sign in with GitHub
- Click "New Project"
- Select "Deploy from GitHub repo"
- Choose `24Shreyaskumar/LyfEZ`

### 2.2 Configure Railway Project
In Railway dashboard:
- Click the project
- Go to Settings
- Set **Root Directory** to `backend`
- Railway will pick up `backend/Dockerfile` automatically (no extra commands needed)

### 2.3 Environment Variables (in Railway dashboard)
Add under "Variables":
```
DATABASE_URL=file:./dev.db
JWT_SECRET=your-super-secret-key-change-this
NODE_ENV=production
PORT=4000
```

### 2.4 Deploy
- Railway auto-deploys from GitHub using the Dockerfile
- Wait for build to complete
- Your backend URL will be something like: `https://lyfez-backend.railway.app`

---

## Step 3: Update Frontend with Backend URL

### 3.1 After Railway deployment
- Note your Railway backend URL
- Go to Vercel project → Settings → Environment Variables
- Update `VITE_API_URL` to your Railway URL
- Redeploy (Vercel will auto-redeploy on next push, or manually trigger)

### 3.2 Or update locally in `.env`:
```
VITE_API_URL=https://your-railway-url.railway.app
```
Then push to GitHub and Vercel redeploys automatically.

---

## Step 4: Update Backend CORS (if needed)

In `backend/src/index.js`, update CORS to allow your Vercel domain:

```javascript
app.use(cors({
  origin: ['https://your-vercel-domain.vercel.app', 'http://localhost:3001'],
  credentials: true
}));
```

---

## Verification Checklist

- [ ] Frontend deployed to Vercel and accessible
- [ ] Backend deployed to Railway and healthy
- [ ] Frontend can communicate with backend API
- [ ] Database migrations ran successfully
- [ ] Login/Register works
- [ ] Create group works
- [ ] Submit activity works
- [ ] Review submissions works
- [ ] Calendar loads
- [ ] Dark mode works

---

## Troubleshooting

### "Failed to fetch API"
→ Check VITE_API_URL environment variable in Vercel

### "Prisma generation failed"
→ Make sure Railway build includes: `npx prisma generate`

### "CORS error"
→ Update CORS origin in backend/src/index.js

### "Database not found"
→ Ensure DATABASE_URL is set in Railway

---

## To Monitor

**Vercel**: vercel.com → your project → "Analytics"
**Railway**: railway.app → your project → "Logs"

---

## Future Improvements

- [ ] Migrate SQLite to PostgreSQL for production
- [ ] Add environment-specific configs
- [ ] Set up CI/CD for tests
- [ ] Add error tracking (Sentry)

