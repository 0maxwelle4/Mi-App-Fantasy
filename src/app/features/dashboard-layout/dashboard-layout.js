import { __decorate } from 'tslib';
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavBar } from '../../shared/components/nav-bar/nav-bar';
let DashboardLayout = class DashboardLayout {};
DashboardLayout = __decorate(
  [
    Component({
      selector: 'app-dashboard-layout',
      standalone: true,
      imports: [RouterOutlet, NavBar],
      templateUrl: 'dashboard-layout.html',
      styleUrl: 'dashboard-layout.scss',
    }),
  ],
  DashboardLayout,
);
export { DashboardLayout };
