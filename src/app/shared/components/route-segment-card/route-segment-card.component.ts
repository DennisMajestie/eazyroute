import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouteSegment, TransportMode } from '../../../models/enhanced-bus-stop.model';

@Component({
    selector: 'app-route-segment-card',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="segment-card" [style.border-left-color]="getModeColor(segment.mode)">
      <!-- Segment Header -->
      <div class="segment-header">
        <span class="mode-icon">{{ getModeIcon(segment.mode) }}</span>
        <span class="mode-label">{{ segment.mode | titlecase }}</span>
        <span class="duration">{{ segment.duration }} mins</span>
        <span class="cost" *ngIf="segment.cost">₦{{ segment.cost }}</span>
      </div>

      <!-- Segment Details -->
      <div class="segment-details">
        <div class="location from">
          <span class="icon">🟢</span>
          <span>{{ segment.fromName }}</span>
        </div>
        <div class="location to">
          <span class="icon">🔴</span>
          <span>{{ segment.toName }}</span>
        </div>
      </div>

      <!-- Instruction -->
      <div class="instruction">
        <span class="icon">➡️</span>
        <span>{{ segment.instruction }}</span>
      </div>

      <!-- Drop Points (if available) -->
      <div class="drop-points" *ngIf="segment.dropPoints && segment.dropPoints.length > 0">
        <span class="label">Drop Points:</span>
        <div class="points-list">
          <span *ngFor="let point of segment.dropPoints" class="point-chip">
            {{ point }}
          </span>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .segment-card {
      background: white;
      border-radius: 12px;
      padding: 16px;
      border-left: 4px solid #6b7280;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      margin-bottom: 12px;
    }

    .segment-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;

      .mode-icon {
        font-size: 24px;
      }

      .mode-label {
        font-weight: 600;
        flex: 1;
      }

      .duration {
        color: #6b7280;
        font-size: 14px;
      }

      .cost {
        background: #10b981;
        color: white;
        padding: 4px 12px;
        border-radius: 12px;
        font-weight: 600;
        font-size: 14px;
      }
    }

    .segment-details {
      margin-bottom: 12px;

      .location {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 4px 0;

        .icon {
          font-size: 12px;
        }
      }
    }

    .instruction {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
      font-size: 14px;

      .icon {
        font-size: 16px;
      }
    }

    .drop-points {
      margin-top: 12px;

      .label {
        display: block;
        font-size: 12px;
        color: #6b7280;
        margin-bottom: 8px;
        font-weight: 600;
      }

      .points-list {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .point-chip {
        background: #e5e7eb;
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 12px;
        color: #374151;
      }
    }
  `]
})
export class RouteSegmentCardComponent {
    @Input() segment!: RouteSegment;

    getModeIcon(mode: TransportMode): string {
        const icons = {
            'walking': '🚶',
            'bus': '🚌',
            'taxi': '🚕',
            'keke': '🛺',
            'okada': '🏍️'
        };
        return icons[mode] || '➡️';
    }

    getModeColor(mode: TransportMode): string {
        const colors = {
            'walking': '#10b981',
            'bus': '#3b82f6',
            'taxi': '#f59e0b',
            'keke': '#8b5cf6',
            'okada': '#ef4444'
        };
        return colors[mode] || '#6b7280';
    }
}
