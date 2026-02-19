import { Component, inject, signal } from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router, RouterOutlet } from '@angular/router';
import { Snackbar } from './components/snackbar/snackbar';
import { GlobalLoader } from './components/global-loader/global-loader';
import { LoaderService } from './services/loader';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Snackbar, GlobalLoader],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private readonly router = inject(Router);
  private readonly loader = inject(LoaderService);

  protected readonly title = signal('attendance');

  constructor() {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.loader.show();
      }
      if (event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError) {
        this.loader.hide();
      }
    });
  }
}
