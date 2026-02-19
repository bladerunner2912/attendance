import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { LoaderService } from '../../services/loader';

@Component({
  selector: 'app-global-loader',
  imports: [CommonModule],
  templateUrl: './global-loader.html',
  styleUrl: './global-loader.css',
})
export class GlobalLoader {
  private readonly loader = inject(LoaderService);
  readonly isVisible = computed(() => this.loader.isLoading());
}
