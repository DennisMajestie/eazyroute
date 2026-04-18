import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
import { BusStopService } from '../../../core/services/bus-stop.service';
import { FormsModule } from '@angular/forms';
import { 
    GraphReport, 
    ConnectionSuggestion, 
    EngineHealth, 
    PricingAnalytics,
    UserStats
} from '../../../models/admin.types';
import { environment } from '../../../../environments/environment';
import { interval, Subject } from 'rxjs';
import { takeUntil, startWith } from 'rxjs/operators';
import { ToastNotificationService } from '../../../core/services/toast-notification.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  public adminService = inject(AdminService);
  private busStopService = inject(BusStopService);
  private toastService = inject(ToastNotificationService);
  private destroy$ = new Subject<void>();
  
  report: GraphReport | null = null;
  health: EngineHealth | null = null;
  pricing: PricingAnalytics | null = null;
  userStats: UserStats | null = null;
  suggestions: ConnectionSuggestion[] = [];
  
  isLoading = false;
  isLoadingPricing = false;
  Math = Math;

  nextSyncSeconds = 120;

  statCards = [
    { label: 'Active Users', value: 0, icon: '👥', color: '#EAB308', trend: 8 },
    { label: 'Total Terminals', value: 0, icon: '📍', color: '#3B82F6', trend: 12 },
    { label: 'Active Routes', value: 0, icon: '🛣️', color: '#10B981', trend: 5 },
    { label: 'Avg Fare', value: 450, icon: '₦', color: '#F59E0B', trend: -2 },
    { label: 'User Contributions', value: 0, icon: '🙌', color: '#8B5CF6', trend: 18 }
  ];

  // Quick Node Creation State
  quickNode = {
    name: '',
    latitude: 0,
    longitude: 0,
    area: 'Abuja Central'
  };
  isCreatingNode = false;

  ngOnInit(): void {
    // Start automated 120s polling
    interval(120000)
      .pipe(
        startWith(0),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.loadAllData();
      });

    // Countdown timer for UI
    interval(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.nextSyncSeconds--;
        if (this.nextSyncSeconds < 0) this.nextSyncSeconds = 120;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadAllData(): void {
    this.nextSyncSeconds = 120;
    this.loadUserStats();
    this.loadReport();
    this.loadSuggestions();
    this.loadDiagnostics();
    this.loadPricing();
  }

  loadUserStats(): void {
    this.adminService.getUserStats().subscribe({
      next: (data) => {
        this.userStats = data;
        const card = this.statCards.find(c => c.label === 'Active Users');
        if (card) card.value = data.total;
        
        const contribCard = this.statCards.find(c => c.label === 'User Contributions');
        if (contribCard) contribCard.value = data.totalContributions || 0;
      },
      error: (err) => {
        console.warn('[Admin] Could not load user stats:', err);
        this.toastService.error('Data Sync Error', 'Failed to refresh active user statistics.');
      }
    });
  }

  loadDiagnostics(): void {
    this.adminService.getEngineDiagnostics().subscribe({
      next: (data) => this.health = data,
      error: (err) => {
        if (environment.useMockAdminData) {
            console.warn('[Admin] Using mock engine status');
            this.health = this.getMockDiagnostics();
        } else {
            console.error('[Admin] Engine diagnostics failed:', err);
            this.toastService.error('Engine Error', 'Failed to retrieve real-time engine health data.');
        }
      }
    });
  }

  loadPricing(): void {
    this.isLoadingPricing = true;
    this.adminService.getPricingAnalytics().subscribe({
      next: (data) => {
        this.pricing = data;
        this.isLoadingPricing = false;
      },
      error: (err) => {
        if (environment.useMockAdminData) {
            console.warn('[Admin] Using mock pricing analytics');
            this.pricing = this.getMockPricing();
        } else {
            console.error('[Admin] Pricing analytics failed:', err);
            this.toastService.error('Analytics Error', 'Failed to load pricing and surge trends.');
        }
        this.isLoadingPricing = false;
      }
    });
  }

  getMockDiagnostics(): EngineHealth {
    return {
      uptime: '4d 12h 30m',
      memoryUsage: { heapTotal: 1024 * 1024 * 512, heapUsed: 1024 * 1024 * 342, external: 1024 * 1024 * 12 },
      counts: { nodes: 1242, edges: 3841, hubs: 12 },
      status: 'healthy',
      lastSyncAt: new Date()
    };
  }

  getMockPricing(): PricingAnalytics {
    return {
      activeSurgeMultiplier: 1.85,
      surgeLabel: '🔥 Evening Rush (April 2026)',
      avgDailyFares: { keke: 150, okada: 200, taxi: 800, bus: 300 },
      trends: [
        { label: 'Mon', value: 420 }, { label: 'Tue', value: 440 }, { label: 'Wed', value: 450 },
        { label: 'Thu', value: 480 }, { label: 'Fri', value: 520 }, { label: 'Sat', value: 380 }, { label: 'Sun', value: 350 }
      ],
      topCorridors: [
        { name: 'Southern Feeder', traffic: 1240, revenue: 154000 },
        { name: 'Main Expressway', traffic: 980, revenue: 210000 },
        { name: 'Village Rib Connect', traffic: 450, revenue: 85000 }
      ]
    };
  }

  loadPricingAnalytics(): void {
    this.adminService.getPricingAnalytics().subscribe({
      next: (data) => {
        this.pricing = data;
        
        // Bind real-time avg fare to card
        const fareCard = this.statCards.find(c => c.label === 'Avg Fare');
        if (fareCard && (data as any).avgBaseFare) {
          fareCard.value = (data as any).avgBaseFare;
        }

        if (data.activeSurgeMultiplier) {
          this.statCards[3].trend = Math.round((data.activeSurgeMultiplier - 1) * 100);
        }
      },
      error: (err) => {
        console.warn('[AdminDashboard] Using mock pricing diagnostics');
        this.pricing = {
          activeSurgeMultiplier: 1.85,
          surgeLabel: '🔥 Evening Rush (April 2026)',
          avgDailyFares: { keke: 150, okada: 200, taxi: 800, bus: 300 },
          trends: [
            { label: 'Mon', value: 420 }, { label: 'Tue', value: 440 }, { label: 'Wed', value: 450 },
            { label: 'Thu', value: 480 }, { label: 'Fri', value: 520 }, { label: 'Sat', value: 380 }, { label: 'Sun', value: 350 }
          ],
          topCorridors: [
            { name: 'Southern Feeder', traffic: 1240, revenue: 154000 },
            { name: 'Main Expressway', traffic: 980, revenue: 210000 },
            { name: 'Village Rib Connect', traffic: 450, revenue: 85000 }
          ]
        };
      }
    });
  }

  formatMemory(bytes: number): string {
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  getMemoryPercentage(): number {
    if (!this.health) return 0;
    return Math.round((this.health.memoryUsage.heapUsed / this.health.memoryUsage.heapTotal) * 100);
  }

  loadReport(): void {
    this.isLoading = true;
    this.adminService.getGraphReport().subscribe({
      next: (data) => {
        this.report = data;
        this.statCards[1].value = data.totalNodes;
        this.statCards[2].value = data.totalEdges;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading report:', err);
        this.toastService.error('Report Error', 'Could not generate the latest graph integrity report.');
        this.isLoading = false;
        // Mock data for demo if API fails
        const mockReport: GraphReport = {
          totalNodes: 1242,
          totalEdges: 3841,
          isolatedCount: 42,
          semanticOrphanCount: 33,
          semanticOrphans: [],
          health: 'moderate',
          issues: [
            '42 isolated bus stops found in Gwarinpa area.',
            'Route graph density is below threshold in Phase 3.',
            '12 duplicate terminal entries detected.'
          ],
          suggestions: []
        };

        
        this.report = mockReport;
        this.statCards[1].value = mockReport.totalNodes;
        this.statCards[2].value = mockReport.totalEdges;
      }
    });
  }

  loadSuggestions(): void {
    this.adminService.getConnectionSuggestions().subscribe({
      next: (data) => {
        this.suggestions = data;
      },
      error: (err) => {
        console.error('Error loading suggestions:', err);
        this.suggestions = [
          { fromStop: { _id: '1', name: 'Berger' }, toStop: { _id: '2', name: 'Wuse Market' }, distance: 1200, reason: 'High demand area', priority: 'high' },
          { fromStop: { _id: '3', name: 'Area 1' }, toStop: { _id: '4', name: 'Garki' }, distance: 800, reason: 'Short gap', priority: 'medium' }
        ];
      }
    });
  }

  createQuickNode(): void {
    if (!this.quickNode.name || !this.quickNode.latitude || !this.quickNode.longitude) {
      this.toastService.error('Missing Data', 'Please provide a name and valid coordinates.');
      return;
    }

    this.isCreatingNode = true;
    this.busStopService.createBusStop({
      name: this.quickNode.name,
      latitude: this.quickNode.latitude,
      longitude: this.quickNode.longitude,
      area: this.quickNode.area
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.toastService.success('Node Created', `${this.quickNode.name} has been added to the graph.`);
          this.quickNode = { name: '', latitude: 0, longitude: 0, area: 'Abuja Central' };
          this.loadReport(); // Refresh stats
        } else {
          this.toastService.error('Creation Failed', res.message || 'Unknown error');
        }
        this.isCreatingNode = false;
      },
      error: (err) => {
        console.error('Error creating node:', err);
        this.toastService.error('API Error', 'Failed to connect to the node creation service.');
        this.isCreatingNode = false;
      }
    });
  }
}
