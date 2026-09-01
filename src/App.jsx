import "./App.css";
import { useState, useRef, useEffect } from "react";
import { supabase } from "./supabaseClient";

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

  // Load posts from Supabase and subscribe to real-time updates
  useEffect(() => {
    const loadPosts = async () => {
      try {
        const { data, error } = await supabase
          .from('forum_posts')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Group posts by channel
        const groupedPosts = {
          suggestions: [],
          feedback: [],
          general: [],
          bugs: []
        };

        data.forEach(post => {
          if (groupedPosts[post.channel]) {
            groupedPosts[post.channel].push({
              id: post.id,
              author: post.author,
              content: post.content,
              image: post.image_url,
              likes: post.likes,
              timestamp: getTimeAgo(new Date(post.created_at)),
              liked: false
            });
          }
        });

        setForumPosts(groupedPosts);
      } catch (error) {
        console.error('Error loading posts:', error);
      }
    };

    loadPosts();

    // Poll for updates every 1 second (real-time feel)
    const interval = setInterval(loadPosts, 1000);

    return () => clearInterval(interval);
  }, []);

  // Track active users
  useEffect(() => {
    const trackUser = async () => {
      try {
        // Upsert user session (insert if new, update if exists)
        const { error: upsertError } = await supabase
          .from('active_users')
          .upsert([{ session_id: sessionId, last_seen: new Date() }], {
            onConflict: 'session_id'
          });

        if (upsertError) throw upsertError;

        // Count active users (last seen in last 5 minutes)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const { count, error } = await supabase
          .from('active_users')
          .select('*', { count: 'exact', head: true })
          .gte('last_seen', fiveMinutesAgo.toISOString());

        if (error) throw error;
        setLiveUsers(count || 0);
      } catch (error) {
        console.error('Error tracking user:', error);
      }
    };

    trackUser();

    // Update user activity every 30 seconds
    const interval = setInterval(trackUser, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [sessionId]);

  // Fetch live Roblox player count
  useEffect(() => {
    const fetchPlayerCount = async () => {
      try {
        const response = await fetch(
          'https://wqvnnxjdaslngwfqoxhz.supabase.co/functions/v1/hyper-endpoint',
          { method: 'GET' }
        );

        if (response.ok) {
          const data = await response.json();
          setLivePlayerCount(data.playerCount || 0);
          setLiveVisits(data.visits || 0);
          setLiveFavorites(data.favoritedCount || 0);
        }
      } catch (error) {
        console.error('Error fetching player count:', error);
      }
    };

    fetchPlayerCount();

    // Poll every 10 seconds
    const interval = setInterval(fetchPlayerCount, 10000);

    return () => clearInterval(interval);
  }, []);

  const [selectedChannel, setSelectedChannel] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [userName, setUserName] = useState("");
  const [postImage, setPostImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [lastPostTime, setLastPostTime] = useState({});
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const MAX_USERNAME_LENGTH = 20;
  const MAX_CONTENT_LENGTH = 500;
  const SPAM_COOLDOWN = 2000; // 2 seconds between posts
  const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB

  const channels = {
    suggestions: { title: "🎵 Song Suggestions", icon: "🎵" },
    feedback: { title: "⭐ Feedback & Ideas", icon: "⭐" },
    general: { title: "🎮 General Discussion", icon: "🎮" },
    bugs: { title: "🐛 Bug Reports", icon: "🐛" }
  };

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

  const handleOpenChannel = (channelKey) => {
    setSelectedChannel(channelKey);
    setError("");
  };

  const handleCloseChannel = () => {
    setSelectedChannel(null);
    setPostContent("");
    setUserName("");
    setPostImage(null);
    setImagePreview(null);
    setError("");
  };

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
    reader.onload = (e) => {
      setImagePreview(e.target?.result);
      setPostImage(e.target?.result);
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

    try {
      const { error } = await supabase
        .from('forum_posts')
        .insert([
          {
            channel: selectedChannel,
            author: userName.trim(),
            content: postContent.trim(),
            image_url: postImage,
            likes: 0,
            created_at: new Date()
          }
        ]);

      if (error) throw error;

      setLastPostTime({
        ...lastPostTime,
        [selectedChannel]: Date.now()
      });

      setPostContent("");
      setUserName("");
      setPostImage(null);
      setImagePreview(null);
    } catch (error) {
      setError("Failed to post message. Please try again.");
      console.error('Error posting:', error);
    }
  };

  const handleLike = async (channelKey, postId) => {
    try {
      const post = forumPosts[channelKey].find(p => p.id === postId);
      if (!post) return;

      const newLikes = post.liked ? post.likes - 1 : post.likes + 1;

      const { error } = await supabase
        .from('forum_posts')
        .update({ likes: newLikes })
        .eq('id', postId);

      if (error) throw error;

      // Update local state
      setForumPosts({
        ...forumPosts,
        [channelKey]: forumPosts[channelKey].map(p =>
          p.id === postId
            ? { ...p, likes: newLikes, liked: !p.liked }
            : p
        )
      });
    } catch (error) {
      console.error('Error updating like:', error);
    }
  };

  return (
    <div className="app">
      <nav className="navbar">
        <div className="logo">
          <img src="/assets/game-logo.png?v=1" alt="Are You Malayali" className="logo-img" />
          <div>
            <strong>Are You Malayali?</strong>
            <small>Dios Productions</small>
          </div>
        </div>

        <div className="nav-links">
          <a href="#home">Home</a>
          <a href="#updates">Updates</a>
          <a href="#suggestions">Suggestions</a>
          <a href="#songs">Songs</a>
          <a href="#feedback">Feedback</a>
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
          <a href="#suggestions" onClick={() => setMenuOpen(false)}>Suggestions</a>
          <a href="#songs" onClick={() => setMenuOpen(false)}>Songs</a>
          <a href="#feedback" onClick={() => setMenuOpen(false)}>Feedback</a>
          <a className="play-button" href="https://www.roblox.com/games/105872949117236/Are-You-Malayali" target="_blank" rel="noreferrer">PLAY ON ROBLOX ↗</a>
        </div>

        <a className="play-button desktop-play" href="https://www.roblox.com/games/105872949117236/Are-You-Malayali" target="_blank" rel="noreferrer">PLAY ON ROBLOX ↗</a>
      </nav>

      <main>
        <section className="hero" id="home">
          <div className="hero-content">
            <div className="badge">🌿 THE OFFICIAL COMMUNITY HUB</div>

            <h1>
              Are You
              <span> Malayali?</span>
            </h1>

            <p>
              Welcome to [RELAPSE] Are You Malayali? 🌿✨
              A high-end digital sanctuary crafted exclusively for the community.
              Escape the noise, step into the mist, and experience a piece of home right here on Roblox.
            </p>

            <p>
              Whether you want to explore the foggy forests, chill by the campfire, or just catch up with
              friends, this is your space.
            </p>

            <ul className="features">
              <li>🎵 200+ Mallu Songs — A massive in-game soundboard featuring your favorite tracks.</li>
              <li>🍃 Cinematic Nature — High-end graphics, realistic lighting, and deeply atmospheric environments.</li>
              <li>📱 Max Optimization — Built to run perfectly smooth on Mobile, PC, and Console.</li>
              <li>🤝 Chill & Hangout — Beautifully designed spaces (Classroom, Library, Waterfalls) to meet friends and vibe.</li>
            </ul>

            <div className="hero-buttons">
              <a className="primary-button" href="https://www.roblox.com/games/105872949117236/Are-You-Malayali" target="_blank" rel="noreferrer">🎮 PLAY GAME</a>

              <a className="secondary-button" href="#updates">✨ VIEW UPDATES</a>
            </div>

            <div className="stats">
              <div>
                <strong>200+</strong>
                <span>Songs</span>
              </div>

              <div>
                <strong>∞</strong>
                <span>Memories</span>
              </div>

              <div>
                <strong>🌿</strong>
                <span>Mallu Vibes</span>
              </div>

              <div>
                <strong>🎮 {livePlayerCount}</strong>
                <span>Playing Now</span>
              </div>

              <div>
                <strong>👣 {liveVisits.toLocaleString()}</strong>
                <span>Visits</span>
              </div>

              <div>
                <strong>👍 {liveFavorites.toLocaleString()}</strong>
                <span>Likes</span>
              </div>
            </div>
          </div>

          <div className="hero-card">
            <div className="card-glow"></div>

            <div className="game-card">
              <span className="live-dot">● LIVE</span>

              <img src="/assets/ay-thumb.png" alt="Are You Malayali" className="game-thumb" />

              <h2>Are You Malayali?</h2>

              <p>Relax • Hangout • Vibe</p>

              <a className="primary-button" href="https://www.roblox.com/games/105872949117236/Are-You-Malayali" target="_blank" rel="noreferrer">JOIN THE GAME →</a>
            </div>
          </div>
        </section>

        <section className="section" id="updates">
          <div className="section-heading">
            <div>
              <span className="section-label">WHAT'S NEW</span>
              <h2>Latest Updates</h2>
            </div>
          </div>

          <div className="update-grid">
            <article className="update-card featured">
              <span>LATEST UPDATE</span>
              <h3>Welcome to the new community hub.</h3>
              <p>
                Stay up to date with everything happening inside
                Are You Malayali?
              </p>
              <small>September 2026</small>
            </article>

            <article className="update-card">
              <span>COMING SOON</span>
              <h3>More community features</h3>
              <p>
                New ways for players to share ideas and feedback.
              </p>
              <small>Stay tuned</small>
            </article>

            <article className="update-card">
              <span>GAME</span>
              <h3>New experiences</h3>
              <p>
                More places, activities and memories are on the way.
              </p>
              <small>In development</small>
            </article>
          </div>
        </section>

        <section className="section community" id="suggestions">
          <div className="community-box">
            <span className="section-label">YOUR VOICE MATTERS</span>

            <h2>Help shape the game.</h2>

            <p>
              Got an idea for a new feature? Want a new activity,
              location or improvement? Send it directly to the team.
            </p>

            <button className="primary-button" onClick={() => handleOpenChannel("suggestions")}>
              💡 SEND A SUGGESTION
            </button>
          </div>

          <div className="community-box" id="songs">
            <span className="section-label">MUSIC</span>

            <h2>Request a song.</h2>

            <p>
              Got a song that belongs in the Mallu playlist?
              Send us your suggestion.
            </p>

            <button className="secondary-button" onClick={() => handleOpenChannel("suggestions")}>
              🎵 REQUEST A SONG
            </button>
          </div>
        </section>

        <section className="feedback" id="feedback">
          <span className="section-label">COMMUNITY FEEDBACK</span>

          <h2>Tell us what you think.</h2>

          <p>
            Your feedback helps us make Are You Malayali? better.
          </p>

          <button className="primary-button" onClick={() => handleOpenChannel("feedback")}>
            ⭐ GIVE FEEDBACK
          </button>
        </section>

        <section className="section forums">
          <div className="section-heading">
            <div>
              <span className="section-label">COMMUNITY FORUMS</span>
              <h2>Join the discussion.</h2>
            </div>
          </div>

          <div className="forums-grid">
            <div className="forum-channel">
              <div className="channel-header">
                <h3>🎵 Song Suggestions</h3>
                <span className="channel-count">{forumPosts.suggestions.length}</span>
              </div>
              <p>Suggest new Mallu songs for the in-game playlist. Let the community vote on your favorites!</p>
              <button className="secondary-button" onClick={() => handleOpenChannel("suggestions")}>ENTER CHANNEL →</button>
            </div>

            <div className="forum-channel">
              <div className="channel-header">
                <h3>⭐ Feedback & Ideas</h3>
                <span className="channel-count">{forumPosts.feedback.length}</span>
              </div>
              <p>Share your ideas, suggestions, and feedback to help us improve the game experience.</p>
              <button className="secondary-button" onClick={() => handleOpenChannel("feedback")}>ENTER CHANNEL →</button>
            </div>

            <div className="forum-channel">
              <div className="channel-header">
                <h3>🎮 General Discussion</h3>
                <span className="channel-count">{forumPosts.general.length}</span>
              </div>
              <p>Hangout with the community, share stories, memories, and connect with other Malayali players.</p>
              <button className="secondary-button" onClick={() => handleOpenChannel("general")}>ENTER CHANNEL →</button>
            </div>

            <div className="forum-channel">
              <div className="channel-header">
                <h3>🐛 Bug Reports</h3>
                <span className="channel-count">{forumPosts.bugs.length}</span>
              </div>
              <p>Found a bug? Report it here and help us keep the game running smoothly for everyone.</p>
              <button className="secondary-button" onClick={() => handleOpenChannel("bugs")}>ENTER CHANNEL →</button>
            </div>
          </div>
        </section>

        <section className="credits">
          <div className="col">
            <h3>Credits</h3>
            <p>• Owner & Developer: Aadi<br />• Co-Developer: Kaniel<br />• GFX & Thumbnails: Fluffy<br />• Studio: Dios Productions</p>
          </div>

          <div className="col">
            <h3>Play</h3>
            <p>Play the game on Roblox:</p>
            <a className="outline-button" href="https://www.roblox.com/games/105872949117236/Are-You-Malayali" target="_blank" rel="noreferrer">Open Are You Malayali on Roblox →</a>
          </div>
        </section>
      </main>

      <footer>
        <div>
          <div className="footer-brand">
            <img src="/assets/game-logo.png" alt="Are You Malayali Logo" className="footer-logo" />
            <div>
              <strong>🌿 Are You Malayali?</strong>
              <p>Made for the community.</p>
            </div>
          </div>
        </div>

        <span>© 2026 Dios Productions</span>
      </footer>

      {selectedChannel && (
        <div className="modal-overlay" onClick={handleCloseChannel}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>{channels[selectedChannel].title}</h2>
                <small className="live-users">👥 {liveUsers} online</small>
              </div>
              <button className="close-btn" onClick={handleCloseChannel}>✕</button>
            </div>

            <div className="forum-posts-container">
              <form className="post-form" onSubmit={handlePostSubmit}>
                <div className="form-group">
                  <label className="form-label">Username</label>
                  <div className="form-input-wrapper">
                    <input
                      type="text"
                      placeholder="Your username..."
                      value={userName}
                      onChange={(e) => setUserName(e.target.value.slice(0, MAX_USERNAME_LENGTH))}
                      maxLength={MAX_USERNAME_LENGTH}
                      className="form-input"
                    />
                    <span className="char-count">{userName.length}/{MAX_USERNAME_LENGTH}</span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Message</label>
                  <div className="form-input-wrapper">
                    <textarea
                      placeholder="What's on your mind? Share your thoughts, suggestions, or feedback..."
                      value={postContent}
                      onChange={(e) => setPostContent(e.target.value.slice(0, MAX_CONTENT_LENGTH))}
                      maxLength={MAX_CONTENT_LENGTH}
                      className="form-textarea"
                      rows="4"
                    />
                    <span className="char-count">{postContent.length}/{MAX_CONTENT_LENGTH}</span>
                  </div>
                </div>

                {imagePreview && (
                  <div className="image-preview">
                    <img src={imagePreview} alt="Preview" className="preview-img" />
                    <button type="button" className="remove-image-btn" onClick={removeImage}>✕</button>
                  </div>
                )}

                <div className="form-actions">
                  <button
                    type="button"
                    className="image-button"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    🖼️ Add Image
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    style={{ display: "none" }}
                  />
                </div>

                {error && <div className="error-message">{error}</div>}

                <button
                  type="submit"
                  className="primary-button"
                  disabled={!userName.trim() || !postContent.trim()}
                >
                  POST MESSAGE
                </button>
              </form>

              <div className="posts-list">
                {forumPosts[selectedChannel].length === 0 ? (
                  <div className="no-posts">
                    <p>No posts yet. Be the first to share! 🌿</p>
                  </div>
                ) : (
                  forumPosts[selectedChannel].map((post) => (
                    <div key={post.id} className="forum-post">
                      <div className="post-header">
                        <strong className="post-author">{post.author}</strong>
                        <span className="post-time">{post.timestamp}</span>
                      </div>
                      <p className="post-content">{post.content}</p>
                      {post.image && (
                        <img src={post.image} alt="Post" className="post-image" />
                      )}
                      <div className="post-actions">
                        <button
                          className={`like-btn ${post.liked ? "liked" : ""}`}
                          onClick={() => handleLike(selectedChannel, post.id)}
                        >
                          {post.liked ? "❤️" : "🤍"} {post.likes}
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
    </div>
  );
}

export default App;