import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface RouteSegment {
    type: 'walk' | 'keke' | 'okada' | 'cab' | 'taxi' | 'bus' | 'transfer';
    instruction: string;
    distance: number;
    estimatedTime: number;
    cost?: number;
    fromStop?: string;
    toStop?: string;
    dropInstruction?: string;
}

interface GeneratedRoute {
    from: string;
    to: string;
    segments: RouteSegment[];
    totalDistance: number;
    totalTime: number;
    totalCost: number;
    instructions: string[];
}

@Component({
    selector: 'app-route-display',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './route-display.component.html',
    styleUrls: ['./route-display.component.scss']
})
export class RouteDisplayComponent implements OnInit {
    // Route data
    route: GeneratedRoute | null = null;
    fromLocation: { lat: number; lng: number; name: string } | null = null;
    toLocation: { lat: number; lng: number; name: string } | null = null;

    // UI state
    isLoading = false;
    error: string = '';
    expandedSegments: Set<number> = new Set();

    constructor(
        private activatedRoute: ActivatedRoute,
        private router: Router,
        private http: HttpClient
    ) { }

    ngOnInit() {
        // Get locations from query params
        this.activatedRoute.queryParams.subscribe(params => {
            if (params['fromLat'] && params['fromLng'] && params['toLat'] && params['toLng']) {
                this.fromLocation = {
                    lat: parseFloat(params['fromLat']),
                    lng: parseFloat(params['fromLng']),
                    name: params['fromName'] || 'Start'
                };

                this.toLocation = {
                    lat: parseFloat(params['toLat']),
                    lng: parseFloat(params['toLng']),
                    name: params['toName'] || 'Destination'
                };

                this.generateRoute();
            }
        });
    }

    /**
     * Call ALONG API to generate route
     */
    generateRoute() {
        if (!this.fromLocation || !this.toLocation) return;

        this.isLoading = true;
        this.error = '';

        const url = `${environment.apiUrl}/along/generate-route`;
        const body = {
            from: {
                lat: this.fromLocation.lat,
                lng: this.fromLocation.lng,
                name: this.fromLocation.name
            },
            to: {
                lat: this.toLocation.lat,
                lng: this.toLocation.lng,
                name: this.toLocation.name
            }
        };

        this.http.post<{ success: boolean; data: GeneratedRoute }>(url, body)
            .subscribe({
                next: (response) => {
                    if (response.success && response.data) {
                        this.route = response.data;
                    }
                    this.isLoading = false;
                },
                error: (error) => {
                    console.error('Route generation error:', error);
                    this.error = 'Could not generate route. Please try again.';
                    this.isLoading = false;
                }
            });
    }

    /**
     * Get segment emoji based on type
     */
    getSegmentEmoji(type: string): string {
        const emojiMap: { [key: string]: string } = {
            'walk': '🚶',
            'keke': '🛺',
            'okada': '🏍️',
            'cab': '🚕',
            'taxi': '🚕',
            'bus': '🚌',
            'transfer': '🔄'
        };
        return emojiMap[type.toLowerCase()] || '📍';
    }

    /**
     * Get segment color based on type
     */
    getSegmentColor(type: string): string {
        const colorMap: { [key: string]: string } = {
            'walk': 'var(--walking-color)',
            'keke': 'var(--keke-color)',
            'okada': 'var(--okada-color)',
            'cab': 'var(--cab-color)',
            'taxi': 'var(--cab-color)',
            'bus': 'var(--bus-color)',
            'transfer': 'var(--secondary)'
        };
        return colorMap[type.toLowerCase()] || 'var(--primary)';
    }

    /**
     * Toggle segment expansion
     */
    toggleSegment(index: number) {
        if (this.expandedSegments.has(index)) {
            this.expandedSegments.delete(index);
        } else {
            this.expandedSegments.add(index);
        }
    }

    /**
     * Check if segment is expanded
     */
    isSegmentExpanded(index: number): boolean {
        return this.expandedSegments.has(index);
    }

    /**
     * Start journey
     */
    startJourney() {
        if (!this.route) return;

        // Navigate to trip tracking with route data
        this.router.navigate(['/trip-tracking'], {
            queryParams: {
                routeData: JSON.stringify(this.route)
            }
        });
    }

    /**
     * Share route via WhatsApp
     */
    shareRoute() {
        if (!this.route) return;

        const message = `🌍 EazyRoute ALONG\n\n` +
            `From: ${this.route.from}\n` +
            `To: ${this.route.to}\n\n` +
            `⏱️ ${this.route.totalTime} min | 💰 ₦${this.route.totalCost} | 📏 ${(this.route.totalDistance / 1000).toFixed(1)}km\n\n` +
            `Steps:\n${this.route.instructions.join('\n')}`;

        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    }

    /**
     * Go back
     */
    goBack() {
        this.router.navigate(['/home']);
    }
}
