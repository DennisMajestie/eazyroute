
import { Component, AfterViewInit, OnDestroy, Input, ElementRef, ViewChild, OnChanges, SimpleChanges, Inject, PLATFORM_ID, EventEmitter, Output } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { LeafletMapService } from '../../../core/services/leaflet-map.service';

@Component({
    selector: 'app-map',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div #mapContainer class="map-container"></div>
  `,
    styles: [`
    .map-container {
      width: 100%;
      height: 100%;
      min-height: 400px;
      z-index: 1;
    }
  `]
})
export class MapComponent implements AfterViewInit, OnDestroy, OnChanges {
    @ViewChild('mapContainer') mapContainer!: ElementRef;

    @Input() center: { lat: number, lng: number } = { lat: 9.0765, lng: 7.3986 }; // Abuja default
    @Input() zoom: number = 13;
    @Input() markers: Array<{ lat: number, lng: number, title?: string, tier?: 'primary' | 'sub-landmark' | 'node' }> = [];
    @Input() polylines: Array<{ path: any[], color?: string, weight?: number, isBackbone?: boolean }> = [];

    @Output() mapClick = new EventEmitter<{ lat: number, lng: number }>();

    private map: any;
    private routeLayers: any[] = [];

    constructor(
        private mapService: LeafletMapService,
        @Inject(PLATFORM_ID) private platformId: Object
    ) { }

    async ngAfterViewInit() {
        if (isPlatformBrowser(this.platformId)) {
            await this.mapService.loadLeaflet();
            this.initMap();
        }
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['center'] && this.map) {
            const center = changes['center'].currentValue;
            if (center && typeof center.lat === 'number' && typeof center.lng === 'number' && !isNaN(center.lat) && !isNaN(center.lng)) {
                this.map.setView([center.lat, center.lng], this.zoom);
            }
        }
        if (changes['markers'] && this.map) {
            this.addMarkers();
        }
        if (changes['polylines'] && this.map) {
            this.drawRoutes();
        }
    }

    private initMap() {
        if (!this.mapContainer) return;

        this.map = this.mapService.initMap(
            this.mapContainer.nativeElement,
            this.center,
            this.zoom
        );

        // Handle Map Click
        this.map.on('click', (e: any) => {
            this.mapClick.emit({ lat: e.latlng.lat, lng: e.latlng.lng });
        });

        this.addMarkers();
        this.drawRoutes();
    }

    private drawRoutes() {
        if (!this.map || !this.polylines) return;

        // Clear existing routes
        this.routeLayers.forEach(layer => this.map.removeLayer(layer));
        this.routeLayers = [];

        this.mapService.loadLeaflet().then(L => {
            this.polylines.forEach(p => {
                if (!p.path || p.path.length < 2) return;

                const color = p.color || '#0ea5e9';
                const weight = p.isBackbone ? (p.weight || 6) : (p.weight || 4);
                const opacity = p.isBackbone ? 0.9 : 0.7;

                // Add glowing effect to backbone
                if (p.isBackbone) {
                    const glowLayer = L.polyline(p.path, {
                        color: '#8b5cf6',
                        weight: weight + 4,
                        opacity: 0.3
                    }).addTo(this.map);
                    this.routeLayers.push(glowLayer);
                }

                const polyline = L.polyline(p.path, {
                    color: color,
                    weight: weight,
                    opacity: opacity,
                    lineJoin: 'round'
                }).addTo(this.map);

                this.routeLayers.push(polyline);
            });
        });
    }

    private addMarkers() {
        if (!this.map || !this.markers.length) return;

        this.mapService.loadLeaflet().then(L => {
            const primaryIcon = L.icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
            });

            this.markers.forEach(m => {
                const options: any = {};
                if (m.tier === 'primary') {
                    options.icon = primaryIcon;
                }

                const marker = L.marker([m.lat, m.lng], options)
                    .addTo(this.map)
                    .bindPopup(m.title || '');
            });
        });
    }

    ngOnDestroy() {
        if (this.map) {
            this.map.remove();
        }
    }
}
