import { Component, computed, inject, signal, OnDestroy } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

import {
  ApiBuyoutClausesService,
  BuyoutPlayerInterface,
} from './services/api-buyout-clauses.service';

import { PlayerCard } from '../../shared/components/player-card/player-card';
import { ConfirmationModal } from '../../shared/modals/confirmation-modal/confirmation-modal';

import { AppState } from '../../core/states/app-state.state';
import { ToastrService } from 'ngx-toastr';
import { SquadPlayerInterface } from '../../shared/interfaces/squad/squad-player.interface';
import { ApiMoneyStatusService } from '../../shared/services/api-money-status.service';

type SortOption =
  | 'CLAUSE_DESC'
  | 'CLAUSE_ASC'
  | 'POINTS_DESC'
  | 'POINTS_ASC'
  | 'NAME_ASC'
  | 'NAME_DESC'
  | 'MANAGER_ASC'
  | 'MANAGER_DESC'
  | 'TREND_DESC'
  | 'TREND_ASC'
  | 'TIME_DESC'
  | 'TIME_ASC'
  | 'PROFIT_DESC'
  | 'PROFIT_ASC';

@Component({
  selector: 'app-buyout-clauses',
  imports: [NgTemplateOutlet, PlayerCard, ConfirmationModal],
  templateUrl: './buyout-clauses.html',
  styleUrl: './buyout-clauses.scss',
  providers: [ApiBuyoutClausesService],
})
export class BuyoutClauses implements OnDestroy {
  private readonly apiBuyoutClauses = inject(ApiBuyoutClausesService);

  private readonly appState = inject(AppState);

  private readonly toastr = inject(ToastrService);
  private readonly apiMoneyService = inject(ApiMoneyStatusService);
  readonly teamId = computed(() => this.appState.league.preSelectedLeague()?.teamId ?? 0);

  // ============================================================
  // GENERAL
  // ============================================================

  readonly loading = signal(true);

  /**
   * Loading visual del boton "Refrescar".
   *
   * Se activa al pulsar el boton y se apaga cuando termina
   * de recargar tanto los jugadores como el dinero del equipo.
   */
  readonly clausesLoading = signal(false);

  readonly skeletons = Array.from({ length: 10 }, (_, index) => index);

  readonly sorting = signal(false);

  private sortingTimeoutId: ReturnType<typeof setTimeout> | null = null;

  readonly players = signal<BuyoutPlayerInterface[]>([]);

  readonly now = signal(Date.now());

  private nowIntervalId: ReturnType<typeof setInterval> | null = null;

  /**
   * Evita lanzar varias recargas de jugadores simultaneamente.
   */
  private loadingPlayers = false;

  // ============================================================
  // FILTROS
  // ============================================================

  readonly searchName = signal('');

  readonly selectedManager = signal('todos');

  readonly selectedPosition = signal('todas');

  readonly availability = signal<'disponibles' | 'todas'>('disponibles');

  readonly sortBy = signal<SortOption>('CLAUSE_DESC');

  readonly sortOrder = signal<'asc' | 'desc'>('desc');

  // ============================================================
  // CONFIRMACIÓN CLAUSULAZO
  // ============================================================

  readonly buyoutConfirmationOpen = signal(false);

  readonly buyoutConfirmationTitle = signal('');

  readonly buyoutConfirmationDescription = signal('');

  readonly buyoutConfirmationPlayer = signal({
    name: '',
    positionId: undefined as string | number | undefined,
    image: undefined as string | undefined,
    teamName: undefined as string | undefined,
  });

  private pendingBuyout: BuyoutPlayerInterface | null = null;

  // ============================================================
  // MANAGERS
  // ============================================================

  readonly managers = computed(() => {
    const players = this.players();

    const managers = players.map((player) => ({
      id: player.managerId,
      name: player.managerName,
      avatar: player.managerAvatar,
    }));

    return managers.filter(
      (manager, index, array) => array.findIndex((m) => m.id === manager.id) === index,
    );
  });

  // ============================================================
  // CONTADORES DE POSICIONES
  // ============================================================

  readonly positionCounts = computed(() => {
    const players = this.players();

    return {
      porteros: players.filter((player) => player.playerMaster.positionId === 1).length,

      defensas: players.filter((player) => player.playerMaster.positionId === 2).length,

      medios: players.filter((player) => player.playerMaster.positionId === 3).length,

      delanteros: players.filter((player) => player.playerMaster.positionId === 4).length,
    };
  });

  // ============================================================
  // DISPONIBILIDAD DE LA CLÁUSULA
  // ============================================================

  private isClauseAvailable(player: SquadPlayerInterface): boolean {
    if (player.isShielded) {
      return false;
    }

    if (!player.buyoutClauseLockedEndTime) {
      return true;
    }

    return new Date(player.buyoutClauseLockedEndTime).getTime() <= this.now();
  }

  // ============================================================
  // TENDENCIA DE MERCADO
  // ============================================================

  private getMarketDifference(player: BuyoutPlayerInterface): number {
    const tendencies = this.appState.market.getMarketTendenciesByPlayerId(player.playerMaster.id);

    return Number(tendencies?.difference24h ?? 0);
  }

  // ============================================================
  // TIEMPO RESTANTE
  // ============================================================

  private getRemainingLockTime(player: BuyoutPlayerInterface): number {
    if (!player.buyoutClauseLockedEndTime) {
      return 0;
    }

    const distance = new Date(player.buyoutClauseLockedEndTime).getTime() - this.now();

    return distance > 0 ? distance : 0;
  }

  // ============================================================
  // RENTABILIDAD
  // ============================================================

  private getProfitability(player: BuyoutPlayerInterface): number {
    const marketValue = Number(player.playerMaster.marketValue ?? 0);

    const difference24h = this.getMarketDifference(player);

    const clause = Number(player.buyoutClause ?? 0);

    return marketValue + difference24h - clause;
  }

  // ============================================================
  // CONTADORES
  // ============================================================

  readonly availablePlayersCount = computed(
    () => this.players().filter((player) => this.isClauseAvailable(player)).length,
  );

  readonly blockedPlayersCount = computed(
    () => this.players().filter((player) => !this.isClauseAvailable(player)).length,
  );

  // ============================================================
  // MANAGER SELECCIONADO
  // ============================================================

  readonly selectedManagerName = computed(() => {
    const managerId = this.selectedManager();

    if (managerId === 'todos') {
      return '';
    }

    return this.managers().find((manager) => manager.id === managerId)?.name ?? '';
  });

  // ============================================================
  // FILTRADO + ORDENACIÓN
  // ============================================================

  readonly filteredPlayers = computed(() => {
    const players = this.players();

    const search = this.searchName().toLowerCase().trim();

    const manager = this.selectedManager();

    const position = this.selectedPosition();

    const availability = this.availability();

    const sort = this.sortBy();

    const order = this.sortOrder();

    const result = players.filter((player) => {
      const playerName = player.playerMaster.name?.toLowerCase() ?? '';

      const teamName = player.playerMaster.team?.name?.toLowerCase() ?? '';

      const managerName = player.managerName?.toLowerCase() ?? '';

      const matchesSearch =
        !search ||
        playerName.includes(search) ||
        teamName.includes(search) ||
        managerName.includes(search);

      const matchesManager = manager === 'todos' || player.managerId === manager;

      const positionId = player.playerMaster.positionId;

      const matchesPosition =
        position === 'todas' ||
        (position === 'Portero' && positionId === 1) ||
        (position === 'Defensa' && positionId === 2) ||
        (position === 'Medio' && positionId === 3) ||
        (position === 'Delantero' && positionId === 4);

      const matchesAvailability = availability === 'todas' || this.isClauseAvailable(player);

      return matchesSearch && matchesManager && matchesPosition && matchesAvailability;
    });

    return [...result].sort((a, b) => {
      let comparison = 0;

      switch (sort) {
        case 'CLAUSE_DESC':
          comparison = Number(b.buyoutClause ?? 0) - Number(a.buyoutClause ?? 0);
          break;

        case 'CLAUSE_ASC':
          comparison = Number(a.buyoutClause ?? 0) - Number(b.buyoutClause ?? 0);
          break;

        case 'POINTS_DESC':
          comparison = Number(b.playerMaster.points ?? 0) - Number(a.playerMaster.points ?? 0);
          break;

        case 'POINTS_ASC':
          comparison = Number(a.playerMaster.points ?? 0) - Number(b.playerMaster.points ?? 0);
          break;

        case 'NAME_ASC':
          comparison = (a.playerMaster.name ?? '').localeCompare(b.playerMaster.name ?? '');
          break;

        case 'NAME_DESC':
          comparison = (b.playerMaster.name ?? '').localeCompare(a.playerMaster.name ?? '');
          break;

        case 'MANAGER_ASC':
          comparison = (a.managerName ?? '').localeCompare(b.managerName ?? '');
          break;

        case 'MANAGER_DESC':
          comparison = (b.managerName ?? '').localeCompare(a.managerName ?? '');
          break;

        case 'TREND_DESC':
          comparison = this.getMarketDifference(b) - this.getMarketDifference(a);
          break;

        case 'TREND_ASC':
          comparison = this.getMarketDifference(a) - this.getMarketDifference(b);
          break;

        case 'TIME_DESC':
          comparison = this.getRemainingLockTime(b) - this.getRemainingLockTime(a);
          break;

        case 'TIME_ASC':
          comparison = this.getRemainingLockTime(a) - this.getRemainingLockTime(b);
          break;

        case 'PROFIT_DESC':
          comparison = this.getProfitability(b) - this.getProfitability(a);
          break;

        case 'PROFIT_ASC':
          comparison = this.getProfitability(a) - this.getProfitability(b);
          break;
      }

      return order === 'desc' ? -comparison : comparison;
    });
  });

  // ============================================================
  // CONSTRUCTOR
  // ============================================================

  constructor() {
    this.loadPlayers();
    this.updateTeamMoney();

    this.nowIntervalId = setInterval(() => {
      this.now.set(Date.now());
    }, 1000);
  }

  // ============================================================
  // DESTROY
  // ============================================================

  ngOnDestroy(): void {
    if (this.nowIntervalId) {
      clearInterval(this.nowIntervalId);
    }

    if (this.sortingTimeoutId) {
      clearTimeout(this.sortingTimeoutId);
    }
  }

  // ============================================================
  // CARGAR JUGADORES
  // ============================================================

  /**
   * @param onComplete Callback opcional que se ejecuta cuando
   * termina la peticion (con exito o con error). Se usa para
   * apagar el spinner del boton "Refrescar".
   */
  private loadPlayers(onComplete?: () => void): void {
    if (this.loadingPlayers) {
      onComplete?.();
      return;
    }

    this.loadingPlayers = true;
    this.loading.set(true);

    this.apiBuyoutClauses.getAllManagersPlayers().subscribe({
      next: (players) => {
        console.log('Jugadores de todos los managers:', players);

        this.players.set(players);

        this.loading.set(false);
        this.loadingPlayers = false;

        onComplete?.();
      },

      error: (error) => {
        console.error('Error obteniendo jugadores de los managers:', error);

        this.players.set([]);

        this.loading.set(false);
        this.loadingPlayers = false;

        onComplete?.();
      },
    });
  }

  // ============================================================
  // REFRESH
  // ============================================================

  /**
   * Refresca la lista de jugadores y el dinero del equipo.
   *
   * No muestra el skeleton inicial (loading() no se toca aqui
   * de forma visible mas alla de lo que ya hace loadPlayers):
   * solo gira el icono del boton mientras dura la peticion.
   */
  refresh(): void {
    if (this.clausesLoading()) {
      return;
    }

    this.clausesLoading.set(true);

    this.updateTeamMoney();

    this.loadPlayers(() => {
      this.clausesLoading.set(false);
    });
  }

  // ============================================================
  // PAGAR CLÁUSULA
  // ============================================================

  onPlayerBuyout(player: SquadPlayerInterface): void {
    if (!this.isClauseAvailable(player)) {
      this.toastr.warning('La cláusula de este jugador no está disponible.');

      return;
    }

    const clauseToPay = Number(player.buyoutClause ?? 0);

    if (clauseToPay <= 0) {
      this.toastr.error('La cláusula del jugador no es válida.');

      return;
    }

    const formattedClause = new Intl.NumberFormat('es-ES').format(clauseToPay);

    this.pendingBuyout = player as BuyoutPlayerInterface;

    this.buyoutConfirmationTitle.set(`¿Pagar cláusula de ${player.playerMaster.name}?`);

    this.buyoutConfirmationDescription.set(
      `Vas a pagar ${formattedClause}€. ` +
        `El importe se descontará de tu presupuesto y ` +
        `el jugador pasará a formar parte de tu plantilla.`,
    );

    this.buyoutConfirmationPlayer.set({
      name: player.playerMaster.name,
      positionId: player.playerMaster.positionId,
      image: player.playerMaster.images?.transparent?.['256x256'],
      teamName: player.playerMaster.team?.name,
    });

    this.buyoutConfirmationOpen.set(true);
  }

  // ============================================================
  // CONFIRMAR CLÁUSULA
  // ============================================================

  onBuyoutConfirmed(): void {
    const player = this.pendingBuyout;

    if (!player) {
      this.closeBuyoutConfirmation();
      return;
    }

    const clauseToPay = Number(player.buyoutClause ?? 0);

    const playerId = player.playerTeamId;

    if (!playerId) {
      this.toastr.error('No se ha podido identificar al jugador.');

      this.closeBuyoutConfirmation();
      return;
    }

    this.apiBuyoutClauses.buyoutClause(clauseToPay, String(playerId)).subscribe({
      next: () => {
        const formattedClause = new Intl.NumberFormat('es-ES').format(clauseToPay);

        // ====================================================
        // ELIMINAR JUGADOR DE LA LISTA
        // ====================================================

        this.players.update((players) =>
          players.filter((currentPlayer) => currentPlayer.playerTeamId !== player.playerTeamId),
        );

        this.toastr.success(`Has fichado a ${player.playerMaster.name} por ${formattedClause}€`);

        this.closeBuyoutConfirmation();
      },

      error: (error) => {
        console.error('Error ejecutando cláusula:', error);

        this.toastr.error('No se ha podido ejecutar la cláusula.: ' + error.error.message);
      },
    });
  }

  // ============================================================
  // CANCELAR CLÁUSULA
  // ============================================================

  onBuyoutCancelled(): void {
    this.closeBuyoutConfirmation();
  }

  private closeBuyoutConfirmation(): void {
    this.buyoutConfirmationOpen.set(false);
    this.pendingBuyout = null;
  }

  // ============================================================
  // FILTROS
  // ============================================================

  setAvailability(value: 'disponibles' | 'todas'): void {
    this.availability.set(value);
  }

  setManager(managerId: string): void {
    this.selectedManager.set(managerId);
  }

  setPosition(position: string): void {
    this.selectedPosition.set(position);
  }

  // ============================================================
  // ORDENACIÓN
  // ============================================================

  setSort(sort: SortOption): void {
    this.sortBy.set(sort);
    this.pulseSorting();
  }

  toggleOrder(): void {
    const current = this.sortOrder();

    this.sortOrder.set(current === 'desc' ? 'asc' : 'desc');

    this.pulseSorting();
  }

  private pulseSorting(): void {
    this.sorting.set(true);

    if (this.sortingTimeoutId) {
      clearTimeout(this.sortingTimeoutId);
    }

    this.sortingTimeoutId = setTimeout(() => {
      this.sorting.set(false);
      this.sortingTimeoutId = null;
    }, 300);
  }

  // ============================================================
  // RESET
  // ============================================================

  clearSearch(): void {
    this.searchName.set('');
  }

  resetAll(): void {
    this.searchName.set('');
    this.selectedManager.set('todos');
    this.selectedPosition.set('todas');
    this.availability.set('disponibles');
    this.sortBy.set('CLAUSE_DESC');
    this.sortOrder.set('desc');
  }

  // ============================================================
  // UPDATES
  // ============================================================

  updateTeamMoney() {
    this.apiMoneyService.getTeamMoney(this.teamId()).subscribe({
      next: (data) => {},
      error: (err) => {
        console.error('Error al obtener el dinero del equipo:', err);
      },
    });
  }
}
