// Supabase Edge Function: Get Roblox Live Player Count
// Deploy this to: Supabase Dashboard â†’ Edge Functions â†’ Create New
// Name it: "get-roblox-stats"

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// Public games API - no API key needed.
const UNIVERSE_ID = "9100306231";

serve(async (req) => {
  // Enable CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  try {
    // Public Roblox games API â€” no API key needed.
    // Returns live "playing" (active players) and total "visits".
    const response = await fetch(
      `https://games.roblox.com/v1/games?universeIds=${UNIVERSE_ID}`
    );

    if (!response.ok) {
      throw new Error(`Roblox API error: ${response.status}`);
    }

    const data = await response.json();
    const game = data.data?.[0] || {};

    return new Response(
      JSON.stringify({
        playerCount: game.playing || 0,
        visits: game.visits || 0,
        favoritedCount: game.favoritedCount || 0,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message, playerCount: 0 }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});

