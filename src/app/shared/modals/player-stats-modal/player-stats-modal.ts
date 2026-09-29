import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  computed,
  inject,
  signal,
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';

import { ApiPlayerStatsModalService } from './services/api-player-stats-modal.service';

import {
  FormattedStat,
  PlayerStatsResponse,
  PlayerWeek,
} from '../../interfaces/players/player-stats-modal.interface';
import { AppState } from '../../../core/states/app-state.state';
import { TeamsInterface } from '../../interfaces/teams/teams.interface';

@Component({
  selector: 'app-player-stats-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './player-stats-modal.html',
  styleUrl: './player-stats-modal.scss',
})
export class PlayerStatsModal implements OnChanges {
  readonly appState = inject(AppState);
  private readonly apiPlayersService = inject(ApiPlayerStatsModalService);

  // ==========================================
  // INPUTS
  // ==========================================

  @Input()
  playerId: number | string | null = null;

  @Input()
  isOpen = false;

  // ==========================================
  // OUTPUT
  // ==========================================

  @Output()
  closeModal = new EventEmitter<void>();

  // ==========================================
  // ESTADOS
  // ==========================================

  loading = signal(false);

  error = signal<string | null>(null);

  playerData = signal<PlayerStatsResponse | null>(null);

  selectedWeek = signal<number | null>(null);

  // Para evitar peticiones duplicadas innecesarias
  private lastLoadedPlayerId: number | string | null = null;

  // ==========================================
  // DETECTAR CAMBIOS
  // ==========================================

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.isOpen) {
      return;
    }

    if (this.playerId === null || this.playerId === undefined) {
      return;
    }

    const playerChanged = changes['playerId'];
    const modalChanged = changes['isOpen'];

    const modalWasOpened = modalChanged && modalChanged.currentValue === true;

    if (playerChanged || modalWasOpened) {
      this.getPlayerStats(this.playerId);
    }
  }

  // ==========================================
  // PETICIÓN
  // ==========================================

  private getPlayerStats(playerId: number | string): void {
    this.loading.set(true);

    this.error.set(null);

    this.playerData.set(null);

    this.selectedWeek.set(null);

    this.lastLoadedPlayerId = playerId;

    this.apiPlayersService
      .getPlayerStats(playerId)
      .pipe(
        finalize(() => {
          this.loading.set(false);
        }),
      )
      .subscribe({
        next: (response: PlayerStatsResponse) => {
          console.log('PLAYER STATS RESPONSE:', response);

          const playerMarket = this.appState.market.getMarketTendenciesByPlayerId(
            response?.playerMaster.id,
          )?.difference24h;

          const playerMarketPct = this.appState.market.getMarketTendenciesByPlayerId(
            response?.playerMaster.id,
          )?.differencePct24h;

          this._valorActual.set(response.playerMaster.marketValue);
          this._variacion24h.set(playerMarket || 0);
          this._porcentaje.set(playerMarketPct || 0);

          this.playerData.set(response);

          const playerWeeks = this.weeks();

          if (playerWeeks.length > 0) {
            /*
             * Seleccionamos la última jornada disponible.
             *
             * Ejemplo:
             * Semana 1
             * Semana 2
             *
             * Se abre directamente en la semana 2.
             */

            const lastWeek = playerWeeks[playerWeeks.length - 1];

            this.selectedWeek.set(lastWeek.weekNumber);
          }
        },

        error: (error: unknown) => {
          console.error('Error obteniendo estadísticas:', error);

          this.error.set('No se han podido cargar las estadísticas del jugador.');
        },
      });
  }

  // ==========================================
  // PLAYER MASTER
  // ==========================================

  player = computed(() => {
    return this.playerData()?.playerMaster ?? null;
  });

  // ==========================================
  // PLAYER TEAM
  // ==========================================

  readonly team = computed(() => {
    return this.appState.teams.teams();
  });

  getTeam(teamId: string | number | undefined): TeamsInterface | undefined {
    if (teamId === undefined) {
      return undefined;
    }

    return this.team().find((team) => String(team.id) === String(teamId));
  }

  // ==========================================
  // JORNADAS
  // ==========================================

  weeks = computed<PlayerWeek[]>(() => {
    const playerStats = this.player()?.playerStats ?? [];

    return [...playerStats].sort((a, b) => a.weekNumber - b.weekNumber);
  });

  getPointsPercentage(week: PlayerWeek | null): number {
    const points = this.getWeekPoints(week);

    // 0 puntos o negativo: relleno mínimo, casi simbólico
    if (points <= 0) {
      return 10;
    }

    const maxPoints = Math.max(...this.weeks().map((w) => this.getWeekPoints(w)), 1);

    const percentage = (points / maxPoints) * 20;

    return Math.min(60, Math.max(0, percentage));
  }

  getPointsFillColor(week: PlayerWeek | null): string {
    const points = this.getWeekPoints(week);

    if (points < 0) {
      return 'var(--red)';
    }

    if (points === 0) {
      return 'var(--yellow)';
    }

    return 'var(--green)';
  }

  // ==========================================
  // JORNADA SELECCIONADA
  // ==========================================

  selectedWeekData = computed<PlayerWeek | null>(() => {
    const selectedWeek = this.selectedWeek();

    if (selectedWeek === null) {
      return null;
    }

    return this.weeks().find((week) => week.weekNumber === selectedWeek) ?? null;
  });

  // ==========================================
  // STATS FORMATEADAS
  // ==========================================

  stats = computed<FormattedStat[]>(() => {
    const week = this.selectedWeekData();

    if (!week) {
      return [];
    }

    return Object.entries(week.stats).map(([key, statValue]) => {
      /*
       * La API devuelve:
       *
       * "goals": [1, 4]
       *
       * Por tanto:
       *
       * statValue[0] = cantidad = 1
       * statValue[1] = puntos = 4
       */

      // @ts-ignore
      const value = Number(statValue?.[0] ?? 0);

      // @ts-ignore
      const points = Number(statValue?.[1] ?? 0);

      return {
        key,
        label: this.getStatLabelFromKey(key),
        value,
        points,
      };
    });
  });

  // ==========================================
  // INFORMACIÓN DEL JUGADOR
  // ==========================================

  getPlayerName(): string {
    return this.player()?.name ?? 'Jugador';
  }

  getPlayerNickname(): string {
    return this.player()?.nickname ?? this.getPlayerName();
  }

  getPlayerImage(): string | null {
    return this.player()?.images?.transparent?.['256x256'] ?? null;
  }

  getPlayerPosition(): string {
    return this.player()?.position ?? 'Sin posición';
  }

  getPlayerPositionId(): number {
    return this.player()?.positionId ?? 0;
  }

  getPlayerTotalPoints(): number {
    return this.player()?.points ?? 0;
  }

  getPlayerWeekPoints(): number {
    return this.player()?.weekPoints ?? 0;
  }

  getPlayerAveragePoints(): number {
    return this.player()?.averagePoints ?? 0;
  }

  getPlayerLastSeasonPoints(): number {
    return this.player()?.lastSeasonPoints ?? 0;
  }

  getPlayerMarketValue(): number {
    return this.player()?.marketValue ?? 0;
  }

  getPlayerTeamId(): number | null {
    return this.player()?.teamId ?? null;
  }

  getPlayerStatus(): string {
    return this.player()?.playerStatus ?? '';
  }

  // ==========================================
  // MARKET PLAYER
  // ==========================================

  getSalePrice(): number | null {
    return this.playerData()?.marketPlayer?.salePrice ?? null;
  }

  getNumberOfOffers(): number {
    return this.playerData()?.marketPlayer?.numberOfOffers ?? 0;
  }

  getMarketExpirationDate(): string | null {
    return this.playerData()?.marketPlayer?.expirationDate ?? null;
  }

  // ==========================================
  // PLAYER TEAM
  // ==========================================

  isPlayerShielded(): boolean {
    return this.playerData()?.playerTeam?.isShielded ?? false;
  }

  getBuyoutClause(): number {
    return this.playerData()?.playerTeam?.buyoutClause ?? this.getPlayerMarketValue();
  }

  // ==========================================
  // MANAGER
  // ==========================================

  getManagerName(): string | null {
    return this.playerData()?.manager?.managerName ?? null;
  }

  getManagerAvatar(): string | null {
    return this.playerData()?.manager?.avatar ?? null;
  }

  // ==========================================
  // JORNADAS
  // ==========================================

  selectWeek(week: PlayerWeek): void {
    this.selectedWeek.set(week.weekNumber);
  }

  isWeekSelected(week: PlayerWeek): boolean {
    return week.weekNumber === this.selectedWeek();
  }

  getWeekNumber(week: PlayerWeek | null): number {
    return week?.weekNumber ?? 0;
  }

  getWeekPoints(week: PlayerWeek | null): number {
    return week?.totalPoints ?? 0;
  }

  isIdealFormation(week: PlayerWeek | null): boolean {
    return week?.isInIdealFormation ?? false;
  }

  // ==========================================
  // ESTADÍSTICAS
  // ==========================================

  getStatLabel(stat: FormattedStat): string {
    return stat.label;
  }

  getStatValue(stat: FormattedStat): number {
    return stat.value;
  }

  getStatPoints(stat: FormattedStat): number {
    return stat.points;
  }

  getPointsClass(points: number): string {
    if (points > 0) {
      return 'pts-pos';
    }

    if (points < 0) {
      return 'pts-neg';
    }

    return 'pts-zero';
  }

  isPositivePoints(points: number): boolean {
    return points > 0;
  }

  isNegativePoints(points: number): boolean {
    return points < 0;
  }

  // ==========================================
  // MODAL
  // ==========================================

  close(): void {
    this.closeModal.emit();
  }

  onBackdropClick(): void {
    this.close();
  }

  stopPropagation(event: MouseEvent): void {
    event.stopPropagation();
  }

  // ==========================================
  // TRACK BY
  // ==========================================

  trackByWeek(index: number, week: PlayerWeek): number {
    return week.weekNumber ?? index;
  }

  trackByStat(index: number, stat: FormattedStat): string {
    return stat.key ?? String(index);
  }

  // ==========================================
  // LABELS DE ESTADÍSTICAS
  // ==========================================

  private getStatLabelFromKey(key: string): string {
    const labels: Record<string, string> = {
      mins_played: 'Minutos jugados',

      goals: 'Goles',

      goal_assist: 'Asistencias',

      offtarget_att_assist: 'Asistencias de ocasión',

      pen_area_entries: 'Entradas al área',

      penalty_won: 'Penaltis provocados',

      penalty_save: 'Penaltis parados',

      saves: 'Paradas',

      effective_clearance: 'Despejes efectivos',

      penalty_failed: 'Penaltis fallados',

      own_goals: 'Goles en propia',

      goals_conceded: 'Goles encajados',

      yellow_card: 'Tarjetas amarillas',

      second_yellow_card: 'Segunda amarilla',

      red_card: 'Tarjetas rojas',

      total_scoring_att: 'Intentos de gol',

      won_contest: 'Duelos ganados',

      ball_recovery: 'Recuperaciones',

      poss_lost_all: 'Pérdidas de balón',

      penalty_conceded: 'Penaltis cometidos',

      marca_points: 'Puntos MARCA',
    };

    return labels[key] ?? this.formatStatName(key);
  }

  // ==========================================
  // TENDENCIES
  // ==========================================

  private _valorActual = signal(0);
  private _variacion24h = signal(0);
  private _porcentaje = signal(0);

  variacion = computed(() => this._variacion24h());
  valorAnterior = computed(() => this._valorActual() - this._variacion24h());
  esPositivo = computed(() => this._variacion24h() >= 0);
  porcentaje = computed(() => this._porcentaje());

  /*
  porcentaje = computed(() => {
    const anterior = this.valorAnterior();
    if (!anterior) return 0;
    return (this._variacion24h() / anterior) * 100;
  });*/

  // Solo tenemos 2 puntos reales (hace 24h y ahora);
  // la curva intermedia es puramente estética, no representa datos reales.
  pathLine = computed(() => (this.esPositivo() ? 'M5,42 Q60,26 115,8' : 'M5,8 Q60,24 115,42'));

  pathArea = computed(() =>
    this.esPositivo() ? 'M5,42 Q60,26 115,8 L115,50 L5,50 Z' : 'M5,8 Q60,24 115,42 L115,50 L5,50 Z',
  );

  color = computed(() => (this.esPositivo() ? '#43c58a' : '#ff6673'));

  // ==========================================
  // UTILIDAD
  // ==========================================

  private formatStatName(key: string): string {
    return key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  }

  getPlayerCrest(): string | null {
    const teamId = this.getPlayerTeamId();

    if (!teamId) {
      return null;
    }

    return `https://placehold.co/56x56/202431/fff?text=T${teamId}`;
  }

  getWeekMinutes(week: PlayerWeek | null): number {
    if (!week?.stats) {
      return 0;
    }

    const minutes = week.stats['mins_played'];

    if (!Array.isArray(minutes)) {
      return 0;
    }

    return Number(minutes[0] ?? 0);
  }

  getPositionDescription(): string {
    const positionId = this.getPlayerPositionId();

    const descriptions: Record<number, string> = {
      1: 'estadísticas centradas en paradas, goles encajados y despejes.',

      2: 'estadísticas centradas en goles encajados, despejes y recuperaciones.',

      3: 'estadísticas centradas en goles, asistencias y recuperaciones.',

      4: 'estadísticas centradas en goles, asistencias y acciones ofensivas.',
    };

    return descriptions[positionId] ?? 'estadísticas del jugador por jornada.';
  }
}
