// src/app/models/bus-stop.model.ts

import { TransportPointType, TransportMode, VerificationStatus } from './transport-point.constants';
export type { TransportPointType, TransportMode, VerificationStatus };

export interface LocationPoint {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
}

export interface BusStop {
    id: string | number; // Support both for backward compatibility
    name: string;
    type: TransportPointType;
    localNames: string[];
    description?: string;
    verificationCount?: number;
    submittedBy?: string;

    // Location data (multiple formats for compatibility)
    location?: LocationPoint; // New GeoJSON format
    latitude: number; // Keep for backward compatibility
    longitude: number; // Keep for backward compatibility

    address: string;
    city: string;
    area: string; // Keep for backward compatibility

    // Verification and community data
    verificationStatus: VerificationStatus;
    upvotes: number;
    downvotes: number;

    // Transport information
    transportModes: TransportMode[];
    roles?: ('boarding' | 'alighting' | 'transfer')[];
    tier?: 'primary' | 'sub-landmark' | 'node';
    hierarchy?: {
        district?: string;
        ward?: string;
        estate?: string;
    };

    // Media
    photos: string[];

    // Usage tracking
    usageCount: number;
    isActive: boolean;

    // V2 Routing Fields
    backboneSide?: 'L' | 'R' | 'C'; // Side of expressway: Left, Right, Center
    bridgeEnabled?: boolean;       // True if this point is a pedestrian bridge

    // V3/V4 Safety Hardening
    securityProfile?: SecurityProfile;
    zone?: string; // ZONE_VILLAGE, ZONE_HUB, ZONE_RESTRICTED, etc.

    // Legacy fields (keep for backward compatibility)
    verified: boolean;
    addedBy?: number;
    createdAt: Date;
}

export interface SecurityProfile {
    level: 'safe' | 'caution' | 'high_risk';
    riskLevel?: 'safe' | 'caution' | 'high_risk'; // V4 alignment
    threats?: string[]; // V4 alignment
    safeZones: string[];
    riskAlerts: string[];
    lastVerifiedAt: Date;
    verificationSource?: 'police' | 'community' | 'official';
}

export interface CreateBusStopRequest {
    name: string;
    type: TransportPointType;
    localNames?: string[];

    // Location
    latitude: number;
    longitude: number;
    address?: string;
    city?: string;
    area: string; // Keep for backward compatibility

    // Transport modes
    transportModes: TransportMode[];

    // Optional fields
    description?: string;
    photos?: File[]; // For FormData upload
}

export interface SearchBusStopParams {
    search?: string;
    type?: TransportPointType;
    transportMode?: TransportMode;
    verificationStatus?: VerificationStatus;
    page?: number;
    limit?: number;
    sort?: string;
}

/**
 * Fuzzy search result with relevance scoring
 */
export interface FuzzySearchResult {
    _id: string;
    name: string;
    localNames?: string[];
    matchScore: number;         // 0-100 relevance score
    matchedField: string;       // which field matched: 'name' | 'localNames'
    location: {
        type: 'Point';
        coordinates: [number, number];  // [lng, lat]
    };
    address?: string;
    city?: string;
    distance?: number;          // distance from user in meters (optional)
    verificationStatus?: VerificationStatus;
    transportModes?: TransportMode[];
}