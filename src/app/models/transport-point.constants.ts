// src/app/models/transport-point.constants.ts

export type TransportMode = 'bus' | 'okada' | 'keke' | 'taxi' | 'walking';
export type VerificationStatus = 'pending' | 'community' | 'verified' | 'flagged';

export type TransportPointType =
    | 'bus_stop'
    | 'junction'
    | 'traffic_light'
    | 'okada_park'
    | 'keke_park'
    | 'terminal'
    | 'landmark'
    | 'village_entry'
    | 'roundabout';

export interface TransportPointTypeConfig {
    label: string;
    icon: string;
    color: string;
    description: string;
}

export const TRANSPORT_POINT_TYPES: Record<TransportPointType, TransportPointTypeConfig> = {
    bus_stop: {
        label: 'Bus Stop',
        icon: '🚌',
        color: '#4CAF50',
        description: 'Public bus stop or station'
    },
    junction: {
        label: 'Junction',
        icon: '🔀',
        color: '#FF9800',
        description: 'Road junction or intersection'
    },
    traffic_light: {
        label: 'Traffic Light',
        icon: '🚦',
        color: '#F44336',
        description: 'Traffic light intersection'
    },
    okada_park: {
        label: 'Okada Park',
        icon: '🏍️',
        color: '#9C27B0',
        description: 'Motorcycle (okada) pickup point'
    },
    keke_park: {
        label: 'Keke Park',
        icon: '🛺',
        color: '#00BCD4',
        description: 'Tricycle (keke) pickup point'
    },
    terminal: {
        label: 'Terminal',
        icon: '🚏',
        color: '#3F51B5',
        description: 'Major transport terminal'
    },
    landmark: {
        label: 'Landmark',
        icon: '📍',
        color: '#E91E63',
        description: 'Notable landmark or location'
    },
    roundabout: {
        label: 'Roundabout',
        icon: '⭕',
        color: '#607D8B',
        description: 'Traffic roundabout'
    },
    village_entry: {
        label: 'Village',
        icon: '🏘️',
        color: '#795548',
        description: 'Entry point to a village or gated community'
    }
};

export interface TransportModeConfig {
    label: string;
    icon: string;
    color: string;
    avgSpeedKmh: number;
}

export const TRANSPORT_MODES: Record<string, TransportModeConfig> = {
    bus: {
        label: 'Bus',
        icon: '🚌',
        color: '#4CAF50',
        avgSpeedKmh: 25
    },
    okada: {
        label: 'Okada',
        icon: '🏍️',
        color: '#9C27B0',
        avgSpeedKmh: 35
    },
    keke: {
        label: 'Keke',
        icon: '🛺',
        color: '#00BCD4',
        avgSpeedKmh: 20
    },
    taxi: {
        label: 'Taxi',
        icon: '🚕',
        color: '#FFC107',
        avgSpeedKmh: 30
    },
    walking: {
        label: 'Walking',
        icon: '🚶',
        color: '#795548',
        avgSpeedKmh: 5
    }
};

export interface VerificationBadgeConfig {
    label: string;
    icon: string;
    color: string;
    description: string;
}

export const VERIFICATION_BADGES: Record<string, VerificationBadgeConfig> = {
    verified: {
        label: 'Verified',
        icon: '✅',
        color: '#4CAF50',
        description: 'Officially verified by admin'
    },
    community: {
        label: 'Community',
        icon: '👥',
        color: '#2196F3',
        description: 'Verified by community upvotes'
    },
    pending: {
        label: 'Pending',
        icon: '⏳',
        color: '#FF9800',
        description: 'Awaiting verification'
    },
    flagged: {
        label: 'Flagged',
        icon: '⚠️',
        color: '#F44336',
        description: 'Flagged for review'
    }
};

// Helper functions
export function getTransportPointTypeConfig(type: TransportPointType): TransportPointTypeConfig {
    return TRANSPORT_POINT_TYPES[type];
}

export function getTransportModeConfig(mode: string): TransportModeConfig | undefined {
    return TRANSPORT_MODES[mode];
}

export function getVerificationBadgeConfig(status: string): VerificationBadgeConfig | undefined {
    return VERIFICATION_BADGES[status];
}

// Get all transport point types as array
export function getAllTransportPointTypes(): TransportPointType[] {
    return Object.keys(TRANSPORT_POINT_TYPES) as TransportPointType[];
}

// Get all transport modes as array
export function getAllTransportModes(): TransportMode[] {
    return Object.keys(TRANSPORT_MODES) as TransportMode[];
}
