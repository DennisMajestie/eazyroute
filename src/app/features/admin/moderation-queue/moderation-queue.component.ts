import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../../core/services/admin.service';
import { LeafletMapService } from '../../../core/services/leaflet-map.service';
import { ModerationItem } from '../../../models/admin.types';
import { environment } from '../../../../environments/environment';
import { ToastNotificationService } from '../../../core/services/toast-notification.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-moderation-queue',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './moderation-queue.component.html',
  styleUrls: ['./moderation-queue.component.scss']
})
export class ModerationQueueComponent implements OnInit {
  private adminService = inject(AdminService);
  private mapService = inject(LeafletMapService);
  private toastService = inject(ToastNotificationService);
  private notifService = inject(NotificationService);
  private destroy$ = new Subject<void>();
  
  queue: ModerationItem[] = [];
  filteredQueue: ModerationItem[] = [];
  activeTab: 'all' | 'bus_stop' | 'pricing' | 'safety' = 'all';
  isLoading = false;
  selectedItem: ModerationItem | null = null;
  mapPreview: any;

  ngOnInit(): void {
    this.loadQueue();
    this.initRealTimeListeners();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initRealTimeListeners(): void {
    this.notifService.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe(notif => {
        if (notif.id.startsWith('mod-') && notif.data) {
          console.log('[Moderation] Real-time item received:', notif.data);
          
          // Map backend format to frontend format
          const item = {
            ...notif.data,
            type: notif.data.type || notif.data.itemType, // Support both formats
            status: notif.data.status || notif.data.action,
            submittedBy: typeof notif.data.submittedBy === 'object' ? 
              (notif.data.submittedBy.name || notif.data.submittedBy.email) : 
              notif.data.submittedBy
          } as ModerationItem;

          // Add to beginning of queue if not already there
          if (!this.queue.some(q => q._id === item._id)) {
            this.queue.unshift(item);
            this.applyFilter();
          }
        }
      });
  }

  async initPreviewMap(location: { lat: number; lng: number }): Promise<void> {
    const L = await this.mapService.loadLeaflet();
    if (!L) return;

    // Small delay to ensure container is rendered
    setTimeout(() => {
        if (this.mapPreview) {
            this.mapPreview.remove();
        }
        this.mapPreview = this.mapService.initMap('item-preview-map', location, 15);
        L.marker([location.lat, location.lng]).addTo(this.mapPreview);
    }, 100);
  }

  promoteToCaptain(userId: string): void {
    if (confirm('Are you sure you want to promote this user to Captain? This action grants elevated contribution verification rights.')) {
        this.adminService.promoteToCaptain(userId).subscribe({
            next: () => this.toastService.success('Promotion Successful', 'User has been granted Captain status.'),
            error: (err) => {
                if (environment.useMockAdminData) {
                    this.toastService.info('Simulation Mode', 'Promotion simulation successful.');
                } else {
                    console.error('[Moderation] Promotion failed:', err);
                    this.toastService.error('Promotion Failed', 'We couldn\'t update user status. Please try again.');
                }
            }
        });
    }
  }

  loadQueue(): void {
    this.isLoading = true;
    this.adminService.getModerationQueue().subscribe({
      next: (items) => {
        this.queue = items;
        this.applyFilter();
        this.isLoading = false;
      },
      error: (err) => {
        if (environment.useMockAdminData) {
            console.warn('[Moderation] Using mock queue');
            this.queue = this.getMockQueue();
            this.applyFilter();
        } else {
            console.error('[Moderation] Queue failed:', err);
        }
        this.isLoading = false;
      }
    });
  }

  private getMockQueue(): ModerationItem[] {
      return [
        {
          _id: 'q1',
          type: 'bus_stop',
          data: { name: 'New Gwarinpa Junction', location: { name: 'Gwarinpa Phase 2' } },
          submittedBy: 'Danladi K.',
          submittedAt: new Date(),
          status: 'pending',
          flags: [],
          autoFlags: { suspiciousActivity: false, duplicateSubmission: false, rapidUpvotes: false }
        },
        {
          _id: 'q2',
          type: 'pricing',
          data: { title: 'Wuse to Berger Update', category: 'Keke Napep' },
          submittedBy: 'Chidi O.',
          submittedAt: new Date(Date.now() - 3600000),
          status: 'pending',
          flags: ['rapid_submissions'],
          autoFlags: { suspiciousActivity: true, duplicateSubmission: false, rapidUpvotes: false }
        },
        {
          _id: 'q3',
          type: 'safety',
          data: { title: 'Area 1 Construction Alert', category: 'Road Closure' },
          submittedBy: 'Amina B.',
          submittedAt: new Date(Date.now() - 7200000),
          status: 'pending',
          flags: [],
          autoFlags: { suspiciousActivity: false, duplicateSubmission: false, rapidUpvotes: false }
        }
      ];
  }

  setTab(tab: any): void {
    this.activeTab = tab;
    this.applyFilter();
  }

  applyFilter(): void {
    if (this.activeTab === 'all') {
      this.filteredQueue = this.queue;
    } else {
      this.filteredQueue = this.queue.filter(item => item.type === this.activeTab);
    }
  }

  approve(item: ModerationItem): void {
    if (confirm(`Approve this ${item.type} submission?`)) {
      this.adminService.approveItem(item._id).subscribe({
        next: () => {
          this.queue = this.queue.filter(q => q._id !== item._id);
          this.applyFilter();
          this.selectedItem = null;
          this.toastService.success('Submission Approved', `The ${item.type} contribution is now live.`);
        },
        error: (err) => {
          if (environment.useMockAdminData) {
              this.queue = this.queue.filter(q => q._id !== item._id);
              this.applyFilter();
              this.selectedItem = null;
              this.toastService.info('Simulation Mode', 'Submission approval simulation successful.');
          } else {
              console.error('[Moderation] Approval failed:', err);
              this.toastService.error('Process Error', 'Failed to approve the submission.');
          }
        }
      });
    }
  }

  reject(item: ModerationItem): void {
    const reason = prompt('Please provide a reason for rejection:');
    if (reason) {
      this.adminService.rejectItem(item._id, reason).subscribe({
        next: () => {
          this.queue = this.queue.filter(q => q._id !== item._id);
          this.applyFilter();
          this.selectedItem = null;
          this.toastService.warning('Submission Rejected', 'The report has been declined and the user notified.');
        },
        error: (err) => {
          if (environment.useMockAdminData) {
              this.queue = this.queue.filter(q => q._id !== item._id);
              this.applyFilter();
              this.selectedItem = null;
              this.toastService.info('Simulation Mode', 'Submission rejection simulation successful.');
          } else {
              console.error('[Moderation] Rejection failed:', err);
              this.toastService.error('Process Error', 'Failed to decline the submission.');
          }
        }
      });
    }
  }

  viewDetails(item: ModerationItem): void {
    this.selectedItem = item;
    
    // Auto-init map if item has coordinates
    if (item.data.location?.lat && item.data.location?.lng) {
        this.initPreviewMap(item.data.location);
    } else if (item.data.coordinates) { // Alternative format
        this.initPreviewMap({ lat: item.data.coordinates[1], lng: item.data.coordinates[0] });
    }
  }
}
