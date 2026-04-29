import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  imports: [CommonModule, FormsModule],
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
  activeTab: 'all' | 'bus_stop' | 'pricing' | 'safety' | 'route_segment' = 'all';
  isLoading = false;
  selectedItem: ModerationItem | null = null;
  selectedIds = new Set<string>();
  showApproveModal = false;
  approvalNotes = '';
  pendingApprovalItem: ModerationItem | null = null;
  showRejectModal = false;
  rejectionReason = '';
  pendingRejectItem: ModerationItem | null = null;
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
          const rawData = notif.data.data || notif.data; // Handle wrapper or direct object
          const item = {
            ...rawData,
            _id: rawData._id || rawData.id || notif.data.id,
            type: (rawData.type || rawData.itemType) === 'pricing_feedback' ? 'pricing' : (rawData.type || rawData.itemType),
            data: rawData.data || rawData.metadata || {}, // Flatten metadata/data
            status: rawData.status || rawData.action,
            flags: rawData.flags || [],
            autoFlags: rawData.autoFlags || { suspiciousActivity: false, duplicateSubmission: false, rapidUpvotes: false },
            submittedAt: (rawData.submittedAt && !isNaN(Date.parse(rawData.submittedAt))) ? new Date(rawData.submittedAt) : new Date(),
            submittedBy: typeof rawData.submittedBy === 'object' ?
              (rawData.submittedBy.name || rawData.submittedBy.email) :
              (rawData.submittedBy || notif.data.submittedBy)
          } as ModerationItem;

          // Add to beginning of queue if not already there
          if (!this.queue.some(q => q._id === item._id)) {
            this.queue.unshift(item);
            this.applyFilter();
          }
        }
      });
  }

  async initPreviewMap(location: { lat: number; lng: number }, secondaryLocation?: { lat: number; lng: number }): Promise<void> {
    const L = await this.mapService.loadLeaflet();
    if (!L) return;

    // Small delay to ensure container is rendered
    setTimeout(() => {
      if (this.mapPreview) {
        this.mapPreview.remove();
      }

      this.mapPreview = this.mapService.initMap('item-preview-map', location, 14);
      L.marker([location.lat, location.lng]).addTo(this.mapPreview);

      if (secondaryLocation) {
        L.marker([secondaryLocation.lat, secondaryLocation.lng]).addTo(this.mapPreview);
        // Draw connection line
        L.polyline([
          [location.lat, location.lng],
          [secondaryLocation.lat, secondaryLocation.lng]
        ], { color: '#3B82F6', weight: 4, dashArray: '10, 10', opacity: 0.8 }).addTo(this.mapPreview);

        // Fit bounds to show both markers
        const bounds = L.latLngBounds([
          [location.lat, location.lng],
          [secondaryLocation.lat, secondaryLocation.lng]
        ]);
        this.mapPreview.fitBounds(bounds, { padding: [30, 30] });
      }
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
      },
      {
        _id: 'q4',
        type: 'route_segment',
        data: {
          fromStop: { name: 'Berger Roundabout', location: { lat: 9.0645, lng: 7.4523 } },
          toStop: { name: 'Wuse Market', location: { lat: 9.0611, lng: 7.4622 } },
          transportMode: 'Taxi',
          priceRange: { min: 200, max: 400 },
          estimatedTime: 8
        },
        submittedBy: 'Musa Y.',
        submittedAt: new Date(Date.now() - 1500000),
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
    this.selectedIds.clear(); // Clear selections on filter change
    if (this.activeTab === 'all') {
      this.filteredQueue = this.queue;
    } else {
      this.filteredQueue = this.queue.filter(item => item.type === this.activeTab);
    }
  }

  toggleSelection(id: string): void {
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
    } else {
      this.selectedIds.add(id);
    }
  }

  toggleAll(event: any): void {
    if (event.target.checked) {
      this.filteredQueue.forEach(item => this.selectedIds.add(item._id));
    } else {
      this.selectedIds.clear();
    }
  }

  isAllSelected(): boolean {
    return this.filteredQueue.length > 0 && this.selectedIds.size === this.filteredQueue.length;
  }

  bulkApprove(): void {
    const ids = Array.from(this.selectedIds);
    if (confirm(`Approve all ${ids.length} selected items?`)) {
      // In a real app, we'd use a bulk endpoint. Here we'll simulate it.
      this.isLoading = true;
      let completed = 0;
      ids.forEach(id => {
        this.adminService.approveItem(id).subscribe({
          next: () => {
            completed++;
            if (completed === ids.length) this.onBulkActionComplete('Approved');
          },
          error: () => {
            completed++;
            if (completed === ids.length) this.onBulkActionComplete('Processed with errors');
          }
        });
      });
    }
  }

  bulkReject(): void {
    const ids = Array.from(this.selectedIds);
    const reason = prompt(`Reject all ${ids.length} selected items? Enter reason:`);
    if (reason) {
      this.isLoading = true;
      let completed = 0;
      ids.forEach(id => {
        this.adminService.rejectItem(id, reason).subscribe({
          next: () => {
            completed++;
            if (completed === ids.length) this.onBulkActionComplete('Rejected');
          },
          error: () => {
            completed++;
            if (completed === ids.length) this.onBulkActionComplete('Processed with errors');
          }
        });
      });
    }
  }

  private onBulkActionComplete(action: string): void {
    const ids = Array.from(this.selectedIds);
    this.queue = this.queue.filter(q => !ids.includes(q._id));
    this.applyFilter();
    this.isLoading = false;
    this.toastService.success('Bulk Action Complete', `${ids.length} items have been ${action}.`);
  }

  approve(item: ModerationItem): void {
    this.pendingApprovalItem = item;
    this.approvalNotes = '';
    this.showApproveModal = true;
  }

  confirmApprove(): void {
    if (!this.pendingApprovalItem) return;

    const item = this.pendingApprovalItem;
    this.isLoading = true;
    this.showApproveModal = false;

    this.adminService.approveItem(item._id, this.approvalNotes).subscribe({
      next: () => {
        this.queue = this.queue.filter(q => q._id !== item._id);
        this.applyFilter();
        this.selectedItem = null;
        this.isLoading = false;
        this.toastService.success('Submission Approved', `The ${item.type} contribution is now live.`);
      },
      error: (err) => {
        this.isLoading = false;
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

  cancelApprove(): void {
    this.showApproveModal = false;
    this.pendingApprovalItem = null;
    this.approvalNotes = '';
  }

  reject(item: ModerationItem): void {
    this.pendingRejectItem = item;
    this.rejectionReason = '';
    this.showRejectModal = true;
  }

  confirmReject(): void {
    if (!this.pendingRejectItem || !this.rejectionReason.trim()) {
      if (!this.rejectionReason.trim()) this.toastService.warning('Required', 'Please provide a reason for rejection.');
      return;
    }

    const item = this.pendingRejectItem;
    this.isLoading = true;
    this.showRejectModal = false;

    this.adminService.rejectItem(item._id, this.rejectionReason).subscribe({
      next: () => {
        this.queue = this.queue.filter(q => q._id !== item._id);
        this.applyFilter();
        this.selectedItem = null;
        this.isLoading = false;
        this.toastService.warning('Submission Rejected', 'The report has been declined and the user notified.');
      },
      error: (err) => {
        this.isLoading = false;
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

  cancelReject(): void {
    this.showRejectModal = false;
    this.pendingRejectItem = null;
    this.rejectionReason = '';
  }

  viewDetails(item: ModerationItem): void {
    this.selectedItem = item;

    // Auto-init map if item has coordinates
    if (item.type === 'route_segment') {
      const fromLoc = item.data.fromStop?.location;
      const toLoc = item.data.toStop?.location;
      if (fromLoc && toLoc) {
        this.initPreviewMap(fromLoc, toLoc);
      }
    } else if (item.data.location?.lat && item.data.location?.lng) {
      this.initPreviewMap(item.data.location);
    } else if (item.data.coordinates) { // Alternative format
      this.initPreviewMap({ lat: item.data.coordinates[1], lng: item.data.coordinates[0] });
    }
  }
}
