import { Injectable, signal } from '@angular/core';

export type SnackbarKind = 'error' | 'info' | 'success';

export interface SnackbarMessage {
  id: number;
  text: string;
  kind: SnackbarKind;
}

@Injectable({
  providedIn: 'root',
})
export class SnackbarService {
  private counter = 0;
  private readonly _message = signal<SnackbarMessage | null>(null);

  readonly message = this._message.asReadonly();

  show(text: string, kind: SnackbarKind = 'error', durationMs = 4000) {
    const id = ++this.counter;
    this._message.set({ id, text, kind });

    if (durationMs > 0) {
      setTimeout(() => {
        if (this._message()?.id === id) {
          this._message.set(null);
        }
      }, durationMs);
    }
  }

  clear() {
    this._message.set(null);
  }
}
