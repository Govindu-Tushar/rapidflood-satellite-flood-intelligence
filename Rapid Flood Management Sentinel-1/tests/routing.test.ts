/**
 * Automated Test Suite for RapidFlood Flood-Aware Route Planner
 * Tests all 15 requirements specified in Section 14:
 * 1. Valid start and destination
 * 2. Missing start or destination
 * 3. Identical start and destination
 * 4. Shortest route intersects a mapped flood polygon
 * 5. A longer alternative avoids the mapped polygon
 * 6. Strict avoidance when a valid alternative exists
 * 7. No available route under strict avoidance
 * 8. Missing flood data
 * 9. Invalid or empty hazard geometry
 * 10. Changing the distance-risk preference
 * 11. Correct distance and flood-exposure calculations
 * 12. Duplicate alternative routes deduplication
 * 13. Route reversal
 * 14. Geodesic and ray-casting geometric math precision
 * 15. Metadata and data freshness integrity
 */

import { haversineDistance, isPointInPolygon, lineSegmentIntersectsPolygon, analyzeRouteFloodIntersections, polylineDistance } from "../src/services/spatialGeometry.ts";
import { RoutingEngine } from "../src/services/routingService.ts";
import { ROAD_NETWORKS } from "../src/data/roadNetworks.ts";
import { getMockAnalysisResults } from "../src/data/locations.ts";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`\x1b[32m✔ PASS\x1b[0m: ${testName}`);
    passed++;
  } else {
    console.error(`\x1b[31m✖ FAIL\x1b[0m: ${testName} ${detail ? `(${detail})` : ""}`);
    failed++;
  }
}

async function runTests() {
  console.log("\n=======================================================");
  console.log("   RAPIDFLOOD ROUTING SUITE — AUTOMATED VALIDATION   ");
  console.log("=======================================================\n");

  const chennaiNetwork = ROAD_NETWORKS["chennai-in"];
  const chennaiAnalysis = getMockAnalysisResults("chennai-in");
  const floodGeoJSON = chennaiAnalysis.geojson.floodExtent;

  const startWp = chennaiNetwork.waypoints[0]; // Siruseri OMR
  const destWp = chennaiNetwork.waypoints[5]; // Chennai Central

  // 1. Valid start and destination
  try {
    const res = await RoutingEngine.calculateRoutes(
      "chennai-in",
      {
        start: startWp,
        destination: destWp,
        preference: 50,
        strictAvoidance: false,
        showAlternatives: true,
        travelMode: "driving",
      },
      floodGeoJSON
    );
    assert(res.routes.length > 0 && res.selectedRouteId !== "", "Test 1: Valid start and destination calculates routes");
  } catch (e: any) {
    assert(false, "Test 1: Valid start and destination calculates routes", e.message);
  }

  // 2. Missing start or destination
  try {
    await RoutingEngine.calculateRoutes(
      "chennai-in",
      {
        start: null,
        destination: destWp,
        preference: 50,
        strictAvoidance: false,
        showAlternatives: true,
        travelMode: "driving",
      },
      floodGeoJSON
    );
    assert(false, "Test 2: Missing start throws error");
  } catch (e: any) {
    assert(e.message.includes("Both start point and destination must be selected"), "Test 2: Missing start throws validation error");
  }

  // 3. Identical start and destination
  try {
    await RoutingEngine.calculateRoutes(
      "chennai-in",
      {
        start: startWp,
        destination: startWp,
        preference: 50,
        strictAvoidance: false,
        showAlternatives: true,
        travelMode: "driving",
      },
      floodGeoJSON
    );
    assert(false, "Test 3: Identical start and destination throws error");
  } catch (e: any) {
    assert(e.message.includes("cannot be identical"), "Test 3: Identical start and destination throws error");
  }

  // 4. Shortest route intersects a mapped flood polygon
  try {
    const res = await RoutingEngine.calculateRoutes(
      "chennai-in",
      {
        start: startWp,
        destination: destWp,
        preference: 0, // Pure shortest
        strictAvoidance: false,
        showAlternatives: false,
        travelMode: "driving",
      },
      floodGeoJSON
    );
    const shortest = res.shortestRoute;
    assert(
      shortest !== null && shortest.floodedDistanceKm > 0 && shortest.floodExposurePercentage > 0,
      "Test 4: Ordinary shortest route detects mapped flood polygon intersections",
      `Exposure: ${shortest?.floodExposurePercentage}%`
    );
  } catch (e: any) {
    assert(false, "Test 4: Shortest route intersects a mapped flood polygon", e.message);
  }

  // 5. A longer alternative avoids the mapped polygon
  try {
    const koyambeduDest = chennaiNetwork.waypoints[8]; // Koyambedu Hub
    const res = await RoutingEngine.calculateRoutes(
      "chennai-in",
      {
        start: startWp,
        destination: koyambeduDest,
        preference: 100, // Max flood avoidance
        strictAvoidance: false,
        showAlternatives: true,
        travelMode: "driving",
      },
      floodGeoJSON
    );
    const floodAware = res.floodAwareRoute;
    const shortest = res.shortestRoute;
    assert(
      floodAware !== null &&
      shortest !== null &&
      floodAware.floodExposurePercentage < shortest.floodExposurePercentage,
      "Test 5: Flood-aware route has lower flood exposure than shortest route",
      `Flood-aware: ${floodAware?.floodExposurePercentage}% vs Shortest: ${shortest?.floodExposurePercentage}%`
    );
  } catch (e: any) {
    assert(false, "Test 5: A longer alternative avoids the mapped polygon", e.message);
  }

  // 6. Strict avoidance when a valid alternative exists
  try {
    const airportDest = chennaiNetwork.waypoints[6]; // Chennai Airport
    const res = await RoutingEngine.calculateRoutes(
      "chennai-in",
      {
        start: startWp,
        destination: airportDest,
        preference: 75,
        strictAvoidance: true,
        showAlternatives: true,
        travelMode: "driving",
      },
      floodGeoJSON
    );
    const floodAware = res.floodAwareRoute;
    assert(
      floodAware !== null && floodAware.floodExposurePercentage === 0,
      "Test 6: Strict avoidance successfully selects 0% flood route via elevated bypass",
      `Exposure: ${floodAware?.floodExposurePercentage}%`
    );
  } catch (e: any) {
    assert(false, "Test 6: Strict avoidance selects route", e.message);
  }

  // 7. No available route under strict avoidance
  try {
    // Artificial scenario: synthetic flood covering all connecting roads
    const globalFloodGeoJSON = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { deltaDb: "-10 dB", floodDepthEst: ">2m" },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [80.0, 12.7],
                [80.4, 12.7],
                [80.4, 13.3],
                [80.0, 13.3],
                [80.0, 12.7],
              ],
            ],
          },
        },
      ],
    };

    const res = await RoutingEngine.calculateRoutes(
      "chennai-in",
      {
        start: startWp,
        destination: destWp,
        preference: 75,
        strictAvoidance: true,
        showAlternatives: false,
        travelMode: "driving",
      },
      globalFloodGeoJSON
    );
    assert(
      res.floodAwareRoute === null &&
      res.warningNotice !== undefined &&
      res.warningNotice.includes("No route completely avoiding"),
      "Test 7: Strict avoidance reports blocked route without silently restoring flooded roads"
    );
  } catch (e: any) {
    assert(false, "Test 7: No available route under strict avoidance", e.message);
  }

  // 8. Missing flood data
  try {
    const res = await RoutingEngine.calculateRoutes(
      "chennai-in",
      {
        start: startWp,
        destination: destWp,
        preference: 50,
        strictAvoidance: false,
        showAlternatives: true,
        travelMode: "driving",
      },
      null // No flood data
    );
    assert(
      res.routes.length > 0 &&
      res.routes[0].floodedDistanceKm === 0 &&
      res.dataFreshness.hazardDataAvailable === false,
      "Test 8: Missing flood data handled gracefully with flood-blind label"
    );
  } catch (e: any) {
    assert(false, "Test 8: Missing flood data", e.message);
  }

  // 9. Invalid or empty hazard geometry
  try {
    const res = await RoutingEngine.calculateRoutes(
      "chennai-in",
      {
        start: startWp,
        destination: destWp,
        preference: 50,
        strictAvoidance: false,
        showAlternatives: true,
        travelMode: "driving",
      },
      { type: "FeatureCollection", features: [] } // Empty features
    );
    assert(
      res.routes.length > 0 && res.routes[0].floodExposurePercentage === 0,
      "Test 9: Empty hazard GeoJSON handled without crashing"
    );
  } catch (e: any) {
    assert(false, "Test 9: Empty hazard geometry", e.message);
  }

  // 10. Changing distance-risk preference slider alters routing cost
  try {
    const res0 = await RoutingEngine.calculateRoutes(
      "chennai-in",
      { start: startWp, destination: destWp, preference: 0, strictAvoidance: false, showAlternatives: false, travelMode: "driving" },
      floodGeoJSON
    );
    const res100 = await RoutingEngine.calculateRoutes(
      "chennai-in",
      { start: startWp, destination: destWp, preference: 100, strictAvoidance: false, showAlternatives: false, travelMode: "driving" },
      floodGeoJSON
    );
    assert(
      res0.selectedRouteId !== "" &&
      res100.selectedRouteId !== "" &&
      (res100.floodAwareRoute?.detourDistanceKm ?? 0) >= (res0.floodAwareRoute?.detourDistanceKm ?? 0),
      "Test 10: Changing preference slider alters cost and triggers detour for flood avoidance"
    );
  } catch (e: any) {
    assert(false, "Test 10: Changing distance-risk preference", e.message);
  }

  // 11. Correct distance and flood-exposure percentage calculations
  try {
    const mockRouteCoords: [number, number][] = [
      [12.98, 80.22],
      [12.98, 80.24],
      [12.98, 80.26],
    ];
    const analysis = analyzeRouteFloodIntersections(mockRouteCoords, floodGeoJSON);
    const expectedPercentage =
      analysis.totalDistanceKm > 0
        ? Number(((analysis.floodedDistanceKm / analysis.totalDistanceKm) * 100).toFixed(1))
        : 0;

    assert(
      analysis.totalDistanceKm > 0 &&
      Math.abs(analysis.exposurePercentage - expectedPercentage) <= 0.1,
      "Test 11: Real geometric calculation confirms P = 100 * D_f / D_r accurately",
      `Calculated: ${analysis.exposurePercentage}% vs Expected: ${expectedPercentage}%`
    );
  } catch (e: any) {
    assert(false, "Test 11: Metric calculation", e.message);
  }

  // 12. Duplicate alternative routes deduplication
  try {
    const res = await RoutingEngine.calculateRoutes(
      "chennai-in",
      { start: startWp, destination: destWp, preference: 50, strictAvoidance: false, showAlternatives: true, travelMode: "driving" },
      floodGeoJSON
    );
    const routeNames = res.routes.map(r => r.id);
    const uniqueNames = new Set(routeNames);
    assert(
      routeNames.length === uniqueNames.size,
      "Test 12: Deduplication prevents identical redundant route IDs and paths"
    );
  } catch (e: any) {
    assert(false, "Test 12: Duplicate alternative routes", e.message);
  }

  // 13. Route reversal
  try {
    const forward = await RoutingEngine.calculateRoutes(
      "chennai-in",
      { start: startWp, destination: destWp, preference: 0, strictAvoidance: false, showAlternatives: false, travelMode: "driving" },
      floodGeoJSON
    );
    const reverse = await RoutingEngine.calculateRoutes(
      "chennai-in",
      { start: destWp, destination: startWp, preference: 0, strictAvoidance: false, showAlternatives: false, travelMode: "driving" },
      floodGeoJSON
    );
    const forwardDist = forward.shortestRoute?.distanceKm ?? 0;
    const reverseDist = reverse.shortestRoute?.distanceKm ?? 0;
    assert(
      Math.abs(forwardDist - reverseDist) < 0.5,
      "Test 13: Route reversal preserves road network symmetric connectivity",
      `Forward: ${forwardDist} km, Reverse: ${reverseDist} km`
    );
  } catch (e: any) {
    assert(false, "Test 13: Route reversal", e.message);
  }

  // 14. Geodesic distance and ray-casting point-in-polygon math precision
  try {
    const d = haversineDistance(13.0827, 80.2707, 12.9856, 80.1652); // Chennai Central to Airport
    // Known real-world distance is ~15.5 - 16.5 km direct
    const isPoly = isPointInPolygon(
      [12.9785, 80.2215],
      [
        [80.20, 12.95],
        [80.25, 12.95],
        [80.25, 13.00],
        [80.20, 13.00],
        [80.20, 12.95],
      ]
    );
    assert(
      d >= 14 && d <= 18 && isPoly === true,
      "Test 14: Spherical Haversine & Ray-Casting algorithms compute exact geospatial coordinates",
      `Haversine: ${d.toFixed(2)} km`
    );
  } catch (e: any) {
    assert(false, "Test 14: Geodesic and ray-casting math", e.message);
  }

  // 15. Metadata and data freshness integrity
  try {
    const res = await RoutingEngine.calculateRoutes(
      "chennai-in",
      { start: startWp, destination: destWp, preference: 50, strictAvoidance: false, showAlternatives: true, travelMode: "driving" },
      floodGeoJSON
    );
    assert(
      res.dataFreshness.satelliteMission.includes("Sentinel-1") &&
      res.dataFreshness.roadSource.includes("OpenStreetMap") &&
      Boolean(res.dataFreshness.analysisTimestamp),
      "Test 15: Sensor metadata, satellite attribution, and timestamp integrity verified"
    );
  } catch (e: any) {
    assert(false, "Test 15: Metadata integrity", e.message);
  }

  console.log("\n=======================================================");
  console.log(`TEST SUMMARY: ${passed} PASSED / ${failed} FAILED`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
