import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'roblox-stats-middleware',
      configureServer(server) {
        server.middlewares.use('/api/roblox-stats', async (req, res) => {
          const UNIVERSE_ID = "9100306231";
          const timestamp = Date.now();

          try {
            const [gamesRes, votesRes] = await Promise.all([
              fetch(`https://games.roblox.com/v1/games?universeIds=${UNIVERSE_ID}&_nc=${timestamp}`, {
                headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" }
              }),
              fetch(`https://games.roblox.com/v1/games/${UNIVERSE_ID}/votes?_nc=${timestamp}`, {
                headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" }
              })
            ]);

            const gamesData = gamesRes.ok ? await gamesRes.json() : {};
            const votesData = votesRes.ok ? await votesRes.json() : {};

            const game = gamesData.data?.[0] || {};
            const upVotes = typeof votesData.upVotes === 'number'
              ? votesData.upVotes
              : (typeof votesData.upvotes === 'number' ? votesData.upvotes : 0);
            const downVotes = typeof votesData.downVotes === 'number' ? votesData.downVotes : 0;
            const playing = typeof game.playing === 'number' ? game.playing : 0;
            const visits = typeof game.visits === 'number' ? game.visits : 0;
            const favoritedCount = typeof game.favoritedCount === 'number' ? game.favoritedCount : 0;

            res.setHeader("Content-Type", "application/json");
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
            res.end(JSON.stringify({
              playing,
              playerCount: playing,
              visits,
              likes: upVotes,
              upVotes,
              downVotes,
              favoritedCount,
              timestamp: new Date().toISOString()
            }));
          } catch (error) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: error.message }));
          }
        });
      }
    }
  ],
})
