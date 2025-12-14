// src/app/shared/components/loader/loader.component.ts
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loader',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loader.component.html',
  styleUrls: ['./loader.component.scss']
})
export class LoaderComponent {
  @Input() message?: string;
  @Input() fullscreen = false;
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
}