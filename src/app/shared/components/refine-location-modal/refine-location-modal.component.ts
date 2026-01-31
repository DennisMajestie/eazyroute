import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface RefineLocationResult {
    originalName: string;
    refinedName: string;
    confirmed: boolean;
}

@Component({
    selector: 'app-refine-location-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './refine-location-modal.component.html',
    styleUrls: ['./refine-location-modal.component.scss']
})
export class RefineLocationModalComponent {
    @Input() isOpen = false;
    @Input() currentName = '';
    @Output() closed = new EventEmitter<RefineLocationResult>();

    refinedName = '';

    ngOnChanges() {
        // Initialize refined name when modal opens
        if (this.isOpen) {
            this.refinedName = this.currentName;
        }
    }

    onConfirm() {
        this.closed.emit({
            originalName: this.currentName,
            refinedName: this.refinedName.trim(),
            confirmed: true
        });
    }

    onCancel() {
        this.closed.emit({
            originalName: this.currentName,
            refinedName: this.currentName,
            confirmed: false
        });
    }

    onBackdropClick(event: MouseEvent) {
        // Close if clicking on backdrop (not the modal content)
        if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
            this.onCancel();
        }
    }
}
