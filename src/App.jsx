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

// Curated playlist catalog representing the in-game 200+ Mallu soundboard
const FEATURED_SONGS = [
  { id: 1, title: "Illuminati", movie: "Aavesham", artist: "Sushin Shyam, Dabzee", category: "Trending", tag: "🔥 Viral Hit" },
  { id: 2, title: "Jaada", movie: "Aavesham", artist: "Sushin Shyam, Sreenath Bhasi", category: "Trending", tag: "⚡ High Energy" },
  { id: 3, title: "Kuthanthram", movie: "Manjummel Boys", artist: "Sushin Shyam, Vedan", category: "Trending", tag: "💥 Bass Boost" },
  { id: 4, title: "Mini Maharani", movie: "Premalu", artist: "Vishnu Vijay, Kapil Kapilan", category: "Trending", tag: "✨ Dance Vibe" },
  { id: 5, title: "Armadham", movie: "Aavesham", artist: "Sushin Shyam, Pranavam Sasi", category: "Trending", tag: "🎉 Party Hit" },
  { id: 6, title: "Aasa Kooda", movie: "Independent Single", artist: "Sai Abhyankkar", category: "Trending", tag: "🌟 Groovy" },

  { id: 7, title: "Nee Himamazhayayi", movie: "Edakkad Battalion 06", artist: "K.S. Harisankar, Nithya Mammen", category: "Chill Melodies", tag: "🌿 Pure Romance" },
  { id: 8, title: "Uyiril Thodum", movie: "Kumbalangi Nights", artist: "Sooraj Santhosh, Anne Amie", category: "Chill Melodies", tag: "🌧️ Soulful" },
  { id: 9, title: "Cherathukal", movie: "Kumbalangi Nights", artist: "Sithara Krishnakumar, Sushin Shyam", category: "Chill Melodies", tag: "✨ Warm Vibe" },
  { id: 10, title: "Malare", movie: "Premam", artist: "Vijay Yesudas, Rajesh Murugesan", category: "Chill Melodies", tag: "🌸 Timeless" },
  { id: 11, title: "Aluva Puzha", movie: "Premam", artist: "Vineeth Sreenivasan", category: "Chill Melodies", tag: "🍃 Nostalgic Flow" },
  { id: 12, title: "Parayuvaan", movie: "Ishq", artist: "Sid Sriram, Jakes Bejoy", category: "Chill Melodies", tag: "💫 Deep Emotion" },

  { id: 13, title: "Oru Rathri Koodi", movie: "Summer in Bethlehem", artist: "K.J. Yesudas, K.S. Chithra", category: "Nostalgia", tag: "📜 Golden Classic" },
  { id: 14, title: "Thumbi Vaa", movie: "Olangal", artist: "S. Janaki, Ilaiyaraaja", category: "Nostalgia", tag: "🌿 Evergreen" },
  { id: 15, title: "Karale Karalinte", movie: "Udayananu Tharam", artist: "Vineeth Sreenivasan, Rimi Tomy", category: "Nostalgia", tag: "💖 Fan Favorite" },
  { id: 16, title: "Pramadavanam", movie: "His Highness Abdullah", artist: "K.J. Yesudas, Raveendran", category: "Nostalgia", tag: "🎻 Masterpiece" },
  { id: 17, title: "Manikya Malaraya Poovi", movie: "Oru Adaar Love", artist: "Vineeth Sreenivasan, Shaan Rahman", category: "Nostalgia", tag: "✨ Iconic" },
  { id: 18, title: "Chandana Cholayil", movie: "Sallapam", artist: "K.J. Yesudas, Johnson", category: "Nostalgia", tag: "🍃 Pure Gold" },

  { id: 19, title: "Thallumaala Pattu", movie: "Thallumaala", artist: "Vishnu Vijay, Hrishi, Shenbagaraj", category: "Party & Beats", tag: "🔥 Full Blast" },
  { id: 20, title: "Ole Melody", movie: "Thallumaala", artist: "Haricharan, Benny Dayal", category: "Party & Beats", tag: "⚡ Modern Beat" },
  { id: 21, title: "Jimikki Kammal", movie: "Velipadinte Pusthakam", artist: "Vineeth Sreenivasan, Shaan Rahman", category: "Party & Beats", tag: "💃 World Viral" },
  { id: 22, title: "Kudukku", movie: "Love Action Drama", artist: "Vineeth Sreenivasan, Shaan Rahman", category: "Party & Beats", tag: "🕺 Fast Vibe" },
  { id: 23, title: "Appangal Embadum", movie: "Ustad Hotel", artist: "Anna Katharina Valayil, Gopi Sundar", category: "Party & Beats", tag: "☕ Kozhikode Vibe" },
  { id: 24, title: "Theerame", movie: "Malik", artist: "K.S. Chithra, Sooraj Santhosh, Sushin Shyam", category: "Chill Melodies", tag: "🌊 Coastal Mist" }
];

const SONG_CATEGORIES = ["All", "Trending", "Chill Melodies", "Nostalgia", "Party & Beats"];

function App() {
  const [forumPosts, setForumPosts] = useState({
    suggestions: [],
    feedback: [],
    general: [],
    bugs: []
  });

  const [liveUsers, setLiveUsers] = useState(0);
  const [livePlayerCount, setLivePlayerCount] = useState(0);
  const [liveVisits, setLiveVisits] = useState(0);
  const [liveFavorites, setLiveFavorites] = useState(0);
  const [sessionId] = useState(() => `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

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

  // Song Explorer States
  const [songSearch, setSongSearch] = useState("");
  const [selectedSongCategory, setSelectedSongCategory] = useState("All");

  const fileInputRef = useRef(null);

  const MAX_USERNAME_LENGTH = 20;
  const MAX_CONTENT_LENGTH = 500;
  const SPAM_COOLDOWN = 2000; // 2 seconds
  const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB

  const channels = {
    suggestions: { title: "🎵 Song Suggestions", icon: "🎵", description: "Suggest new Mallu songs for the in-game soundboard!" },
    feedback: { title: "⭐ Feedback & Ideas", icon: "⭐", description: "Share your ideas & feature thoughts with the devs." },
    general: { title: "🎮 General Discussion", icon: "🎮", description: "Hangout, share stories & connect with Malayali players." },
    bugs: { title: "🐛 Bug Reports", icon: "🐛", description: "Report glitches or performance issues to get them fixed." }
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
    setError("");
  }, []);

  const handleOpenChannel = useCallback((channelKey, initialText = "") => {
    setSelectedChannel(channelKey);
    if (initialText) {
      setPostContent(initialText);
    }
    setError("");
  }, []);

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

      const groupedPosts = {
        suggestions: [],
        feedback: [],
        general: [],
        bugs: []
      };

      (data || []).forEach(post => {
        if (groupedPosts[post.channel]) {
          groupedPosts[post.channel].push({
            id: post.id,
            author: post.author,
            content: post.content,
            image: post.image_url,
            likes: post.likes || 0,
            timestamp: getTimeAgo(new Date(post.created_at)),
            rawDate: new Date(post.created_at).getTime(),
            liked: likedSet.has(post.id)
          });
        }
      });

      setForumPosts(groupedPosts);
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
        const { error: upsertError } = await supabase
          .from('active_users')
          .upsert([{ session_id: sessionId, last_seen: new Date() }], {
            onConflict: 'session_id'
          });

        if (upsertError) throw upsertError;

        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const { count, error: countErr } = await supabase
          .from('active_users')
          .select('*', { count: 'exact', head: true })
          .gte('last_seen', fiveMinutesAgo.toISOString());

        if (countErr) throw countErr;
        if (isMounted) {
          setLiveUsers(count || 1);
        }
      } catch (err) {
        console.error('Error tracking user:', err);
      }
    };

    trackUser();
    const interval = setInterval(trackUser, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [sessionId]);

  // Fetch live Roblox player count & stats
  useEffect(() => {
    let isMounted = true;
    const fetchPlayerCount = async () => {
      try {
        const response = await fetch(
          'https://wqvnnxjdaslngwfqoxhz.supabase.co/functions/v1/hyper-endpoint',
          { method: 'GET' }
        );

        if (response.ok) {
          const data = await response.json();
          if (isMounted) {
            setLivePlayerCount(data.playerCount || 0);
            setLiveVisits(data.visits || 0);
            setLiveFavorites(data.favoritedCount || 0);
          }
        }
      } catch (err) {
        console.error('Error fetching player count:', err);
      }
    };

    fetchPlayerCount();
    const interval = setInterval(fetchPlayerCount, 15000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
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

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!validatePost()) return;

    const trimmedAuthor = userName.trim();
    const trimmedContent = postContent.trim();
    const imagePayload = postImage;

    // Save username in localStorage for convenience
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
            content: trimmedContent,
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
      showToast("✨ Post published to the community!", "success");
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

    const post = forumPosts[channelKey]?.find(p => p.id === postId);
    if (!post) return;

    const delta = isCurrentlyLiked ? -1 : 1;
    const newLikes = Math.max(0, (post.likes || 0) + delta);

    // Optimistic UI update
    setForumPosts(prev => ({
      ...prev,
      [channelKey]: prev[channelKey].map(p =>
        p.id === postId
          ? { ...p, likes: newLikes, liked: !isCurrentlyLiked }
          : p
      )
    }));

    showToast(isCurrentlyLiked ? "Removed like" : "❤️ Liked post!", "info");

    try {
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
      text: "Join the official Are You Malayali community! 200+ Mallu songs, chill nature vibes & live stats.",
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

  // Handle Quick Song Suggestion
  const handleSuggestSong = (songTitle, movie) => {
    const text = `🎵 Song Request: "${songTitle}" from ${movie}`;
    handleOpenChannel("suggestions", text);
  };

  // Filtered & Sorted Song Catalog
  const filteredSongs = useMemo(() => {
    return FEATURED_SONGS.filter((song) => {
      const matchesCategory = selectedSongCategory === "All" || song.category === selectedSongCategory;
      const q = songSearch.toLowerCase().trim();
      const matchesQuery =
        !q ||
        song.title.toLowerCase().includes(q) ||
        song.movie.toLowerCase().includes(q) ||
        song.artist.toLowerCase().includes(q) ||
        song.tag.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [songSearch, selectedSongCategory]);

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
          <a href="#songs">Music Soundboard</a>
          <a href="#forums">Forums</a>
          <a href="#feedback">Feedback</a>
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
          <a href="#songs" onClick={() => setMenuOpen(false)}>Music Soundboard</a>
          <a href="#forums" onClick={() => setMenuOpen(false)}>Forums</a>
          <a href="#feedback" onClick={() => setMenuOpen(false)}>Feedback</a>
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

              <a className="secondary-button" href="#songs">
                🎵 BROWSE 200+ SONGS
              </a>
            </div>

            {/* LIVE METRICS BAR */}
            <div className="stats">
              <div className="stat-card">
                <strong>200+</strong>
                <span>Soundboard Songs</span>
              </div>

              <div className="stat-card">
                <strong>👥 {liveUsers}</strong>
                <span>Online on Hub</span>
              </div>

              <div className="stat-card highlight-stat">
                <strong>🎮 {livePlayerCount.toLocaleString()}</strong>
                <span>Playing in Roblox</span>
              </div>

              <div className="stat-card">
                <strong>👣 {liveVisits > 0 ? liveVisits.toLocaleString() : "10,000+"}</strong>
                <span>Total Visits</span>
              </div>

              <div className="stat-card">
                <strong>👍 {liveFavorites > 0 ? liveFavorites.toLocaleString() : "500+"}</strong>
                <span>Game Likes</span>
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
              <h3>New In-Game Soundboard & Songs</h3>
              <p>
                Expanded soundboard featuring the newest 2026 trending tracks, Malayalam hip hop, and timeless classic melodies.
              </p>
              <small>September 2026 • Live Now</small>
            </article>

            <article className="update-card">
              <span className="update-badge">FORUMS LIVE</span>
              <h3>Real-Time Community Discussions</h3>
              <p>
                Suggest songs, submit feedback, vote on community ideas, and report bugs with instant live synchronization.
              </p>
              <small>Global Community Active</small>
            </article>

            <article className="update-card">
              <span className="update-badge">IN DEVELOPMENT</span>
              <h3>Scenic Hangout Expansions</h3>
              <p>
                New cozy Kerala backwaters area, interactive tea stall (Thattukada), and scenic sunset viewpoint.
              </p>
              <small>Coming in Next Season</small>
            </article>
          </div>
        </section>

        {/* INTERACTIVE SONG SOUNDBOARD SHOWCASE */}
        <section className="section songs-showcase-section" id="songs">
          <div className="section-heading">
            <div>
              <span className="section-label">IN-GAME SOUNDBOARD</span>
              <h2>200+ Malayalam Songs Collection</h2>
              <p className="section-subtext">
                Browse popular soundboard tracks included inside the game. Don't see your favorite track? Request it in our forums!
              </p>
            </div>
            <button className="primary-button" onClick={() => handleOpenChannel("suggestions")}>
              ➕ SUGGEST NEW SONG
            </button>
          </div>

          {/* SEARCH & FILTERS */}
          <div className="song-controls">
            <div className="song-search-box">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search by song name, movie, artist or vibe..."
                value={songSearch}
                onChange={(e) => setSongSearch(e.target.value)}
                className="song-search-input"
              />
              {songSearch && (
                <button className="search-clear-btn" onClick={() => setSongSearch("")}>
                  ✕
                </button>
              )}
            </div>

            <div className="category-pills">
              {SONG_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  className={`category-pill ${selectedSongCategory === cat ? "active" : ""}`}
                  onClick={() => setSelectedSongCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* SONG GRID */}
          <div className="songs-grid">
            {filteredSongs.length === 0 ? (
              <div className="no-songs-found">
                <p>No tracks matching "{songSearch}".</p>
                <button className="secondary-button" onClick={() => handleOpenChannel("suggestions", `🎵 Request: ${songSearch}`)}>
                  Request "{songSearch}" in Forums →
                </button>
              </div>
            ) : (
              filteredSongs.map((song) => (
                <div key={song.id} className="song-card">
                  <div className="song-header">
                    <span className="song-icon">🎵</span>
                    <span className="song-tag">{song.tag}</span>
                  </div>
                  <h3 className="song-title">{song.title}</h3>
                  <p className="song-movie">🎬 {song.movie}</p>
                  <p className="song-artist">🎙️ {song.artist}</p>
                  <div className="song-footer">
                    <span className="song-category-badge">{song.category}</span>
                    <button
                      className="song-suggest-btn"
                      onClick={() => handleSuggestSong(song.title, song.movie)}
                      title="Request or discuss in forum"
                    >
                      💬 Discuss in Forum
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* COMMUNITY FORUMS SECTION */}
        <section className="section forums" id="forums">
          <div className="section-heading">
            <div>
              <span className="section-label">COMMUNITY FORUMS</span>
              <h2>Join Live Discussions</h2>
              <p className="section-subtext">
                Real-time channels to collaborate directly with the development team and other Malayali players.
              </p>
            </div>
          </div>

          <div className="forums-grid">
            {Object.entries(channels).map(([key, info]) => {
              const postCount = forumPosts[key]?.length || 0;
              return (
                <div key={key} className="forum-channel">
                  <div className="channel-header">
                    <div className="channel-title-row">
                      <span className="channel-big-icon">{info.icon}</span>
                      <h3>{info.title}</h3>
                    </div>
                    <span className="channel-count">{postCount} {postCount === 1 ? "post" : "posts"}</span>
                  </div>
                  <p>{info.description}</p>
                  <button className="secondary-button channel-cta-btn" onClick={() => handleOpenChannel(key)}>
                    OPEN CHANNEL →
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* QUICK SUGGESTIONS & FEEDBACK CALLOUT */}
        <section className="section community" id="suggestions">
          <div className="community-box">
            <span className="section-label">DIRECT TO DEVS</span>
            <h2>Have a feature idea?</h2>
            <p>
              Suggest new hangout areas, activities, sound effects, or lighting styles to make the atmosphere even more nostalgic.
            </p>
            <button className="primary-button" onClick={() => handleOpenChannel("feedback")}>
              💡 SUBMIT AN IDEA
            </button>
          </div>

          <div className="community-box" id="feedback">
            <span className="section-label">COMMUNITY FIRST</span>
            <h2>Help us squash bugs.</h2>
            <p>
              Encountered a glitch on mobile or PC? Report it to our bug tracker and we'll patch it in the next update.
            </p>
            <button className="secondary-button" onClick={() => handleOpenChannel("bugs")}>
              🐛 REPORT A BUG
            </button>
          </div>
        </section>

        {/* CREDITS & STUDIO SECTION */}
        <section className="credits">
          <div className="col">
            <h3>Credits & Team</h3>
            <p>
              • <strong>Owner & Developer:</strong> Aadi<br />
              • <strong>Co-Developer:</strong> Kaniel<br />
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
                  <label className="form-label">Message Content</label>
                  <div className="form-input-wrapper">
                    <textarea
                      placeholder={`Write in ${channels[selectedChannel].title}...`}
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
                    POST TO CHANNEL ✨
                  </button>
                </div>

                {error && <div className="error-message">⚠️ {error}</div>}
              </form>

              {/* POST LIST & CONTROLS */}
              <div className="posts-header-row">
                <h4>
                  Channel Feed <span>({displayedPosts.length})</span>
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
                    <div key={post.id} className="forum-post">
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
                      </div>
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