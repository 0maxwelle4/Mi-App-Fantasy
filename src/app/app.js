import { __decorate } from 'tslib';
import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppState } from './core/states/app-state.state';
let App = class App {
  title = signal('mi-app-fantasy');
  appState = inject(AppState);
  constructor() {
    this.appState.loadInitialData();
  }
};
App = __decorate(
  [
    Component({
      selector: 'app-root',
      imports: [RouterOutlet],
      templateUrl: './app.html',
      styleUrl: './app.scss',
    }),
  ],
  App,
);
export { App };
