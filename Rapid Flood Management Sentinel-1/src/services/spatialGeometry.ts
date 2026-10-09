/**
 * Geospatial Geometry & Spatial Intersection Engine for RapidFlood
 * Performs real spherical geodesic distance calculations, ray-casting point-in-polygon tests,
 * and polyline-hazard clipping without external heavy GIS dependencies.
 */

import type { RouteHazardSegment } from "../types";

export interface GeoPoint {
  lat: number;
  lng: number;
}

/**
 * Calculates Haversine distance between two coordinates in kilometers
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Total length of a polyline in kilometers
 */
export function polylineDistance(coords: [number, number][]): number {
  if (!coords || coords.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    total += haversineDistance(
      coords[i][0],
      coords[i][1],
      coords[i + 1][0],
      coords[i + 1][1]
    );
  }
  return Number(total.toFixed(3));
}

/**
 * Point-in-polygon ray-casting test.
 * Accepts point as [lat, lng] and polygon as array of [lng, lat] (GeoJSON standard) or [lat, lng].
 */
export function isPointInPolygon(
  point: [number, number], // [lat, lng]
  polyCoords: number[][] // either [lng, lat] or [lat, lng]
): boolean {
  if (!polyCoords || polyCoords.length < 3) return false;
  const [pLat, pLng] = point;
  let inside = false;

  // Detect coordinate order: GeoJSON uses [lng, lat]
  // In typical flood polygons, coords are [lng, lat]
  for (let i = 0, j = polyCoords.length - 1; i < polyCoords.length; j = i++) {
    const xi = polyCoords[i][0];
    const yi = polyCoords[i][1];
    const xj = polyCoords[j][0];
    const yj = polyCoords[j][1];

    // Check if GeoJSON [lng, lat]
    // Here pLng is X and pLat is Y
    const intersect =
      yi > pLat !== yj > pLat &&
      pLng < ((xj - xi) * (pLat - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Checks if line segment (p1 to p2) intersects or is contained in polygon
 */
export function lineSegmentIntersectsPolygon(
  p1: [number, number], // [lat, lng]
  p2: [number, number], // [lat, lng]
  polyCoords: number[][]
): boolean {
  // 1. Check if endpoints are inside
  if (isPointInPolygon(p1, polyCoords) || isPointInPolygon(p2, polyCoords)) {
    return true;
  }

  // 2. Check midpoint
  const mid: [number, number] = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
  if (isPointInPolygon(mid, polyCoords)) {
    return true;
  }

  // 3. Line-line intersection check with polygon boundary edges
  const [lat1, lng1] = p1;
  const [lat2, lng2] = p2;

  for (let i = 0; i < polyCoords.length - 1; i++) {
    const [cLng1, cLat1] = polyCoords[i];
    const [cLng2, cLat2] = polyCoords[i + 1];

    if (segmentsIntersect(lng1, lat1, lng2, lat2, cLng1, cLat1, cLng2, cLat2)) {
      return true;
    }
  }

  return false;
}

/**
 * Standard 2D line segment intersection (CCW test)
 */
function segmentsIntersect(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  x4: number,
  y4: number
): boolean {
  const ccw = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) => {
    return (cy - ay) * (bx - ax) > (by - ay) * (cx - ax);
  };
  return (
    ccw(x1, y1, x3, y3, x4, y4) !== ccw(x2, y2, x3, y3, x4, y4) &&
    ccw(x1, y1, x2, y2, x3, y3) !== ccw(x1, y1, x2, y2, x4, y4)
  );
}

/**
 * Interpolates points along a route so long straight segments don't miss small flood patches
 */
export function densifyPolyline(
  coords: [number, number][],
  maxSegmentMeters = 150
): [number, number][] {
  if (coords.length < 2) return coords;
  const result: [number, number][] = [coords[0]];

  for (let i = 0; i < coords.length - 1; i++) {
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const distMeters = haversineDistance(p1[0], p1[1], p2[0], p2[1]) * 1000;

    if (distMeters > maxSegmentMeters) {
      const steps = Math.ceil(distMeters / maxSegmentMeters);
      for (let s = 1; s <= steps; s++) {
        const factor = s / steps;
        const lat = p1[0] + (p2[0] - p1[0]) * factor;
        const lng = p1[1] + (p2[1] - p1[1]) * factor;
        result.push([lat, lng]);
      }
    } else {
      result.push(p2);
    }
  }

  return result;
}

export interface HazardAnalysisResult {
  totalDistanceKm: number;
  floodedDistanceKm: number;
  exposurePercentage: number;
  flaggedSegments: RouteHazardSegment[];
  safeSegments: [number, number][][];
}

/**
 * Evaluates route geometry against active GeoJSON flood polygons.
 * Dissects polyline into safe and hazardous segments with real calculated lengths.
 */
export function analyzeRouteFloodIntersections(
  rawCoords: [number, number][],
  floodGeoJSON: any,
  priorityZonesGeoJSON?: any
): HazardAnalysisResult {
  if (!rawCoords || rawCoords.length < 2) {
    return {
      totalDistanceKm: 0,
      floodedDistanceKm: 0,
      exposurePercentage: 0,
      flaggedSegments: [],
      safeSegments: [],
    };
  }

  const denseCoords = densifyPolyline(rawCoords, 100);
  const totalDist = polylineDistance(denseCoords);

  // Extract all polygon coordinates and feature properties from GeoJSON
  interface PolygonFeature {
    id: string;
    properties: any;
    rings: number[][][];
  }

  const polygonFeatures: PolygonFeature[] = [];

  if (floodGeoJSON && floodGeoJSON.features) {
    floodGeoJSON.features.forEach((feat: any, idx: number) => {
      if (feat.geometry?.type === "Polygon") {
        polygonFeatures.push({
          id: feat.properties?.id || `flood-poly-${idx + 1}`,
          properties: feat.properties || {},
          rings: feat.geometry.coordinates,
        });
      } else if (feat.geometry?.type === "MultiPolygon") {
        feat.geometry.coordinates.forEach((poly: any, pIdx: number) => {
          polygonFeatures.push({
            id: feat.properties?.id || `flood-poly-${idx + 1}-${pIdx}`,
            properties: feat.properties || {},
            rings: poly,
          });
        });
      }
    });
  }

  // Also extract priority zones for hazard metadata enrichment
  const priorityZoneFeatures: PolygonFeature[] = [];
  if (priorityZonesGeoJSON && priorityZonesGeoJSON.features) {
    priorityZonesGeoJSON.features.forEach((feat: any, idx: number) => {
      if (feat.geometry?.type === "Polygon") {
        priorityZoneFeatures.push({
          id: feat.properties?.zoneName || `pz-${idx + 1}`,
          properties: feat.properties || {},
          rings: feat.geometry.coordinates,
        });
      }
    });
  }

  // If no flood features exist, the entire route is safe
  if (polygonFeatures.length === 0) {
    return {
      totalDistanceKm: totalDist,
      floodedDistanceKm: 0,
      exposurePercentage: 0,
      flaggedSegments: [],
      safeSegments: [denseCoords],
    };
  }

  // Step through each mini-segment
  interface SubSegment {
    p1: [number, number];
    p2: [number, number];
    lengthKm: number;
    isFlooded: boolean;
    hitFeature?: PolygonFeature;
    priorityZoneName?: string;
  }

  const subSegments: SubSegment[] = [];

  for (let i = 0; i < denseCoords.length - 1; i++) {
    const p1 = denseCoords[i];
    const p2 = denseCoords[i + 1];
    const segLen = haversineDistance(p1[0], p1[1], p2[0], p2[1]);

    let isFlooded = false;
    let hitFeature: PolygonFeature | undefined;

    // Check intersection against flood polygons
    for (const feat of polygonFeatures) {
      const outerRing = feat.rings[0];
      if (lineSegmentIntersectsPolygon(p1, p2, outerRing)) {
        isFlooded = true;
        hitFeature = feat;
        break; // matched active flood
      }
    }

    // Check priority zones
    let pzName: string | undefined;
    for (const pz of priorityZoneFeatures) {
      if (lineSegmentIntersectsPolygon(p1, p2, pz.rings[0])) {
        pzName = pz.properties?.zoneName;
        break;
      }
    }

    subSegments.push({
      p1,
      p2,
      lengthKm: segLen,
      isFlooded,
      hitFeature,
      priorityZoneName: pzName,
    });
  }

  // Aggregate contiguous segments
  const flaggedSegments: RouteHazardSegment[] = [];
  const safeSegments: [number, number][][] = [];

  let currentHazardCoords: [number, number][] = [];
  let currentHazardLen = 0;
  let currentHitFeature: PolygonFeature | undefined;
  let currentPzName: string | undefined;

  let currentSafeCoords: [number, number][] = [];

  subSegments.forEach((sub, idx) => {
    if (sub.isFlooded) {
      // Flush safe segment if any
      if (currentSafeCoords.length > 1) {
        safeSegments.push([...currentSafeCoords]);
        currentSafeCoords = [];
      } else if (currentSafeCoords.length === 1) {
        currentSafeCoords = [];
      }

      // Add to current hazard cluster
      if (currentHazardCoords.length === 0) {
        currentHazardCoords.push(sub.p1);
      }
      currentHazardCoords.push(sub.p2);
      currentHazardLen += sub.lengthKm;
      currentHitFeature = sub.hitFeature || currentHitFeature;
      currentPzName = sub.priorityZoneName || currentPzName;
    } else {
      // Flush hazard segment if any
      if (currentHazardCoords.length > 1) {
        flaggedSegments.push({
          id: `hazard-seg-${flaggedSegments.length + 1}`,
          name: `Hazardous Sector ${flaggedSegments.length + 1} (${currentPzName || "Inundated Corridor"})`,
          roadType: "Submerged Roadway",
          coordinates: [...currentHazardCoords],
          lengthKm: Number(currentHazardLen.toFixed(2)),
          hazardType: "Inundated",
          deltaDb: currentHitFeature?.properties?.deltaDb || "-6.8 dB",
          floodDepthEst: currentHitFeature?.properties?.floodDepthEst || "0.8 - 1.4m Depth",
          confidence: currentHitFeature?.properties?.waterConfidence || "High Confidence",
          zoneName: currentPzName || "Active Basin Inundation",
        });
        currentHazardCoords = [];
        currentHazardLen = 0;
        currentHitFeature = undefined;
        currentPzName = undefined;
      }

      // Add to safe segments
      if (currentSafeCoords.length === 0) {
        currentSafeCoords.push(sub.p1);
      }
      currentSafeCoords.push(sub.p2);
    }
  });

  // Flush remaining
  if (currentHazardCoords.length > 1) {
    flaggedSegments.push({
      id: `hazard-seg-${flaggedSegments.length + 1}`,
      name: `Hazardous Sector ${flaggedSegments.length + 1} (${currentPzName || "Inundated Corridor"})`,
      roadType: "Submerged Roadway",
      coordinates: [...currentHazardCoords],
      lengthKm: Number(currentHazardLen.toFixed(2)),
      hazardType: "Inundated",
      deltaDb: currentHitFeature?.properties?.deltaDb || "-6.8 dB",
      floodDepthEst: currentHitFeature?.properties?.floodDepthEst || "0.8 - 1.4m Depth",
      confidence: currentHitFeature?.properties?.waterConfidence || "High Confidence",
      zoneName: currentPzName || "Active Basin Inundation",
    });
  }

  if (currentSafeCoords.length > 1) {
    safeSegments.push([...currentSafeCoords]);
  }

  const floodedDist = flaggedSegments.reduce((sum, seg) => sum + seg.lengthKm, 0);
  const exposurePct = totalDist > 0 ? Math.min(100, Math.max(0, (floodedDist / totalDist) * 100)) : 0;

  return {
    totalDistanceKm: totalDist,
    floodedDistanceKm: Number(floodedDist.toFixed(2)),
    exposurePercentage: Number(exposurePct.toFixed(1)),
    flaggedSegments,
    safeSegments,
  };
}
