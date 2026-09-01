# 🌿 Are You Malayali? — Community Hub

The official community website for [RELAPSE] Are You Malayali, a high-end Roblox experience created by **Dios Productions**.

## Features

- 🎮 Game information & launch links
- 📰 Latest updates feed
- 💬 **Fully functional community forums** with:
  - 🎵 Song Suggestions channel
  - ⭐ Feedback & Ideas channel
  - 🎮 General Discussion channel
  - 🐛 Bug Reports channel
- 🖼️ Image uploads in posts
- ❤️ Like system for posts
- 🚫 Spam protection & validation
- 📱 Fully responsive design

## Tech Stack

- **Frontend**: React 19 + Vite
- **Styling**: Pure CSS with gradients & animations
- **Hosting**: Vercel (auto-deploy on push)
- **State**: React hooks (localStorage ready)

## Local Development

### Prerequisites
- Node.js 18+
- Git (for version control)

### Setup

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/are-you-malayali-site.git
cd are-you-malayali-site

# Install dependencies
npm install

# Start dev server
npm run dev
```

Dev server runs at: `http://localhost:5174/`

### Available Scripts

```bash
npm run dev      # Start development server with hot reload
npm run build    # Build for production
npm run preview  # Preview production build locally
npm run lint     # Run Oxlint
```

## Deployment

### Automatic Deployment on Vercel (Recommended)

1. **Create GitHub account** (free at github.com)

2. **Push code to GitHub:**
   ```bash
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git push -u origin main
   ```

3. **Deploy on Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New..." → "Project"
   - Import your GitHub repository
   - Click "Deploy"
   - Done! Your site is live

4. **Update workflow:**
   ```bash
   # Make changes locally
   git add .
   git commit -m "Your update message"
   git push
   # Vercel automatically deploys in ~1-2 minutes
   ```

### Get a Custom Domain

- Use Vercel's free subdomain or connect custom domain
- Vercel provides 1 free SSL certificate

## Project Structure

```
src/
├── App.jsx          # Main component with forums
├── App.css          # All styling
├── main.jsx         # React entry point
├── index.css        # Global styles
└── assets/          # Images & icons
public/
└── assets/          # Static assets
```

## Forum Features

- **Character limits**: Username (20), Message (500)
- **Image uploads**: Up to 2MB per image
- **Spam protection**: 2-second cooldown between posts
- **Real-time updates**: Posts appear instantly
- **Like system**: Toggle ❤️/🤍

## Credits

- **Owner & Developer**: Aadi
- **Co-Developer**: Kaniel
- **Manager**: Venix
- **GFX & Thumbnails**: Fluffy
- **Studio**: Dios Productions

## Links

- [Play on Roblox](https://www.roblox.com/games/105872949117236/Are-You-Malayali)
- [Dios Productions](https://www.roblox.com/groups/16048950)

---

Made with 💚 for the Malayali community
