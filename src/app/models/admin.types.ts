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
    type: 'pricing' | 'safety' | 'protocol' | 'bus_stop';
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
