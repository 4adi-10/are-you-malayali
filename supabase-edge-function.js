// Supabase Edge Function: Get Roblox Live Stats (Player Count, Visits, Likes, Favorites)
// Universe ID: 9100306231 (Place ID: 105872949117236)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const UNIVERSE_ID = "9100306231";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, cache-control, pragma",
      },
    });
  }

  try {
    const timestamp = Date.now();
    // Cache bust Roblox APIs
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
    const upVotes = typeof votesData.upVotes === 'number' ? votesData.upVotes : (typeof votesData.upvotes === 'number' ? votesData.upvotes : 0);
    const downVotes = typeof votesData.downVotes === 'number' ? votesData.downVotes : 0;
    const playing = typeof game.playing === 'number' ? game.playing : 0;
    const visits = typeof game.visits === 'number' ? game.visits : 0;
    const favoritedCount = typeof game.favoritedCount === 'number' ? game.favoritedCount : 0;

    return new Response(
      JSON.stringify({
        playerCount: playing,
        playing: playing,
        visits: visits,
        likes: upVotes,
        upVotes: upVotes,
        downVotes: downVotes,
        favoritedCount: favoritedCount,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          "Pragma": "no-cache",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message, playerCount: 0, visits: 0, likes: 0 }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-store",
        },
      }
    );
  }
});
