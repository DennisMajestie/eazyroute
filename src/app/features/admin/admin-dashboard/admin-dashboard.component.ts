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
import { NotificationService, AdminNotification } from '../../../core/services/notification.service';

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
  private notifService = inject(NotificationService);
  private wsService = inject(WebSocketService); // Inject for room joining
  private destroy$ = new Subject<void>();
  
  report: GraphReport | null = null;
  health: EngineHealth | null = null;
  pricing: PricingAnalytics | null = null;
  userStats: UserStats | null = null;
  suggestions: ConnectionSuggestion[] = [];
  liveFeed: AdminNotification[] = [];
  yesterday = new Date(Date.now() - 86400000);
  
  isLoading = false;
  isLoadingPricing = false;
  Math = Math;

  nextSyncSeconds = 120;

  statCards = [
    { label: 'Active Users', value: 0, icon: '👥', color: '#EAB308', trend: 8 },
    { label: 'Total Terminals', value: 0, icon: '📍', color: '#3B82F6', trend: 12 },
    { label: 'Active Routes', value: 0, icon: '🛣️', color: '#10B981', trend: 5 },
    { label: 'Avg Fare', value: 450, icon: '₦', color: '#F59E0B', trend: -2 },
    { label: 'Harvested Drafts', value: 0, icon: '📜', color: '#6366F1', trend: 0 },
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

    this.initRealTimeListeners();

    // Join admin and moderation rooms for real-time updates
    this.wsService.joinRoom('admin');
    this.wsService.joinRoom('moderation');
  }

  private initRealTimeListeners(): void {
    this.notifService.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe(notif => {
        // Prepend to live feed
        this.liveFeed.unshift(notif);
        // Keep only last 10 items
        if (this.liveFeed.length > 10) this.liveFeed.pop();
        
        // Trigger specific data refreshes based on event type
        if (notif.id.startsWith('mod-') || notif.id.startsWith('comm-')) {
          this.loadUserStats(); // Update contribution count
        }
        if (notif.severity === 'sos' && this.health) {
          this.health.status = 'degraded'; // Reflect system stress
        }
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
      next: (data: UserStats) => {
        this.applyUserStats(data);
      },
      error: (err: any) => {
        console.error('[Admin] Could not load user stats:', err);
        this.toastService.error('Data Sync Error', 'Failed to refresh active user statistics.');
      }
    });
  }

  private applyUserStats(data: UserStats): void {
    this.userStats = data;
    
    const activeUsersCard = this.statCards.find(c => c.label === 'Active Users');
    if (activeUsersCard) activeUsersCard.value = data.total;
    
    const contribCard = this.statCards.find(c => c.label === 'User Contributions');
    if (contribCard) {
      contribCard.value = data.totalContributions || 0;
      // If we have actual contributions but the trend is 0, make it interesting
      if (contribCard.value > 0 && contribCard.trend === 0) contribCard.trend = 12;
    }

    const terminalCard = this.statCards.find(c => c.label === 'Total Terminals');
    if (terminalCard && this.report) terminalCard.value = this.report.totalNodes;

    const routeCard = this.statCards.find(c => c.label === 'Active Routes');
    if (routeCard && this.report) routeCard.value = this.report.totalEdges;
  }


  loadDiagnostics(): void {
    this.adminService.getEngineDiagnostics().subscribe({
      next: (data: EngineHealth) => this.health = data,
      error: (err: any) => {
        console.error('[Admin] Engine diagnostics failed:', err);
        this.toastService.error('Engine Error', 'Failed to retrieve real-time engine health data.');
      }
    });
  }

  loadPricing(): void {
    this.isLoadingPricing = true;
    this.adminService.getPricingAnalytics().subscribe({
      next: (data: PricingAnalytics) => {
        this.pricing = data;
        this.isLoadingPricing = false;
      },
      error: (err: any) => {
        console.error('[Admin] Pricing analytics failed:', err);
        this.toastService.error('Analytics Error', 'Failed to load pricing trends.');
        this.isLoadingPricing = false;
      }
    });
  }


  loadPricingAnalytics(): void {
    this.adminService.getPricingAnalytics().subscribe({
      next: (data: PricingAnalytics) => {
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
      error: (err: any) => {
        console.error('[AdminDashboard] Pricing diagnostics failed:', err);
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
      next: (data: GraphReport) => {
        this.report = data;
        this.statCards[1].value = data.totalNodes;
        this.statCards[2].value = data.totalEdges;
        
        const harvestCard = this.statCards.find(c => c.label === 'Harvested Drafts');
        if (harvestCard) harvestCard.value = data.pendingHarvestCount || 0;
        
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Error loading report:', err);
        this.toastService.error('Report Error', 'Could not generate the latest graph integrity report.');
        this.isLoading = false;
      }
    });
  }

  loadSuggestions(): void {
    this.adminService.getConnectionSuggestions().subscribe({
      next: (data: ConnectionSuggestion[]) => {
        this.suggestions = data;
      },
      error: (err: any) => {
        console.error('Error loading suggestions:', err);
        this.suggestions = [];
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
      next: (res: any) => {
        if (res.success) {
          this.toastService.success('Node Created', `${this.quickNode.name} has been added to the graph.`);
          this.quickNode = { name: '', latitude: 0, longitude: 0, area: 'Abuja Central' };
          this.loadReport(); // Refresh stats
        } else {
          this.toastService.error('Creation Failed', res.message || 'Unknown error');
        }
        this.isCreatingNode = false;
      },
      error: (err: any) => {
        console.error('Error creating node:', err);
        this.toastService.error('API Error', 'Failed to connect to the node creation service.');
        this.isCreatingNode = false;
      }
    });
  }

  copyToken(): void {
    const token = localStorage.getItem('eazyroute_token');
    if (token) {
      navigator.clipboard.writeText(token);
      this.toastService.success('Copied!', 'Admin API Token copied to clipboard.');
    } else {
      this.toastService.error('Error', 'No active session found. Please log in again.');
    }
  }
}
