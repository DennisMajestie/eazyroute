import { Component, OnInit, AfterViewInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../../core/services/admin.service';
import { LeafletMapService } from '../../../core/services/leaflet-map.service';
import { CommunityReport } from '../../../models/community.types';
import { ContributorStats } from '../../../models/admin.types';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { ToastNotificationService } from '../../../core/services/toast-notification.service';

@Component({
  selector: 'app-community-intelligence',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './community-intelligence.component.html',
  styleUrls: ['./community-intelligence.component.scss']
})
export class CommunityIntelligenceComponent implements OnInit, AfterViewInit, OnDestroy {
  private adminService = inject(AdminService);
  private mapService = inject(LeafletMapService);
  private toastService = inject(ToastNotificationService);
  private destroy$ = new Subject<void>();

  map: any;
  reports: CommunityReport[] = [];
  contributors: ContributorStats[] = [];
  isLoading = false;
  Math = Math;
  
  // Selection state
  selectedReport: CommunityReport | null = null;
  activeFilter: 'all' | 'congestion' | 'fare' | 'risk_alert' = 'all';

  // Map markers group
  private markerLayer: any;

  ngOnInit(): void {
    this.loadContributors();
    this.loadReports();
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async initMap(): Promise<void> {
    const L = await this.mapService.loadLeaflet();
    if (!L) return;

    this.map = this.mapService.initMap('cil-map', { lat: 9.0765, lng: 7.3986 }, 12);
    this.markerLayer = L.layerGroup().addTo(this.map);
    
    // Add markers once reports are loaded
    if (this.reports.length > 0) {
      this.renderMarkers();
    }
  }

  loadReports(): void {
    this.isLoading = true;
    this.adminService.getCommunityReports().subscribe({
      next: (data) => {
        this.reports = data;
        this.renderMarkers();
        this.isLoading = false;
      },
      error: (err) => {
        if (environment.useMockAdminData) {
            console.warn('[CIL] Using mock reports');
            this.reports = this.getMockReports();
            this.renderMarkers();
        } else {
            console.error('[CIL] Community reports failed:', err);
            this.toastService.error('Direct Intelligience Error', 'Failed to synchronize live community reports.');
        }
        this.isLoading = false;
      }
    });
  }

  loadContributors(): void {
    this.adminService.getTopContributors().subscribe({
      next: (data) => {
        this.contributors = data;
      },
      error: (err) => {
        if (environment.useMockAdminData) {
            console.warn('[CIL] Using mock contributors');
            this.contributors = [
              { userId: 'c1', name: 'Captain Ibrahim', totalReports: 142, accuracyRate: 0.98, tier: 'captain', lastActive: new Date(), flaggedReports: 1 },
              { userId: 'c2', name: 'Wuse Connector', totalReports: 89, accuracyRate: 0.94, tier: 'trusted', lastActive: new Date(), flaggedReports: 0 },
              { userId: 'c3', name: 'Amina Garki', totalReports: 56, accuracyRate: 0.88, tier: 'new', lastActive: new Date(), flaggedReports: 2 }
            ];
        } else {
            console.error('[CIL] Top contributors failed:', err);
            this.toastService.error('Reputation Sync Error', 'Could not load contributor rankings.');
        }
      }
    });
  }

  async renderMarkers() {
    if (!this.map || !this.markerLayer) return;
    const L = (window as any).L;
    if (!L) return;

    this.markerLayer.clearLayers();

    const filtered = this.activeFilter === 'all' 
      ? this.reports 
      : this.reports.filter(r => r.reportType === this.activeFilter);

    filtered.forEach(report => {
      const color = this.getReportColor(report.reportType);
      
      // Use CircleMarker for pulsing heatmap effect
      const marker = L.circleMarker([report.location.lat, report.location.lng], {
        radius: 12,
        fillColor: color,
        color: 'white',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.7,
        className: `pulsing-marker-${report.reportType}`
      });

      marker.bindPopup(`
        <div class="report-popup">
          <strong>${report.reportType.toUpperCase()}</strong>
          <p>${this.getReportDescription(report)}</p>
          <small>${new Date(report.timestamp || '').toLocaleString()}</small>
        </div>
      `);

      marker.on('click', () => this.selectedReport = report);
      marker.addTo(this.markerLayer);
    });
  }

  setFilter(filter: any) {
    this.activeFilter = filter;
    this.renderMarkers();
  }

  private getReportColor(type: string): string {
    switch (type) {
      case 'congestion': return '#f59e0b'; // Amber
      case 'fare': return '#ef4444';       // Red
      case 'risk_alert': return '#dc2626';  // Deep Red
      case 'wait_time': return '#3b82f6';   // Blue
      default: return '#10b981';           // Green
    }
  }

  private getReportDescription(report: CommunityReport): string {
    if (report.reportType === 'fare') return `Price Hike: ₦${report.payload.fareMin} - ₦${report.payload.fareMax}`;
    if (report.reportType === 'congestion') return `Traffic: ${(report.payload.congestionLevel || 0) * 100}% Density`;
    return 'Status Update from Community';
  }

  private getMockReports(): CommunityReport[] {
    return [
      { reportType: 'congestion', location: { lat: 9.0667, lng: 7.4833 }, mode: 'keke', payload: { congestionLevel: 0.8 }, timestamp: new Date() },
      { reportType: 'fare', location: { lat: 9.0765, lng: 7.3986 }, mode: 'taxi', payload: { fareMin: 400, fareMax: 600 }, timestamp: new Date() },
      { reportType: 'risk_alert', location: { lat: 9.055, lng: 7.45 }, mode: 'bus', payload: { riskLevel: 0.6, riskDescription: 'Heavy Rain' }, timestamp: new Date() },
      { reportType: 'wait_time', location: { lat: 9.08, lng: 7.42 }, mode: 'bus', payload: { waitTime: 25 }, timestamp: new Date() }
    ];
  }
}
