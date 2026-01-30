/**
 * ═══════════════════════════════════════════════════════════════════
 * DATA SANITIZER UTILITY
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Provides robust, recursive normalization for volatile API responses.
 * Guarantees that components receive stable, valid objects.
 */

export class DataSanitizer {
    /**
     * Deeply sanitizes any object or array to ensure no nullish properties break .map() or .length
     */
    static sanitize<T>(data: any, schemaIdentifier: 'route' | 'segment' | 'stop' | 'result'): T {
        if (data === null || data === undefined) {
            return this.getDefaultValue(schemaIdentifier) as T;
        }

        if (Array.isArray(data)) {
            return (data.filter(item => !!item).map(item => this.sanitize(item, schemaIdentifier))) as any as T;
        }

        if (typeof data === 'object') {
            const sanitized: any = { ...data };

            // Recursively fix known risk areas
            if (schemaIdentifier === 'route') {
                sanitized.segments = this.sanitize(data.segments || data.legs || [], 'segment');
                sanitized.totalCost = this.normalizeNumber(data.totalCost || data.cost || 0);
                sanitized.totalTime = this.normalizeNumber(data.totalTime || data.totalDuration || data.time || 0);
                sanitized.totalDistance = this.normalizeNumber(data.totalDistance || data.distance || 0);
                sanitized.instructions = Array.isArray(data.instructions) ? data.instructions.filter((i: any) => !!i) : [];
            }

            if (schemaIdentifier === 'segment') {
                sanitized.cost = this.normalizeNumber(data.cost || 0);
                sanitized.distance = this.normalizeNumber(data.distance || 0);
                sanitized.estimatedTime = this.normalizeNumber(data.estimatedTime || data.duration || 0);
                sanitized.instructions = data.instruction || data.instructions || '';
                sanitized.fromStop = this.sanitize(data.fromStop, 'stop');
                sanitized.toStop = this.sanitize(data.toStop, 'stop');
            }

            if (schemaIdentifier === 'stop') {
                sanitized.latitude = data.lat ?? data.latitude ?? data.location?.lat ?? data.location?.coordinates?.[1] ?? 0;
                sanitized.longitude = data.lng ?? data.longitude ?? data.location?.lng ?? data.location?.coordinates?.[0] ?? 0;
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
            // Handle V4 cost ranges (prefer max for budgeting safety, or value)
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
                return {
                    id: `empty-${Date.now()}`,
                    segments: [],
                    totalDistance: 0,
                    totalTime: 0,
                    totalCost: 0,
                    instructions: [],
                    classification: 'UNKNOWN'
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
            default:
                return {};
        }
    }
}
