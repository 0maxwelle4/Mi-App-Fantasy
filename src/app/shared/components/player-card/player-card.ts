import {
  Component,
  computed,
  inject,
  Input,
  input,
  output,
  signal,
  OnChanges,
  OnDestroy,
  SimpleChanges,
} from '@angular/core';
import { SquadPlayerInterface } from '../../interfaces/squad/squad-player.interface';
import { DecimalPipe } from '@angular/common';
import { PlayerConfigModalInterface } from '../../interfaces/players/player-config-modal.interface';
import { MarketPlayerInterface } from '../../interfaces/market/market-player.interface';
import { AppState } from '../../../core/states/app-state.state';
import { PlayerStatsModal } from '../../modals/player-stats-modal/player-stats-modal';
import { ConfirmationModal } from '../../modals/confirmation-modal/confirmation-modal';
import { Router } from '@angular/router';

const POSITION_MAP: Record<number, string> = {
  1: 'PORTERO',
  2: 'DEFENSA',
  3: 'CENTROCAMPISTA',
  4: 'DELANTERO',
  5: 'ENTRENADOR',
};

type Player = SquadPlayerInterface | MarketPlayerInterface;

@Component({
  selector: 'app-player-card',
  imports: [DecimalPipe, PlayerStatsModal, ConfirmationModal],
  templateUrl: './player-card.html',
  styleUrl: './player-card.scss',
})
export class PlayerCard implements OnChanges, OnDestroy {
  players = input.required<Player>();
  readonly appState = inject(AppState);
  private readonly router = inject(Router);

  @Input() config: PlayerConfigModalInterface = {
    isOwnPlayer: true,
    isMarketOpen: true,
    hasShieldsAvailable: true,
  };

  /** Puja / modificar / cancelar puja — vale tanto para jugadores de Mercado como para
   * jugadores rivales dentro de una plantilla ajena. */
  onBid = output<Player>();
  onModifyBid = output<Player>();
  onCancelBid = output<Player>();

  onAddToMarket = output<{ playerId: string; salePrice: number }>();
  onRemoveFromMarket = output<{ marketId: string }>();

  /** Emiten para que el padre abra el player-modal con la acción correspondiente */
  onRaiseClauseClick = output<SquadPlayerInterface>();
  onAddToMarketClick = output<SquadPlayerInterface>();

  /** Emite cuando el usuario quiere pagar/ejecutar la cláusula de un jugador rival */
  onBuyoutClick = output<SquadPlayerInterface>();

  /** SQUAD OR MARKET DATA **/
  readonly squadData = computed(() => {
    const player = this.players();

    return 'buyoutClause' in player ? player : null;
  });

  readonly marketData = computed(() => {
    const player = this.players();

    return 'discr' in player ? player : null;
  });

  readonly playerTeam = computed(() => {
    const player = this.players().playerMaster;

    const teamId = player.teamId ?? player.team?.id;

    if (!teamId) {
      return undefined;
    }

    return this.appState.teams.getTeamById(String(teamId));
  });

  // ==========================================================
  // MANAGER DEL EQUIPO EN EL QUE ESTA EL JUGADOR
  //
  // Solo llega en jugadores "ajenos" (plantilla rival o listado
  // de clausulas), donde el objeto trae managerName/managerId.
  // En tus propios jugadores (config.isOwnPlayer) no tiene
  // sentido mostrarlo: el manager eres tu.
  // ==========================================================

  readonly managerName = computed(() => {
    const player = this.players();

    if ('managerName' in player && player.managerName) {
      return player.managerName;
    }

    return null;
  });

  /**
   * Id del equipo del manager (distinto del equipo REAL del
   * jugador, que es playerTeam()). Solo viene informado en
   * jugadores "ajenos" que traen managerName/managerId.
   */
  readonly managerTeamId = computed(() => {
    const player = this.players();

    if ('teamId' in player && player.teamId) {
      return player.teamId;
    }

    return null;
  });

  /**
   * Navega a la plantilla del manager del jugador (/squad/:id).
   * No hace nada si el jugador no trae datos de manager
   * (p.ej. en tus propios jugadores).
   */
  goManagerTeam(): void {
    const teamId = this.managerTeamId();

    if (!teamId) {
      return;
    }

    this.router.navigate(['/squad', teamId]);
  }

  readonly isShielded = computed(() => {
    const player = this.players();

    if ('isShielded' in player) {
      return player.isShielded;
    }

    return false;
  });

  // ==========================================================
  // DISPONIBILIDAD DE LA CLÁUSULA
  // Bloqueada si está blindada (isShielded) O si su
  // buyoutClauseLockedEndTime todavía no ha pasado.
  // `now` se actualiza en cada tick del countdown para que
  // esto sea reactivo cuando el bloqueo expira.
  // ==========================================================

  readonly now = signal<number>(Date.now());

  readonly isClauseAvailable = computed(() => {
    const squad = this.squadData();

    if (!squad) {
      return false;
    }

    if (squad.isShielded) {
      return false;
    }

    if (!squad.buyoutClauseLockedEndTime) {
      return true;
    }

    return new Date(squad.buyoutClauseLockedEndTime).getTime() <= this.now();
  });

  onActionClick = output<Player>();

  // 1. Señales para controlar el texto y el estado de la cuenta atrás
  readonly countdownText = signal<string>('---');
  private timerId: any = null;

  readonly positionText = computed(() => {
    const player = this.players();
    if (!player || !player.playerMaster) return 'DESCONOCIDO';
    return POSITION_MAP[player.playerMaster.positionId] ?? 'DESCONOCIDO';
  });

  readonly positionClass = computed(() => {
    const player = this.players();
    if (!player || !player.playerMaster) return '';

    const classMap: Record<number, string> = {
      1: 'por',
      2: 'df',
      3: 'cc',
      4: 'dl',
      5: 'ch',
    };

    return classMap[player.playerMaster.positionId] ?? '';
  });

  readonly market = computed(() =>
    this.appState.market.getMarketTendenciesByPlayerId(this.players()?.playerMaster.id),
  );

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['players']) {
      this.startCountdown();
    }
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  private startCountdown(): void {
    this.clearTimer();

    const player = this.players();

    if (!player) {
      this.countdownText.set('SIN FECHA');
      return;
    }

    let endTimeStr: string | undefined;

    // SquadPlayer
    if ('buyoutClauseLockedEndTime' in player) {
      endTimeStr = player.buyoutClauseLockedEndTime;
    }

    // MarketPlayer
    else if ('expirationDate' in player) {
      endTimeStr = player.expirationDate;
    }

    if (!endTimeStr) {
      this.countdownText.set('SIN FECHA');
      return;
    }

    // Actualización inmediata
    this.updateTime(endTimeStr);

    // Actualización cada segundo
    this.timerId = setInterval(() => {
      this.updateTime(endTimeStr);
    }, 1000);
  }

  private updateTime(endTimeStr: string): void {
    const endTime = new Date(endTimeStr).getTime();
    const now = new Date().getTime();

    // Mantiene `now` reactivo para que isClauseAvailable se recalcule
    // en cada tick (p.ej. cuando el bloqueo de la cláusula expira).
    this.now.set(now);

    const distance = endTime - now;

    if (distance <= 0) {
      this.countdownText.set('FINALIZADO');
      this.clearTimer();
      return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    const pad = (num: number) => String(num).padStart(2, '0');

    if (days > 0) {
      this.countdownText.set(`${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
    } else {
      this.countdownText.set(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
    }
  }

  private clearTimer(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  /** MARKET **/

  readonly isMarketPlayer = computed(() => {
    return 'discr' in this.players();
  });

  /**
   * Devuelve la oferta/puja activa sobre este jugador, sea de Mercado
   * (`bid`) o de una plantilla rival (`playerMarket.offer`).
   */
  readonly activeBid = computed(() => {
    const player = this.players();

    if ('discr' in player) {
      return player.bid ?? null;
    }

    return player.playerMarket?.offer ?? null;
  });

  readonly hasBid = computed(() => {
    const bid = this.activeBid();

    return !!bid && bid.status === 'pending';
  });

  readonly myBidAmount = computed(() => {
    return this.activeBid()?.money ?? null;
  });

  readonly numberOfBids = computed(() => {
    const player = this.players();

    if ('discr' in player) {
      return player.numberOfBids ?? 0;
    }

    return player.playerMarket?.numberOfOffers ?? 0;
  });

  placeBid(): void {
    this.onBid.emit(this.players());
  }

  modifyBid(): void {
    this.onModifyBid.emit(this.players());
  }

  cancelBid(): void {
    this.onCancelBid.emit(this.players());
  }

  // ============================================================
  // ACCIONES DIRECTAS SOBRE JUGADOR PROPIO (SIN MODAL)
  // ============================================================

  readonly confirmationOpen = signal(false);
  readonly confirmationTitle = signal('');
  readonly confirmationDescription = signal('');

  private pendingAction: (() => void) | null = null;

  private openConfirmation(title: string, description: string, action: () => void): void {
    this.confirmationTitle.set(title);
    this.confirmationDescription.set(description);
    this.pendingAction = action;
    this.confirmationOpen.set(true);
  }

  onConfirmationSuccess(): void {
    if (this.pendingAction) {
      this.pendingAction();
    }
    this.closeConfirmation();
  }

  closeConfirmation(): void {
    this.confirmationOpen.set(false);
    this.pendingAction = null;
  }

  removeFromMarket(): void {
    const player = this.squadData();

    if (!player || !player.playerMarket) {
      return;
    }

    this.openConfirmation(
      '¿Retirar del Mercado?',
      `Estás a punto de retirar a ${player.playerMaster.nickname} del mercado. Se rechazarán todas las ofertas recibidas.`,
      () => this.onRemoveFromMarket.emit({ marketId: player.playerMarket!.id }),
    );
  }

  // ============================================================
  // ACCIONES QUE ABREN EL PLAYER-MODAL (lo gestiona el padre)
  // ============================================================

  openAddToMarket(): void {
    const player = this.players();

    if (!('buyoutClause' in player)) {
      return;
    }

    this.onAddToMarketClick.emit(player);
  }

  openRaiseClause(): void {
    const player = this.players();

    if (!('buyoutClause' in player)) {
      return;
    }

    this.onRaiseClauseClick.emit(player);
  }

  // ============================================================
  // CLAUSULAR JUGADOR RIVAL
  // Solo aplica a jugadores de plantilla (SquadPlayer) que no
  // sean nuestros; la disponibilidad la valida isClauseAvailable().
  // ============================================================

  openBuyout(): void {
    const player = this.players();

    if (!('buyoutClause' in player)) {
      return;
    }

    if (!this.isClauseAvailable()) {
      return;
    }

    this.onBuyoutClick.emit(player);
  }

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
}
