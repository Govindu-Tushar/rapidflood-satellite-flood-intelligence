import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import {
  Maximize2,
  Minimize2,
  RotateCcw,
  Layers as LayersIcon,
  Navigation,
  MapPin,
  AlertTriangle,
  Waves,
  Map as MapIcon,
  Satellite,
  Compass,
  Info,
  ShieldAlert,
} from "lucide-react";
import { PlannedRoute, RouteWaypoint, AnalysisResults } from "../../types";

export type BasemapMode = "street" | "satellite" | "dark";

interface RouteMapProps {
  results: AnalysisResults;
  startPoint: RouteWaypoint | null;
  destPoint: RouteWaypoint | null;
  routes: PlannedRoute[];
  selectedRouteId: string;
  onSelectRoute: (routeId: string) => void;
  pickingMode: "start" | "dest" | null;
  onMapClickPoint: (lat: number, lng: number) => void;
  className?: string;
  initialBasemap?: BasemapMode;
}

export const RouteMap: React.FC<RouteMapProps> = ({
  results,
  startPoint,
  destPoint,
  routes,
  selectedRouteId,
  onSelectRoute,
  pickingMode,
  onMapClickPoint,
  className = "h-[620px] w-full",
  initialBasemap = "satellite",
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupsRef = useRef<{ [key: string]: L.LayerGroup }>({});

  const [baseMap, setBaseMap] = useState<BasemapMode>(initialBasemap);
  const [showFloodExtent, setShowFloodExtent] = useState<boolean>(true);
  const [showPriorityZones, setShowPriorityZones] = useState<boolean>(true);
  const [showHazardSegments, setShowHazardSegments] = useState<boolean>(true);
  const [showLayerPanel, setShowLayerPanel] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [tileErrorWarning, setTileErrorWarning] = useState<string | null>(null);

  // Initialize Leaflet map (only runs when location changes)
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const { center, zoom } = results.location;

    const map = L.map(mapContainerRef.current, {
      center: center,
      zoom: zoom,
      zoomControl: true,
      attributionControl: false,
    });

    mapInstanceRef.current = map;

    // Scale bar
    L.control.scale({ imperial: false, position: "bottomleft" }).addTo(map);

    // Initialize layer groups with explicit z-order
    layerGroupsRef.current = {
      baseTile: L.layerGroup().addTo(map),
      floodExtent: L.layerGroup().addTo(map),
      priorityZones: L.layerGroup().addTo(map),
      routes: L.layerGroup().addTo(map),
      hazardSegments: L.layerGroup().addTo(map),
      markers: L.layerGroup().addTo(map),
    };

    // Map click handler for picking start / dest
    map.on("click", (e: L.LeafletMouseEvent) => {
      onMapClickPoint(Number(e.latlng.lat.toFixed(5)), Number(e.latlng.lng.toFixed(5)));
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [results.location.id]);

  // Update Base Tile Layer when baseMap changes (PRESERVES zoom, center, markers, and routes!)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !layerGroupsRef.current.baseTile) return;

    layerGroupsRef.current.baseTile.clearLayers();
    setTileErrorWarning(null);

    let tileUrl = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
    let maxZoom = 18;
    let attribution = "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community";

    if (baseMap === "street") {
      tileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
      maxZoom = 19;
      attribution = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';
    } else if (baseMap === "dark") {
      tileUrl = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
      maxZoom = 19;
      attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';
    }

    const tileLayer = L.tileLayer(tileUrl, {
      maxZoom,
      subdomains: "abcd",
      attribution,
    });

    tileLayer.on("tileerror", () => {
      setTileErrorWarning("External tile provider connection timeout. Re-attempting fetch...");
    });

    layerGroupsRef.current.baseTile.addLayer(tileLayer);
  }, [baseMap]);

  // Update Flood Polygons & Priority Zones
  useEffect(() => {
    const lg = layerGroupsRef.current;
    if (!lg.floodExtent || !lg.priorityZones) return;

    // 1. Flood Extent (styled for high contrast on both aerial and street basemaps)
    lg.floodExtent.clearLayers();
    if (showFloodExtent && results.geojson?.floodExtent) {
      const isSat = baseMap === "satellite";
      const floodLayer = L.geoJSON(results.geojson.floodExtent, {
        style: () => ({
          color: isSat ? "#38bdf8" : "#0284c7",
          weight: 2.5,
          dashArray: "4, 4",
          fillColor: isSat ? "#0284c7" : "#0ea5e9",
          fillOpacity: isSat ? 0.65 : 0.5,
        }),
        onEachFeature: (feature, layer) => {
          layer.bindPopup(`
            <div class="text-xs font-mono space-y-1 p-1">
              <div class="flex items-center gap-1.5 font-bold text-cyan-400">
                <span class="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                ACTIVE SATELLITE FLOOD EXTENT
              </div>
              <div class="text-slate-200">Backscatter Drop: <strong class="text-cyan-300">${feature.properties?.deltaDb || "-7.2 dB"}</strong></div>
              <div class="text-slate-300">Confidence: <strong>${feature.properties?.waterConfidence || "High"}</strong></div>
              <div class="text-slate-300">Est. Depth: <strong class="text-amber-400">${feature.properties?.floodDepthEst || "1.0m"}</strong></div>
              <div class="text-slate-500 text-[10px] pt-1 border-t border-slate-700">Copernicus Sentinel-1 C-SAR IW 10m</div>
            </div>
          `);
        },
      });
      lg.floodExtent.addLayer(floodLayer);
    }

    // 2. Priority Zones
    lg.priorityZones.clearLayers();
    if (showPriorityZones && results.geojson?.priorityZones) {
      const pzLayer = L.geoJSON(results.geojson.priorityZones, {
        style: (feature) => ({
          color: feature?.properties?.color || "#ef4444",
          weight: 2,
          dashArray: "5, 5",
          fillColor: feature?.properties?.color || "#ef4444",
          fillOpacity: 0.18,
        }),
      });
      lg.priorityZones.addLayer(pzLayer);
    }
  }, [results, showFloodExtent, showPriorityZones, baseMap]);

  // Update Markers (Start & Destination)
  useEffect(() => {
    const lg = layerGroupsRef.current;
    if (!lg.markers) return;

    lg.markers.clearLayers();

    // Start marker (Green glowing pin)
    if (startPoint) {
      const startHtml = `
        <div class="relative flex items-center justify-center">
          <span class="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-emerald-400 opacity-70"></span>
          <div class="relative flex items-center justify-center h-7 w-7 rounded-full bg-emerald-500 border-2 border-white shadow-xl text-slate-950 font-black text-xs">
            S
          </div>
        </div>
      `;
      const startIcon = L.divIcon({
        className: "custom-start-marker",
        html: startHtml,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      const marker = L.marker([startPoint.lat, startPoint.lng], { icon: startIcon, zIndexOffset: 1000 });
      marker.bindPopup(`
        <div class="text-xs font-mono p-1">
          <strong class="text-emerald-400 block mb-0.5">ORIGIN / START POINT</strong>
          <div class="text-white font-bold">${startPoint.name}</div>
          <div class="text-slate-400 text-[10px] mt-0.5">${startPoint.lat.toFixed(4)}, ${startPoint.lng.toFixed(4)}</div>
        </div>
      `);
      lg.markers.addLayer(marker);
    }

    // Destination marker (Cyan glowing pin)
    if (destPoint) {
      const destHtml = `
        <div class="relative flex items-center justify-center">
          <span class="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-cyan-400 opacity-70"></span>
          <div class="relative flex items-center justify-center h-7 w-7 rounded-full bg-cyan-500 border-2 border-white shadow-xl text-space-950 font-black text-xs">
            D
          </div>
        </div>
      `;
      const destIcon = L.divIcon({
        className: "custom-dest-marker",
        html: destHtml,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      const marker = L.marker([destPoint.lat, destPoint.lng], { icon: destIcon, zIndexOffset: 1000 });
      marker.bindPopup(`
        <div class="text-xs font-mono p-1">
          <strong class="text-cyan-400 block mb-0.5">DESTINATION POINT</strong>
          <div class="text-white font-bold">${destPoint.name}</div>
          <div class="text-slate-400 text-[10px] mt-0.5">${destPoint.lat.toFixed(4)}, ${destPoint.lng.toFixed(4)}</div>
        </div>
      `);
      lg.markers.addLayer(marker);
    }
  }, [startPoint, destPoint]);

  // Update Route Polylines and Hazardous Road Segments
  useEffect(() => {
    const lg = layerGroupsRef.current;
    if (!lg.routes || !lg.hazardSegments) return;

    lg.routes.clearLayers();
    lg.hazardSegments.clearLayers();

    if (!routes || routes.length === 0) return;

    // Draw unselected / alternative routes first
    routes.forEach((route) => {
      const isSelected = route.id === selectedRouteId;
      if (isSelected) return; // will draw on top

      const isShortest = route.type === "shortest";
      // Ensure high contrast on both street and satellite views
      const color = isShortest ? (baseMap === "satellite" ? "#cbd5e1" : "#64748b") : "#818cf8";
      const poly = L.polyline(route.coordinates, {
        color,
        weight: 4,
        opacity: 0.75,
        dashArray: isShortest ? "6, 6" : undefined,
      });

      poly.on("click", () => {
        onSelectRoute(route.id);
      });

      poly.bindPopup(`
        <div class="text-xs font-mono p-1">
          <strong class="text-slate-200 block mb-0.5">${route.name}</strong>
          <div>Distance: <strong>${route.distanceKm} km</strong></div>
          <div>Flood Exposure: <strong class="${route.floodExposurePercentage > 0 ? "text-amber-400" : "text-emerald-400"}">${route.floodExposurePercentage}%</strong></div>
          <button class="mt-2 text-[10px] px-2 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-bold uppercase tracking-wider w-full">
            Select This Route
          </button>
        </div>
      `);

      lg.routes.addLayer(poly);
    });

    // Draw selected route with glowing electric cyan line
    const selectedRoute = routes.find((r) => r.id === selectedRouteId);
    if (selectedRoute) {
      // Background glow line
      const glowPoly = L.polyline(selectedRoute.coordinates, {
        color: "#06b6d4",
        weight: 10,
        opacity: 0.45,
      });
      lg.routes.addLayer(glowPoly);

      // Core crisp line
      const mainPoly = L.polyline(selectedRoute.coordinates, {
        color: "#22d3ee",
        weight: 5.5,
        opacity: 1,
      });

      mainPoly.bindPopup(`
        <div class="text-xs font-mono p-1">
          <div class="flex items-center gap-1.5 text-cyan-400 font-bold mb-1">
            <span class="w-2 h-2 rounded-full bg-cyan-400"></span>
            ACTIVE SELECTED ROUTE
          </div>
          <div class="text-white font-bold">${selectedRoute.name}</div>
          <div class="text-slate-300">Distance: <strong>${selectedRoute.distanceKm} km</strong></div>
          <div class="text-slate-300">Est. Time: <strong>${selectedRoute.travelTimeMin} min</strong></div>
          <div class="text-slate-300">Flood Exposure: <strong class="${selectedRoute.floodExposurePercentage > 0 ? "text-rose-400" : "text-emerald-400"}">${selectedRoute.floodExposurePercentage}% (${selectedRoute.floodedDistanceKm} km)</strong></div>
          ${selectedRoute.detourDistanceKm > 0 ? `<div class="text-cyan-300">Detour: +${selectedRoute.detourDistanceKm} km</div>` : ""}
        </div>
      `);

      lg.routes.addLayer(mainPoly);

      // Draw Flagged Hazardous Road Segments (Red/Orange Dashed with outline for high contrast)
      if (showHazardSegments && selectedRoute.hazardousSegments) {
        selectedRoute.hazardousSegments.forEach((seg) => {
          // Dark background border for contrast
          const hazardBorder = L.polyline(seg.coordinates, {
            color: "#450a0a",
            weight: 8,
            opacity: 0.8,
          });
          lg.hazardSegments.addLayer(hazardBorder);

          const hazardLine = L.polyline(seg.coordinates, {
            color: "#ef4444",
            weight: 6,
            opacity: 1,
            dashArray: "6, 6",
          });

          hazardLine.bindPopup(`
            <div class="text-xs font-mono p-1 space-y-1">
              <div class="flex items-center gap-1.5 text-rose-400 font-bold">
                <span class="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                ROADWAY INTERSECTS MAPPED FLOOD
              </div>
              <div class="text-white font-bold">${seg.name}</div>
              <div class="text-slate-300">Segment Length: <strong class="text-amber-400">${seg.lengthKm} km</strong></div>
              <div class="text-slate-300">Est. Water Depth: <strong class="text-rose-400">${seg.floodDepthEst || "Unknown"}</strong></div>
              <div class="text-slate-300">SAR Radar Drop: <strong>${seg.deltaDb || "-7 dB"}</strong></div>
              <div class="text-slate-400 text-[10px] pt-1 border-t border-slate-700">
                CAUTION: Submerged road surface. Do not attempt crossing high-velocity sheet flows.
              </div>
            </div>
          `);

          lg.hazardSegments.addLayer(hazardLine);
        });
      }
    }
  }, [routes, selectedRouteId, showHazardSegments, baseMap]);

  // Fit Route Bounds to Map
  const handleFitRoute = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const selectedRoute = routes.find((r) => r.id === selectedRouteId);
    if (selectedRoute && selectedRoute.coordinates.length > 0) {
      const bounds = L.latLngBounds(selectedRoute.coordinates.map((c) => [c[0], c[1]]));
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (startPoint && destPoint) {
      const bounds = L.latLngBounds([
        [startPoint.lat, startPoint.lng],
        [destPoint.lat, destPoint.lng],
      ]);
      map.fitBounds(bounds, { padding: [60, 60] });
    } else {
      map.setView(results.location.center, results.location.zoom);
    }
  };

  const handleResetView = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.setView(results.location.center, results.location.zoom);
  };

  // Get active mode label
  const getBasemapTitle = () => {
    switch (baseMap) {
      case "street":
        return "STREET MAP — GEOGRAPHIC ROAD NETWORK";
      case "satellite":
        return "SATELLITE IMAGERY — AERIAL GEOGRAPHIC CONTEXT";
      case "dark":
        return "DARK TACTICAL CANVAS";
    }
  };

  return (
    <div
      className={`relative rounded-xl overflow-hidden border border-space-800 bg-space-950 shadow-2xl flex flex-col ${className} ${
        isFullscreen ? "!fixed !inset-0 !z-50 !h-screen !w-screen !rounded-none" : ""
      }`}
    >
      {/* Top Banner when user is actively clicking on map to pick location */}
      {pickingMode && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 bg-cyan-500 text-space-950 font-mono text-xs font-black px-4 py-1.5 rounded-full shadow-lg flex items-center gap-2 animate-bounce">
          <MapPin className="w-3.5 h-3.5" />
          <span>
            CLICK MAP TO SET {pickingMode === "start" ? "ORIGIN (GREEN)" : "DESTINATION (CYAN)"}
          </span>
        </div>
      )}

      {/* Leaflet Map Canvas */}
      <div
        ref={mapContainerRef}
        className={`w-full flex-1 z-0 ${pickingMode ? "cursor-crosshair" : ""}`}
      />

      {/* PROMINENT TOP-RIGHT MAP CONTROLS & BASEMAP SWITCHER */}
      <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-2 max-w-[calc(100%-24px)]">
        
        {/* Row with Segmented View Switcher + Quick Actions */}
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          
          {/* Main Street / Satellite / Dark Switcher */}
          <div className="flex items-center bg-space-950/90 border border-space-700/80 rounded-xl p-1 shadow-2xl backdrop-blur-md">
            
            {/* STREET VIEW BUTTON */}
            <button
              id="street-view-btn"
              onClick={() => setBaseMap("street")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                baseMap === "street"
                  ? "bg-gradient-to-r from-sky-500 to-cyan-400 text-space-950 shadow-glow-cyan"
                  : "text-slate-300 hover:text-white hover:bg-space-850"
              }`}
              title="Switch to Street Map with OpenStreetMap geographic network"
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">STREET VIEW</span>
              <span className="sm:hidden">STREET</span>
            </button>

            {/* SATELLITE VIEW BUTTON */}
            <button
              id="satellite-view-btn"
              onClick={() => setBaseMap("satellite")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                baseMap === "satellite"
                  ? "bg-gradient-to-r from-sky-500 to-cyan-400 text-space-950 shadow-glow-cyan"
                  : "text-slate-300 hover:text-white hover:bg-space-850"
              }`}
              title="Switch to High-Resolution Satellite & Aerial Imagery"
            >
              <Satellite className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">SATELLITE VIEW</span>
              <span className="sm:hidden">SATELLITE</span>
            </button>

            {/* DARK CANVAS BUTTON */}
            <button
              id="dark-view-btn"
              onClick={() => setBaseMap("dark")}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                baseMap === "dark"
                  ? "bg-gradient-to-r from-sky-500 to-cyan-400 text-space-950 shadow-glow-cyan"
                  : "text-slate-400 hover:text-white hover:bg-space-850"
              }`}
              title="Switch to High-Contrast Dark Tactical Basemap"
            >
              <Compass className="w-3.5 h-3.5" />
              <span className="hidden md:inline text-[11px]">DARK</span>
            </button>

          </div>

          {/* Quick Map Utility Actions */}
          <div className="flex items-center gap-1 bg-space-950/90 border border-space-700/80 rounded-xl p-1 shadow-2xl backdrop-blur-md">
            
            {/* Layer Settings Toggle */}
            <button
              onClick={() => setShowLayerPanel(!showLayerPanel)}
              className={`p-1.5 rounded-lg border transition-all ${
                showLayerPanel
                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-400"
                  : "text-slate-300 hover:text-white border-transparent hover:bg-space-850"
              }`}
              title="Toggle Flood & Road Overlays"
            >
              <LayersIcon className="w-3.5 h-3.5" />
            </button>

            {/* Fit Route to Bounds */}
            <button
              onClick={handleFitRoute}
              className="p-1.5 rounded-lg text-slate-300 hover:text-cyan-400 hover:bg-space-850 transition-all"
              title="Fit Entire Route on Map"
            >
              <Navigation className="w-3.5 h-3.5" />
            </button>

            {/* Reset View */}
            <button
              onClick={handleResetView}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-space-850 transition-all"
              title="Reset View to Area of Interest"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-space-850 transition-all"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Map"}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

          </div>

        </div>

        {/* Technical Mode Indicator Badge */}
        <div className="bg-space-950/90 border border-space-800 rounded-lg px-2.5 py-1 text-[10px] font-mono text-slate-300 shadow-lg flex items-center gap-2 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
          <span className="font-bold tracking-wider text-slate-200">
            {getBasemapTitle()}
          </span>
        </div>

      </div>

      {/* Tile Connection Warning if network error occurs */}
      {tileErrorWarning && (
        <div className="absolute top-16 left-3 z-20 bg-amber-500/20 border border-amber-500/50 rounded-lg px-3 py-1 text-xs font-mono text-amber-200 backdrop-blur-md flex items-center gap-2 shadow-lg">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span>{tileErrorWarning}</span>
        </div>
      )}

      {/* Collapsible Layer Settings Flyout */}
      {showLayerPanel && (
        <div className="absolute top-16 right-3 z-30 w-72 bg-space-950/95 border border-cyan-electric/30 rounded-xl p-3.5 backdrop-blur-xl shadow-2xl text-xs space-y-3 font-mono animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between border-b border-space-800 pb-2">
            <span className="font-bold text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <LayersIcon className="w-3.5 h-3.5 text-cyan-400" />
              LAYER CONTROLS & BASEMAP
            </span>
            <button
              onClick={() => setShowLayerPanel(false)}
              className="text-slate-400 hover:text-white text-sm"
            >
              ✕
            </button>
          </div>

          {/* Basemap Selection */}
          <div className="space-y-1.5">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              ACTIVE BASEMAP PROVIDER
            </span>
            <div className="grid grid-cols-3 gap-1">
              {(["street", "satellite", "dark"] as const).map((b) => (
                <button
                  key={b}
                  onClick={() => setBaseMap(b)}
                  className={`py-1.5 px-2 rounded-lg text-[10px] uppercase font-bold text-center transition-all ${
                    baseMap === b
                      ? "bg-cyan-500 text-space-950 font-black shadow-glow-cyan"
                      : "bg-space-900 text-slate-300 hover:bg-space-800 hover:text-white"
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* Layer Visibility Toggles */}
          <div className="space-y-2 pt-2 border-t border-space-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              DISASTER & HAZARD OVERLAYS
            </span>
            
            <label className="flex items-center justify-between text-slate-300 hover:text-white cursor-pointer select-none">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded bg-cyan-400 opacity-90"></span>
                Sentinel-1 Flood Extent
              </span>
              <input
                type="checkbox"
                checked={showFloodExtent}
                onChange={(e) => setShowFloodExtent(e.target.checked)}
                className="accent-cyan-400 w-4 h-4 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between text-slate-300 hover:text-white cursor-pointer select-none">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded bg-rose-500 opacity-90"></span>
                Hazardous Road Segments
              </span>
              <input
                type="checkbox"
                checked={showHazardSegments}
                onChange={(e) => setShowHazardSegments(e.target.checked)}
                className="accent-rose-500 w-4 h-4 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between text-slate-300 hover:text-white cursor-pointer select-none">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded border border-rose-400"></span>
                Emergency Decision Zones
              </span>
              <input
                type="checkbox"
                checked={showPriorityZones}
                onChange={(e) => setShowPriorityZones(e.target.checked)}
                className="accent-amber-400 w-4 h-4 cursor-pointer"
              />
            </label>
          </div>
        </div>
      )}

      {/* Attribution & Legal Notice (Bottom Left) */}
      <div className="absolute bottom-2 left-2 z-20 bg-space-950/80 border border-space-800/80 rounded px-2 py-0.5 text-[9px] font-mono text-slate-400 backdrop-blur-sm pointer-events-none max-w-lg truncate">
        {baseMap === "satellite" ? (
          <span>Basemap: Esri World Imagery &bull; Overlays: Copernicus Sentinel-1 C-SAR</span>
        ) : baseMap === "street" ? (
          <span>Basemap: &copy; OpenStreetMap contributors &bull; Overlays: Copernicus Sentinel-1 C-SAR</span>
        ) : (
          <span>Basemap: &copy; CARTO &bull; Overlays: Copernicus Sentinel-1 C-SAR</span>
        )}
      </div>

      {/* Map Legend (Bottom Right Overlay) */}
      <div className="absolute bottom-6 right-3 z-20 bg-space-950/90 border border-space-800 rounded-lg p-2.5 backdrop-blur-md text-[10px] font-mono text-slate-300 space-y-1.5 shadow-xl pointer-events-none sm:pointer-events-auto">
        <div className="font-bold text-white text-[11px] mb-1">MAP LEGEND</div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
          <span>Selected Flood-Aware Route</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-1 border-t-2 border-dashed border-slate-300"></span>
          <span>Shortest Route (Flood-Blind)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-1.5 rounded-full bg-indigo-400"></span>
          <span>Alternative Bypass Route</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-1 border-t-2 border-dashed border-rose-500"></span>
          <span>Flagged Submerged Roadway</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-2 rounded bg-cyan-500/50 border border-cyan-400"></span>
          <span>Sentinel-1 SAR Inundation</span>
        </div>
      </div>
    </div>
  );
};
