export type BusStopTier = 'primary' | 'sub-landmark' | 'node';
export type TransportMode = 'walking' | 'bus' | 'taxi' | 'keke' | 'okada';
export type BusStopRole = 'boarding' | 'alighting' | 'transfer';

export interface EnhancedBusStop {
    _id?: string;
    id?: string;
    name: string;
    localNames?: string[];
    location: {
        type: 'Point';
        coordinates: [number, number]; // [longitude, latitude]
    };
    tier: BusStopTier;
    transportModes: TransportMode[];
    roles: BusStopRole[];
    droppingPoints?: string[];
    city: string;
    state: string;
    district?: string;
    areaCouncil?: string; // NEW - Area Council (AMAC, Bwari, Gwagwalada, etc.)
    distanceFromCity?: number; // NEW - Distance from city center in km
    distance?: number; // Distance from user (for nearby searches)
    notes?: string;
}

export interface RouteSegment {
    fromId: string;
    fromName: string;
    toId: string;
    toName: string;
    mode: TransportMode;
    distance: number; // in meters
    duration: number; // in minutes
    cost?: number; // in Naira
    instruction: string;
    dropPoints?: string[];
}

export interface EnhancedRoute {
    from: string;
    to: string;
    segments: RouteSegment[];
    totalDistance: number; // in meters
    totalTime: number; // in minutes
    totalCost: number; // in Naira
    instructions: string[];
    rationale: string;
}

export interface EnhancedRouteResponse {
    success: boolean;
    data: EnhancedRoute;
    message?: string;
}

export interface BusStopSearchResponse {
    success: boolean;
    data: EnhancedBusStop[];
    total?: number;
    message?: string;
}
