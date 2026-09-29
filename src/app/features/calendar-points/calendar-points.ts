import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  computed,
  inject,
  signal,
} from '@angular/core';

import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ApiCalendarPointsService } from './services/api-calendar-points.service';

import {
  CalendarPlayer,
  CalendarPointsResponse,
} from '../../shared/interfaces/calendar/calendar-points.interface';
import { PlayerStatsModal } from '../../shared/modals/player-stats-modal/player-stats-modal';
import { TeamsInterface } from '../../shared/interfaces/teams/teams.interface';
import { AppState } from '../../core/states/app-state.state';

interface Jornada {
  number: number;
  id: string;
  status: 'played' | 'live';
}

@Component({
  selector: 'app-calendar-points',
  standalone: true,
  imports: [DecimalPipe, RouterLink, PlayerStatsModal],
  templateUrl: './calendar-points.html',
  styleUrl: './calendar-points.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarPoints implements OnInit {
  private readonly apiCalendarPointsService = inject(ApiCalendarPointsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly appState = inject(AppState);

  /**
   * =====================================================
   * TEAM ID
   * =====================================================
   *
   * Si tu ruta es:
   *
   * /lineup/123/points
   *
   * y tienes:
   *
   * path: 'lineup/:teamId/points'
   *
   * usamos teamId.
   */
  protected readonly teamId = Number(this.route.snapshot.paramMap.get('id'));

  /**
   * =====================================================
   * OUTPUT
   * =====================================================
   */

  @Output()
  playerClick = new EventEmitter<number | string>();

  /**
   * =====================================================
   * ESTADO
   * =====================================================
   */

  readonly loading = signal(true);

  readonly loadingWeek = signal(false);

  readonly error = signal<string | null>(null);

  /**
   * Jornada actual de la competición.
   */
  readonly currentWeek = signal(1);

  /**
   * Jornada seleccionada.
   */
  readonly selectedWeek = signal(1);

  readonly teams = computed(() => {
    return this.appState.teams.teams();
  });

  get isPointsPage(): boolean {
    return this.router.url.includes('/points');
  }

  /**
   * =====================================================
   * CACHE DE JORNADAS
   * =====================================================
   *
   * Aquí guardamos las respuestas que ya hemos pedido.
   *
   * Ejemplo:
   *
   * 1 -> response J1
   * 2 -> response J2
   * 3 -> response J3
   *
   * Si vuelves a J2 no hacemos otra petición.
   */

  protected readonly weekResponses = signal<Map<number, CalendarPointsResponse>>(new Map());

  /**
   * =====================================================
   * JORNADAS
   * =====================================================
   */

  readonly jornadas = computed<Jornada[]>(() => {
    const current = this.currentWeek();

    return Array.from({ length: current }, (_, index) => {
      const number = index + 1;

      return {
        number,
        id: `J${number}`,
        status: number === current ? 'live' : 'played',
      };
    });
  });

  /**
   * =====================================================
   * MANAGER NAME
   * =====================================================
   */

  readonly allManagers = this.appState.managers.managers;

  readonly managerName = computed(() => {
    const id = this.teamId;

    const foundManager = this.allManagers().find((m) => m.teamId === id.toString());

    return foundManager?.managerName ?? 'Sin Manager';
  });

  /**
   * =====================================================
   * PLAYERS STATS
   * =====================================================
   */

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

  /**
   * =====================================================
   * PLAYERS TEAMS
   * =====================================================
   */

  getTeam(teamId: string | number | undefined): TeamsInterface | undefined {
    if (teamId === undefined) {
      return undefined;
    }

    return this.teams().find((team) => String(team.id) === String(teamId));
  }

  /**
   * =====================================================
   * RESPONSE SELECCIONADO
   * =====================================================
   */

  readonly selectedResponse = computed(() => {
    return this.weekResponses().get(this.selectedWeek());
  });

  /**
   * =====================================================
   * JUGADORES
   * =====================================================
   */

  readonly goalkeeper = computed(() => {
    return this.selectedResponse()?.formation?.goalkeeper?.[0] ?? null;
  });

  readonly defenders = computed(() => {
    return this.selectedResponse()?.formation?.defender ?? [];
  });

  readonly midfielders = computed(() => {
    return this.selectedResponse()?.formation?.midfield ?? [];
  });

  readonly strikers = computed(() => {
    return this.selectedResponse()?.formation?.striker ?? [];
  });

  /**
   * =====================================================
   * TITULARES
   * =====================================================
   */

  readonly starters = computed(() => {
    const response = this.selectedResponse();

    if (!response) {
      return [];
    }

    return this.getAllPlayers(response);
  });

  /**
   * =====================================================
   * PUNTOS JORNADA
   * =====================================================
   */

  readonly selectedWeekPoints = computed(() => {
    return this.starters().reduce(
      (total, player) => total + this.getPointsForWeek(player, this.selectedWeek()),
      0,
    );
  });

  /**
   * =====================================================
   * PUNTOS TOTALES
   * =====================================================
   *
   * IMPORTANTE:
   *
   * Ahora NO hacemos peticiones para calcular esto.
   *
   * Solo suma las jornadas que ya están cargadas.
   */

  readonly totalPoints = computed(() => {
    let total = 0;

    for (const [weekNumber, response] of this.weekResponses()) {
      const players = this.getAllPlayers(response);

      total += players.reduce((sum, player) => sum + this.getPointsForWeek(player, weekNumber), 0);
    }

    return total;
  });

  /**
   * =====================================================
   * MEDIA
   * =====================================================
   */

  readonly averagePoints = computed(() => {
    const loadedWeeks = this.weekResponses().size;

    if (!loadedWeeks) {
      return 0;
    }

    return this.totalPoints() / loadedWeeks;
  });

  readonly playerCount = computed(() => {
    return this.starters().length;
  });

  /**
   * =====================================================
   * INIT
   * =====================================================
   */

  ngOnInit(): void {
    this.loadCurrentWeek();
  }

  /**
   * =====================================================
   * 1. OBTENER JORNADA ACTUAL
   * =====================================================
   */

  private loadCurrentWeek(): void {
    this.loading.set(true);

    this.error.set(null);

    this.apiCalendarPointsService.getCurrentWeek().subscribe({
      next: (currentWeek) => {
        const weekNumber = this.extractCurrentWeekNumber(currentWeek);

        this.currentWeek.set(weekNumber);

        this.selectedWeek.set(weekNumber);

        /**
         * IMPORTANTE:
         *
         * Solo cargamos la jornada actual.
         */
        this.loadWeek(weekNumber, true);
      },

      error: () => {
        this.loading.set(false);

        this.error.set('No se ha podido cargar la jornada actual.');
      },
    });
  }

  /**
   * =====================================================
   * 2. CARGAR UNA JORNADA
   * =====================================================
   */

  private loadWeek(weekNumber: number, initialLoad = false): void {
    /**
     * Si ya tenemos la jornada en memoria,
     * NO volvemos a llamar a la API.
     */
    if (this.weekResponses().has(weekNumber)) {
      this.loading.set(false);

      this.loadingWeek.set(false);

      return;
    }

    if (!this.teamId) {
      this.loading.set(false);

      this.error.set('No se ha encontrado el ID del equipo en la URL.');

      return;
    }

    if (initialLoad) {
      this.loading.set(true);
    } else {
      this.loadingWeek.set(true);
    }

    this.error.set(null);

    this.apiCalendarPointsService.getCalendarPoints(this.teamId, weekNumber).subscribe({
      next: (response) => {
        /**
         * Creamos un nuevo Map para que Angular
         * detecte correctamente el cambio.
         */
        const updatedMap = new Map(this.weekResponses());

        updatedMap.set(weekNumber, response);

        this.weekResponses.set(updatedMap);

        this.loading.set(false);

        this.loadingWeek.set(false);
      },

      error: () => {
        this.loading.set(false);

        this.loadingWeek.set(false);

        this.error.set(`No se han podido cargar los puntos de J${weekNumber}.`);
      },
    });
  }

  /**
   * =====================================================
   * 3. SELECCIONAR JORNADA
   * =====================================================
   */

  selectWeek(weekNumber: number): void {
    /**
     * Primero cambiamos la jornada visualmente.
     */
    this.selectedWeek.set(weekNumber);

    /**
     * Si ya está cargada, no hacemos petición.
     */
    if (this.weekResponses().has(weekNumber)) {
      return;
    }

    /**
     * Si no está cargada, hacemos la petición
     * justo ahora.
     */
    this.loadWeek(weekNumber);
  }

  /**
   * =====================================================
   * PUNTOS DE UNA JORNADA
   * =====================================================
   */

  weekResponsesPoints(weekNumber: number): number {
    const response = this.weekResponses().get(weekNumber);

    if (!response) {
      return 0;
    }

    const players = this.getAllPlayers(response);

    return players.reduce((total, player) => total + this.getPointsForWeek(player, weekNumber), 0);
  }

  /**
   * =====================================================
   * TODOS LOS JUGADORES
   * =====================================================
   */

  private getAllPlayers(response: CalendarPointsResponse): CalendarPlayer[] {
    return [
      ...(response.formation?.goalkeeper ?? []),

      ...(response.formation?.defender ?? []),

      ...(response.formation?.midfield ?? []),

      ...(response.formation?.striker ?? []),
    ];
  }

  /**
   * =====================================================
   * PUNTOS DEL JUGADOR
   * =====================================================
   */

  private getPointsForWeek(player: CalendarPlayer, weekNumber: number): number {
    const stat = player.playerMaster?.lastStats?.find((item) => item.weekNumber === weekNumber);

    return stat?.totalPoints ?? 0;
  }

  /**
   * =====================================================
   * PENDING
   * =====================================================
   */

  isPending(player: CalendarPlayer): boolean {
    const stat = player.playerMaster?.lastStats?.find(
      (item) => item.weekNumber === this.selectedWeek(),
    );

    return !stat;
  }

  /**
   * =====================================================
   * CLASE PUNTOS
   * =====================================================
   */

  getPointClass(player: CalendarPlayer): string {
    if (this.isPending(player)) {
      return 'pending';
    }

    const points = this.getPointsForWeek(player, this.selectedWeek());

    if (points > 0) {
      return 'pos';
    }

    if (points < 0) {
      return 'neg';
    }

    return 'zero';
  }

  /**
   * =====================================================
   * LABEL PUNTOS
   * =====================================================
   */

  getPointLabel(player: CalendarPlayer): string {
    if (this.isPending(player)) {
      return '-';
    }

    const points = this.getPointsForWeek(player, this.selectedWeek());

    return points > 0 ? `+${points}` : `${points}`;
  }

  /**
   * =====================================================
   * CLICK JUGADOR
   * =====================================================
   */

  onPlayerClick(player: CalendarPlayer): void {
    this.playerClick.emit(player.playerMaster.id);
  }

  /**
   * =====================================================
   * POSICIÓN
   * =====================================================
   */

  getPositionShort(player: CalendarPlayer): string {
    switch (player.playerMaster.positionId) {
      case 1:
        return 'POR';

      case 2:
        return 'DEF';

      case 3:
        return 'MED';

      case 4:
        return 'DEL';

      default:
        return '';
    }
  }

  /**
   * =====================================================
   * IMAGEN
   * =====================================================
   */

  getPlayerImage(player: CalendarPlayer): string {
    return player.playerMaster?.images?.transparent?.['256x256'] ?? '';
  }

  /**
   * =====================================================
   * NOMBRE
   * =====================================================
   */

  getPlayerName(player: CalendarPlayer): string {
    return player.playerMaster.nickname || player.playerMaster.name;
  }

  getFullPlayerName(player: CalendarPlayer): string {
    return player.playerMaster.name;
  }

  /**
   * =====================================================
   * CURRENT WEEK
   * =====================================================
   */

  private extractCurrentWeekNumber(currentWeek: any): number {
    return Number(
      currentWeek?.weekNumber ??
        currentWeek?.number ??
        currentWeek?.week?.weekNumber ??
        currentWeek?.week?.number ??
        1,
    );
  }
}
