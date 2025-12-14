import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';

@Component({
  selector: 'app-chip-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ChipInputComponent),
      multi: true
    }
  ],
  template: `
    <div class="chip-input-container">
      <div class="chips-wrapper">
        <div class="chip" *ngFor="let chip of chips; let i = index">
          <span class="chip-text">{{ chip }}</span>
          <button 
            type="button"
            class="chip-remove" 
            (click)="removeChip(i)"
            [disabled]="disabled">
            ×
          </button>
        </div>
        <input
          #inputElement
          type="text"
          class="chip-input"
          [placeholder]="chips.length === 0 ? placeholder : ''"
          [(ngModel)]="inputValue"
          (keydown.enter)="addChip($event)"
          (keydown.comma)="addChip($event)"
          (blur)="onTouched()"
          [disabled]="disabled || (maxChips > 0 && chips.length >= maxChips)"
        />
      </div>
      <div class="chip-info" *ngIf="maxChips > 0">
        <span class="chip-count">{{ chips.length }} / {{ maxChips }}</span>
      </div>
      <div class="chip-error" *ngIf="errorMessage">
        {{ errorMessage }}
      </div>
    </div>
  `,
  styles: [`
    .chip-input-container {
      width: 100%;
    }

    .chips-wrapper {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 8px;
      min-height: 44px;
      background-color: white;
      cursor: text;
    }

    .chips-wrapper:focus-within {
      border-color: #4CAF50;
      outline: 2px solid #4CAF5020;
    }

    .chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      background-color: #E8F5E9;
      color: #2E7D32;
      border-radius: 16px;
      font-size: 0.875rem;
      font-weight: 500;
      max-width: 200px;
    }

    .chip-text {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .chip-remove {
      background: none;
      border: none;
      color: #2E7D32;
      font-size: 1.25rem;
      line-height: 1;
      cursor: pointer;
      padding: 0;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: background-color 0.2s;
    }

    .chip-remove:hover:not(:disabled) {
      background-color: #C8E6C9;
    }

    .chip-remove:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .chip-input {
      flex: 1;
      min-width: 120px;
      border: none;
      outline: none;
      font-size: 0.875rem;
      padding: 4px;
    }

    .chip-input:disabled {
      background-color: #f5f5f5;
      cursor: not-allowed;
    }

    .chip-info {
      margin-top: 4px;
      font-size: 0.75rem;
      color: #666;
      text-align: right;
    }

    .chip-count {
      font-weight: 500;
    }

    .chip-error {
      margin-top: 4px;
      font-size: 0.75rem;
      color: #d32f2f;
    }
  `]
})
export class ChipInputComponent implements ControlValueAccessor {
  @Input() placeholder: string = 'Type and press Enter...';
  @Input() maxChips: number = 0; // 0 = unlimited
  @Input() minLength: number = 1;
  @Input() maxLength: number = 50;
  @Input() disabled: boolean = false;
  @Output() chipsChange = new EventEmitter<string[]>();

  chips: string[] = [];
  inputValue: string = '';
  errorMessage: string = '';

  private onChange: (value: string[]) => void = () => { };
  onTouched: () => void = () => { };

  addChip(event: Event) {
    event.preventDefault();

    const value = this.inputValue.trim();

    // Clear error
    this.errorMessage = '';

    if (!value) {
      return;
    }

    // Validate length
    if (value.length < this.minLength) {
      this.errorMessage = `Minimum ${this.minLength} characters required`;
      return;
    }

    if (value.length > this.maxLength) {
      this.errorMessage = `Maximum ${this.maxLength} characters allowed`;
      return;
    }

    // Check max chips
    if (this.maxChips > 0 && this.chips.length >= this.maxChips) {
      this.errorMessage = `Maximum ${this.maxChips} items allowed`;
      return;
    }

    // Check for duplicates
    if (this.chips.includes(value)) {
      this.errorMessage = 'This item already exists';
      return;
    }

    // Add chip
    this.chips.push(value);
    this.inputValue = '';
    this.onChange(this.chips);
    this.chipsChange.emit(this.chips);
  }

  removeChip(index: number) {
    this.chips.splice(index, 1);
    this.onChange(this.chips);
    this.chipsChange.emit(this.chips);
    this.errorMessage = '';
  }

  // ControlValueAccessor implementation
  writeValue(value: string[]): void {
    this.chips = value || [];
  }

  registerOnChange(fn: (value: string[]) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
