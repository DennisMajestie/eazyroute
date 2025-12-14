
import { Component, AfterViewInit, OnDestroy, Input, ElementRef, ViewChild, OnChanges, SimpleChanges, Inject, PLATFORM_ID } from '@angular/core';
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
    @Input() markers: Array<{ lat: number, lng: number, title?: string }> = [];

    private map: any;

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
            this.map.setView([this.center.lat, this.center.lng], this.zoom);
        }
    }

    private initMap() {
        if (!this.mapContainer) return;

        this.map = this.mapService.initMap(
            this.mapContainer.nativeElement,
            this.center,
            this.zoom
        );

        this.addMarkers();
    }

    private addMarkers() {
        if (!this.map || !this.markers.length) return;

        // We need access to L to create markers, but mapService wraps it.
        // Ideally mapService should handle this to keep L encapsulated, 
        // or we expose L from service. 
        // For now, let's assume we implement addMarker in service effectively.
        // But since I didn't add addMarker to service yet, I'll obtain L from service instance if possible
        // or better, I will update service in next step if needed. 
        // Actually, looking at my service code, I didn't implement addMarker. 
        // I will use raw L from the service load for now if I can, or better, 
        // I made `loadLeaflet` implementation return `this.L`.

        // So I can get L instance:
        this.mapService.loadLeaflet().then(L => {
            this.markers.forEach(m => {
                L.marker([m.lat, m.lng]).addTo(this.map).bindPopup(m.title || '');
            });
        });
    }

    ngOnDestroy() {
        if (this.map) {
            this.map.remove();
        }
    }
}
