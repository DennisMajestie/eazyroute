
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
    @Input() markers: Array<{ lat: number, lng: number, title?: string, tier?: 'primary' | 'sub-landmark' | 'node' | string }> = [];
    @Input() polylines: Array<{ path: any[], color?: string, weight?: number, isBackbone?: boolean, isWalking?: boolean, portalType?: string }> = [];

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
            // Task 5: Component Lifecycle Delay
            // Give the browser 100ms to ensure the div for the map is actually rendered
            setTimeout(() => {
                this.initMap();
            }, 100);
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

        // The "Abuja Soul" Map Guard
        const Leaflet = (window as any).L || (this.mapService as any).L;
        
        if (!Leaflet || typeof Leaflet.map !== 'function') {
            console.error("Critical: Leaflet library not found on window. Check script loading.");
            return; 
        }

        this.map = Leaflet.map(this.mapContainer.nativeElement, {
            zoomControl: false,
            dragging: true
        }).setView([this.center.lat, this.center.lng], this.zoom);

        Leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

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
                    lineJoin: 'round',
                    dashArray: (p.isWalking || p.portalType === 'PEDESTRIAN_BRIDGE') ? '10, 10' : undefined
                }).addTo(this.map);

                this.routeLayers.push(polyline);
            });
        });
    }

    private addMarkers() {
        if (!this.map || !this.markers.length) return;

        this.mapService.loadLeaflet().then(L => {
            // Task 4: Global Namespace Guard at marker level
            const _L = (window as any).L || L;

            // Task 6: Icon Fallback Safety via try-catch
            let primaryIcon, taxiIcon, busIcon;
            
            try {
                primaryIcon = _L.icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                });

                taxiIcon = _L.icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                });

                busIcon = _L.icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                });
            } catch (e) {
                console.warn('[Map] Icon generation failed, using defaults', e);
            }

            const iconMap: Record<string, any> = {
                'primary': primaryIcon,
                'taxi': taxiIcon,
                'cab': taxiIcon,
                'bus': busIcon
            };

            const getSafeIcon = (mode: string | undefined): any => {
                const key = mode?.toLowerCase() || 'node';
                if (key === 'node' || key === 'sub-landmark') return undefined;

                // 🏗️ Production Hardening: Explicit Keke/Okada Support
                const icon = iconMap[key] || iconMap['taxi'] || iconMap['cab'];
                
                // Nuclear Fallback: If Leaflet namespace is unstable or icon generation failed
                if (!icon && _L?.icon) {
                    try {
                        return _L.icon({
                            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
                            iconSize: [25, 41],
                            iconAnchor: [12, 41]
                        });
                    } catch (innerError) {
                        return undefined; // Use default Leaflet icon
                    }
                }

                return icon;
            };

            this.markers.forEach(m => {
                const options: any = {};
                const icon = getSafeIcon(m.tier);
                if (icon) {
                    options.icon = icon;
                }

                const marker = _L.marker([m.lat, m.lng], options)
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
