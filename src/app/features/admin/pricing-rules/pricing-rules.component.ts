import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { AdminService } from '../../../core/services/admin.service';
import { ToastNotificationService } from '../../../core/services/toast-notification.service';
import { PricingRule, PricingRulesResponse } from '../../../models/admin.types';

@Component({
  selector: 'app-pricing-rules',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './pricing-rules.component.html',
  styleUrls: ['./pricing-rules.component.scss']
})
export class PricingRulesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private adminService = inject(AdminService);
  private toastService = inject(ToastNotificationService);

  rules: PricingRule[] = [];
  filteredRules: PricingRule[] = [];
  totalCount = 0;
  page = 1;
  limit = 20;
  searchQuery = '';
  isLoading = false;
  isSubmitting = false;
  showModal = false;
  editMode = false;
  currentRuleId: string | null = null;
  selectedRule: PricingRule | null = null;

  search$ = new Subject<string>();

  modes = ['KEKE', 'OKADA', 'TAXI', 'BUS', 'WALKING'];
  corridors = [
    'AIRPORT_ROAD',
    'WUSE_ZONE',
    'MAITAMA',
    'GARKI',
    'GWARINPA',
    'KUBWA',
    'UTAKO',
    'JABI',
    'KADUNA_ROAD',
    'LOKOJA_ROAD',
    'SULEJA_ROAD',
    'NYANYA',
    'MARARABA',
    'KARU',
    'KARSHI',
    'DEFAULT'
  ];

  ruleForm: FormGroup;

  constructor() {
    this.ruleForm = this.fb.group({
      mode: ['KEKE', Validators.required],
      corridor: ['DEFAULT', Validators.required],
      baseFare: [100, [Validators.required, Validators.min(0)]],
      perKm: [50, [Validators.required, Validators.min(0)]],
      minFare: [0, [Validators.required, Validators.min(0)]],
      villageSurcharge: [1.25, [Validators.required, Validators.min(0), Validators.max(5)]],
      alongDiscount: [0.85, [Validators.required, Validators.min(0), Validators.max(1)]],
      surgeMultiplier: [1.0, [Validators.required, Validators.min(0.1), Validators.max(5)]],
      isActive: [true]
    });
  }

  ngOnInit(): void {
    this.setupSearch();
    this.loadRules();
  }

  setupSearch(): void {
    this.search$.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => {
      this.searchQuery = query;
      this.page = 1;
      this.loadRules();
    });
  }

  loadRules(): void {
    this.isLoading = true;
    this.adminService.getPricingRules(this.page, this.limit).subscribe({
      next: (res: PricingRulesResponse) => {
        this.rules = res.rules || [];
        this.totalCount = res.total || 0;
        this.applyFilter();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('[PricingRules] Load failed:', err);
        this.toastService.error('Load Error', 'Failed to load pricing rules');
        this.isLoading = false;
      }
    });
  }

  applyFilter(): void {
    if (!this.searchQuery.trim()) {
      this.filteredRules = this.rules;
    } else {
      const q = this.searchQuery.toLowerCase();
      this.filteredRules = this.rules.filter(r =>
        r.mode.toLowerCase().includes(q) ||
        r.corridor.toLowerCase().includes(q) ||
        r.baseFare.toString().includes(q)
      );
    }
  }

  onSearch(event: Event): void {
    const query = (event.target as HTMLInputElement).value;
    this.search$.next(query);
  }

  onPageChange(newPage: number): void {
    this.page = newPage;
    this.loadRules();
  }

  get totalPages(): number {
    return Math.ceil(this.totalCount / this.limit);
  }

  openCreateModal(): void {
    this.editMode = false;
    this.currentRuleId = null;
    this.ruleForm.reset({
      mode: 'KEKE',
      corridor: 'DEFAULT',
      baseFare: 100,
      perKm: 50,
      minFare: 0,
      villageSurcharge: 1.25,
      alongDiscount: 0.85,
      surgeMultiplier: 1.0,
      isActive: true
    });
    this.showModal = true;
  }

  openEditModal(rule: PricingRule): void {
    this.editMode = true;
    this.currentRuleId = rule._id || rule.id || null;
    this.selectedRule = rule;
    this.ruleForm.patchValue({
      mode: rule.mode,
      corridor: rule.corridor,
      baseFare: rule.baseFare,
      perKm: rule.perKm,
      minFare: rule.minFare,
      villageSurcharge: rule.villageSurcharge,
      alongDiscount: rule.alongDiscount,
      surgeMultiplier: rule.surgeMultiplier,
      isActive: rule.isActive
    });
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.editMode = false;
    this.currentRuleId = null;
    this.selectedRule = null;
    this.ruleForm.reset();
  }

  onSubmit(): void {
    if (this.ruleForm.invalid) {
      this.ruleForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const payload = this.ruleForm.value;

    if (this.editMode && this.currentRuleId) {
      this.adminService.updatePricingRule(this.currentRuleId, payload).subscribe({
        next: (updated) => {
          this.handleSuccess('Pricing rule updated successfully');
        },
        error: (err) => this.handleError(err, 'Failed to update pricing rule')
      });
    } else {
      this.adminService.createPricingRule(payload).subscribe({
        next: (created) => {
          this.handleSuccess('Pricing rule created successfully');
        },
        error: (err) => this.handleError(err, 'Failed to create pricing rule')
      });
    }
  }

  private handleSuccess(message: string): void {
    this.isSubmitting = false;
    this.toastService.success('Success', message);
    this.closeModal();
    this.loadRules();
  }

  private handleError(err: any, fallback: string): void {
    this.isSubmitting = false;
    const msg = err.error?.message || err.error?.error || fallback;
    this.toastService.error('Error', msg);
  }

  toggleActive(rule: PricingRule): void {
    const id = rule._id || rule.id;
    if (!id) return;

    const newStatus = !rule.isActive;
    this.adminService.togglePricingRule(id, newStatus).subscribe({
      next: (updated) => {
        rule.isActive = updated.isActive;
        this.toastService.success('Updated', `Rule ${newStatus ? 'activated' : 'deactivated'}`);
      },
      error: (err) => {
        const msg = err.error?.message || 'Failed to toggle status';
        this.toastService.error('Error', msg);
      }
    });
  }

  deleteRule(rule: PricingRule): void {
    const id = rule._id || rule.id;
    if (!id) return;

    if (!confirm(`Delete pricing rule for ${rule.mode} - ${rule.corridor}?`)) return;

    this.adminService.deletePricingRule(id).subscribe({
      next: () => {
        this.toastService.success('Deleted', 'Pricing rule removed');
        this.loadRules();
      },
      error: (err) => {
        const msg = err.error?.message || 'Failed to delete rule';
        this.toastService.error('Error', msg);
      }
    });
  }

  getModeColor(mode: string): string {
    const colors: Record<string, string> = {
      KEKE: '#f59e0b',
      OKADA: '#ef4444',
      TAXI: '#3b82f6',
      BUS: '#10b981',
      WALKING: '#6b7280'
    };
    return colors[mode] || '#6b7280';
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount);
  }
}