/**
 * High-fidelity Road Network Topology & Waypoints for RapidFlood AOIs
 * Models actual highway arteries, river-crossing bridges, elevated bypasses,
 * and peri-urban corridors for Chennai, Sylhet, Valencia, and Patna.
 */

import type { RouteWaypoint } from "../types";

export interface RoadGraphNode {
  id: string;
  name: string;
  lat: number;
  lng: number;
  isEvacuationHub?: boolean;
}

export interface RoadGraphEdge {
  id: string;
  from: string;
  to: string;
  name: string;
  roadType: "Motorway / Expressway" | "Primary Highway" | "Arterial Corridor" | "Elevated Ring Road" | "Secondary Road" | "River Causeway";
  speedKmH: number;
  lengthKm: number;
  geometry: [number, number][]; // [lat, lng] array along the real road path
}

export interface LocationRoadNetwork {
  locationId: string;
  locationName: string;
  waypoints: RouteWaypoint[];
  defaultStartId: string;
  defaultDestId: string;
  nodes: RoadGraphNode[];
  edges: RoadGraphEdge[];
}

export const ROAD_NETWORKS: Record<string, LocationRoadNetwork> = {
  "chennai-in": {
    locationId: "chennai-in",
    locationName: "Chennai Coastal & River Basin, India",
    defaultStartId: "ch-wp-omr",
    defaultDestId: "ch-wp-central",
    waypoints: [
      { name: "Siruseri IT Park (OMR South)", lat: 12.8285, lng: 80.2185 },
      { name: "Sholinganallur Junction", lat: 12.9015, lng: 80.2278 },
      { name: "Velachery Central Hub", lat: 12.9785, lng: 80.2215 },
      { name: "Guindy Industrial Estate / Metro", lat: 13.0067, lng: 80.2033 },
      { name: "Adyar Bridge / South Coast", lat: 13.0075, lng: 80.2562 },
      { name: "Chennai Central Station", lat: 13.0827, lng: 80.2755 },
      { name: "Chennai International Airport (MAA)", lat: 12.9856, lng: 80.1652 },
      { name: "Tambaram Transit Terminal", lat: 12.9249, lng: 80.1185 },
      { name: "Koyambedu CMBT Hub", lat: 13.0694, lng: 80.1948 },
    ],
    nodes: [
      { id: "N_SIRUSERI", name: "Siruseri IT Corridor", lat: 12.8285, lng: 80.2185 },
      { id: "N_SHOLING", name: "Sholinganallur Jn", lat: 12.9015, lng: 80.2278 },
      { id: "N_PERUNGUDI", name: "Perungudi Lake Basin", lat: 12.9585, lng: 80.2385 },
      { id: "N_VELACHERY", name: "Velachery Low Basin", lat: 12.9785, lng: 80.2215 },
      { id: "N_ADYAR", name: "Adyar Estuary Crossing", lat: 13.0075, lng: 80.2562 },
      { id: "N_SAIDAPET", name: "Saidapet Bridge (Adyar)", lat: 13.0185, lng: 80.2225 },
      { id: "N_GUINDY", name: "Guindy Junction (Elevated)", lat: 13.0067, lng: 80.2033 },
      { id: "N_AIRPORT", name: "Chennai Airport (GST Rd)", lat: 12.9856, lng: 80.1652 },
      { id: "N_TAMBARAM", name: "Tambaram South Hub", lat: 12.9249, lng: 80.1185 },
      { id: "N_BYPASS_S", name: "Chennai Bypass South (Mudichur)", lat: 12.9325, lng: 80.0825 },
      { id: "N_BYPASS_M", name: "Chennai Bypass Porur Flyover", lat: 13.0345, lng: 80.1565 },
      { id: "N_KOYAMBEDU", name: "Koyambedu CMBT", lat: 13.0694, lng: 80.1948 },
      { id: "N_MOUNT_RD", name: "Anna Salai (Mount Road)", lat: 13.0455, lng: 80.2455 },
      { id: "N_CENTRAL", name: "Chennai Central Railway", lat: 13.0827, lng: 80.2755, isEvacuationHub: true },
      { id: "N_POONAMALLEE", name: "Poonamallee High Road", lat: 13.0785, lng: 80.2355 },
    ],
    edges: [
      // Direct Low-lying Coastal & River Basin Highway (Vulnerable to Adyar/Velachery inundation)
      {
        id: "E_OMR_1",
        from: "N_SIRUSERI",
        to: "N_SHOLING",
        name: "Old Mahabalipuram Road (OMR)",
        roadType: "Primary Highway",
        speedKmH: 50,
        lengthKm: 8.2,
        geometry: [
          [12.8285, 80.2185],
          [12.855, 80.222],
          [12.882, 80.225],
          [12.9015, 80.2278],
        ],
      },
      {
        id: "E_OMR_2",
        from: "N_SHOLING",
        to: "N_PERUNGUDI",
        name: "OMR Expressway (Perungudi Marshland Cut)",
        roadType: "Primary Highway",
        speedKmH: 45,
        lengthKm: 6.5,
        geometry: [
          [12.9015, 80.2278],
          [12.925, 80.232],
          [12.945, 80.236],
          [12.9585, 80.2385],
        ],
      },
      {
        id: "E_VELACHERY_CUT",
        from: "N_PERUNGUDI",
        to: "N_VELACHERY",
        name: "Velachery Inner Arterial (Low Basin Road)",
        roadType: "Arterial Corridor",
        speedKmH: 35,
        lengthKm: 3.2,
        geometry: [
          [12.9585, 80.2385],
          [12.968, 80.23],
          [12.9785, 80.2215],
        ],
      },
      {
        id: "E_ADYAR_LOW",
        from: "N_VELACHERY",
        to: "N_SAIDAPET",
        name: "Saidapet-Velachery Causeway (Adyar Flood Channel)",
        roadType: "River Causeway",
        speedKmH: 30,
        lengthKm: 4.8,
        geometry: [
          [12.9785, 80.2215],
          [12.995, 80.222],
          [13.008, 80.222],
          [13.0185, 80.2225],
        ],
      },
      {
        id: "E_ANNA_SALAI",
        from: "N_SAIDAPET",
        to: "N_MOUNT_RD",
        name: "Anna Salai (Central Arterial)",
        roadType: "Primary Highway",
        speedKmH: 50,
        lengthKm: 4.2,
        geometry: [
          [13.0185, 80.2225],
          [13.032, 80.235],
          [13.0455, 80.2455],
        ],
      },
      {
        id: "E_MOUNT_CENTRAL",
        from: "N_MOUNT_RD",
        to: "N_CENTRAL",
        name: "Anna Salai - Chennai Central Terminal",
        roadType: "Primary Highway",
        speedKmH: 45,
        lengthKm: 5.4,
        geometry: [
          [13.0455, 80.2455],
          [13.062, 80.262],
          [13.075, 80.271],
          [13.0827, 80.2755],
        ],
      },

      // Elevated West Bypass Corridors (High Ground / Flood Evacuation Route)
      {
        id: "E_SHOLING_TAMBARAM",
        from: "N_SHOLING",
        to: "N_TAMBARAM",
        name: "Medavakkam-Tambaram Elevated Link",
        roadType: "Arterial Corridor",
        speedKmH: 55,
        lengthKm: 12.8,
        geometry: [
          [12.9015, 80.2278],
          [12.912, 80.185],
          [12.918, 80.15],
          [12.9249, 80.1185],
        ],
      },
      {
        id: "E_TAMBARAM_BYPASS",
        from: "N_TAMBARAM",
        to: "N_BYPASS_S",
        name: "Chennai Bypass Highway Access",
        roadType: "Elevated Ring Road",
        speedKmH: 75,
        lengthKm: 4.2,
        geometry: [
          [12.9249, 80.1185],
          [12.928, 80.101],
          [12.9325, 80.0825],
        ],
      },
      {
        id: "E_BYPASS_MAIN",
        from: "N_BYPASS_S",
        to: "N_BYPASS_M",
        name: "Chennai Outer Bypass NH 48 (High Embankment)",
        roadType: "Motorway / Expressway",
        speedKmH: 80,
        lengthKm: 13.5,
        geometry: [
          [12.9325, 80.0825],
          [12.965, 80.098],
          [12.998, 80.122],
          [13.0345, 80.1565],
        ],
      },
      {
        id: "E_PORUR_KOYAMBEDU",
        from: "N_BYPASS_M",
        to: "N_KOYAMBEDU",
        name: "Maduravoyal Elevated Expressway Link",
        roadType: "Elevated Ring Road",
        speedKmH: 65,
        lengthKm: 5.6,
        geometry: [
          [13.0345, 80.1565],
          [13.052, 80.175],
          [13.0694, 80.1948],
        ],
      },
      {
        id: "E_KOYAMBEDU_POONAMALLEE",
        from: "N_KOYAMBEDU",
        to: "N_POONAMALLEE",
        name: "Poonamallee High Road (EVAC Arterial)",
        roadType: "Primary Highway",
        speedKmH: 55,
        lengthKm: 4.8,
        geometry: [
          [13.0694, 80.1948],
          [13.074, 80.215],
          [13.0785, 80.2355],
        ],
      },
      {
        id: "E_POONAMALLEE_CENTRAL",
        from: "N_POONAMALLEE",
        to: "N_CENTRAL",
        name: "Poonamallee High Road to Central",
        roadType: "Primary Highway",
        speedKmH: 50,
        lengthKm: 4.5,
        geometry: [
          [13.0785, 80.2355],
          [13.08, 80.255],
          [13.0827, 80.2755],
        ],
      },

      // Cross connections
      {
        id: "E_GUINDY_SAIDAPET",
        from: "N_GUINDY",
        to: "N_SAIDAPET",
        name: "Guindy - Saidapet Overpass",
        roadType: "Primary Highway",
        speedKmH: 45,
        lengthKm: 2.4,
        geometry: [
          [13.0067, 80.2033],
          [13.012, 80.212],
          [13.0185, 80.2225],
        ],
      },
      {
        id: "E_AIRPORT_GUINDY",
        from: "N_AIRPORT",
        to: "N_GUINDY",
        name: "GST Road Flyover",
        roadType: "Primary Highway",
        speedKmH: 60,
        lengthKm: 4.6,
        geometry: [
          [12.9856, 80.1652],
          [12.995, 80.182],
          [13.0067, 80.2033],
        ],
      },
      {
        id: "E_TAMBARAM_AIRPORT",
        from: "N_TAMBARAM",
        to: "N_AIRPORT",
        name: "GST Road (National Highway 32)",
        roadType: "Primary Highway",
        speedKmH: 60,
        lengthKm: 8.5,
        geometry: [
          [12.9249, 80.1185],
          [12.955, 80.138],
          [12.9856, 80.1652],
        ],
      },
      {
        id: "E_GUINDY_KOYAMBEDU",
        from: "N_GUINDY",
        to: "N_KOYAMBEDU",
        name: "Jawaharlal Nehru 100 Feet Inner Ring Road",
        roadType: "Elevated Ring Road",
        speedKmH: 60,
        lengthKm: 8.1,
        geometry: [
          [13.0067, 80.2033],
          [13.028, 80.201],
          [13.051, 80.198],
          [13.0694, 80.1948],
        ],
      },
    ],
  },

  "valencia-es": {
    locationId: "valencia-es",
    locationName: "Valencia & Turia Basin, Spain",
    defaultStartId: "v-wp-catarroja",
    defaultDestId: "v-wp-valencia-center",
    waypoints: [
      { name: "Catarroja Center (Horta Sud)", lat: 39.4032, lng: -0.4035 },
      { name: "Paiporta Station (Rambla del Poyo)", lat: 39.4278, lng: -0.4182 },
      { name: "Picanya Transport Hub", lat: 39.4358, lng: -0.4345 },
      { name: "Torrent Logistics Hub", lat: 39.4368, lng: -0.4655 },
      { name: "Valencia City Center (Plaça de l'Ajuntament)", lat: 39.4699, lng: -0.3763 },
      { name: "Manises Valencia International Airport (VLC)", lat: 39.4893, lng: -0.4815 },
      { name: "Valencia Maritime Port", lat: 39.4585, lng: -0.3275 },
    ],
    nodes: [
      { id: "VN_CATARROJA", name: "Catarroja (Horta Sud)", lat: 39.4032, lng: -0.4035 },
      { id: "VN_PAIPORTA", name: "Paiporta Basin (Rambla Poyo)", lat: 39.4278, lng: -0.4182 },
      { id: "VN_SEDAVI", name: "Sedaví Highway Junction", lat: 39.4255, lng: -0.3855 },
      { id: "VN_PICANYA", name: "Picanya High Ground", lat: 39.4358, lng: -0.4345 },
      { id: "VN_TORRENT", name: "Torrent Ring Road", lat: 39.4368, lng: -0.4655 },
      { id: "VN_V30_SOUTH", name: "V-30 South Turia River Channel", lat: 39.442, lng: -0.395 },
      { id: "VN_V30_WEST", name: "V-30 / A-7 West Bypass Interchange", lat: 39.458, lng: -0.452 },
      { id: "VN_AIRPORT", name: "Manises Airport", lat: 39.4893, lng: -0.4815 },
      { id: "VN_A3_WEST", name: "A-3 Autovía del Este Link", lat: 39.475, lng: -0.445 },
      { id: "VN_CENTER", name: "Valencia City Center", lat: 39.4699, lng: -0.3763, isEvacuationHub: true },
    ],
    edges: [
      // Direct Low-Lying Barranco del Poyo / Horta Sud Cut (severely inundated in DANA event)
      {
        id: "VE_POYO_1",
        from: "VN_CATARROJA",
        to: "VN_PAIPORTA",
        name: "CV-400 Horta Sud Arterial (Low Ground)",
        roadType: "Primary Highway",
        speedKmH: 60,
        lengthKm: 3.5,
        geometry: [
          [39.4032, -0.4035],
          [39.415, -0.411],
          [39.4278, -0.4182],
        ],
      },
      {
        id: "VE_POYO_2",
        from: "VN_PAIPORTA",
        to: "VN_V30_SOUTH",
        name: "CV-406 Turia Inflow Corridor",
        roadType: "River Causeway",
        speedKmH: 50,
        lengthKm: 3.1,
        geometry: [
          [39.4278, -0.4182],
          [39.435, -0.405],
          [39.442, -0.395],
        ],
      },
      {
        id: "VE_V30_CENTER",
        from: "VN_V30_SOUTH",
        to: "VN_CENTER",
        name: "V-15 / Avinguda d'Ausiàs March",
        roadType: "Arterial Corridor",
        speedKmH: 55,
        lengthKm: 4.2,
        geometry: [
          [39.442, -0.395],
          [39.455, -0.384],
          [39.4699, -0.3763],
        ],
      },

      // Elevated West Detour via Torrent & A-7 Mediterranean Autovía (Circumvents flood zone)
      {
        id: "VE_CATARROJA_TORRENT",
        from: "VN_CATARROJA",
        to: "VN_TORRENT",
        name: "CV-405 Elevated Western Arterial",
        roadType: "Primary Highway",
        speedKmH: 70,
        lengthKm: 7.2,
        geometry: [
          [39.4032, -0.4035],
          [39.415, -0.435],
          [39.428, -0.455],
          [39.4368, -0.4655],
        ],
      },
      {
        id: "VE_TORRENT_A7",
        from: "VN_TORRENT",
        to: "VN_V30_WEST",
        name: "A-7 Autovía del Mediterráneo (High Viaduct)",
        roadType: "Motorway / Expressway",
        speedKmH: 90,
        lengthKm: 4.8,
        geometry: [
          [39.4368, -0.4655],
          [39.448, -0.458],
          [39.458, -0.452],
        ],
      },
      {
        id: "VE_A7_A3",
        from: "VN_V30_WEST",
        to: "VN_A3_WEST",
        name: "A-7 / A-3 Elevated Highway Interchange",
        roadType: "Motorway / Expressway",
        speedKmH: 90,
        lengthKm: 3.2,
        geometry: [
          [39.458, -0.452],
          [39.468, -0.448],
          [39.475, -0.445],
        ],
      },
      {
        id: "VE_A3_CENTER",
        from: "VN_A3_WEST",
        to: "VN_CENTER",
        name: "A-3 Autovía del Este into Av. del Cid",
        roadType: "Primary Highway",
        speedKmH: 70,
        lengthKm: 6.8,
        geometry: [
          [39.475, -0.445],
          [39.472, -0.412],
          [39.471, -0.392],
          [39.4699, -0.3763],
        ],
      },
      {
        id: "VE_SEDAVI_CENTER",
        from: "VN_CATARROJA",
        to: "VN_SEDAVI",
        name: "V-31 Pista de Silla Corridor",
        roadType: "Primary Highway",
        speedKmH: 65,
        lengthKm: 3.8,
        geometry: [
          [39.4032, -0.4035],
          [39.415, -0.392],
          [39.4255, -0.3855],
        ],
      },
      {
        id: "VE_SEDAVI_V30",
        from: "VN_SEDAVI",
        to: "VN_V30_SOUTH",
        name: "V-30 Outer Ring Junction",
        roadType: "Elevated Ring Road",
        speedKmH: 70,
        lengthKm: 2.3,
        geometry: [
          [39.4255, -0.3855],
          [39.435, -0.389],
          [39.442, -0.395],
        ],
      },
    ],
  },

  "sylhet-bd": {
    locationId: "sylhet-bd",
    locationName: "Sylhet & Surma River Basin, Bangladesh",
    defaultStartId: "sy-wp-airport",
    defaultDestId: "sy-wp-south-surma",
    waypoints: [
      { name: "Osmani International Airport (ZYL)", lat: 24.9632, lng: 91.8665 },
      { name: "Shahjalal University (SUST)", lat: 24.9195, lng: 91.8315 },
      { name: "Keane Bridge / Surma Waterfront", lat: 24.8872, lng: 91.8685 },
      { name: "Sylhet Railway Junction (South Surma)", lat: 24.8725, lng: 91.8655 },
      { name: "Tilagarh Eco Park / High Ridge", lat: 24.9015, lng: 91.9025 },
    ],
    nodes: [
      { id: "SN_AIRPORT", name: "Osmani Airport Terminal", lat: 24.9632, lng: 91.8665 },
      { id: "SN_AIRPORT_RD", name: "Airport Road Junction", lat: 24.935, lng: 91.868 },
      { id: "SN_SUST", name: "SUST Akhaliya", lat: 24.9195, lng: 91.8315 },
      { id: "SN_CITY_NORTH", name: "Zindabazar Hub", lat: 24.899, lng: 91.871 },
      { id: "SN_KEANE_BRIDGE", name: "Keane Bridge (Surma River Crossing)", lat: 24.8872, lng: 91.8685 },
      { id: "SN_KAZIR_BAZAR", name: "Kazir Bazar Elevated Bridge", lat: 24.8845, lng: 91.8545 },
      { id: "SN_SOUTH_SURMA", name: "South Surma Bus Terminal", lat: 24.8725, lng: 91.8655, isEvacuationHub: true },
      { id: "SN_BYPASS_EAST", name: "Sylhet East Bypass (Tilagarh)", lat: 24.9015, lng: 91.9025 },
      { id: "SN_BYPASS_SOUTH", name: "Moglabazar Bypass Link", lat: 24.855, lng: 91.885 },
    ],
    edges: [
      // Direct Low-Lying Riverfront Route (Surma River Flash Flood)
      {
        id: "SE_AIRPORT_CITY",
        from: "SN_AIRPORT",
        to: "SN_AIRPORT_RD",
        name: "Airport Road Highway N208",
        roadType: "Primary Highway",
        speedKmH: 50,
        lengthKm: 3.5,
        geometry: [
          [24.9632, 91.8665],
          [24.948, 91.867],
          [24.935, 91.868],
        ],
      },
      {
        id: "SE_RD_ZINDA",
        from: "SN_AIRPORT_RD",
        to: "SN_CITY_NORTH",
        name: "VIP Road into Zindabazar",
        roadType: "Arterial Corridor",
        speedKmH: 40,
        lengthKm: 4.2,
        geometry: [
          [24.935, 91.868],
          [24.915, 91.869],
          [24.899, 91.871],
        ],
      },
      {
        id: "SE_ZINDA_KEANE",
        from: "SN_CITY_NORTH",
        to: "SN_KEANE_BRIDGE",
        name: "Surma River Promenade (Low Causeway)",
        roadType: "River Causeway",
        speedKmH: 25,
        lengthKm: 1.8,
        geometry: [
          [24.899, 91.871],
          [24.892, 91.87],
          [24.8872, 91.8685],
        ],
      },
      {
        id: "SE_KEANE_SOUTH",
        from: "SN_KEANE_BRIDGE",
        to: "SN_SOUTH_SURMA",
        name: "Station Road (Flood Plain)",
        roadType: "Arterial Corridor",
        speedKmH: 30,
        lengthKm: 1.9,
        geometry: [
          [24.8872, 91.8685],
          [24.879, 91.867],
          [24.8725, 91.8655],
        ],
      },

      // Elevated Kazir Bazar Bridge & Western Bypass (Safeguarded from River Swell)
      {
        id: "SE_AIRPORT_SUST",
        from: "SN_AIRPORT_RD",
        to: "SN_SUST",
        name: "Airport-Medikunja Link Road",
        roadType: "Primary Highway",
        speedKmH: 55,
        lengthKm: 5.1,
        geometry: [
          [24.935, 91.868],
          [24.928, 91.848],
          [24.9195, 91.8315],
        ],
      },
      {
        id: "SE_SUST_KAZIR",
        from: "SN_SUST",
        to: "SN_KAZIR_BAZAR",
        name: "Sunamganj Road - Kazir Bazar Bridge Approach",
        roadType: "Elevated Ring Road",
        speedKmH: 50,
        lengthKm: 4.6,
        geometry: [
          [24.9195, 91.8315],
          [24.9, 91.842],
          [24.8845, 91.8545],
        ],
      },
      {
        id: "SE_KAZIR_SOUTH",
        from: "SN_KAZIR_BAZAR",
        to: "SN_SOUTH_SURMA",
        name: "Kazir Bazar Elevated Bridge (4-Lane Flood-Safe)",
        roadType: "Primary Highway",
        speedKmH: 60,
        lengthKm: 2.1,
        geometry: [
          [24.8845, 91.8545],
          [24.878, 91.859],
          [24.8725, 91.8655],
        ],
      },
    ],
  },

  "patna-in": {
    locationId: "patna-in",
    locationName: "Patna & Ganga Floodplain, India",
    defaultStartId: "pt-wp-danapur",
    defaultDestId: "pt-wp-patna-junction",
    waypoints: [
      { name: "Danapur Cantonment / Station", lat: 25.632, lng: 85.045 },
      { name: "Digha Ghat (Ganga Riverfront)", lat: 25.658, lng: 85.105 },
      { name: "Patna AIIMS Hospital (High Ground)", lat: 25.568, lng: 85.035 },
      { name: "Patna Junction Railway Station", lat: 25.602, lng: 85.137 },
      { name: "Gandhi Maidan Central", lat: 25.621, lng: 85.148 },
    ],
    nodes: [
      { id: "PN_DANAPUR", name: "Danapur West Junction", lat: 25.632, lng: 85.045 },
      { id: "PN_DIGHA", name: "Digha Ghat (Ganga Swell)", lat: 25.658, lng: 85.105 },
      { id: "PN_RIVERFRONT", name: "JP Ganga Path Marine Drive", lat: 25.642, lng: 85.128 },
      { id: "PN_GANDHI_MAIDAN", name: "Gandhi Maidan North", lat: 25.621, lng: 85.148 },
      { id: "PN_AIIMS", name: "Patna AIIMS Embankment", lat: 25.568, lng: 85.035 },
      { id: "PN_BYPASS", name: "Patna Elevated Bypass NH 31", lat: 25.582, lng: 85.095 },
      { id: "PN_JUNCTION", name: "Patna Junction Hub", lat: 25.602, lng: 85.137, isEvacuationHub: true },
    ],
    edges: [
      // Direct Low-Lying Riverfront Route (Flooded by Monsoon Ganga Discharge)
      {
        id: "PE_DANAPUR_DIGHA",
        from: "PN_DANAPUR",
        to: "PN_DIGHA",
        name: "Danapur-Khagaul River Link",
        roadType: "Arterial Corridor",
        speedKmH: 45,
        lengthKm: 6.8,
        geometry: [
          [25.632, 85.045],
          [25.645, 85.075],
          [25.658, 85.105],
        ],
      },
      {
        id: "PE_DIGHA_MARINE",
        from: "PN_DIGHA",
        to: "PN_RIVERFRONT",
        name: "JP Ganga Path (River Shore Causeway)",
        roadType: "River Causeway",
        speedKmH: 50,
        lengthKm: 3.2,
        geometry: [
          [25.658, 85.105],
          [25.65, 85.118],
          [25.642, 85.128],
        ],
      },
      {
        id: "PE_MARINE_MAIDAN",
        from: "PN_RIVERFRONT",
        to: "PN_GANDHI_MAIDAN",
        name: "Ashok Rajpath Inflow Arterial",
        roadType: "Arterial Corridor",
        speedKmH: 35,
        lengthKm: 3.1,
        geometry: [
          [25.642, 85.128],
          [25.63, 85.138],
          [25.621, 85.148],
        ],
      },
      {
        id: "PE_MAIDAN_JUNCTION",
        from: "PN_GANDHI_MAIDAN",
        to: "PN_JUNCTION",
        name: "Fraser Road into Patna Junction",
        roadType: "Primary Highway",
        speedKmH: 40,
        lengthKm: 2.5,
        geometry: [
          [25.621, 85.148],
          [25.61, 85.142],
          [25.602, 85.137],
        ],
      },

      // Elevated South Bypass Corridor (High Embankment NH 31)
      {
        id: "PE_DANAPUR_AIIMS",
        from: "PN_DANAPUR",
        to: "PN_AIIMS",
        name: "Khagaul Elevated Arterial (Safe High Ground)",
        roadType: "Primary Highway",
        speedKmH: 60,
        lengthKm: 7.4,
        geometry: [
          [25.632, 85.045],
          [25.598, 85.038],
          [25.568, 85.035],
        ],
      },
      {
        id: "PE_AIIMS_BYPASS",
        from: "PN_AIIMS",
        to: "PN_BYPASS",
        name: "Patna South Ring Road NH 31",
        roadType: "Motorway / Expressway",
        speedKmH: 75,
        lengthKm: 6.8,
        geometry: [
          [25.568, 85.035],
          [25.575, 85.065],
          [25.582, 85.095],
        ],
      },
      {
        id: "PE_BYPASS_JUNCTION",
        from: "PN_BYPASS",
        to: "PN_JUNCTION",
        name: "Kankarbagh Elevated Flyover",
        roadType: "Elevated Ring Road",
        speedKmH: 60,
        lengthKm: 4.9,
        geometry: [
          [25.582, 85.095],
          [25.592, 85.115],
          [25.602, 85.137],
        ],
      },
    ],
  },
};
