/**
 * ALONG Framework Models
 * Locality-based micro-positioning system
 */

/**
 * Movement Profile - Behavioral characteristics of a locality
 */
export interface MovementProfile {
    typicalVehicles: string[];  // ['keke', 'taxi', 'bus', 'okada']
    walkingTolerance: [number, number];  // [min, max] in meters
    informalBoardingDensity: 'low' | 'medium' | 'high';
    peakHours: string[];  // ['7:00-9:00', '17:00-19:00']
}

/**
 * Locality - Behavioral zone (e.g., "Efab Estate Axis")
 */
export interface Locality {
    id: number;
    name: string;
    type: string;  // 'estate_axis', 'junction', 'market', etc.
    areaId: number;
    areaName?: string;
    movementProfile: MovementProfile;
    description?: string;
    latitude?: number;
    longitude?: number;
}

/**
 * Anchor - Transport point within a locality (e.g., "Efab Gate")
 */
export interface Anchor {
    id: number;
    name: string;
    localityId: number;
    localityName?: string;
    type: string;  // 'gate', 'junction', 'landmark', etc.
    transportModes: string[];  // ['keke', 'taxi']
    latitude: number;
    longitude: number;
    description?: string;
}

/**
 * Micro-Node - 2-10m precise positioning
 */
export interface MicroNode {
    id: number;
    anchorId: number;
    anchorName?: string;
    nodeType: string;  // 'boarding_candidate', 'drop_off', 'waiting_area'
    relativePosition: string;  // 'near_gate_house', 'beside_fence'
    microInstructions: string;  // "Stand 5m from gate house, keke drivers will see you"
    visibility: 'low' | 'medium' | 'high';
    safety: 'unsafe' | 'moderate' | 'safe';
    barriers: string[];  // ['estate_fence', 'drainage']
    distanceFromAnchor: number;  // meters
    latitude: number;
    longitude: number;
}

/**
 * Hierarchy - Complete tree structure
 */
export interface LocalityHierarchy {
    area: {
        id: number;
        name: string;
    };
    localities: Array<{
        locality: Locality;
        anchors: Array<{
            anchor: Anchor;
            microNodes: MicroNode[];
        }>;
    }>;
}

/**
 * Search Result - Unified search response
 */
export interface LocalitySearchResult {
    type: 'locality' | 'anchor' | 'micro_node';
    id: number;
    name: string;
    hierarchy: string;  // "Lokogoma → Efab Estate Axis → Efab Gate"
    latitude: number;
    longitude: number;
    locality?: Locality;
    anchor?: Anchor;
    microNode?: MicroNode;
}
