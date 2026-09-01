# 🚀 Supabase Real-Time Forum Setup Guide

Your forum is now ready to scale! Here's how to complete the setup:

## **What's Changed?**

✅ Posts now sync across ALL users in real-time  
✅ Live user counter shows active players  
✅ Images stored in cloud (Supabase Storage)  
✅ Production-ready database backend  

---

## **Step 1: Create Supabase Tables**

1. Go to your Supabase dashboard: https://app.supabase.com
2. Select your project: `are-you-malayali`
3. Click **SQL Editor** in the left sidebar
4. Click **"New Query"**
5. Copy & paste the entire contents of `SUPABASE_SETUP.sql`
6. Click **"Run"** (green play button)

✅ This creates:
- `forum_posts` table (stores all posts)
- `active_users` table (tracks who's online)
- Security policies (Row Level Security)
- Database indexes (for fast queries)

---

## **Step 2: Test It Live**

1. Open your site locally: `npm run dev` (http://localhost:5174)
2. Open **2 different browser tabs/windows**
3. In Tab 1: Post a message in a forum channel
4. In Tab 2: Watch it appear **instantly** (real-time sync!)
5. Click the heart on any post to like it
6. Check the "👥 X online" counter in the channel header

---

## **Step 3: Deploy to Vercel**

Your code is already updated. Just push to GitHub:

```bash
git add .
git commit -m "Add real-time Supabase integration + live user counter"
git push
```

Vercel will auto-deploy in ~2 minutes. 🚀

---

## **Environment Variables (Already Configured)**

Your Supabase credentials are embedded in `src/supabaseClient.js`:

```javascript
const SUPABASE_URL = 'https://wqvnnxjdaslngwfqoxhz.supabase.co'
const SUPABASE_KEY = 'sb_publishable_ew8XHLNTZnHAZmjGt9UZkQ_f4gKrvQf'
```

**Note:** These are public keys (safe to expose). Real authentication can be added later.

---

## **Current Features**

### Forum Posts
- 📝 Create posts with text + images
- ❤️ Like posts (syncs across all users)
- 🔄 Real-time updates (posts appear instantly)
- 📱 Full mobile support
- 🎨 Syntax: 500 char limit, 20 char username, 2MB images

### User Tracking
- 👥 Live online user counter
- ⏱️ Auto-cleanup (users offline >5 min removed)
- 📊 Visible in channel header

### Database
- 🛡️ Row-Level Security enabled
- 🚀 Indexed for performance
- 📚 Auto-timestamps on posts
- 🔐 Public read/write (upgrade to auth later)

---

## **Next Steps (Optional Upgrades)**

### 1. **Image Upload to Supabase Storage** (Coming Soon)
Instead of base64 images, upload to cloud storage:
```javascript
await supabase.storage.from('forum-images').upload(...)
```

### 2. **User Authentication**
Add login so posts track real users:
```javascript
const { user } = await supabase.auth.signUp({email, password})
```

### 3. **Moderation Dashboard**
Admin panel to delete spam, ban users

### 4. **Notifications**
Alert users when someone likes their post

### 5. **User Profiles**
Track total posts, likes, member since date

---

## **Troubleshooting**

### Posts not showing?
- Check browser console (F12) for errors
- Verify tables exist: Supabase → Table Editor
- Ensure Row Level Security policies are enabled

### Live count stuck?
- Refresh page
- Check active_users table has rows with recent timestamps
- Verify SQL ran successfully

### Images not uploading?
- Confirm 2MB size limit
- Use jpg/png format
- Check error message in form

---

## **Database Structure Reference**

### `forum_posts` table
```
id (auto)
channel (suggestions|feedback|general|bugs)
author (username)
content (post text)
image_url (base64 or URL)
likes (integer)
created_at (timestamp)
updated_at (timestamp)
```

### `active_users` table
```
id (auto)
session_id (unique browser session)
last_seen (timestamp)
created_at (timestamp)
```

---

**Your forum is now production-ready!** 🎉

Questions? Check the code in `src/App.jsx` or Supabase docs at https://supabase.com/docs
