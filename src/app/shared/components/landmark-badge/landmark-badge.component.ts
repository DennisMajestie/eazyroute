import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BusStopTier } from '../../../models/enhanced-bus-stop.model';

@Component({
    selector: 'app-landmark-badge',
    standalone: true,
    imports: [CommonModule],
    template: `
    <span class="landmark-badge" [ngClass]="tier">
      <span class="icon">{{ getIcon() }}</span>
      <span class="label">{{ getLabel() }}</span>
    </span>
  `,
    styles: [`
    .landmark-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      white-space: nowrap;
      
      &.primary {
        background: #dbeafe;
        color: #1e40af;
      }
      
      &.sub-landmark {
        background: #d1fae5;
        color: #065f46;
      }
      
      &.node {
        background: #f3f4f6;
        color: #4b5563;
      }
      
      .icon {
        font-size: 14px;
        line-height: 1;
      }
      
      .label {
        line-height: 1;
      }
    }
  `]
})
export class LandmarkBadgeComponent {
    @Input() tier: BusStopTier = 'node';

    getIcon(): string {
        const icons = {
            'primary': '⭐',
            'sub-landmark': '📍',
            'node': '⚪'
        };
        return icons[this.tier] || '⚪';
    }

    getLabel(): string {
        const labels = {
            'primary': 'Major Hub',
            'sub-landmark': 'Landmark',
            'node': 'Stop'
        };
        return labels[this.tier] || 'Stop';
    }
}
