import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppState } from './core/states/app-state.state';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('mi-app-fantasy');

  private readonly appState = inject(AppState);

  constructor() {
    this.appState.loadInitialData();
  }
}
