// Supabase Edge Function: Get Roblox Live Player Count
// Deploy this to: Supabase Dashboard → Edge Functions → Create New
// Name it: "get-roblox-stats"

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GAME_ID = "9100306231";
const API_KEY = "BsR+mH/6FECQlDIwBYEiaz7UIFq6QofTFK+pEPFqIzh7nIi8ZXlKaGJHY2lPaUpTVXpJMU5pSXNJbXRwWkNJNkluTnBaeTB5TURJeExUQTNMVEV6VkRFNE9qVXhPalE1V2lJc0luUjVjQ0k2SWtwWFZDSjkuZXlKaGRXUWlPaUpTYjJKc2IzaEpiblJsY201aGJDSXNJbWx6Y3lJNklrTnNiM1ZrUVhWMGFHVnVkR2xqWVhScGIyNVRaWEoyYVdObElpd2lZbUZ6WlVGd2FVdGxlU0k2SWtKelVpdHRTQzgyUmtWRFVXeEVTWGRDV1VWcFlYbzNWVWxHY1RaUmIyWlVSa3NyY0VWUVJuRkplbWczYmtsbE9DSXNJbTkzYm1WeVNXUWlPaUkwTmpBME56azFOREkwSWl3aVpYaHdJam94TnpnNE1qWTBNREkwTENKcFlYUWlPakUzT0RneU5qQTBNalFzSW01aVppSTZNVGM0T0RJMk1EUXlOSDAuU0JTSE9iNmVPR09TcGtyRlVVMEUzNnY1SnpkMnNYSVlRZFpkcGJ5UjBVVG5jZVJfRlZLLXkyTFFxeTJza29PT0tHUkxaY0NSRUJqckM0b2xCUEhFSG5KTVQxSTBadzg1OW9EQlRodVVKLWdVNlhER1ljb041aEtxOTg1MXgyNk5fVW5NdlozcU5rbHgtSFVFOXd1Q2VzRlV1TVFqd25aWlFrVUVwYlo4ZUh6Ynl0b1Y2dkhYdm45NG1OdVg4OWdYUDluelNEckgxX3FXaGhldURieS1qWlJzN0RlZUZFemJQNmlkUERUYjk0MDJuOXdjWS04U2ktdmZLQXR4YU0yZjFGX2Rmd2RVWHk0RFhnRTBTLTNCSnFQM1ZpeFN2aFVQSC0xMWtKR0hjVWE5bkMtTXc0bDctT0ZLc0tFeFVSWDgwWmxrTGVZSmZ6Vnd2SVQ1R3QyWTRn";

serve(async (req) => {
  // Enable CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  try {
    // Fetch from Roblox Open Cloud API
    const response = await fetch(
      `https://apis.roblox.com/universes/v1/${GAME_ID}/universe-stats`,
      {
        headers: {
          "x-api-key": API_KEY,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Roblox API error: ${response.status}`);
    }

    const data = await response.json();

    return new Response(
      JSON.stringify({
        playerCount: data.active_users || 0,
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
