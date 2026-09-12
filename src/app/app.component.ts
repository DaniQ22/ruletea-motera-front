import { CommonModule } from '@angular/common';
import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LoadingService } from './core/services/loading.service';

/** Render free tier duerme el backend; despertarlo puede tardar hasta ~1 min. */
const WAKE_MESSAGE_DELAY_MS = 2500;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  private readonly loadingService = inject(LoadingService);
  private readonly destroyRef = inject(DestroyRef);

  readonly isLoading = this.loadingService.isLoading;
  readonly showWakeMessage = signal(false);
  private wakeTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      if (this.isLoading()) {
        this.wakeTimer = setTimeout(() => this.showWakeMessage.set(true), WAKE_MESSAGE_DELAY_MS);
      } else {
        this.clearWakeTimer();
        this.showWakeMessage.set(false);
      }
    });

    this.destroyRef.onDestroy(() => this.clearWakeTimer());
  }

  private clearWakeTimer(): void {
    if (this.wakeTimer) {
      clearTimeout(this.wakeTimer);
      this.wakeTimer = null;
    }
  }
}
