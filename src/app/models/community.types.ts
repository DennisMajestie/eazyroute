export interface CommunityReport {
    type: 'fare' | 'wait_time' | 'risk_alert' | 'stop_alias';
    fare?: number;
    waitTime?: 'short' | 'medium' | 'long';
    riskAlert?: string;
    stopAlias?: string;
    location: {
        lat: number;
        lng: number;
    };
    stopId?: string;
    corridorId?: string;
    timestamp?: Date;
}

export interface VerifiedStopAlias {
    stopId: string;
    alias: string;
    confidence: number;
    reportedBy: number; // Count of reports
}
