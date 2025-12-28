export enum TransportMode {
    KEKE = 'keke',
    BUS = 'bus',
    OKADA = 'okada',
    TAXI = 'taxi',
    WALKING = 'walking'
}

export interface IBusStop {
    id: string;
    name: string;
    location: { type: 'Point'; coordinates: [number, number] };
    // ... other existing fields if needed
}

export interface BoardingInference {
    anchor: IBusStop;
    walkingDistance: number;
    boardingProbability: number;
    microInstructions?: string;
    estimatedWalkTime: number;
    actionSuggestion?: string;
}

export interface AlongSegment {
    type: 'walk' | 'wait' | 'ride' | 'transfer';
    instruction: string;
    distance: number;
    estimatedTime: number;
    cost?: number;
    fromStop?: string;
    toStop?: string;
    vehicleType?: TransportMode | string;
    dropInstruction?: string;
    // V2 Routing Fields
    intermediateStops?: { id: string; name: string }[];
    bridgeEnabled?: boolean;
    backbonePriority?: boolean;
    instructions?: string; // Aligned with instructions plural
}

export interface AlongRoute {
    from: string;
    to: string;
    segments: AlongSegment[];
    totalDistance: number;
    totalTime: number;
    totalCost: number;
    instructions: string[];
    rationale?: string; // NEW: Explains route choice logic
    suggestion?: string; // Handling 404 Route Not Found suggestions
    // Backend V2 Fields
    minCost?: number;
    maxCost?: number;
    warnings?: string[];
    metadata?: {
        strategy: string; // 'shortest' | 'cheapest' | 'balanced'
        alternativeRoutes: boolean;
        isSurgeApplied?: boolean;
        backbonePriority?: boolean;
    };
}

export interface Corridor {
    id: string;
    localName: string;
    primaryMode: TransportMode;
    anchorSequence: string[]; // Bus Stop IDs
}

export interface AlongSearchResult {
    name: string;
    type: 'hotel' | 'school' | 'transport_point' | 'bus_stop' | 'place' | 'locality' | string;
    source: 'osm' | 'along';
    location: {
        lat: number;
        lng: number;
    };
    hierarchy?: string;
}

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
}
