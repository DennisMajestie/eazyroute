
import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

// Dynamically import Leaflet to avoid SSR issues
@Injectable({
    providedIn: 'root'
})
export class LeafletMapService {
    private L: any = null;

    constructor(@Inject(PLATFORM_ID) private platformId: Object) { }

    async loadLeaflet(): Promise<any> {
        if (isPlatformBrowser(this.platformId) && !this.L) {
            this.L = await import('leaflet');

            // Fix marker icon issues - use CDN instead of local assets
            const iconRetinaUrl = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png';
            const iconUrl = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png';
            const shadowUrl = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png';

            const defaultIcon = this.L.icon({
                iconRetinaUrl,
                iconUrl,
                shadowUrl,
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
            });

            this.L.Marker.prototype.options.icon = defaultIcon;
        }
        return this.L;
    }

    isBrowser(): boolean {
        return isPlatformBrowser(this.platformId);
    }

    initMap(elementId: string, center: { lat: number; lng: number }, zoom: number): any {
        if (!this.isBrowser() || !this.L) return null;

        const map = this.L.map(elementId).setView([center.lat, center.lng], zoom);

        this.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        return map;
    }
}
