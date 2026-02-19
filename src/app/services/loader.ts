import { Injectable, computed, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LoaderService {
  private readonly activeRequests = signal(0);
  readonly isLoading = computed(() => this.activeRequests() > 0);

  show() {
    this.activeRequests.update((value) => value + 1);
  }

  hide() {
    this.activeRequests.update((value) => Math.max(0, value - 1));
  }
}
