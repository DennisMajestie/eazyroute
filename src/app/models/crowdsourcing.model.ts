export interface CommuterProtocol {
    _id?: string;
    junction: string;
    junctionId: string;
    destination: string;
    destinationId: string;

    location: string; // "Expressway side, past bridge"
    shout: string; // "Gwarinpa! 1st Gate!"
    signal?: string; // "Wave one finger"
    insiderTip?: string;
    avoidTime?: string;

    typicalPrice?: {
        along?: number;
        drop?: number;
    };

    photos?: string[];

    submittedBy: string;
    submittedAt: Date;
    upvotes: number;
    downvotes: number;
    verified: boolean;
    verifiedBy?: string;
    verifiedAt?: Date;

    flags?: string[];
    autoFlags?: {
        suspiciousActivity: boolean;
        duplicateSubmission: boolean;
        rapidUpvotes: boolean;
    };
}

export interface PricingReport {
    _id?: string;
    routeSegmentId: string;
    route: {
        from: string;
        fromId: string;
        to: string;
        toId: string;
    };

    mode: 'bus' | 'taxi' | 'keke' | 'okada';
    pricePaid: number;

    timeOfDay: string; // HH:mm format
    date: Date;

    conditions: {
        weather: 'clear' | 'rain' | 'harmattan';
        traffic: 'light' | 'moderate' | 'heavy' | 'extreme';
        fuelPrice?: number;
        wasSurge: boolean;
        surgeReason?: string;
    };

    negotiated: boolean;

    submittedBy: string;
    submittedAt: Date;
    verified: boolean;

    flags?: string[];
    autoFlags?: {
        suspiciousActivity: boolean;
        duplicateSubmission: boolean;
        rapidUpvotes: boolean;
    };
}

export interface PricingStats {
    route: string;
    mode: string;
    averagePrice: number;
    minPrice: number;
    maxPrice: number;
    lastUpdated: Date;
    sampleSize: number;

    priceByTime: {
        morning: number;    // 6-10 AM
        midday: number;     // 10 AM - 4 PM
        evening: number;    // 4-8 PM
        night: number;      // 8 PM - 6 AM
    };
}

export interface SafetyRating {
    _id?: string;
    route: {
        from: string;
        fromId: string;
        to: string;
        toId: string;
    };

    ratings: {
        overall: number;        // 1-5
        daytime: number;
        nighttime: number;
        forWomen: number;
        forSoloTravelers: number;
    };

    warnings: SafetyWarning[];

    submittedBy: string;
    submittedAt: Date;

    flags?: string[];
    autoFlags?: {
        suspiciousActivity: boolean;
        duplicateSubmission: boolean;
        rapidUpvotes: boolean;
    };
}

export interface SafetyWarning {
    type: 'time_based' | 'area_based' | 'mode_based';
    condition: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;

    submittedBy: string;
    upvotes: number;
    verifiedByAdmin: boolean;
}

export interface UserContribution {
    userId: string;
    totalPoints: number;
    level: number;
    levelName: string;
    badges: Badge[];

    contributions: {
        pricing: number;
        safety: number;
        protocols: number;
        photos: number;
    };

    nextBadge: {
        name: string;
        pointsNeeded: number;
    };

    rank: number;
    joinedAt: Date;
}

export interface Badge {
    id: string;
    name: string;
    description: string;
    icon: string;
    earnedAt: Date;
}

export interface UserRank {
    userId: string;
    username: string;
    points: number;
    badge: string;
    rank: number;
}

export interface LeaderboardResponse {
    leaderboard: UserRank[];
    userRank: number;
}
