import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private pending = 0;
  readonly isLoading = signal(false);

  show(): void {
    this.pending++;
    this.isLoading.set(true);
  }

  hide(): void {
    this.pending = Math.max(0, this.pending - 1);
    if (this.pending === 0) {
      this.isLoading.set(false);
    }
  }
}
