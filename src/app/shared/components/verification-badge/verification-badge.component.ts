import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VerificationStatus } from '../../../models/bus-stop.model';
import { getVerificationBadgeConfig } from '../../../models/transport-point.constants';

@Component({
  selector: 'app-verification-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span 
      class="verification-badge"
      [class.verified]="status === 'verified'"
      [class.community]="status === 'community'"
      [class.pending]="status === 'pending'"
      [class.flagged]="status === 'flagged'"
      [title]="config?.description">
      <span class="badge-icon">{{ config?.icon }}</span>
      <span class="badge-label" *ngIf="showLabel">{{ config?.label }}</span>
    </span>
  `,
  styles: [`
    .verification-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 500;
      white-space: nowrap;
    }

    .badge-icon {
      font-size: 0.875rem;
      line-height: 1;
    }

    .badge-label {
      line-height: 1;
    }

    .verified {
      background-color: #E8F5E9;
      color: #2E7D32;
    }

    .community {
      background-color: #E3F2FD;
      color: #1565C0;
    }

    .pending {
      background-color: #FFF3E0;
      color: #E65100;
    }

    .flagged {
      background-color: #FFEBEE;
      color: #C62828;
    }
  `]
})
export class VerificationBadgeComponent {
  @Input() status!: VerificationStatus;
  @Input() showLabel: boolean = true;

  get config() {
    return getVerificationBadgeConfig(this.status);
  }
}
