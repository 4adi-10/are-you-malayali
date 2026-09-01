import "./App.css";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { supabase } from "./supabaseClient";

// Helper function to format time
const getTimeAgo = (date) => {
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
};

function App() {
  const [forumPosts, setForumPosts] = useState({
    suggestions: [],
    feedback: [],
    general: [],
    bugs: [],
    reports: []
  });

  // Accurate Live Stats
  const [liveUsers, setLiveUsers] = useState(1);
  const [livePlayerCount, setLivePlayerCount] = useState(53);
  const [liveVisits, setLiveVisits] = useState(231895);
  const [liveLikes, setLiveLikes] = useState(498);
  const [liveFavorites, setLiveFavorites] = useState(958);
  const [sessionId] = useState(() => {
    const existing = sessionStorage.getItem('aym_session_id');
    if (existing) return existing;
    const newId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('aym_session_id', newId);
    return newId;
  });

  // Persistent Liked Posts
  const [likedPostIds, setLikedPostIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("aym_liked_posts") || "[]");
    } catch {
      return [];
    }
  });

  // Persistent Username
  const [userName, setUserName] = useState(() => {
    return localStorage.getItem("aym_username") || "";
  });

  const [selectedChannel, setSelectedChannel] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [postImage, setPostImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [lastPostTime, setLastPostTime] = useState({});
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState("newest"); // "newest" | "popular"
  const [lightboxImage, setLightboxImage] = useState(null);
  const [toasts, setToasts] = useState([]);

  // Reply States
  const [replyingTo, setReplyingTo] = useState(null); // { id, author, snippet } | null
  const [expandedReplies, setExpandedReplies] = useState({}); // { [postId]: boolean }

  // Refresh Timer for player count
  const [refreshTimer, setRefreshTimer] = useState(5);

  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  const MAX_USERNAME_LENGTH = 20;
  const MAX_CONTENT_LENGTH = 500;
  const SPAM_COOLDOWN = 2000; // 2 seconds
  const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB

  const channels = {
    general: { title: "🎮 General Discussion", icon: "🎮", description: "Hangout, share stories, memes & connect with Malayali players." },
    suggestions: { title: "🎵 Song & Feature Suggestions", icon: "🎵", description: "Suggest songs for the in-game soundboard, areas, and ideas." },
    feedback: { title: "⭐ Feedback & Ideas", icon: "⭐", description: "Share your thoughts and feedback directly with the devs." },
    bugs: { title: "🐛 Bug Reports", icon: "🐛", description: "Report glitches or performance issues to get them fixed." },
    reports: { title: "🚨 Player & Moderation Reports", icon: "🚨", description: "Report exploiters, rule breakers, or inappropriate behavior to moderators." }
  };

  // Toast Helper
  const showToast = useCallback((message, type = "success") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const handleCloseChannel = useCallback(() => {
    setSelectedChannel(null);
    setPostContent("");
    setPostImage(null);
    setImagePreview(null);
    setReplyingTo(null);
    setError("");
  }, []);

  const handleOpenChannel = useCallback((channelKey, initialText = "") => {
    setSelectedChannel(channelKey);
    if (initialText) {
      setPostContent(initialText);
    }
    setReplyingTo(null);
    setError("");
  }, []);

  // Fetch all posts and structure replies into parent threads
  const fetchAllPosts = useCallback(async () => {
    try {
      const { data, error: fetchErr } = await supabase
        .from('forum_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchErr) throw fetchErr;

      let currentLikes = [];
      try {
        currentLikes = JSON.parse(localStorage.getItem("aym_liked_posts") || "[]");
      } catch {
        currentLikes = [];
      }
      const likedSet = new Set(currentLikes);

      const rawGrouped = {
        general: [],
        suggestions: [],
        feedback: [],
        bugs: [],
        reports: []
      };

      // 1. Parse raw posts and extract replies
      const allParsed = (data || []).map(post => {
        let parentId = null;
        let replyToAuthor = null;
        let cleanText = post.content || "";

        // Check if formatted as [reply:123:@author] text
        const replyMatch = cleanText.match(/^\[reply:(\d+):@([^\]]+)\]\s*(.*)$/s);
        if (replyMatch) {
          parentId = parseInt(replyMatch[1], 10);
          replyToAuthor = replyMatch[2];
          cleanText = replyMatch[3];
        }

        return {
          id: post.id,
          channel: post.channel,
          author: post.author,
          content: cleanText,
          originalContent: post.content,
          image: post.image_url,
          likes: post.likes || 0,
          timestamp: getTimeAgo(new Date(post.created_at)),
          rawDate: new Date(post.created_at).getTime(),
          liked: likedSet.has(post.id),
          parentId,
          replyToAuthor,
          replies: []
        };
      });

      // 2. Build map and attach replies to parent posts
      const postMap = new Map();
      allParsed.forEach(p => postMap.set(p.id, p));

      const topLevelGrouped = {
        general: [],
        suggestions: [],
        feedback: [],
        bugs: [],
        reports: []
      };

      allParsed.forEach(post => {
        if (post.parentId && postMap.has(post.parentId)) {
          // Attach as reply to parent post
          const parent = postMap.get(post.parentId);
          parent.replies.push(post);
        } else {
          // Top-level post
          if (topLevelGrouped[post.channel]) {
            topLevelGrouped[post.channel].push(post);
          } else if (rawGrouped[post.channel]) {
            rawGrouped[post.channel].push(post);
          }
        }
      });

      // Sort replies in chronological order (oldest first)
      Object.keys(topLevelGrouped).forEach(ch => {
        topLevelGrouped[ch].forEach(post => {
          if (post.replies.length > 0) {
            post.replies.sort((a, b) => a.rawDate - b.rawDate);
          }
        });
      });

      setForumPosts(topLevelGrouped);
    } catch (err) {
      console.error('Error loading posts:', err);
    }
  }, []);

  // Supabase Real-time Subscription + Fallback Polling
  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      if (!isMounted) return;
      await fetchAllPosts();
    };

    load();

    // Supabase Real-time Channel
    const channel = supabase
      .channel('public:forum_posts_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'forum_posts' },
        () => {
          load();
        }
      )
      .subscribe();

    // Fallback polling every 8 seconds
    const interval = setInterval(load, 8000);

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [fetchAllPosts]);

  // Track active users
  useEffect(() => {
    let isMounted = true;
    const trackUser = async () => {
      try {
        const nowIso = new Date().toISOString();
        const { error: upsertError } = await supabase
          .from('active_users')
          .upsert([{ session_id: sessionId, last_seen: nowIso }], {
            onConflict: 'session_id'
          });

        if (upsertError) throw upsertError;

        // Active in last 30 seconds (tight window to avoid ghost counts)
        const cutoff = new Date(Date.now() - 30 * 1000).toISOString();
        const { count, error: countErr } = await supabase
          .from('active_users')
          .select('*', { count: 'exact', head: true })
          .gte('last_seen', cutoff);

        if (countErr) throw countErr;
        if (isMounted) {
          setLiveUsers(Math.max(1, count || 1));
        }
      } catch (err) {
        console.error('Error tracking user:', err);
      }
    };

    // Clean up session on tab/window close
    const cleanupSession = () => {
      // Use sendBeacon for reliable cleanup on close
      const url = `${import.meta.env.VITE_SUPABASE_URL || 'https://wqvnnxjdaslngwfqoxhz.supabase.co'}/rest/v1/active_users?session_id=eq.${sessionId}`;
      const apiKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_ew8XHLNTZnHAZmjGt9UZkQ_f4gKrvQf';
      navigator.sendBeacon?.(url); // best-effort
      // Also try fetch with keepalive
      fetch(url, {
        method: 'DELETE',
        keepalive: true,
        headers: {
          'apikey': apiKey,
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        }
      }).catch(() => {});
    };

    trackUser();
    // Heartbeat every 15 seconds
    const interval = setInterval(trackUser, 15000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        trackUser();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', cleanupSession);
    window.addEventListener('pagehide', cleanupSession);

    return () => {
      isMounted = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', cleanupSession);
      window.removeEventListener('pagehide', cleanupSession);
    };
  }, [sessionId]);

  // Fetch live Roblox player count & stats with auth headers & no-cache
  useEffect(() => {
    let isMounted = true;

    const fetchPlayerCount = async () => {
      try {
        const response = await fetch(
          `https://wqvnnxjdaslngwfqoxhz.supabase.co/functions/v1/hyper-endpoint?_t=${Date.now()}`,
          {
            method: 'GET',
            cache: 'no-store',
            headers: {
              'apikey': 'sb_publishable_ew8XHLNTZnHAZmjGt9UZkQ_f4gKrvQf',
              'Authorization': 'Bearer sb_publishable_ew8XHLNTZnHAZmjGt9UZkQ_f4gKrvQf',
              'Pragma': 'no-cache',
              'Cache-Control': 'no-cache, no-store, must-revalidate'
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (isMounted && data) {
            if (typeof data.playerCount === 'number') {
              setLivePlayerCount(data.playerCount);
            } else if (typeof data.playing === 'number') {
              setLivePlayerCount(data.playing);
            }
            if (typeof data.visits === 'number' && data.visits > 0) {
              setLiveVisits(data.visits);
            }
            if (typeof data.likes === 'number' && data.likes > 0) {
              setLiveLikes(data.likes);
            } else if (typeof data.upVotes === 'number' && data.upVotes > 0) {
              setLiveLikes(data.upVotes);
            }
            if (typeof data.favoritedCount === 'number' && data.favoritedCount > 0) {
              setLiveFavorites(data.favoritedCount);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching live player count:', err);
      }
      // Reset countdown timer after each fetch
      if (isMounted) {
        setRefreshTimer(5);
      }
    };

    fetchPlayerCount();
    // Poll every 5 seconds for live real-time player count
    const interval = setInterval(fetchPlayerCount, 5000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchPlayerCount();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      isMounted = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // Countdown timer that ticks every second
  useEffect(() => {
    const tick = setInterval(() => {
      setRefreshTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  // Keyboard accessibility and body scroll lock
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (lightboxImage) {
          setLightboxImage(null);
        } else if (selectedChannel) {
          handleCloseChannel();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxImage, selectedChannel, handleCloseChannel]);

  useEffect(() => {
    if (selectedChannel || lightboxImage) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [selectedChannel, lightboxImage]);

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_IMAGE_SIZE) {
      setError("Image must be smaller than 2MB");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target?.result);
      setPostImage(event.target?.result);
      setError("");
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setPostImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const validatePost = () => {
    if (!userName.trim()) {
      setError("Please enter a username");
      return false;
    }

    if (userName.length > MAX_USERNAME_LENGTH) {
      setError(`Username must be ${MAX_USERNAME_LENGTH} characters or less`);
      return false;
    }

    if (!postContent.trim()) {
      setError("Please write a message");
      return false;
    }

    if (postContent.length > MAX_CONTENT_LENGTH) {
      setError(`Message must be ${MAX_CONTENT_LENGTH} characters or less`);
      return false;
    }

    const now = Date.now();
    const lastPost = lastPostTime[selectedChannel] || 0;

    if (now - lastPost < SPAM_COOLDOWN) {
      setError("Please wait a moment before posting again");
      return false;
    }

    return true;
  };

  // Start replying to a post
  const handleStartReply = (post) => {
    setReplyingTo({
      id: post.id,
      author: post.author,
      snippet: post.content.length > 50 ? `${post.content.slice(0, 50)}...` : post.content
    });
    // Auto expand replies on parent post
    setExpandedReplies(prev => ({ ...prev, [post.id]: true }));
    setError("");

    // Focus textarea
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  const toggleReplies = (postId) => {
    setExpandedReplies(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!validatePost()) return;

    const trimmedAuthor = userName.trim();
    let finalContent = postContent.trim();

    // If replying, prefix with structured metadata
    if (replyingTo) {
      finalContent = `[reply:${replyingTo.id}:@${replyingTo.author}] ${finalContent}`;
    }

    const imagePayload = postImage;

    // Save username in localStorage
    try {
      localStorage.setItem("aym_username", trimmedAuthor);
    } catch (err) {
      console.error(err);
    }

    try {
      const { error: insertErr } = await supabase
        .from('forum_posts')
        .insert([
          {
            channel: selectedChannel,
            author: trimmedAuthor,
            content: finalContent,
            image_url: imagePayload,
            likes: 0,
            created_at: new Date()
          }
        ]);

      if (insertErr) throw insertErr;

      setLastPostTime({
        ...lastPostTime,
        [selectedChannel]: Date.now()
      });

      setPostContent("");
      setPostImage(null);
      setImagePreview(null);
      setReplyingTo(null);
      showToast(replyingTo ? "💬 Reply posted!" : "✨ Post published to the channel!", "success");
      void fetchAllPosts();
    } catch (err) {
      setError("Failed to post message. Please try again.");
      showToast("❌ Could not post message", "error");
      console.error('Error posting:', err);
    }
  };

  const handleLike = async (channelKey, postId) => {
    const isCurrentlyLiked = likedPostIds.includes(postId);
    const newLikedPostIds = isCurrentlyLiked
      ? likedPostIds.filter((id) => id !== postId)
      : [...likedPostIds, postId];

    setLikedPostIds(newLikedPostIds);
    try {
      localStorage.setItem("aym_liked_posts", JSON.stringify(newLikedPostIds));
    } catch (err) {
      console.error(err);
    }

    const delta = isCurrentlyLiked ? -1 : 1;

    // Optimistically update top level or reply posts
    setForumPosts(prev => {
      const channelPosts = prev[channelKey] || [];
      const updated = channelPosts.map(p => {
        if (p.id === postId) {
          return { ...p, likes: Math.max(0, (p.likes || 0) + delta), liked: !isCurrentlyLiked };
        }
        if (p.replies && p.replies.length > 0) {
          const updatedReplies = p.replies.map(r =>
            r.id === postId
              ? { ...r, likes: Math.max(0, (r.likes || 0) + delta), liked: !isCurrentlyLiked }
              : r
          );
          return { ...p, replies: updatedReplies };
        }
        return p;
      });
      return { ...prev, [channelKey]: updated };
    });

    showToast(isCurrentlyLiked ? "Removed like" : "❤️ Liked post!", "info");

    try {
      // Find current like count to update in DB
      let currentLikes = 0;
      const allPostsInChannel = forumPosts[channelKey] || [];
      for (const p of allPostsInChannel) {
        if (p.id === postId) currentLikes = p.likes;
        if (p.replies) {
          for (const r of p.replies) {
            if (r.id === postId) currentLikes = r.likes;
          }
        }
      }
      const newLikes = Math.max(0, currentLikes + delta);

      const { error: updateErr } = await supabase
        .from('forum_posts')
        .update({ likes: newLikes })
        .eq('id', postId);

      if (updateErr) throw updateErr;
    } catch (err) {
      console.error('Error updating like in db:', err);
    }
  };

  // Social Share
  const handleShare = async () => {
    const shareData = {
      title: "Are You Malayali? | Roblox Community Hub",
      text: "Join the official Are You Malayali community! Chill nature vibes, live stats & active forums.",
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        showToast("Thanks for sharing! 🌿", "success");
      } catch (err) {
        if (err.name !== "AbortError") {
          copyLink();
        }
      }
    } else {
      copyLink();
    }
  };

  const copyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      showToast("🔗 Hub link copied to clipboard!", "success");
    }
  };

  // Sorted Forum Posts for active modal
  const displayedPosts = useMemo(() => {
    if (!selectedChannel || !forumPosts[selectedChannel]) return [];
    const posts = [...forumPosts[selectedChannel]];
    if (sortBy === "popular") {
      return posts.sort((a, b) => b.likes - a.likes || b.rawDate - a.rawDate);
    }
    return posts.sort((a, b) => b.rawDate - a.rawDate);
  }, [selectedChannel, forumPosts, sortBy]);

  return (
    <div className="app">
      {/* TOAST CONTAINER */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>

      {/* NAVBAR */}
      <nav className="navbar">
        <div className="logo">
          <img src="/assets/game-logo.png" alt="Are You Malayali" className="logo-img" />
          <div>
            <strong>Are You Malayali?</strong>
            <small>Dios Productions</small>
          </div>
        </div>

        <div className="nav-links">
          <a href="#home">Home</a>
          <a href="#updates">Updates</a>
          <a href="#forums">Forums</a>
          <a href="#feedback">Feedback & Reports</a>
        </div>

        <div className="nav-actions">
          <button className="icon-action-btn" onClick={handleShare} title="Share Community Hub" aria-label="Share">
            🔗 Share
          </button>
          <a
            className="play-button desktop-play"
            href="https://www.roblox.com/games/105872949117236/Are-You-Malayali"
            target="_blank"
            rel="noreferrer"
          >
            PLAY ON ROBLOX ↗
          </a>
        </div>

        <button
          className={`hamburger ${menuOpen ? "open" : ""}`}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <div className={`mobile-menu ${menuOpen ? "open" : ""}`}>
          <a href="#home" onClick={() => setMenuOpen(false)}>Home</a>
          <a href="#updates" onClick={() => setMenuOpen(false)}>Updates</a>
          <a href="#forums" onClick={() => setMenuOpen(false)}>Forums</a>
          <a href="#feedback" onClick={() => setMenuOpen(false)}>Feedback & Reports</a>
          <button className="mobile-share-btn" onClick={() => { setMenuOpen(false); handleShare(); }}>
            🔗 Share Community Hub
          </button>
          <a
            className="play-button"
            href="https://www.roblox.com/games/105872949117236/Are-You-Malayali"
            target="_blank"
            rel="noreferrer"
          >
            PLAY ON ROBLOX ↗
          </a>
        </div>
      </nav>

      <main>
        {/* HERO SECTION */}
        <section className="hero" id="home">
          <div className="hero-content">
            <div className="badge">🌿 THE OFFICIAL COMMUNITY HUB</div>

            <h1>
              Are You
              <span> Malayali?</span>
            </h1>

            <p>
              Welcome to <strong>[RELAPSE] Are You Malayali?</strong> 🌿✨ A high-end digital sanctuary crafted
              exclusively for the Kerala gaming community. Escape the noise, step into the mist, and experience
              a slice of home right inside Roblox.
            </p>

            <ul className="features">
              <li>🎵 <strong>200+ Mallu Songs</strong> — Massive in-game interactive soundboard featuring your top tracks.</li>
              <li>🍃 <strong>Cinematic Nature</strong> — High-end realistic fog, rain, waterfalls, and peaceful lighting.</li>
              <li>📱 <strong>Smooth Optimization</strong> — High FPS across Mobile, PC, iPad, and Console.</li>
              <li>🤝 <strong>Hangout & Vibe</strong> — Classroom, Library, Campfire, and Teashop hangouts to chill with friends.</li>
            </ul>

            <div className="hero-buttons">
              <a
                className="primary-button hero-play-btn"
                href="https://www.roblox.com/games/105872949117236/Are-You-Malayali"
                target="_blank"
                rel="noreferrer"
              >
                🎮 PLAY ON ROBLOX
              </a>

              <a className="secondary-button" href="#forums">
                💬 JOIN COMMUNITY FORUMS
              </a>
            </div>

            {/* LIVE METRICS BAR */}
            <div className="stats">
              <div className="stat-card">
                <strong>200+</strong>
                <span>Mallu Songs</span>
              </div>

              <div className="stat-card highlight-stat">
                <strong>👥 {liveUsers}</strong>
                <span>Online on Hub</span>
              </div>

              <div className="stat-card highlight-stat">
                <strong>🎮 {livePlayerCount.toLocaleString()}</strong>
                <span>Playing in Roblox</span>
                <small className="refresh-timer">Updates in {refreshTimer}s</small>
              </div>

              <div className="stat-card">
                <strong>👣 {liveVisits.toLocaleString()}</strong>
                <span>Total Visits</span>
              </div>

              <div className="stat-card">
                <strong>👍 {liveLikes.toLocaleString()}</strong>
                <span>Game Likes</span>
              </div>

              <div className="stat-card">
                <strong>⭐ {liveFavorites.toLocaleString()}</strong>
                <span>Favorites</span>
              </div>
            </div>
          </div>

          <div className="hero-card">
            <div className="card-glow"></div>

            <div className="game-card">
              <div className="live-status-pill">
                <span className="live-dot-pulse"></span>
                LIVE ROBLOX GAME
              </div>

              <img src="/assets/ay-thumb.png" alt="Are You Malayali Roblox Game" className="game-thumb" />

              <h2>Are You Malayali?</h2>
              <p className="game-sub">Relax • Hangout • Mallu Vibes</p>

              <div className="game-card-actions">
                <a
                  className="primary-button full-width"
                  href="https://www.roblox.com/games/105872949117236/Are-You-Malayali"
                  target="_blank"
                  rel="noreferrer"
                >
                  JOIN GAME SERVER →
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* LATEST UPDATES */}
        <section className="section" id="updates">
          <div className="section-heading">
            <div>
              <span className="section-label">COMMUNITY DISPATCH</span>
              <h2>Latest Updates & Roadmap</h2>
            </div>
          </div>

          <div className="update-grid">
            <article className="update-card featured">
              <span className="update-badge">LATEST PATCH</span>
              <h3>New In-Game Soundboard & Hangouts</h3>
              <p>
                Expanded soundboard featuring trending Malayalam tracks, classroom chill zone, and realistic rain acoustics.
              </p>
              <small>Live Now on Roblox</small>
            </article>

            <article className="update-card">
              <span className="update-badge">COMMUNITY FORUMS</span>
              <h3>Interactive Channels & Reply Threads</h3>
              <p>
                Discuss ideas, suggest songs, report exploiters, and reply directly to other players in real-time threads.
              </p>
              <small>Global Sync Active</small>
            </article>

            <article className="update-card">
              <span className="update-badge">IN DEVELOPMENT</span>
              <h3>Scenic Backwaters & Tea Stall Expansion</h3>
              <p>
                New cozy Kerala backwaters area, interactive tea stall (Thattukada), and scenic sunset viewpoint.
              </p>
              <small>Coming in Next Season</small>
            </article>
          </div>
        </section>

        {/* COMMUNITY FORUMS SECTION */}
        <section className="section forums" id="forums">
          <div className="section-heading">
            <div>
              <span className="section-label">COMMUNITY FORUMS</span>
              <h2>Join Live Discussions</h2>
              <p className="section-subtext">
                Real-time channels to chat with players, submit suggestions, report rule breakers, and collaborate with the team.
              </p>
            </div>
          </div>

          <div className="forums-grid">
            {Object.entries(channels).map(([key, info]) => {
              const topPosts = forumPosts[key] || [];
              let totalMessages = topPosts.length;
              topPosts.forEach(p => {
                if (p.replies) totalMessages += p.replies.length;
              });

              return (
                <div key={key} className="forum-channel">
                  <div className="channel-header">
                    <div className="channel-title-row">
                      <span className="channel-big-icon">{info.icon}</span>
                      <h3>{info.title}</h3>
                    </div>
                    <span className="channel-count">{totalMessages} {totalMessages === 1 ? "msg" : "msgs"}</span>
                  </div>
                  <p>{info.description}</p>
                  <button className="secondary-button channel-cta-btn" onClick={() => handleOpenChannel(key)}>
                    ENTER CHANNEL →
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* QUICK SUGGESTIONS & FEEDBACK CALLOUT */}
        <section className="section community" id="feedback">
          <div className="community-box">
            <span className="section-label">DIRECT TO DEVS</span>
            <h2>Have a feature idea?</h2>
            <p>
              Suggest new hangout areas, activities, sound effects, or lighting styles to make the atmosphere even more nostalgic.
            </p>
            <button className="primary-button" onClick={() => handleOpenChannel("suggestions")}>
              💡 SUBMIT AN IDEA
            </button>
          </div>

          <div className="community-box">
            <span className="section-label">COMMUNITY SAFETY</span>
            <h2>Report an exploiter or bug.</h2>
            <p>
              Keep the community clean and fun. Report rule breakers, exploiters, or game bugs directly to the moderation team.
            </p>
            <div className="community-box-actions">
              <button className="secondary-button" onClick={() => handleOpenChannel("reports")}>
                🚨 FILE REPORT
              </button>
              <button className="outline-button" onClick={() => handleOpenChannel("bugs")}>
                🐛 REPORT BUG
              </button>
            </div>
          </div>
        </section>

        {/* CREDITS & STUDIO SECTION */}
        <section className="credits">
          <div className="col">
            <h3>Credits & Team</h3>
            <p>
              • <strong>Owner & Developer:</strong> Aadi<br />
              • <strong>Co-Developer:</strong> Kaniel<br />
              • <strong>Manager:</strong> Venix<br />
              • <strong>GFX & Thumbnails:</strong> Fluffy<br />
              • <strong>Studio:</strong> Dios Productions
            </p>
          </div>

          <div className="col">
            <h3>Join Dios Productions</h3>
            <p>Become part of our official Roblox studio group for exclusive in-game perks and announcements.</p>
            <div className="credit-links">
              <a
                className="outline-button"
                href="https://www.roblox.com/groups/16048950"
                target="_blank"
                rel="noreferrer"
              >
                Dios Productions Roblox Group →
              </a>
              <a
                className="outline-button"
                href="https://www.roblox.com/games/105872949117236/Are-You-Malayali"
                target="_blank"
                rel="noreferrer"
              >
                Launch Game on Roblox →
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer>
        <div className="footer-left">
          <div className="footer-brand">
            <img src="/assets/game-logo.png" alt="Are You Malayali Logo" className="footer-logo" />
            <div>
              <strong>🌿 Are You Malayali?</strong>
              <p>Made with love for the Kerala gaming community.</p>
            </div>
          </div>
        </div>

        <div className="footer-right">
          <button className="footer-share-btn" onClick={handleShare}>
            🔗 Share Hub
          </button>
          <span>© 2026 Dios Productions. All Rights Reserved.</span>
        </div>
      </footer>

      {/* FORUM MODAL */}
      {selectedChannel && (
        <div className="modal-overlay" onClick={handleCloseChannel}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-area">
                <h2>{channels[selectedChannel].title}</h2>
                <div className="modal-meta-row">
                  <span className="live-users-pill">👥 {liveUsers} online</span>
                  <span className="modal-channel-sub">{channels[selectedChannel].description}</span>
                </div>
              </div>
              <button className="close-btn" onClick={handleCloseChannel} aria-label="Close modal">
                ✕
              </button>
            </div>

            <div className="forum-posts-container">
              {/* POST FORM */}
              <form className="post-form" onSubmit={handlePostSubmit}>
                {replyingTo && (
                  <div className="replying-banner">
                    <div className="replying-info">
                      <span className="reply-indicator-icon">↳</span>
                      <span>Replying to <strong>@{replyingTo.author}</strong>: <em>"{replyingTo.snippet}"</em></span>
                    </div>
                    <button type="button" className="cancel-reply-btn" onClick={handleCancelReply} title="Cancel reply">
                      ✕ Cancel
                    </button>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Your Username</label>
                  <div className="form-input-wrapper">
                    <input
                      type="text"
                      placeholder="e.g., Aadi, MalluGamer..."
                      value={userName}
                      onChange={(e) => setUserName(e.target.value.slice(0, MAX_USERNAME_LENGTH))}
                      maxLength={MAX_USERNAME_LENGTH}
                      className="form-input"
                    />
                    <span className="char-count">{userName.length}/{MAX_USERNAME_LENGTH}</span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    {replyingTo ? `Your Reply to @${replyingTo.author}` : "Message Content"}
                  </label>
                  <div className="form-input-wrapper">
                    <textarea
                      ref={textareaRef}
                      placeholder={
                        replyingTo
                          ? `Write a reply to @${replyingTo.author}...`
                          : `Write in ${channels[selectedChannel].title}...`
                      }
                      value={postContent}
                      onChange={(e) => setPostContent(e.target.value.slice(0, MAX_CONTENT_LENGTH))}
                      maxLength={MAX_CONTENT_LENGTH}
                      className="form-textarea"
                      rows="3"
                    />
                    <span className="char-count">{postContent.length}/{MAX_CONTENT_LENGTH}</span>
                  </div>
                </div>

                {imagePreview && (
                  <div className="image-preview">
                    <img src={imagePreview} alt="Attached Preview" className="preview-img" />
                    <button type="button" className="remove-image-btn" onClick={removeImage} title="Remove image">
                      ✕ Remove
                    </button>
                  </div>
                )}

                <div className="form-actions-row">
                  <div className="form-left-actions">
                    <button
                      type="button"
                      className="image-button"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      🖼️ {imagePreview ? "Change Image" : "Add Image (Max 2MB)"}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      style={{ display: "none" }}
                    />
                  </div>

                  <button
                    type="submit"
                    className="primary-button submit-post-btn"
                    disabled={!userName.trim() || !postContent.trim()}
                  >
                    {replyingTo ? "POST REPLY 💬" : "POST MESSAGE ✨"}
                  </button>
                </div>

                {error && <div className="error-message">⚠️ {error}</div>}
              </form>

              {/* POST LIST & CONTROLS */}
              <div className="posts-header-row">
                <h4>
                  Channel Feed <span>({displayedPosts.length} threads)</span>
                </h4>
                <div className="sort-buttons">
                  <button
                    className={`sort-pill ${sortBy === "newest" ? "active" : ""}`}
                    onClick={() => setSortBy("newest")}
                  >
                    🕒 Newest
                  </button>
                  <button
                    className={`sort-pill ${sortBy === "popular" ? "active" : ""}`}
                    onClick={() => setSortBy("popular")}
                  >
                    🔥 Most Liked
                  </button>
                </div>
              </div>

              <div className="posts-list">
                {displayedPosts.length === 0 ? (
                  <div className="no-posts">
                    <span className="no-posts-icon">🌿</span>
                    <p>No messages yet in this channel.</p>
                    <small>Be the first to share your thoughts with the community!</small>
                  </div>
                ) : (
                  displayedPosts.map((post) => (
                    <div key={post.id} className="forum-post-thread">
                      {/* MAIN POST CARD */}
                      <div className="forum-post">
                        <div className="post-header">
                          <div className="author-info">
                            <span className="author-avatar">{post.author.charAt(0).toUpperCase()}</span>
                            <strong className="post-author">{post.author}</strong>
                          </div>
                          <span className="post-time">{post.timestamp}</span>
                        </div>

                        <p className="post-content">{post.content}</p>

                        {post.image && (
                          <div className="post-image-wrapper" onClick={() => setLightboxImage(post.image)}>
                            <img src={post.image} alt="Forum attachment" className="post-image" loading="lazy" />
                            <span className="image-zoom-hint">🔍 Click to enlarge</span>
                          </div>
                        )}

                        <div className="post-actions">
                          <button
                            className={`like-btn ${post.liked ? "liked" : ""}`}
                            onClick={() => handleLike(selectedChannel, post.id)}
                            aria-label={post.liked ? "Unlike post" : "Like post"}
                          >
                            <span className="heart-icon">{post.liked ? "❤️" : "🤍"}</span>
                            <span className="like-counter">{post.likes}</span>
                          </button>

                          <button
                            className="reply-action-btn"
                            onClick={() => handleStartReply(post)}
                          >
                            💬 Reply
                          </button>

                          {post.replies && post.replies.length > 0 && (
                            <button
                              className="toggle-replies-btn"
                              onClick={() => toggleReplies(post.id)}
                            >
                              {expandedReplies[post.id]
                                ? `▲ Hide ${post.replies.length} ${post.replies.length === 1 ? 'reply' : 'replies'}`
                                : `▼ View ${post.replies.length} ${post.replies.length === 1 ? 'reply' : 'replies'}`}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* NESTED REPLIES */}
                      {post.replies && post.replies.length > 0 && expandedReplies[post.id] && (
                        <div className="replies-container">
                          {post.replies.map((reply) => (
                            <div key={reply.id} className="reply-card">
                              <div className="reply-header">
                                <div className="author-info">
                                  <span className="author-avatar reply-avatar">{reply.author.charAt(0).toUpperCase()}</span>
                                  <strong className="post-author">{reply.author}</strong>
                                </div>
                                <span className="post-time">{reply.timestamp}</span>
                              </div>

                              <p className="reply-content">{reply.content}</p>

                              {reply.image && (
                                <div className="post-image-wrapper" onClick={() => setLightboxImage(reply.image)}>
                                  <img src={reply.image} alt="Reply attachment" className="post-image" loading="lazy" />
                                </div>
                              )}

                              <div className="reply-actions">
                                <button
                                  className={`like-btn mini-like ${reply.liked ? "liked" : ""}`}
                                  onClick={() => handleLike(selectedChannel, reply.id)}
                                >
                                  <span className="heart-icon">{reply.liked ? "❤️" : "🤍"}</span>
                                  <span className="like-counter">{reply.likes}</span>
                                </button>
                                <button
                                  className="reply-action-btn"
                                  onClick={() => handleStartReply(post)}
                                >
                                  💬 Reply
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* IMAGE LIGHTBOX MODAL */}
      {lightboxImage && (
        <div className="lightbox-overlay" onClick={() => setLightboxImage(null)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <img src={lightboxImage} alt="Enlarged view" className="lightbox-img" />
            <button className="lightbox-close" onClick={() => setLightboxImage(null)}>
              ✕ Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;