require("dotenv").config();

const express = require("express");
const cors = require("cors");

const { initializeEarthEngine, analyzeFlood } = require("./geeService.cjs");

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", async (req, res) => {
  try {
    await initializeEarthEngine();

    res.json({
      ok: true,
      gee: true,
      message: "RapidFlood GEE backend is running",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      ok: false,
      gee: false,
      error: error.message,
    });
  }
});

app.post("/api/analyze", async (req, res) => {
  try {
    const { params, location } = req.body;

    if (!params) {
      return res.status(400).json({
        error: "Missing analysis parameters",
      });
    }

    if (!location || !location.bbox) {
      return res.status(400).json({
        error: "Missing location or bbox",
      });
    }

    console.log("Starting GEE flood analysis:", {
      location: location.name,
      preFloodDate: params.preFloodDate,
      postFloodDate: params.postFloodDate,
      polarization: params.polarization,
      thresholdDb: params.thresholdDb,
    });

    const result = await analyzeFlood(params, location);

    res.json({
      ok: true,
      result,
    });
  } catch (error) {
    console.error("GEE analysis failed:", error);

    res.status(500).json({
      ok: false,
      error: error.message || "Unknown GEE error",
    });
  }
});

app.post("/api/route", async (req, res) => {
  try {
    const { start, destination, preference = 50, strictAvoidance = false } = req.body || {};

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

    res.json({
      ok: true,
      message: "Route request validated",
      preference,
      strictAvoidance,
    });
  } catch (error) {
    console.error("Routing error:", error);
    res.status(500).json({
      ok: false,
      error: error.message || "Unknown routing error",
    });
  }
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`RapidFlood GEE server running on http://localhost:${PORT}`);
});
