import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface SmartStep {
    instruction: string;
    microInstructions?: string[];
    barriers?: string[];
    riskAlerts?: string[];
    isSafeZone?: boolean;
    isBoarding?: boolean;
}

@Component({
    selector: 'app-smart-instruction',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="smart-instruction-card" [class.boarding-step]="step.isBoarding" [class.safe-zone]="step.isSafeZone">
            <div class="main-instruction">
                <i [class]="step.isBoarding ? 'fas fa-door-open text-success' : 'fas fa-directions text-primary'"></i>
                <span class="ms-2">{{ step.instruction }}</span>
                <span *ngIf="step.isSafeZone" class="badge bg-success ms-2 small">🛡️ Safe Zone</span>
            </div>

            <!-- Risk Alerts -->
            <div *ngIf="step.riskAlerts && step.riskAlerts.length > 0" class="risk-alerts mt-2">
                <div *ngFor="let alert of step.riskAlerts" class="alert-item text-danger">
                    <i class="fas fa-shield-alt me-1"></i>
                    <strong>Risk:</strong> {{ alert }}
                </div>
            </div>

            <!-- Micro Instructions (e.g. "Wait near the green transformer") -->
            <ul *ngIf="step.microInstructions && step.microInstructions.length > 0" class="micro-list mt-2">
                <li *ngFor="let micro of step.microInstructions">
                    <i class="fas fa-dot-circle text-muted me-1"></i>
                    {{ micro }}
                </li>
            </ul>

            <!-- Barriers (e.g. "Open Gutter") -->
            <div *ngIf="step.barriers && step.barriers.length > 0" class="barriers-warning mt-2">
                <div *ngFor="let barrier of step.barriers" class="barrier-item">
                    <i class="fas fa-exclamation-triangle text-warning me-1"></i>
                    <span><strong>Watch out:</strong> {{ barrier }}</span>
                </div>
            </div>
        </div>
    `,
    styles: [`
        .smart-instruction-card {
            padding: 0.75rem;
            border-radius: 0.75rem;
            background: rgba(255, 255, 255, 0.05);
            margin-bottom: 0.5rem;
            border-left: 3px solid transparent;

            &.boarding-step {
                background: rgba(34, 197, 94, 0.05);
                border-left: 3px solid #22C55E;
            }

            &.safe-zone {
                border-right: 3px solid #10B981;
            }

            .main-instruction {
                font-weight: 600;
                font-size: 0.95rem;
            }

            .risk-alerts {
                font-size: 0.85rem;
                background: rgba(220, 38, 38, 0.1);
                padding: 0.5rem;
                border-radius: 0.5rem;
                border: 1px solid rgba(220, 38, 38, 0.2);
            }

            .alert-item {
                display: flex;
                align-items: center;
                font-weight: 600;
            }

            .micro-list {
                list-style: none;
                padding-left: 1.25rem;
                margin: 0;
                font-size: 0.85rem;
                color: rgba(255, 255, 255, 0.7);
            }

            .barriers-warning {
                font-size: 0.85rem;
                background: rgba(245, 158, 11, 0.1);
                color: #F59E0B;
                padding: 0.5rem;
                border-radius: 0.5rem;
            }

            .barrier-item {
                display: flex;
                align-items: center;
            }
        }
    `]
})
export class SmartInstructionComponent {
    @Input() step!: SmartStep;
}
