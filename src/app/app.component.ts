import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ActiveTripModalComponent } from './shared/components/active-trip-modal/active-trip-modal.component';

@Component({
  standalone: true,
  selector: 'app-root',
  imports: [RouterOutlet, ActiveTripModalComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'Along_9ja';
}
