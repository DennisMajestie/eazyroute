import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PriceEstimate } from '../../../models/pricing.types';

@Component({
    selector: 'app-price-display',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="price-display" [class.surge-active]="hasSurge">
            <!-- Main Price -->
            <div class="price-main">
                <span class="currency">₦</span>
                <span class="amount">{{ formatAmount(estimate?.currentEstimate || 0) }}</span>
                <span class="surge-badge" *ngIf="hasSurge">
                    <i class="fas fa-bolt"></i>
                    {{ surgeLabel }}
                </span>
            </div>

            <!-- Price Range -->
            <div class="price-range" *ngIf="showRange && estimate">
                <span class="range-label">Range:</span>
                <span class="range-value">
                    ₦{{ formatAmount(estimate.dynamicPrice.min) }} - ₦{{ formatAmount(estimate.dynamicPrice.max) }}
                </span>
            </div>

            <!-- Confidence Indicator -->
            <div class="confidence" *ngIf="showConfidence && estimate">
                <div class="confidence-bar">
                    <div class="confidence-fill" [style.width.%]="estimate.confidence"></div>
                </div>
                <span class="confidence-label">{{ confidenceLabel }}</span>
            </div>

            <!-- Factors -->
            <div class="factors" *ngIf="showFactors && estimate?.factors?.length">
                <div class="factor" *ngFor="let factor of estimate.factors">
                    <i class="fas fa-info-circle"></i>
                    {{ factor }}
                </div>
            </div>
        </div>
    `,
    styles: [`
        .price-display {
            padding: 12px;
            background: var(--card-bg, #fff);
            border-radius: 12px;
            border: 1px solid var(--border-color, #e0e0e0);
        }

        .price-display.surge-active {
            border-color: #ff6b35;
            background: linear-gradient(135deg, #fff5f0 0%, #fff 100%);
        }

        .price-main {
            display: flex;
            align-items: baseline;
            gap: 4px;
            flex-wrap: wrap;
        }

        .currency {
            font-size: 1rem;
            color: var(--text-secondary, #666);
        }

        .amount {
            font-size: 1.75rem;
            font-weight: 700;
            color: var(--text-primary, #1a1a1a);
        }

        .surge-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 4px 8px;
            background: linear-gradient(135deg, #ff6b35 0%, #ff8c5a 100%);
            color: white;
            border-radius: 12px;
            font-size: 0.75rem;
            font-weight: 600;
            margin-left: 8px;
        }

        .surge-badge i {
            font-size: 0.7rem;
        }

        .price-range {
            margin-top: 8px;
            font-size: 0.85rem;
            color: var(--text-secondary, #666);
        }

        .range-label {
            margin-right: 4px;
        }

        .range-value {
            font-weight: 500;
        }

        .confidence {
            margin-top: 10px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .confidence-bar {
            flex: 1;
            height: 4px;
            background: var(--border-color, #e0e0e0);
            border-radius: 2px;
            overflow: hidden;
        }

        .confidence-fill {
            height: 100%;
            background: linear-gradient(90deg, #4caf50, #8bc34a);
            border-radius: 2px;
            transition: width 0.3s ease;
        }

        .confidence-label {
            font-size: 0.75rem;
            color: var(--text-muted, #999);
            white-space: nowrap;
        }

        .factors {
            margin-top: 12px;
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .factor {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 0.8rem;
            color: var(--text-secondary, #666);
            padding: 6px 8px;
            background: var(--bg-muted, #f5f5f5);
            border-radius: 6px;
        }

        .factor i {
            color: #ff6b35;
            font-size: 0.7rem;
        }
    `]
})
export class PriceDisplayComponent {
    @Input() estimate: PriceEstimate | null = null;
    @Input() showRange = true;
    @Input() showConfidence = true;
    @Input() showFactors = false;

    get hasSurge(): boolean {
        return (this.estimate?.surgeMultiplier || 1) > 1.0;
    }

    get surgeLabel(): string {
        const multiplier = this.estimate?.surgeMultiplier || 1;
        if (multiplier <= 1.0) return '';
        if (multiplier <= 1.2) return 'Slight surge';
        if (multiplier <= 1.5) return `${multiplier.toFixed(1)}x`;
        return `High demand ${multiplier.toFixed(1)}x`;
    }

    get confidenceLabel(): string {
        const confidence = this.estimate?.confidence || 0;
        if (confidence >= 80) return 'High confidence';
        if (confidence >= 50) return 'Medium confidence';
        return 'Low confidence';
    }

    formatAmount(amount: number): string {
        return amount.toLocaleString('en-NG');
    }
}
