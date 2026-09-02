// Vercel Serverless Function: Real-time Roblox Game Stats
// Universe ID: 9100306231 (Game: [Relapse] Are You Malayali?)

export default async function handler(req, res) {
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

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
    res.setHeader("Pragma", "no-cache");

    return res.status(200).json({
      playing,
      playerCount: playing,
      visits,
      likes: upVotes,
      upVotes,
      downVotes,
      favoritedCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
      playing: 0,
      playerCount: 0,
      visits: 0,
      likes: 0,
      favoritedCount: 0
    });
  }
}
