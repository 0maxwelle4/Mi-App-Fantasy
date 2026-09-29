import { Component, computed, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ApiActivitiesService } from './services/api-activities.service';
import { AppState } from '../../core/states/app-state.state';

import { ActivitiesInterface } from '../../shared/interfaces/league/activities.interface';
import { PlayerInterface } from '../../shared/interfaces/players/player.interface';
import { ManagerInterface } from '../../shared/interfaces/users/manager.interface';
import { TeamsInterface } from '../../shared/interfaces/teams/teams.interface';
import { PlayerStatsModal } from '../../shared/modals/player-stats-modal/player-stats-modal';
import { SquadInterface } from '../../shared/interfaces/squad/squad.interface';

@Component({
  selector: 'app-activities',
  standalone: true,
  imports: [RouterLink, PlayerStatsModal],
  templateUrl: './activities.html',
  styleUrl: './activities.scss',
})
export class Activities implements OnInit, OnDestroy {
  private readonly apiActivities = inject(ApiActivitiesService);
  private readonly appState = inject(AppState);

  // ============================================================
  // CONFIG
  // ============================================================

  private readonly PAGE_SIZE = 10;
  private readonly INITIAL_VISIBLE = 10;
  private readonly LOAD_MORE_VISIBLE = 10;

  // ============================================================
  // STATE
  // ============================================================

  readonly activities = signal<ActivitiesInterface[]>([]);
  readonly loading = signal(true);
  readonly activitiesLoading = signal(false);
  readonly loadingMore = signal(false);
  readonly hasMore = signal(true);
  readonly visibleCount = signal(this.INITIAL_VISIBLE);

  private currentPage = 0;
  private loadingHistory = false;

  // ============================================================
  // FILTERS
  // ============================================================

  readonly search = signal('');
  readonly userFilter = signal('all');
  readonly typeFilter = signal('all');
  readonly timeFilter = signal('all');
  readonly sort = signal('recent');

  // ============================================================
  // APP STATE
  // ============================================================

  readonly managers = computed(() => {
    return this.appState.managers.managers();
  });

  readonly players = computed(() => {
    return this.appState.players.players();
  });

  readonly teams = computed(() => {
    return this.appState.teams.teams();
  });

  // ============================================================
  // PLAYERS STATS
  // ============================================================

  showPlayerStats = false;
  selectedPlayerId: string | null = null;

  closePlayerStats(): void {
    this.showPlayerStats = false;
    this.selectedPlayerId = null;
  }

  openPlayerStats(playerId: string): void {
    this.selectedPlayerId = playerId;
    this.showPlayerStats = true;
  }

  // ============================================================
  // SCROLL TO TOP
  // ============================================================

  /**
   * Controla si el boton flotante de "volver arriba" es visible.
   */
  readonly showScrollTop = signal(false);

  /**
   * Umbral de scroll (en px) a partir del cual se muestra el boton.
   */
  private readonly SCROLL_THRESHOLD = 400;

  /**
   * Referencia al elemento que realmente hace scroll
   * (puede ser la ventana o un contenedor interno,
   * segun el layout de PC o movil).
   */
  private scrolledTarget: Window | HTMLElement = window;

  /**
   * Usamos capture:true para detectar el scroll de CUALQUIER
   * elemento de la pagina, aunque el scroll no ocurra en window
   * sino dentro de un contenedor interno con overflow (comun
   * en layouts de escritorio con sidebar fija).
   */
  private readonly scrollListener = (event: Event): void => {
    const target = event.target;

    if (target === document) {
      this.scrolledTarget = window;

      const scrollTop = window.scrollY || document.documentElement.scrollTop;

      this.showScrollTop.set(scrollTop > this.SCROLL_THRESHOLD);
    } else {
      const el = target as HTMLElement;

      this.scrolledTarget = el;

      this.showScrollTop.set(el.scrollTop > this.SCROLL_THRESHOLD);
    }
  };

  ngOnInit(): void {
    document.addEventListener('scroll', this.scrollListener, true);
  }

  ngOnDestroy(): void {
    document.removeEventListener('scroll', this.scrollListener, true);
  }

  scrollToTop(): void {
    this.scrolledTarget.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ============================================================
  // FILTERED ACTIVITIES
  // ============================================================

  readonly filteredActivities = computed(() => {
    const activities = this.activities();
    const search = this.normalize(this.search());
    const userFilter = this.userFilter();
    const typeFilter = this.typeFilter();
    const timeFilter = this.timeFilter();

    let result = activities.filter((activity) => {
      if (
        userFilter !== 'all' &&
        String(activity.user1Id) !== userFilter &&
        String(activity.user2Id) !== userFilter
      ) {
        return false;
      }

      if (
        typeFilter !== 'all' &&
        this.getActivityCategory(activity.activityTypeId) !== typeFilter
      ) {
        return false;
      }

      if (timeFilter !== 'all' && !this.matchesTimeFilter(activity.createdAt, timeFilter)) {
        return false;
      }

      if (search) {
        const player = this.getPlayer(activity.playerMasterId);
        const manager1 = this.getManager(activity.user1Id);
        const manager2 =
          activity.user2Id !== undefined ? this.getManager(activity.user2Id) : undefined;
        const team = player ? this.getTeam(player.teamId) : undefined;

        const searchText = this.normalize(
          [
            player?.nickname,
            player?.name,
            player?.slug,
            manager1?.managerName,
            manager2?.managerName,
            team?.name,
          ]
            .filter(Boolean)
            .join(' '),
        );

        if (!searchText.includes(search)) {
          return false;
        }
      }

      return true;
    });

    const sort = this.sort();

    result = [...result].sort((a, b) => {
      if (sort === 'old') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sort === 'high') {
        return (b.amount ?? 0) - (a.amount ?? 0);
      }
      if (sort === 'low') {
        return (a.amount ?? 0) - (b.amount ?? 0);
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return result;
  });

  // ============================================================
  // VISIBLE ACTIVITIES
  // ============================================================

  readonly visibleActivities = computed(() => {
    return this.filteredActivities().slice(0, this.visibleCount());
  });

  readonly hasMoreVisible = computed(() => {
    return this.visibleActivities().length < this.filteredActivities().length;
  });

  // ============================================================
  // CONSTRUCTOR
  // ============================================================

  constructor() {
    this.loadAllHistory();
  }

  // ============================================================
  // LOAD ALL HISTORY
  // ============================================================

  private loadAllHistory(onComplete?: () => void): void {
    if (this.loadingHistory || !this.hasMore()) {
      onComplete?.();
      return;
    }

    this.loadingHistory = true;

    this.apiActivities.getLeagueActivities(this.currentPage).subscribe({
      next: (response) => {
        const activities = response ?? [];

        if (activities.length === 0) {
          this.hasMore.set(false);
          this.loadingHistory = false;
          this.loading.set(false);
          onComplete?.();
          return;
        }

        this.activities.update((current) => {
          return [...current, ...activities];
        });

        this.currentPage++;

        if (activities.length < this.PAGE_SIZE) {
          this.hasMore.set(false);
          this.loadingHistory = false;
          this.loading.set(false);
          onComplete?.();
          return;
        }

        this.loadingHistory = false;
        this.loadAllHistory(onComplete);
      },

      error: (error) => {
        console.error('Error loading activities history', error);
        this.loadingHistory = false;
        this.loading.set(false);
        this.hasMore.set(false);
        onComplete?.();
      },
    });
  }

  // ============================================================
  // REFRESH
  // ============================================================

  refresh(): void {
    if (this.loadingHistory || this.activitiesLoading()) {
      return;
    }

    this.activitiesLoading.set(true);

    this.currentPage = 0;
    this.hasMore.set(true);
    this.activities.set([]);
    this.resetVisibleCount();

    this.loadAllHistory(() => {
      this.activitiesLoading.set(false);
    });
  }

  // ============================================================
  // LOAD MORE VISIBLE
  // ============================================================

  loadMore(): void {
    if (this.loadingMore() || !this.hasMoreVisible()) {
      return;
    }

    this.loadingMore.set(true);

    this.visibleCount.update((current) => {
      return current + this.LOAD_MORE_VISIBLE;
    });

    this.loadingMore.set(false);
  }

  // ============================================================
  // FILTER METHODS
  // ============================================================

  setSearch(value: string): void {
    this.search.set(value);
    this.resetVisibleCount();
  }

  setUserFilter(value: string): void {
    this.userFilter.set(value);
    this.resetVisibleCount();
  }

  setTypeFilter(value: string): void {
    this.typeFilter.set(value);
    this.resetVisibleCount();
  }

  setTimeFilter(value: string): void {
    this.timeFilter.set(value);
    this.resetVisibleCount();
  }

  setSort(value: string): void {
    this.sort.set(value);
    this.resetVisibleCount();
  }

  private resetVisibleCount(): void {
    this.visibleCount.set(this.INITIAL_VISIBLE);
  }

  clearFilters(): void {
    this.search.set('');
    this.userFilter.set('all');
    this.typeFilter.set('all');
    this.timeFilter.set('all');
    this.sort.set('recent');
    this.resetVisibleCount();
  }

  hasActiveFilters(): boolean {
    return (
      this.search() !== '' ||
      this.userFilter() !== 'all' ||
      this.typeFilter() !== 'all' ||
      this.timeFilter() !== 'all' ||
      this.sort() !== 'recent'
    );
  }

  getActivityCount(category: string): number {
    if (category === 'all') {
      return this.activities().length;
    }

    return this.activities().filter((activity) => {
      return this.getActivityCategory(activity.activityTypeId) === category;
    }).length;
  }

  getActivityCategory(activityTypeId: number): string {
    switch (activityTypeId) {
      case 31:
        return 'market';
      case 1:
        return 'transfer';
      case 33:
        return 'sale';
      case 12:
        return 'ideal';
      case 6:
        return 'bonus';
      case 9:
        return 'manager';
      case 4:
        return 'shield';
      default:
        return 'other';
    }
  }

  getActivityLabel(activityTypeId: number): string {
    switch (activityTypeId) {
      case 31:
        return 'FICHAJE DE MERCADO';
      case 1:
        return 'TRASPASO / CLAUSULAZO';
      case 33:
        return 'VENTA A LA LIGA';
      case 12:
        return 'ONCE IDEAL';
      case 6:
        return 'PREMIO DE JORNADA';
      case 9:
        return 'NUEVO MANAGER';
      case 4:
        return 'JUGADOR BLINDADO';
      default:
        return 'ACTIVIDAD';
    }
  }

  getActivityClass(activityTypeId: number): string {
    switch (activityTypeId) {
      case 31:
        return 'red';
      case 1:
        return 'blue';
      case 33:
        return 'yellow';
      case 12:
        return 'purple';
      case 6:
        return 'green';
      case 9:
        return 'cyan';
      case 4:
        return 'cyan';
      default:
        return '';
    }
  }

  getPlayer(playerMasterId: number | undefined): PlayerInterface | undefined {
    if (playerMasterId === undefined) {
      return undefined;
    }
    return this.players().find((player) => String(player.id) === String(playerMasterId));
  }

  getManager(managerId: number | undefined): ManagerInterface | undefined {
    if (managerId === undefined) {
      return undefined;
    }
    return this.managers().find((manager) => String(manager.id) === String(managerId));
  }

  getTeam(teamId: string | number | undefined): TeamsInterface | undefined {
    if (teamId === undefined) {
      return undefined;
    }
    return this.teams().find((team) => String(team.id) === String(teamId));
  }

  formatMoney(amount: number | undefined): string {
    if (amount === undefined) {
      return '';
    }
    return new Intl.NumberFormat('es-ES').format(Math.abs(amount)) + '€';
  }

  isPositiveActivity(activity: ActivitiesInterface): boolean {
    return (
      activity.activityTypeId === 6 ||
      activity.activityTypeId === 12 ||
      activity.activityTypeId === 33
    );
  }

  isNegativeActivity(activity: ActivitiesInterface): boolean {
    return activity.activityTypeId === 31 || activity.activityTypeId === 1;
  }

  formatDate(date: string): string {
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  }

  private matchesTimeFilter(dateString: string, filter: string): boolean {
    const date = new Date(dateString).getTime();
    const now = Date.now();
    const difference = now - date;
    const hour = 60 * 60 * 1000;
    const day = 24 * hour;

    if (difference < 0) {
      return false;
    }

    switch (filter) {
      case 'today': {
        const today = new Date();
        const activityDate = new Date(dateString);

        return (
          today.getFullYear() === activityDate.getFullYear() &&
          today.getMonth() === activityDate.getMonth() &&
          today.getDate() === activityDate.getDate()
        );
      }

      case '24h':
        return difference <= day;

      case '7d':
        return difference <= 7 * day;

      case '30d':
        return difference <= 30 * day;

      default:
        return true;
    }
  }

  private normalize(value: string | undefined): string {
    if (!value) {
      return '';
    }

    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  protected readonly String = String;
}
