# 🚀 Deployment Guide

Follow these steps to get your site live on the internet with automatic updates.

## Step 1: Install Git

### Windows
1. Download from: https://git-scm.com/download/win
2. Run the installer (accept all defaults)
3. Restart terminal/VS Code
4. Verify: Open PowerShell and run `git --version`

## Step 2: Create GitHub Account

1. Go to https://github.com/signup
2. Create free account with email
3. Verify your email

## Step 3: Initialize Git Locally

Open PowerShell/Terminal in your project folder:

```bash
cd c:\Users\4adii\Desktop\are-you-malayali-site

# Initialize git
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit - Are You Malayali community hub"

# Rename branch to 'main'
git branch -M main
```

## Step 4: Create GitHub Repository

1. Log in to GitHub at https://github.com
2. Click **"+"** icon → **"New repository"**
3. Name it: `are-you-malayali-site`
4. Click **"Create repository"** (don't initialize with README)
5. You'll see commands to push existing repo

## Step 5: Connect Local Git to GitHub

Copy & paste these commands (replace YOUR_USERNAME):

```bash
git remote add origin https://github.com/YOUR_USERNAME/are-you-malayali-site.git
git push -u origin main
```

## Step 6: Deploy on Vercel

1. Go to https://vercel.com/signup
2. Click **"Continue with GitHub"**
3. Authorize Vercel to access GitHub
4. Click **"New Project"**
5. Select your `are-you-malayali-site` repository
6. Click **"Import"**
7. Keep default settings → Click **"Deploy"**
8. Wait 2-3 minutes for deployment to finish ✅

**Your live URL will appear!** Example: `https://are-you-malayali-site.vercel.app`

## Step 7: Update Your Site (Weekly/Daily)

Every time you make changes:

```bash
# Make edits in VS Code, then:

git add .
git commit -m "Updated forums" 
git push
```

Vercel will automatically redeploy in ~1-2 minutes! 🚀

## Step 8: Connect Custom Domain (Optional)

If you have a domain like `malayalizone.com`:

1. Go to Vercel Dashboard
2. Select your project
3. Go to **Settings → Domains**
4. Add your domain
5. Follow DNS setup instructions from your domain provider

---

## Troubleshooting

### "Git is not recognized"
- Git isn't installed. Download from https://git-scm.com
- Restart terminal after installation

### "Remote already exists"
```bash
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/are-you-malayali-site.git
```

### "Push rejected"
```bash
git pull origin main --allow-unrelated-histories
git push
```

### Vercel build fails
- Check that `npm run build` works locally:
  ```bash
  npm run build
  ```
- If it fails, fix errors in console

---

## Advanced: Enable Auto-Reload for Forums

To persist forum posts between refreshes, add this to `App.jsx`:

```jsx
// After forumPosts state declaration:
useEffect(() => {
  localStorage.setItem('forumPosts', JSON.stringify(forumPosts));
}, [forumPosts]);

useEffect(() => {
  const saved = localStorage.getItem('forumPosts');
  if (saved) setForumPosts(JSON.parse(saved));
}, []);
```

This saves posts to browser storage!

---

## Need Help?

- Vercel Docs: https://vercel.com/docs
- GitHub Help: https://docs.github.com
- Vite Guide: https://vitejs.dev/guide/
