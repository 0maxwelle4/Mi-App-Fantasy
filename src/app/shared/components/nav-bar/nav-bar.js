import { __decorate } from 'tslib';
import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AppState } from '../../../core/states/app-state.state';
let NavBar = class NavBar {
  appState = inject(AppState);
  preSelectedLeagueId = computed(() => this.appState.league.preSelectedLeague()?.id);
  preSelectedManagerId = computed(() => this.appState.league.preSelectedLeague()?.teamId);
};
NavBar = __decorate(
  [
    Component({
      selector: 'app-nav-bar',
      standalone: true,
      imports: [RouterLink, RouterLinkActive],
      templateUrl: './nav-bar.html',
      styleUrl: './nav-bar.scss',
    }),
  ],
  NavBar,
);
export { NavBar };
