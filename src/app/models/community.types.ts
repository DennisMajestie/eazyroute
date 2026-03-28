export interface CommunityReport {
    reportType: 'fare' | 'wait_time' | 'stop_alias' | 'risk_alert' | 'congestion';
    location: {
        lat: number;
        lng: number;
    };
    mode: 'bus' | 'keke' | 'taxi' | 'okada' | string;
    payload: {
        fareMin?: number;
        fareMax?: number;
        waitTime?: number;        // minutes
        aliasName?: string;
        riskLevel?: number;       // 0-1
        riskDescription?: string;
        congestionLevel?: number; // 0-1
    };
    nodeId?: string;
    corridorId?: string;
    timestamp?: Date;
}

export interface VerifiedStopAlias {
    stopId: string;
    alias: string;
    confidence: number;
    reportedBy: number; // Count of reports
}
