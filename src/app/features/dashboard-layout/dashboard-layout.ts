import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavBar } from '../../shared/components/nav-bar/nav-bar';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [RouterOutlet, NavBar],
  templateUrl: 'dashboard-layout.html',
  styleUrl: 'dashboard-layout.scss',
})
export class DashboardLayout {}
