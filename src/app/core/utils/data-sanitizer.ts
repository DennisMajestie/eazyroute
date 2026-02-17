/**
 * ═══════════════════════════════════════════════════════════════════
 * DATA SANITIZER UTILITY
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Provides robust, recursive normalization for volatile API responses.
 * Guarantees that components receive stable, valid objects.
 */

console.warn('[DataSanitizer] Loading version 2.3 (Robust Trip ID Extraction)');

export class DataSanitizer {
    /**
     * Deeply sanitizes any object or array to ensure no nullish properties break .map() or .length
     */
    static sanitize<T>(data: any, schemaIdentifier: 'route' | 'segment' | 'stop' | 'result' | 'trip' | 'reroute'): T {
        if (data === null || data === undefined) {
            return this.getDefaultValue(schemaIdentifier) as T;
        }

        // Handle string inputs for Stop schema immediately at the top level
        if (schemaIdentifier === 'stop' && typeof data === 'string') {
            return { name: data, latitude: 0, longitude: 0 } as any as T;
        }

        if (Array.isArray(data)) {
            return (data.filter(item => !!item).map(item => this.sanitize(item, schemaIdentifier))) as any as T;
        }

        if (typeof data === 'object') {
            const sanitized: any = { ...data };

            // Recursively fix known risk areas
            if (schemaIdentifier === 'route' || schemaIdentifier === 'reroute') {
                sanitized.id = data.id || `route-${Date.now()}`;
                sanitized.generatedAt = data.generatedAt || new Date();
                sanitized.segments = this.sanitize(data.segments || data.legs || [], 'segment');
                sanitized.totalCost = this.normalizeNumber(data.totalCost || data.cost || 0);
                sanitized.totalTime = this.normalizeNumber(data.totalTime || data.totalDuration || data.time || 0);
                sanitized.totalDistance = this.normalizeNumber(data.totalDistance || data.distance || 0);
                sanitized.instructions = Array.isArray(data.instructions) ? data.instructions.filter((i: any) => !!i) : [];
                sanitized.classification = data.classification || 'BALANCED';
                sanitized.strategy = data.strategy || data.metadata?.strategy || 'balanced';

                // Ensure rankingScore exists for UI sorting
                sanitized.rankingScore = data.rankingScore || {
                    shortest: data.classification === 'FASTEST' ? 100 : 70,
                    cheapest: data.classification === 'CHEAPEST' ? 100 : 70,
                    balanced: 85
                };
                sanitized.dynamicAdjustment = data.dynamicAdjustment;
            }

            if (schemaIdentifier === 'segment') {
                sanitized.cost = this.normalizeNumber(data.cost || 0);
                sanitized.distance = this.normalizeNumber(data.distance || 0);
                sanitized.estimatedTime = this.normalizeNumber(data.estimatedTime || data.duration || 0);
                sanitized.instructions = data.instruction || data.instructions || '';

                // Sanitize nested stops - support name fallbacks
                sanitized.fromStop = this.sanitize(data.fromStop || data.fromName || {}, 'stop');
                sanitized.toStop = this.sanitize(data.toStop || data.toName || {}, 'stop');

                // Coordinate fallback
                if (sanitized.fromStop && typeof sanitized.fromStop === 'object' && !sanitized.fromStop.latitude) {
                    sanitized.fromStop.latitude = data.fromLat ?? data.fromLatitude ?? 0;
                    sanitized.fromStop.longitude = data.fromLng ?? data.fromLongitude ?? 0;
                }
                if (sanitized.toStop && typeof sanitized.toStop === 'object' && !sanitized.toStop.latitude) {
                    sanitized.toStop.latitude = data.toLat ?? data.toLatitude ?? 0;
                    sanitized.toStop.longitude = data.toLng ?? data.toLongitude ?? 0;
                }

                sanitized.fromStopId = data.fromStopId || data.fromId || data.fromStop?._id || data.fromStop?.id;
                sanitized.toStopId = data.toStopId || data.toId || data.toStop?._id || data.toStop?.id;
                sanitized.dynamicAdjustment = data.dynamicAdjustment;
            }

            if (schemaIdentifier === 'stop') {
                if (typeof data === 'string') {
                    sanitized.id = `stop-${Date.now()}`;
                    sanitized.name = data;
                    sanitized.latitude = 0;
                    sanitized.longitude = 0;
                } else {
                    sanitized.id = data.id || data._id;
                    sanitized.name = data.name || data.stopName || 'Unknown Stop';

                    // 🛡️ Safety: Fix double-wrapped names (where .name is actually the whole stop object)
                    if (typeof sanitized.name === 'object' && sanitized.name !== null) {
                        console.warn('[DataSanitizer] Double-wrapped stop name detected, unwrapping...', sanitized.name);
                        sanitized.name = (sanitized.name as any).name || (sanitized.name as any).stopName || 'Unknown Stop';
                    }
                    // Support wide variety of coordinate formats
                    sanitized.latitude = data.latitude ?? data.lat ?? data.location?.latitude ?? data.location?.lat ?? data.location?.coordinates?.[1] ?? 0;
                    sanitized.longitude = data.longitude ?? data.lng ?? data.location?.longitude ?? data.location?.lng ?? data.location?.coordinates?.[0] ?? 0;
                    sanitized.zone = data.zone;
                    sanitized.securityProfile = data.securityProfile || {
                        riskLevel: data.riskLevel || 'LOW',
                        threats: data.threats || [],
                        safetyAdvice: data.safetyAdvice || ''
                    };
                }
            }

            if (schemaIdentifier === 'trip') {
                // Robust ID extraction for trips
                console.log('[DataSanitizer] Sanitizing trip data, raw data:', JSON.stringify(data));
                let id = data._id || data.id || (typeof data === 'string' ? data : null);

                if (typeof id === 'object' && id !== null) {
                    console.log('[DataSanitizer] id is an object, extracting...', id);
                    id = id.$oid || id.id || id._id || (typeof id.toString === 'function' && id.toString() !== '[object Object]' ? id.toString() : null);

                    if (!id) {
                        // Exhaustive search for something that looks like an ID string (24 hex chars)
                        const possibleId = Object.values(data).find(v => typeof v === 'string' && /^[0-9a-fA-F]{24}$/.test(v));
                        if (possibleId) id = possibleId;
                    }
                }

                sanitized.id = id ? String(id) : undefined;
                if (sanitized._id) sanitized._id = sanitized.id;

                // 🛡️ Safety: Fix malformed empty-object dates which crash Angular pipes
                if (sanitized.startTime && typeof sanitized.startTime === 'object' && Object.keys(sanitized.startTime).length === 0) {
                    // Recover from createdAt if available, otherwise just use curr date to allow trip to "finish"
                    console.warn('[DataSanitizer] Found empty startTime object, fixing...');
                    sanitized.startTime = data.createdAt ? new Date(data.createdAt) : new Date();
                }

                if (sanitized.endTime && typeof sanitized.endTime === 'object' && Object.keys(sanitized.endTime).length === 0) {
                    sanitized.endTime = null;
                }

                console.log('[DataSanitizer] Resulting sanitized.id:', sanitized.id);
            }

            return sanitized as T;
        }

        return data as T;
    }

    /**
     * Normalizes values that could be numbers, strings, or object-based ranges ({min, max})
     */
    static normalizeNumber(value: any): number {
        if (value === null || value === undefined) return 0;
        if (typeof value === 'number') return value;
        if (typeof value === 'string') return parseFloat(value) || 0;
        if (typeof value === 'object') {
            return value.max || value.value || value.amount || value.min || 0;
        }
        return 0;
    }

    /**
     * Guaranteed safe defaults for each schema type
     */
    private static getDefaultValue(type: string): any {
        switch (type) {
            case 'route':
            case 'reroute':
                return {
                    id: `empty-${Date.now()}`,
                    segments: [],
                    totalDistance: 0,
                    totalTime: 0,
                    totalCost: 0,
                    instructions: []
                };
            case 'segment':
                return {
                    id: `empty-seg-${Date.now()}`,
                    mode: { type: 'walk', name: 'Walking' },
                    distance: 0,
                    estimatedTime: 0,
                    cost: 0,
                    instructions: 'No instructions available'
                };
            case 'stop':
                return { name: 'Unknown Stop', latitude: 0, longitude: 0 };
            case 'trip':
                return { id: undefined, status: 'unknown' };
            default:
                return {};
        }
    }
}
