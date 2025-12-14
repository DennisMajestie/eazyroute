// src/app/models/bus-stop.model.ts

import { TransportPointType } from './transport-point.constants';

export type VerificationStatus = 'pending' | 'community' | 'verified' | 'flagged';
export type TransportMode = 'bus' | 'okada' | 'keke' | 'taxi' | 'walking';

export interface LocationPoint {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
}

export interface BusStop {
    id: string | number; // Support both for backward compatibility
    name: string;
    type: TransportPointType;
    localNames: string[];

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

    // Media
    photos: string[];

    // Usage tracking
    usageCount: number;
    isActive: boolean;

    // Legacy fields (keep for backward compatibility)
    verified: boolean;
    addedBy?: number;
    createdAt: Date;
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
}