import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';

export interface BoardingProtocol {
    destination: string;
    location: string;
    shout: string;
    price: { min: number; max: number };
    mode: string;
    tip: string;
}

export interface HubProtocol {
    name: string;
    localNames: string[];
    protocols: BoardingProtocol[];
}

export interface CommuterProtocolsData {
    hubs: { [key: string]: HubProtocol };
    generalTips: string[];
}

@Injectable({
    providedIn: 'root'
})
export class CommuterProtocolService {
    private protocolsData: CommuterProtocolsData | null = null;
    private dataLoaded$ = new BehaviorSubject<boolean>(false);

    // Current active protocol for display
    private activeProtocol$ = new BehaviorSubject<{ hub: HubProtocol; protocol: BoardingProtocol } | null>(null);

    constructor(private http: HttpClient) {
        this.loadProtocols();
    }

    /**
     * Load protocols from JSON file
     */
    private loadProtocols() {
        this.http.get<CommuterProtocolsData>('/assets/data/commuter-protocols.json')
            .pipe(
                tap(data => {
                    this.protocolsData = data;
                    this.dataLoaded$.next(true);
                    console.log('[CommuterProtocolService] Protocols loaded:', Object.keys(data.hubs).length, 'hubs');
                }),
                catchError(err => {
                    console.error('[CommuterProtocolService] Failed to load protocols:', err);
                    return of(null);
                })
            )
            .subscribe();
    }

    /**
     * Check if protocols data is loaded
     */
    isDataLoaded(): Observable<boolean> {
        return this.dataLoaded$.asObservable();
    }

    /**
     * Get active protocol observable (for UI binding)
     */
    getActiveProtocol(): Observable<{ hub: HubProtocol; protocol: BoardingProtocol } | null> {
        return this.activeProtocol$.asObservable();
    }

    /**
     * Find hub by name or local name
     */
    findHub(stopName: string): HubProtocol | null {
        if (!this.protocolsData) return null;

        const normalizedName = stopName.toLowerCase().trim();

        for (const key of Object.keys(this.protocolsData.hubs)) {
            const hub = this.protocolsData.hubs[key];

            // Check exact hub name
            if (hub.name.toLowerCase() === normalizedName) {
                return hub;
            }

            // Check local names
            if (hub.localNames.some(ln =>
                normalizedName.includes(ln.toLowerCase()) ||
                ln.toLowerCase().includes(normalizedName)
            )) {
                return hub;
            }
        }

        return null;
    }

    /**
     * Get boarding protocol for a specific destination at a hub
     */
    getProtocolForDestination(hubName: string, destinationName: string): { hub: HubProtocol; protocol: BoardingProtocol } | null {
        const hub = this.findHub(hubName);
        if (!hub) return null;

        const normalizedDest = destinationName.toLowerCase().trim();

        const protocol = hub.protocols.find(p =>
            p.destination.toLowerCase().includes(normalizedDest) ||
            normalizedDest.includes(p.destination.toLowerCase())
        );

        if (protocol) {
            return { hub, protocol };
        }

        // If no exact match, return first protocol as fallback
        if (hub.protocols.length > 0) {
            return { hub, protocol: hub.protocols[0] };
        }

        return null;
    }

    /**
     * Set active protocol (called when user arrives at a hub)
     */
    setActiveProtocol(hubName: string, destinationName?: string) {
        const hub = this.findHub(hubName);

        if (hub) {
            let protocol: BoardingProtocol | undefined;

            if (destinationName) {
                const matched = this.getProtocolForDestination(hubName, destinationName);
                if (matched) {
                    protocol = matched.protocol;
                }
            }

            // Default to first protocol if no destination match
            if (!protocol && hub.protocols.length > 0) {
                protocol = hub.protocols[0];
            }

            if (protocol) {
                this.activeProtocol$.next({ hub, protocol });
                console.log('[CommuterProtocolService] Active protocol set:', hub.name, '->', protocol.destination);
            }
        } else {
            console.log('[CommuterProtocolService] No hub found for:', hubName);
        }
    }

    /**
     * Clear active protocol
     */
    clearActiveProtocol() {
        this.activeProtocol$.next(null);
    }

    /**
     * Get all protocols for a hub
     */
    getAllProtocolsForHub(hubName: string): BoardingProtocol[] {
        const hub = this.findHub(hubName);
        return hub ? hub.protocols : [];
    }

    /**
     * Get general tips
     */
    getGeneralTips(): string[] {
        return this.protocolsData?.generalTips || [];
    }

    /**
     * Get transport mode icon
     */
    getModeIcon(mode: string): string {
        const icons: { [key: string]: string } = {
            'bus': '🚌',
            'taxi': '🚖',
            'keke': '🛺',
            'okada': '🏍️',
            'walk': '🚶'
        };
        return icons[mode] || '🚐';
    }
}
