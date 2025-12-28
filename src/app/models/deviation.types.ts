/**
 * Deviation Types - Trip Deviation Detection
 */

/**
 * Route deviation status from backend
 */
export interface DeviationStatus {
    isDeviated: boolean;           // Whether user is off route
    distanceFromRoute: number;     // Distance from route in meters
    threshold: number;             // Deviation threshold (default 100m)
    nearestSegment?: {
        from: string;              // Nearest segment origin name
        to: string;                // Nearest segment destination name
    };
    suggestedAction?: 'continue' | 'reroute' | 'return';
    timestamp?: Date;
}

/**
 * Deviation severity levels
 */
export type DeviationSeverity = 'none' | 'minor' | 'moderate' | 'severe';

/**
 * Deviation event from WebSocket
 */
export interface DeviationEvent {
    tripId: string;
    status: DeviationStatus;
    severity: DeviationSeverity;
    timestamp: Date;
}

/**
 * Get severity based on deviation distance
 */
export function getDeviationSeverity(distanceFromRoute: number, threshold: number): DeviationSeverity {
    if (distanceFromRoute <= threshold) return 'none';
    if (distanceFromRoute <= threshold * 2) return 'minor';
    if (distanceFromRoute <= threshold * 5) return 'moderate';
    return 'severe';
}

/**
 * Get human-readable deviation message
 */
export function getDeviationMessage(status: DeviationStatus): string {
    if (!status.isDeviated) {
        return 'On route';
    }

    const distance = status.distanceFromRoute;
    if (distance < 1000) {
        return `You are ${Math.round(distance)}m off route`;
    }
    return `You are ${(distance / 1000).toFixed(1)}km off route`;
}
