import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DeviationStatus, DeviationSeverity, getDeviationSeverity, getDeviationMessage } from '../../../models/deviation.types';

@Component({
    selector: 'app-deviation-banner',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="deviation-banner" 
             *ngIf="status?.isDeviated"
             [class]="'severity-' + severity">
            
            <div class="banner-icon">
                <i [class]="severityIcon"></i>
            </div>
            
            <div class="banner-content">
                <div class="banner-title">{{ severityTitle }}</div>
                <div class="banner-message">{{ message }}</div>
                <div class="banner-segment" *ngIf="status?.nearestSegment">
                    Nearest: {{ status.nearestSegment.from }} → {{ status.nearestSegment.to }}
                </div>
            </div>
            
            <div class="banner-actions">
                <button class="btn-reroute" (click)="onReroute.emit()">
                    <i class="fas fa-route"></i>
                    Reroute
                </button>
                <button class="btn-dismiss" (click)="onDismiss.emit()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    `,
    styles: [`
        .deviation-banner {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 16px;
            border-radius: 12px;
            margin: 8px 0;
            animation: slideDown 0.3s ease;
        }

        @keyframes slideDown {
            from {
                opacity: 0;
                transform: translateY(-10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .severity-minor {
            background: linear-gradient(135deg, #fff8e1 0%, #fff 100%);
            border: 1px solid #ffc107;
        }

        .severity-moderate {
            background: linear-gradient(135deg, #fff3e0 0%, #fff 100%);
            border: 1px solid #ff9800;
        }

        .severity-severe {
            background: linear-gradient(135deg, #ffebee 0%, #fff 100%);
            border: 1px solid #f44336;
        }

        .banner-icon {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }

        .severity-minor .banner-icon {
            background: #ffc107;
            color: white;
        }

        .severity-moderate .banner-icon {
            background: #ff9800;
            color: white;
        }

        .severity-severe .banner-icon {
            background: #f44336;
            color: white;
        }

        .banner-icon i {
            font-size: 1rem;
        }

        .banner-content {
            flex: 1;
            min-width: 0;
        }

        .banner-title {
            font-weight: 600;
            font-size: 0.9rem;
            color: var(--text-primary, #1a1a1a);
        }

        .banner-message {
            font-size: 0.85rem;
            color: var(--text-secondary, #666);
            margin-top: 2px;
        }

        .banner-segment {
            font-size: 0.75rem;
            color: var(--text-muted, #999);
            margin-top: 4px;
        }

        .banner-actions {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-shrink: 0;
        }

        .btn-reroute {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 8px 12px;
            background: var(--primary-color, #007bff);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 0.85rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .btn-reroute:hover {
            background: var(--primary-hover, #0056b3);
            transform: translateY(-1px);
        }

        .btn-dismiss {
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: transparent;
            border: 1px solid var(--border-color, #e0e0e0);
            border-radius: 50%;
            color: var(--text-secondary, #666);
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .btn-dismiss:hover {
            background: var(--bg-muted, #f5f5f5);
            color: var(--text-primary, #1a1a1a);
        }

        /* Responsive */
        @media (max-width: 480px) {
            .deviation-banner {
                flex-wrap: wrap;
            }

            .banner-actions {
                width: 100%;
                margin-top: 8px;
                justify-content: flex-end;
            }
        }
    `]
})
export class DeviationBannerComponent {
    @Input() status: DeviationStatus | null = null;
    @Output() onReroute = new EventEmitter<void>();
    @Output() onDismiss = new EventEmitter<void>();

    get severity(): DeviationSeverity {
        if (!this.status) return 'none';
        return getDeviationSeverity(this.status.distanceFromRoute, this.status.threshold);
    }

    get message(): string {
        if (!this.status) return '';
        return getDeviationMessage(this.status);
    }

    get severityTitle(): string {
        switch (this.severity) {
            case 'minor': return 'Slight Deviation';
            case 'moderate': return 'Off Route';
            case 'severe': return 'Significantly Off Route';
            default: return 'Route Status';
        }
    }

    get severityIcon(): string {
        switch (this.severity) {
            case 'minor': return 'fas fa-exclamation';
            case 'moderate': return 'fas fa-exclamation-triangle';
            case 'severe': return 'fas fa-times-circle';
            default: return 'fas fa-info';
        }
    }
}
