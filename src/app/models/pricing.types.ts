/**
 * Pricing Types - Dynamic Pricing and Fare Feedback
 */

/**
 * Dynamic price estimate from backend
 */
export interface PriceEstimate {
    basePrice: {
        min: number;
        max: number;
    };
    dynamicPrice: {
        min: number;
        max: number;
    };
    currentEstimate: number;        // Best estimate for current conditions
    surgeMultiplier: number;        // 1.0 = no surge, 1.5 = 50% surge
    confidence: number;             // 0-100 confidence score
    factors: string[];              // Explanatory factors, e.g. ["Surge detected: 1.3x", "Peak hours"]
    lastUpdated?: Date;
}

/**
 * User-submitted price feedback
 */
export interface PriceFeedback {
    fromStopId: string;
    toStopId: string;
    transportMode: string;
    pricePaid: number;
    tripId?: string;                // Optional link to trip record
    timestamp?: Date;
    notes?: string;                 // User notes about the price
    wasNegotiated?: boolean;        // Did user negotiate the price?
}

/**
 * Price submission response
 */
export interface PriceSubmitResponse {
    success: boolean;
    message: string;
    pointsEarned?: number;          // Gamification points awarded
}

/**
 * Historical price data for a route
 */
export interface PriceHistory {
    fromStopId: string;
    toStopId: string;
    transportMode: string;
    prices: {
        amount: number;
        timestamp: Date;
        timeOfDay: 'morning' | 'midday' | 'evening' | 'night';
    }[];
    average: number;
    trend: 'stable' | 'increasing' | 'decreasing';
}
