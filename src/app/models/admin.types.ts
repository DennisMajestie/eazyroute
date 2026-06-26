/**
 * Admin Types - Graph Diagnostics and System Health
 */

/**
 * Graph health report
 */
export interface GraphReport {
    totalNodes: number;            // Total bus stops in graph
    totalEdges: number;            // Total route segments
    isolatedCount: number;         // Stops with no connections
    semanticOrphanCount: number;   // Nodes not in core skeleton
    semanticOrphans: Array<{ id: string; name: string }>;
    pendingHarvestCount: number;   // New: harvested but inactive nodes
    manualRouteSeedCount: number;
    manualSegmentSeedCount: number;
    health: 'good' | 'moderate' | 'poor';
    issues: string[];              // List of identified issues
    suggestions: ConnectionSuggestion[];
    lastUpdated?: Date;
}

/**
 * Isolated node (bus stop with no connections)
 */
export interface IsolatedNode {
    _id: string;
    name: string;
    localNames?: string[];
    location: {
        type: 'Point';
        coordinates: [number, number];  // [lng, lat]
    };
    city?: string;
    verificationStatus?: string;
}

/**
 * Suggested connection between stops
 */
export interface ConnectionSuggestion {
    fromStop: {
        _id: string;
        name: string;
    };
    toStop: {
        _id: string;
        name: string;
    };
    distance: number;              // Distance in meters
    reason: string;                // Why this connection is suggested
    priority: 'high' | 'medium' | 'low';
}

/**
 * Graph validation result
 */
export interface GraphValidation {
    isValid: boolean;
    errors: GraphError[];
    warnings: GraphWarning[];
}

export interface GraphError {
    type: 'missing_node' | 'invalid_edge' | 'duplicate' | 'orphan';
    message: string;
    affectedIds: string[];
}

export interface GraphWarning {
    type: 'unreachable' | 'single_direction' | 'long_distance';
    message: string;
    affectedIds: string[];
}

/**
 * Moderation Queue Item
 */
export interface ModerationItem {
    _id: string;
    type: 'pricing' | 'safety' | 'protocol' | 'bus_stop' | 'route_segment';
    data: any;
    submittedBy: string;
    submittedAt: Date;
    status: 'pending' | 'approved' | 'rejected';

    flags: string[];  // ['rapid_submissions', 'duplicate_location']
    autoFlags: {
        suspiciousActivity: boolean;
        duplicateSubmission: boolean;
        rapidUpvotes: boolean;
    };
}

/**
 * Abuja Soul Engine - Integration Health
 */
export interface EngineHealth {
    uptime: string;
    memoryUsage: {
        heapTotal: number;
        heapUsed: number;
        external: number;
    };
    counts: {
        nodes: number;
        edges: number;
        hubs: number;
    };
    status: 'healthy' | 'warning' | 'degraded';
    lastSyncAt: Date;
}

/**
 * 🌍 Global System Conditions
 */
export interface GlobalConditions {
    isFuelScarcity: boolean;
    isHoliday: boolean;
    hasCommunalClash: boolean;
    activeEvent?: string;
    lastUpdated: Date;
}

/**
 * Economic & Surge Statistics
 */
export interface PricingAnalytics {
    activeSurgeMultiplier: number;
    surgeLabel: string;
    avgDailyFares: {
        keke: number;
        okada: number;
        taxi: number;
        bus: number;
    };
    trends: {
        label: string;
        value: number;
    }[];
    topCorridors: {
        name: string;
        traffic: number;
        revenue: number;
    }[];
    avgBaseFare?: number;
    globalConditions?: GlobalConditions;
}

/**
 * Contribution Stats
 */
export interface ContributorStats {
    userId: string;
    name: string;
    totalReports: number;
    accuracyRate: number;      // 0-1
    tier: 'captain' | 'trusted' | 'new';
    lastActive: Date;
    flaggedReports: number;
    role?: string;              // Admin role field (user, admin, captain, etc.)
}

/**
 * User Statistics
 */
export interface UserStats {
    total: number;
    totalContributions: number;
    verified: number;
    byRole: { _id: string; count: number; }[];
    byStatus: { _id: string; count: number; }[];
    recentUsers: {
        firstName: string;
        lastName: string;
        email: string;
        role: string;
        createdAt: Date;
    }[];
}

/**
 * SOS & Safety Analytics
 */
export interface SafetyIncident {
    _id: string;
    type: 'SOS_SILENT' | 'PANIC_BUTTON' | 'RISK_ALERT' | 'FAKE_CALL';
    location: {
        lat: number;
        lng: number;
    };
    timestamp: Date;
    severity: 'low' | 'medium' | 'high';
    description?: string;
    status: 'active' | 'resolved' | 'investigating';
}

export interface SafetyAnalytics {
    hotspots: {
        lat: number;
        lng: number;
        intensity: number; // 0-1
        radius: number;    // meters
        label: string;
    }[];
    incidentTrends: {
        hour: number;
        count: number;
    }[];
    totalAlerts24h: number;
    activePanicTriggers: number;
}

/**
 * User Statistics (Admin)
 */
export interface UserStats {
    total: number;
    totalContributions: number;
    verified: number;
    byRole: { _id: string; count: number; }[];
    byStatus: { _id: string; count: number; }[];
    recentUsers: {
        firstName: string;
        lastName: string;
        email: string;
        role: string;
        createdAt: Date;
    }[];
}

/**
 * Pricing Rule (Admin)
 */
export interface PricingRule {
    _id?: string;
    id?: string;
    mode: 'KEKE' | 'OKADA' | 'TAXI' | 'BUS' | 'WALKING';
    corridor: string;
    baseFare: number;
    perKm: number;
    minFare: number;
    villageSurcharge: number;
    alongDiscount: number;
    surgeMultiplier: number;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface PricingRulesResponse {
    rules: PricingRule[];
    total: number;
    page: number;
    limit: number;
}

/**
 * Bus Stop (Admin)
 */
export interface BusStop {
    _id?: string;
    id?: string;
    name: string;
    localNames?: string[];
    location: {
        type: 'Point';
        coordinates: [number, number];
    };
    city?: string;
    area?: string;
    verificationStatus: 'pending' | 'verified' | 'rejected' | 'inactive';
    isActive: boolean;
    transportModes?: string[];
    soulV2Preferences?: {
        firstLegPreferredMode?: string;
        bridgeModePreference?: string;
    };
    createdAt?: Date;
    updatedAt?: Date;
}

export interface BusStopsResponse {
    stops: BusStop[];
    total: number;
    page: number;
    limit: number;
}

/**
 * Route Segment (Admin)
 */
export interface RouteSegment {
    _id?: string;
    id?: string;
    fromStopId: string;
    toStopId: string;
    transportModes: string[];
    estimatedTime: number;
    priceRange: {
        min: number;
        max: number;
    };
    fromStop?: {
        id: string;
        name: string;
        localNames?: string[];
        area: string;
    };
    toStop?: {
        id: string;
        name: string;
        localNames?: string[];
        area: string;
    };
    createdAt?: Date;
    updatedAt?: Date;
}

export interface RouteSegmentsResponse {
    segments: RouteSegment[];
    total: number;
    page: number;
    limit: number;
}
