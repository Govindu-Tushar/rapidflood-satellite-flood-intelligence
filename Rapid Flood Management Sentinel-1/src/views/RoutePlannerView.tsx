import React, { useState, useEffect, useMemo } from "react";
import {
  Route as RouteIcon,
  MapPin,
  Navigation,
  ShieldAlert,
  Waves,
  Layers,
  ArrowRightLeft,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Car,
  Clock,
  Compass,
  FileText,
  RotateCcw,
  Sparkles,
  Info,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import {
  AnalysisResults,
  LocationInfo,
  PlannedRoute,
  RouteHazardSegment,
  RoutePlanningOptions,
  RoutePlanningResult,
  RouteWaypoint,
} from "../types";
import { ROAD_NETWORKS } from "../data/roadNetworks";
import { RoutingEngine } from "../services/routingService";
import { RouteMap } from "../components/routes/RouteMap";

interface RoutePlannerViewProps {
  results: AnalysisResults;
  currentLocation: LocationInfo;
}

export const RoutePlannerView: React.FC<RoutePlannerViewProps> = ({
  results,
  currentLocation,
}) => {
  const activeNetwork = useMemo(() => {
    return ROAD_NETWORKS[currentLocation.id] || ROAD_NETWORKS["chennai-in"];
  }, [currentLocation.id]);

  // Origin & Destination state
  const [startPoint, setStartPoint] = useState<RouteWaypoint>(() => {
    return activeNetwork.waypoints[0] || { name: "Origin", lat: currentLocation.center[0], lng: currentLocation.center[1] };
  });

  const [destPoint, setDestPoint] = useState<RouteWaypoint>(() => {
    return activeNetwork.waypoints[activeNetwork.waypoints.length - 1] || { name: "Destination", lat: currentLocation.center[0] + 0.05, lng: currentLocation.center[1] + 0.05 };
  });

  // Controls state
  const [preference, setPreference] = useState<number>(75); // 0 (Shortest) to 100 (Max Flood Avoidance)
  const [strictAvoidance, setStrictAvoidance] = useState<boolean>(false);
  const [showAlternatives, setShowAlternatives] = useState<boolean>(true);
  const [travelMode] = useState<"driving">("driving");

  // Map picking mode
  const [pickingMode, setPickingMode] = useState<"start" | "dest" | null>(null);

  // Calculation state
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [routingResult, setRoutingResult] = useState<RoutePlanningResult | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reset origin & destination when AOI location changes
  useEffect(() => {
    if (activeNetwork.waypoints.length >= 2) {
      setStartPoint(activeNetwork.waypoints[0]);
      setDestPoint(activeNetwork.waypoints[activeNetwork.waypoints.length - 1]);
    } else {
      setStartPoint({ name: "Start Point", lat: currentLocation.center[0], lng: currentLocation.center[1] });
      setDestPoint({ name: "Destination", lat: currentLocation.center[0] + 0.03, lng: currentLocation.center[1] + 0.03 });
    }
    setRoutingResult(null);
    setSelectedRouteId("");
    setErrorMessage(null);
  }, [currentLocation.id, activeNetwork]);

  // Compute routes on button click or initial mount
  const runRouteCalculation = async () => {
    setIsCalculating(true);
    setErrorMessage(null);

    try {
      const options: RoutePlanningOptions = {
        start: startPoint,
        destination: destPoint,
        preference,
        strictAvoidance,
        showAlternatives,
        travelMode,
      };

      const result = await RoutingEngine.calculateRoutes(
        currentLocation.id,
        options,
        results.geojson?.floodExtent,
        results.geojson?.priorityZones
      );

      setRoutingResult(result);
      setSelectedRouteId(result.selectedRouteId);
    } catch (err: any) {
      console.error("Route calculation error:", err);
      setErrorMessage(err.message || "Failed to calculate road network route.");
      setRoutingResult(null);
    } finally {
      setIsCalculating(false);
    }
  };

  // Run calculation initially when component loads
  useEffect(() => {
    runRouteCalculation();
  }, [currentLocation.id]);

  // Swap Start & Destination
  const handleSwapLocations = () => {
    const temp = startPoint;
    setStartPoint(destPoint);
    setDestPoint(temp);
  };

  // Handle Map Click when picking mode is active
  const handleMapClickPoint = (lat: number, lng: number) => {
    if (pickingMode === "start") {
      setStartPoint({
        name: `Custom Origin (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        lat,
        lng,
      });
      setPickingMode(null);
    } else if (pickingMode === "dest") {
      setDestPoint({
        name: `Custom Destination (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        lat,
        lng,
      });
      setPickingMode(null);
    }
  };

  // Selected Route Object
  const activeRoute: PlannedRoute | undefined = useMemo(() => {
    if (!routingResult) return undefined;
    return routingResult.routes.find((r) => r.id === selectedRouteId) || routingResult.routes[0];
  }, [routingResult, selectedRouteId]);

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1700px] mx-auto animate-in fade-in">
      
      {/* Top Header & Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-space-800">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-bold uppercase tracking-wider mb-1">
            <RouteIcon className="w-4 h-4 text-cyan-400" />
            <span>RAPIDFLOOD NAVIGATION DSS</span>
            <span className="text-space-600">/</span>
            <span>{currentLocation.name}</span>
          </div>
          <h2 className="text-2xl font-black font-display text-white tracking-tight flex items-center gap-2.5">
            <span>Flood-Aware Shortest & Lowest-Risk Route Planner</span>
          </h2>
          <p className="text-slate-400 text-xs mt-1 max-w-3xl">
            Calculates road network corridors that dynamically trade geometric distance against satellite-detected flood inundation extents derived from Copernicus Sentinel-1 SAR imagery.
          </p>
        </div>

        {/* Telemetry pill */}
        <div className="flex items-center gap-3 bg-space-900 border border-space-800 rounded-xl px-3.5 py-2">
          <div className="flex items-center gap-2">
            <Waves className="w-4 h-4 text-cyan-400 animate-pulse" />
            <div className="text-left font-mono">
              <div className="text-[10px] text-slate-400 uppercase">ACTIVE SENSOR</div>
              <div className="text-xs font-bold text-slate-200">Sentinel-1 C-SAR IW</div>
            </div>
          </div>
          <div className="h-6 w-[1px] bg-space-800" />
          <div className="text-left font-mono">
            <div className="text-[10px] text-slate-400 uppercase">ROAD NETWORK</div>
            <div className="text-xs font-bold text-cyan-400">OpenStreetMap Graph</div>
          </div>
        </div>
      </div>

      {/* Persistent Safety Notice Banner */}
      <div className="bg-gradient-to-r from-space-900 via-space-900/90 to-space-900 border-l-4 border-l-cyan-400 border border-space-800 rounded-xl p-3.5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-400/10 text-cyan-400 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-white tracking-wider flex items-center gap-2">
              <span>FLOOD-AWARE DECISION SUPPORT — VERIFY CONDITIONS BEFORE TRAVEL</span>
              <span className="px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 text-[10px] border border-cyan-800">ADVISORY ONLY</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Routes avoid mapped flood extents where possible. No road is guaranteed safe. Rapid weather shifts or unmapped surface runoffs can alter passability. Official civil emergency directives strictly supersede all automated calculations.
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Controls Panel + Right Map & Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT CONTROL PANEL (Cols 1-4) */}
        <div className="lg:col-span-4 space-y-5">
          <div className="bg-space-900/90 border border-space-800 rounded-xl p-4.5 backdrop-blur-xl shadow-xl space-y-5">
            
            <div className="flex items-center justify-between border-b border-space-800 pb-3">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Navigation className="w-4 h-4 text-cyan-400" />
                ROUTE CONFIGURATION
              </span>
              <button
                onClick={handleSwapLocations}
                className="p-1.5 rounded-lg bg-space-800 hover:bg-space-700 text-slate-300 hover:text-cyan-400 border border-space-700 transition-colors"
                title="Swap Start and Destination"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Origin (Start) Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                  START LOCATION (ORIGIN)
                </span>
                <button
                  onClick={() => setPickingMode(pickingMode === "start" ? null : "start")}
                  className={`text-[10px] px-2 py-0.5 rounded transition-all font-bold ${
                    pickingMode === "start"
                      ? "bg-emerald-500 text-space-950 animate-pulse"
                      : "bg-space-800 text-slate-300 hover:bg-space-700 hover:text-white"
                  }`}
                >
                  {pickingMode === "start" ? "CLICK ON MAP..." : "SELECT ON MAP"}
                </button>
              </div>

              {/* Waypoint preset dropdown */}
              <select
                value={startPoint.name}
                onChange={(e) => {
                  const wp = activeNetwork.waypoints.find((w) => w.name === e.target.value);
                  if (wp) setStartPoint(wp);
                }}
                className="w-full bg-space-950 border border-space-700 rounded-lg px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
              >
                {activeNetwork.waypoints.map((wp) => (
                  <option key={wp.name} value={wp.name}>
                    {wp.name}
                  </option>
                ))}
                {!activeNetwork.waypoints.some((w) => w.name === startPoint.name) && (
                  <option value={startPoint.name}>{startPoint.name}</option>
                )}
              </select>

              {/* Coordinates readouts */}
              <div className="text-[10px] font-mono text-slate-400 px-1 flex justify-between">
                <span>Lat: {startPoint.lat.toFixed(4)}</span>
                <span>Lng: {startPoint.lng.toFixed(4)}</span>
              </div>
            </div>

            {/* Destination Selector */}
            <div className="space-y-2 pt-2 border-t border-space-800">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-cyan-400 font-bold flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                  DESTINATION POINT
                </span>
                <button
                  onClick={() => setPickingMode(pickingMode === "dest" ? null : "dest")}
                  className={`text-[10px] px-2 py-0.5 rounded transition-all font-bold ${
                    pickingMode === "dest"
                      ? "bg-cyan-500 text-space-950 animate-pulse"
                      : "bg-space-800 text-slate-300 hover:bg-space-700 hover:text-white"
                  }`}
                >
                  {pickingMode === "dest" ? "CLICK ON MAP..." : "SELECT ON MAP"}
                </button>
              </div>

              {/* Waypoint preset dropdown */}
              <select
                value={destPoint.name}
                onChange={(e) => {
                  const wp = activeNetwork.waypoints.find((w) => w.name === e.target.value);
                  if (wp) setDestPoint(wp);
                }}
                className="w-full bg-space-950 border border-space-700 rounded-lg px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
              >
                {activeNetwork.waypoints.map((wp) => (
                  <option key={wp.name} value={wp.name}>
                    {wp.name}
                  </option>
                ))}
                {!activeNetwork.waypoints.some((w) => w.name === destPoint.name) && (
                  <option value={destPoint.name}>{destPoint.name}</option>
                )}
              </select>

              {/* Coordinates readouts */}
              <div className="text-[10px] font-mono text-slate-400 px-1 flex justify-between">
                <span>Lat: {destPoint.lat.toFixed(4)}</span>
                <span>Lng: {destPoint.lng.toFixed(4)}</span>
              </div>
            </div>

            {/* Travel Mode */}
            <div className="space-y-1.5 pt-2 border-t border-space-800">
              <label className="text-[11px] font-mono text-slate-400 uppercase font-bold">
                TRAVEL MODE
              </label>
              <div className="flex items-center gap-2 bg-space-950 border border-space-700 rounded-lg px-3 py-2 text-xs font-semibold text-slate-200">
                <Car className="w-4 h-4 text-cyan-400" />
                <span>Emergency Vehicle / Driving</span>
                <span className="ml-auto text-[10px] font-mono text-slate-400">Road Network</span>
              </div>
            </div>

            {/* Route Preference Slider: Distance <-> Flood Avoidance */}
            <div className="space-y-2 pt-2 border-t border-space-800">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                  DISTANCE ↔ FLOOD AVOIDANCE
                </span>
                <span className="px-2 py-0.5 rounded bg-space-950 border border-space-700 text-cyan-300 font-bold text-[11px]">
                  {preference}%
                </span>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={preference}
                onChange={(e) => setPreference(Number(e.target.value))}
                className="w-full accent-cyan-400 bg-space-950 h-2 rounded-lg cursor-pointer"
              />

              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span className={preference < 30 ? "text-cyan-400 font-bold" : ""}>
                  Shortest (0%)
                </span>
                <span className={preference >= 30 && preference <= 70 ? "text-cyan-400 font-bold" : ""}>
                  Balanced (50%)
                </span>
                <span className={preference > 70 ? "text-cyan-400 font-bold" : ""}>
                  Max Avoidance (100%)
                </span>
              </div>
            </div>

            {/* Toggles: Strict Avoidance & Show Alternatives */}
            <div className="space-y-2 pt-2 border-t border-space-800 text-xs font-mono">
              <label className="flex items-center justify-between text-slate-300 hover:text-white cursor-pointer select-none">
                <span className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <span>AVOID MAPPED FLOOD ZONES (STRICT)</span>
                </span>
                <input
                  type="checkbox"
                  checked={strictAvoidance}
                  onChange={(e) => setStrictAvoidance(e.target.checked)}
                  className="accent-rose-500 w-4 h-4"
                />
              </label>
              <p className="text-[10px] text-slate-400 pl-6">
                Completely disallows traversed edges that intersect detected flood polygons. Reports blocked if no dry bypass exists.
              </p>

              <label className="flex items-center justify-between text-slate-300 hover:text-white cursor-pointer select-none pt-2">
                <span className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span>SHOW ALTERNATIVE ROUTES</span>
                </span>
                <input
                  type="checkbox"
                  checked={showAlternatives}
                  onChange={(e) => setShowAlternatives(e.target.checked)}
                  className="accent-cyan-400 w-4 h-4"
                />
              </label>
            </div>

            {/* Error Message if any */}
            {errorMessage && (
              <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-mono flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Strict Avoidance Blocked Notice */}
            {routingResult?.warningNotice && (
              <div className="p-3 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs font-mono space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-300">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>STRICT AVOIDANCE NOTICE</span>
                </div>
                <div>{routingResult.warningNotice}</div>
              </div>
            )}

            {/* Primary Action Button */}
            <div className="pt-2">
              <button
                onClick={runRouteCalculation}
                disabled={isCalculating}
                className="w-full py-3 px-4 rounded-xl font-bold font-mono text-xs uppercase tracking-wider bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-space-950 shadow-glow-cyan transition-all active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isCalculating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-space-950 border-t-transparent rounded-full animate-spin" />
                    <span>CALCULATING ROAD GRAPH...</span>
                  </>
                ) : (
                  <>
                    <RouteIcon className="w-4 h-4" />
                    <span>CALCULATE ROUTE</span>
                  </>
                )}
              </button>
            </div>

          </div>

          {/* Quick Route Selector Tabs */}
          {routingResult && routingResult.routes.length > 0 && (
            <div className="space-y-2.5">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 px-1">
                AVAILABLE ROAD ROUTES ({routingResult.routes.length})
              </span>
              
              <div className="space-y-2">
                {routingResult.routes.map((route) => {
                  const isSelected = route.id === selectedRouteId;
                  const isSafe = route.floodExposurePercentage === 0;

                  return (
                    <button
                      key={route.id}
                      onClick={() => setSelectedRouteId(route.id)}
                      className={`w-full p-3.5 rounded-xl border text-left transition-all font-mono space-y-2 relative ${
                        isSelected
                          ? "bg-space-900 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.15)] ring-1 ring-cyan-400"
                          : "bg-space-950/80 hover:bg-space-900 border-space-800 text-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-xs">
                          {route.type === "flood-aware" ? (
                            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]"></span>
                          ) : route.type === "shortest" ? (
                            <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                          ) : (
                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-400"></span>
                          )}
                          <span className={isSelected ? "text-white" : "text-slate-200"}>
                            {route.name}
                          </span>
                        </div>
                        
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                            isSafe
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                              : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                          }`}
                        >
                          {isSafe ? "0% FLOOD RISK" : `${route.floodExposurePercentage}% EXPOSURE`}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-[11px] pt-1 border-t border-space-800/80">
                        <div>
                          <div className="text-slate-400 text-[10px]">DISTANCE</div>
                          <div className="font-bold text-white">{route.distanceKm} km</div>
                        </div>
                        <div>
                          <div className="text-slate-400 text-[10px]">EST. TIME</div>
                          <div className="font-bold text-white">{route.travelTimeMin} min</div>
                        </div>
                        <div>
                          <div className="text-slate-400 text-[10px]">DETOUR</div>
                          <div className="font-bold text-cyan-300">
                            {route.detourDistanceKm > 0 ? `+${route.detourDistanceKm} km` : "Baseline"}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* RIGHT AREA: Interactive Map & Results Metrics (Cols 5-12) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Main Leaflet Route Map */}
          <RouteMap
            results={results}
            startPoint={startPoint}
            destPoint={destPoint}
            routes={routingResult?.routes || []}
            selectedRouteId={selectedRouteId}
            onSelectRoute={(id) => setSelectedRouteId(id)}
            pickingMode={pickingMode}
            onMapClickPoint={handleMapClickPoint}
            className="h-[520px] w-full"
          />

          {/* RESULTS DASHBOARD PANEL */}
          {activeRoute && (
            <div className="bg-space-900/90 border border-space-800 rounded-xl p-5 backdrop-blur-xl shadow-xl space-y-5">
              
              {/* Header with Title and Status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-space-800 pb-4">
                <div>
                  <div className="text-[11px] font-mono text-cyan-400 font-bold uppercase tracking-wider">
                    {activeRoute.label}
                  </div>
                  <h3 className="text-lg font-black font-display text-white mt-0.5">
                    {activeRoute.name}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase border ${
                      activeRoute.floodExposurePercentage === 0
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                        : activeRoute.floodExposurePercentage < 15
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                        : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                    }`}
                  >
                    {activeRoute.floodExposurePercentage === 0
                      ? "Zero Mapped Exposure"
                      : `Hazard Alert: ${activeRoute.floodExposurePercentage}% Flooded`}
                  </span>
                </div>
              </div>

              {/* 5 Key Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 font-mono">
                
                {/* Metric 1: Distance */}
                <div className="bg-space-950 p-3.5 rounded-xl border border-space-800 space-y-1">
                  <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                    <RouteIcon className="w-3 h-3 text-cyan-400" />
                    TOTAL DISTANCE
                  </div>
                  <div className="text-xl font-black text-white">
                    {activeRoute.distanceKm}{" "}
                    <span className="text-xs font-normal text-slate-400">km</span>
                  </div>
                  <div className="text-[10px] text-slate-400">Road Network Length</div>
                </div>

                {/* Metric 2: Estimated Travel Time */}
                <div className="bg-space-950 p-3.5 rounded-xl border border-space-800 space-y-1">
                  <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                    <Clock className="w-3 h-3 text-cyan-400" />
                    EST. TRAVEL TIME
                  </div>
                  <div className="text-xl font-black text-white">
                    {activeRoute.travelTimeMin}{" "}
                    <span className="text-xs font-normal text-slate-400">min</span>
                  </div>
                  <div className="text-[10px] text-slate-400">At Safe Road Speeds</div>
                </div>

                {/* Metric 3: Flood Exposure Distance */}
                <div className="bg-space-950 p-3.5 rounded-xl border border-space-800 space-y-1">
                  <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                    <Waves className="w-3 h-3 text-rose-400" />
                    FLOOD EXPOSURE
                  </div>
                  <div className={`text-xl font-black ${activeRoute.floodedDistanceKm > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                    {activeRoute.floodedDistanceKm}{" "}
                    <span className="text-xs font-normal text-slate-400">km</span>
                  </div>
                  <div className="text-[10px] text-slate-400">Inundated Roadway</div>
                </div>

                {/* Metric 4: Flood Exposure Percentage */}
                <div className="bg-space-950 p-3.5 rounded-xl border border-space-800 space-y-1">
                  <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3 text-amber-400" />
                    EXPOSURE %
                  </div>
                  <div className={`text-xl font-black ${activeRoute.floodExposurePercentage > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                    {activeRoute.floodExposurePercentage}%
                  </div>
                  <div className="text-[10px] text-slate-400">Of Total Journey</div>
                </div>

                {/* Metric 5: Detour Distance */}
                <div className="bg-space-950 p-3.5 rounded-xl border border-space-800 space-y-1">
                  <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                    <Navigation className="w-3 h-3 text-cyan-400" />
                    DETOUR DISTANCE
                  </div>
                  <div className="text-xl font-black text-cyan-300">
                    {activeRoute.detourDistanceKm > 0 ? `+${activeRoute.detourDistanceKm}` : "0.0"}{" "}
                    <span className="text-xs font-normal text-slate-400">km</span>
                  </div>
                  <div className="text-[10px] text-slate-400">Vs Shortest Path</div>
                </div>

              </div>

              {/* Rationale & Decision Explanation Box */}
              <div className="bg-space-950 border border-space-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400 uppercase tracking-wide">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <span>ROUTE SELECTION DECISION RATIONALE</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-sans">
                  {activeRoute.summary}
                </p>
                {routingResult?.shortestRoute && (
                  <div className="text-[11px] font-mono text-slate-400 pt-2 border-t border-space-850 flex flex-wrap gap-x-6 gap-y-1">
                    <span>Baseline Shortest: <strong>{routingResult.shortestRoute.distanceKm} km</strong> ({routingResult.shortestRoute.floodExposurePercentage}% flooded)</span>
                    <span>Flagged Submerged Road Sectors: <strong className="text-rose-400">{activeRoute.flaggedSegmentsCount}</strong></span>
                    <span>Safety Trade-off Factor: <strong className="text-cyan-300">&lambda; = {preference}</strong></span>
                  </div>
                )}
              </div>

              {/* Flagged Hazardous Segments Detail (if route has flood intersections) */}
              {activeRoute.hazardousSegments.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-rose-400 flex items-center gap-1.5 uppercase tracking-wide">
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                      HAZARDOUS ROAD SECTORS ON SELECTED CORRIDOR ({activeRoute.hazardousSegments.length})
                    </span>
                    <span className="text-[10px] text-slate-400">High Risk Caution Required</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 font-mono">
                    {activeRoute.hazardousSegments.map((seg, idx) => (
                      <div
                        key={seg.id || idx}
                        className="bg-space-950 border border-rose-500/30 rounded-lg p-3 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <strong className="text-white text-[11px]">{seg.name}</strong>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold uppercase">
                            SUBMERGED
                          </span>
                        </div>
                        <div className="text-slate-300 text-[11px] flex justify-between">
                          <span>Length: <strong className="text-amber-400">{seg.lengthKm} km</strong></span>
                          <span>Est. Depth: <strong className="text-rose-400">{seg.floodDepthEst}</strong></span>
                        </div>
                        <div className="text-slate-400 text-[10px]">
                          Zone: {seg.zoneName} &bull; SAR Drop: {seg.deltaDb}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Data Freshness & Sensor Telemetry Footer */}
              <div className="pt-3 border-t border-space-800 flex flex-wrap items-center justify-between gap-3 text-[10px] font-mono text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                  <span>Sensor: <strong>{routingResult?.dataFreshness.satelliteMission}</strong></span>
                </div>
                <div>
                  Road Graph: <strong>{routingResult?.dataFreshness.roadSource}</strong>
                </div>
                <div>
                  Analysis Timestamp: <strong>{new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</strong>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
};
