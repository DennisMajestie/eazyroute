import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TransportPointType, getTransportPointTypeConfig } from '../../../models/transport-point.constants';

@Component({
  selector: 'app-transport-point-icon',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span 
      class="transport-icon"
      [class.small]="size === 'small'"
      [class.medium]="size === 'medium'"
      [class.large]="size === 'large'"
      [style.background-color]="backgroundColor"
      [title]="config?.label">
      {{ config?.icon }}
    </span>
  `,
  styles: [`
    .transport-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      font-weight: 500;
      flex-shrink: 0;
    }

    .small {
      width: 24px;
      height: 24px;
      font-size: 0.75rem;
    }

    .medium {
      width: 32px;
      height: 32px;
      font-size: 1rem;
    }

    .large {
      width: 48px;
      height: 48px;
      font-size: 1.5rem;
    }
  `]
})
export class TransportPointIconComponent {
  @Input() type!: TransportPointType;
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() showBackground: boolean = true;

  get config() {
    return getTransportPointTypeConfig(this.type);
  }

  get backgroundColor() {
    return this.showBackground ? `${this.config?.color}20` : 'transparent';
  }
}
