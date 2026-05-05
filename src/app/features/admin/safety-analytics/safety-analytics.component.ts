import { Component, OnInit, AfterViewInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../../core/services/admin.service';
import { LeafletMapService } from '../../../core/services/leaflet-map.service';
import { SafetyIncident, SafetyAnalytics } from '../../../models/admin.types';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-safety-analytics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './safety-analytics.component.html',
  styleUrls: ['./safety-analytics.component.scss']
})
export class SafetyAnalyticsComponent implements OnInit, AfterViewInit, OnDestroy {
  private adminService = inject(AdminService);
  private mapService = inject(LeafletMapService);
  private notifService = inject(NotificationService);
  private destroy$ = new Subject<void>();

  map: any;
  private L: any; // Store Leaflet instance locally
  analytics: SafetyAnalytics | null = null;
  incidents: SafetyIncident[] = [];
  isLoading = false;
  Math = Math;
  
  // Selection state
  selectedIncident: SafetyIncident | null = null;
  activeFilter: 'all' | 'SOS_SILENT' | 'PANIC_BUTTON' | 'RISK_ALERT' = 'all';

  // Map layers
  private hotspotLayer: any;
  private incidentLayer: any;

  ngOnInit(): void {
    this.loadHistory();
    this.loadAnalytics();
    this.initRealTimeListeners();
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initRealTimeListeners(): void {
    this.notifService.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe(notif => {
        if (notif.severity === 'sos' && notif.data) {
          console.log('[Safety] Real-time SOS received:', notif.data);
          
          // Data format check - backend broadcast might be different from history schema
          const incident: SafetyIncident = {
            _id: notif.id,
            type: notif.data.type || 'SOS_PANIC',
            location: {
              lat: notif.data.latitude,
              lng: notif.data.longitude
            },
            timestamp: notif.timestamp,
            severity: 'high',
            description: notif.data.description || notif.message,
            status: 'active'
          };

          // Update local state
          if (!this.incidents.some(i => i._id === incident._id)) {
            this.incidents.unshift(incident);
            if (this.analytics) {
              this.analytics.activePanicTriggers = (this.analytics.activePanicTriggers || 0) + 1;
            }
            this.renderIncidents();
          }
        }
      });
  }

  async initMap(): Promise<void> {
    this.L = await this.mapService.loadLeaflet();
    if (!this.L) return;

    this.map = this.mapService.initMap('safety-map', { lat: 9.0765, lng: 7.3986 }, 12);
    this.hotspotLayer = this.L.layerGroup().addTo(this.map);
    this.incidentLayer = this.L.layerGroup().addTo(this.map);
    
    // Add markers once data is loaded
    if (this.analytics) this.renderHotspots();
    if (this.incidents.length > 0) this.renderIncidents();
  }

  loadAnalytics(): void {
    this.adminService.getSafetyAnalytics().subscribe({
      next: (data: SafetyAnalytics) => {
        this.analytics = data;
        this.renderHotspots();
      },
      error: (err: any) => {
        if (environment.useMockAdminData) {
            console.warn('[Safety] Using mock analytics');
            this.analytics = this.getMockAnalytics();
            this.renderHotspots();
        } else {
            console.error('[Safety] Analytics failed:', err);
        }
      }
    });
  }

  loadHistory(): void {
    this.isLoading = true;
    this.adminService.getIncidentHistory().subscribe({
      next: (data: SafetyIncident[]) => {
        this.incidents = data;
        this.renderIncidents();
        this.isLoading = false;
      },
      error: (err: any) => {
        if (environment.useMockAdminData) {
            console.warn('[Safety] Using mock incident history');
            this.incidents = this.getMockHistory();
            this.renderIncidents();
        } else {
            console.error('[Safety] Incident history failed:', err);
        }
        this.isLoading = false;
      }
    });
  }

  async renderHotspots() {
    if (!this.map || !this.hotspotLayer || !this.analytics || !this.L) return;

    this.hotspotLayer.clearLayers();

    this.analytics.hotspots.forEach(spot => {
      const circle = this.L.circle([spot.lat, spot.lng], {
        radius: spot.radius,
        color: '#dc2626',
        fillColor: '#ef4444',
        fillOpacity: spot.intensity * 0.4,
        weight: 1,
        className: 'risk-bubble'
      }).addTo(this.hotspotLayer);

      circle.bindPopup(`<strong>${spot.label}</strong><br>Incident Intensity: ${Math.round(spot.intensity * 100)}%`);
    });
  }

  async renderIncidents() {
    if (!this.map || !this.incidentLayer || !this.L) return;

    this.incidentLayer.clearLayers();

    const filtered = this.activeFilter === 'all' 
      ? this.incidents 
      : this.incidents.filter(i => i.type === this.activeFilter);

    filtered.forEach(incident => {
      const color = this.getIncidentColor(incident.severity);
      
      const marker = this.L.circleMarker([incident.location.lat, incident.location.lng], {
        radius: 8,
        fillColor: color,
        color: 'white',
        weight: 2,
        opacity: 1,
        fillOpacity: 1,
        className: incident.severity === 'high' ? 'pulsing-sos-marker' : ''
      });

      marker.bindPopup(`
        <div class="safety-popup">
          <span class="severity-badge ${incident.severity}">${incident.severity.toUpperCase()}</span>
          <strong>${incident.type.replace('_', ' ')}</strong>
          <p>${incident.description}</p>
          <small>${new Date(incident.timestamp).toLocaleString()}</small>
        </div>
      `);

      marker.on('click', () => this.selectedIncident = incident);
      marker.addTo(this.incidentLayer);
    });
  }

  getIncidentColor(severity: string): string {
    switch (severity) {
      case 'high': return '#dc2626';
      case 'medium': return '#fbbf24';
      default: return '#3b82f6';
    }
  }

  getMaxTrendCount(): number {
    if (!this.analytics) return 0;
    return Math.max(...this.analytics.incidentTrends.map(t => t.count), 1);
  }

  private getMockAnalytics(): SafetyAnalytics {
    return {
      hotspots: [
        { lat: 9.0667, lng: 7.4833, intensity: 0.8, radius: 800, label: 'Berger Transit Hub' },
        { lat: 9.0765, lng: 7.3986, intensity: 0.6, radius: 600, label: 'Wuse Market' },
        { lat: 9.055, lng: 7.45, intensity: 0.9, radius: 1000, label: 'Area 1 Corridor' }
      ],
      incidentTrends: [
        { hour: 0, count: 12 }, { hour: 4, count: 34 }, { hour: 8, count: 15 },
        { hour: 12, count: 5 }, { hour: 16, count: 22 }, { hour: 20, count: 45 }, { hour: 23, count: 18 }
      ],
      totalAlerts24h: 156,
      activePanicTriggers: 2
    };
  }

  private getMockHistory(): SafetyIncident[] {
    return [
      { _id: 's1', type: 'PANIC_BUTTON', location: { lat: 9.0667, lng: 7.4833 }, timestamp: new Date(), severity: 'high', description: 'User triggered panic button near hub', status: 'investigating' },
      { _id: 's2', type: 'SOS_SILENT', location: { lat: 9.07, lng: 7.45 }, timestamp: new Date(Date.now() - 3600000), severity: 'high', description: 'Silent SOS alert detected', status: 'active' },
      { _id: 's3', type: 'RISK_ALERT', location: { lat: 9.08, lng: 7.41 }, timestamp: new Date(Date.now() - 7200000), severity: 'medium', description: 'Suspicious activity reported', status: 'resolved' }
    ];
  }
}
