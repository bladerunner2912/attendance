import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SnackbarService } from '../../services/snackbar';

@Component({
  selector: 'app-snackbar',
  imports: [CommonModule],
  templateUrl: './snackbar.html',
  styleUrl: './snackbar.css',
})
export class Snackbar {
  private readonly snackbar = inject(SnackbarService);

  readonly message = this.snackbar.message;
  readonly isVisible = computed(() => !!this.message());

  dismiss() {
    this.snackbar.clear();
  }
}
