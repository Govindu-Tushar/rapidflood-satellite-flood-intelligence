// Vercel Serverless Function for Route Planning API
module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  }

  try {
    const { start, destination, preference = 50, strictAvoidance = false, showAlternatives = true } = req.body || {};

    if (!start || !destination) {
      return res.status(400).json({
        ok: false,
        error: "Missing start or destination coordinates",
      });
    }

    if (
      Math.abs(start.lat - destination.lat) < 0.0001 &&
      Math.abs(start.lng - destination.lng) < 0.0001
    ) {
      return res.status(400).json({
        ok: false,
        error: "Start and destination cannot be identical locations",
      });
    }

    return res.status(200).json({
      ok: true,
      message: "Route parameters verified",
      preference,
      strictAvoidance,
      showAlternatives,
    });
  } catch (error) {
    console.error("Route calculation API error:", error);
    return res.status(500).json({
      ok: false,
      error: error?.message || String(error),
    });
  }
};
