import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe, DatePipe, UpperCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MarketPlayerInterface } from '../../shared/interfaces/market/market-player.interface';
import { ApiMarketOffersService } from './services/api-market-offers.service';
import { ConfirmationModal } from '../../shared/modals/confirmation-modal/confirmation-modal';
import { ToastrService } from 'ngx-toastr';
import { ApiMoneyStatusService } from '../../shared/services/api-money-status.service';
import { AppState } from '../../core/states/app-state.state';
import { PlayerStatsModal } from '../../shared/modals/player-stats-modal/player-stats-modal';

interface OfferDetailsInterface {
  id: string;
  money: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  isFromMarket: boolean;
  expirationDate: string;
}

type MarketPlayerWithOptions = MarketPlayerInterface & {
  salePrice?: number;

  playerMaster?: {
    id: string;
    name: string;
    nickname?: string;
    marketValue: number;
    positionId?: string | number;

    images?: {
      transparent?: {
        '256x256': string;
      };
    };

    team?: {
      id?: string | number;
      name: string;
      badgeColor: string;
    };
  };

  currentOffer?: OfferDetailsInterface[];
};

@Component({
  selector: 'app-market-offers',
  imports: [DecimalPipe, DatePipe, UpperCasePipe, RouterLink, ConfirmationModal, PlayerStatsModal],
  templateUrl: './market-offers.html',
  styleUrl: './market-offers.scss',
})
export class MarketOffers {
  private readonly apiMarketOffers = inject(ApiMarketOffersService);
  private readonly appState = inject(AppState);

  // ============================================================
  // LOADING && INJECTS
  // ============================================================

  readonly loadingMarket = signal(true);
  private readonly toastr = inject(ToastrService);
  private readonly apiMoneyService = inject(ApiMoneyStatusService);

  // ============================================================
  // MARKET
  // ============================================================

  readonly leagueMarket = signal<MarketPlayerWithOptions[]>([]);

  // ============================================================
  // STATE
  // ============================================================

  readonly preSelectedLeagueId = computed(() => this.appState.league.preSelectedLeague()?.id);
  readonly teamMoney = computed(() => this.appState.league.preSelectedLeague()?.teamMoney ?? 0);
  readonly teamValue = computed(() => this.appState.league.preSelectedLeague()?.teamValue ?? 0);
  readonly teamId = computed(() => this.appState.league.preSelectedLeague()?.teamId ?? 0);
  readonly totalOffersCount = computed(() => this.leagueMarket().length);

  readonly activeBidsCount = computed(() => {
    return this.leagueMarket().reduce((sum, player) => sum + (player.numberOfBids ?? 0), 0);
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
  // CONFIRMATION MODAL STATE
  // ============================================================

  readonly confirmationOpen = signal(false);
  readonly confirmationTitle = signal('');
  readonly confirmationDescription = signal('');

  readonly selectedPlayerForModal = signal<MarketPlayerWithOptions | null>(null);

  private pendingAction: (() => void) | null = null;

  // ============================================================
  // INIT
  // ============================================================

  constructor() {
    this.loadMarket();
    this.updateTeamMoney();
  }

  // ============================================================
  // API
  // ============================================================

  private loadMarket(): void {
    this.loadingMarket.set(true);

    this.apiMarketOffers.getMarketWithOffers().subscribe({
      next: (marketWithOffers) => {
        const onlyWithOffers = (marketWithOffers ?? []).filter(
          (player: MarketPlayerWithOptions) =>
            Array.isArray(player.currentOffer) && player.currentOffer.length > 0,
        );

        console.log(onlyWithOffers);
        this.leagueMarket.set(onlyWithOffers);
      },

      error: (error) => {
        console.error('Error cargando mercado con ofertas:', error);

        this.leagueMarket.set([]);
        this.loadingMarket.set(false);
      },

      complete: () => {
        this.loadingMarket.set(false);
      },
    });
  }

  // ============================================================
  // TEAM
  // ============================================================

  getTeamByPlayer(player: MarketPlayerWithOptions) {
    const teamId = player?.playerMaster?.teamId || player?.playerMaster?.team?.id;

    if (!teamId) {
      return undefined;
    }

    return this.appState.teams.getTeamById(String(teamId));
  }

  // ============================================================
  // CONFIRMATION MODAL HANDLERS
  // ============================================================

  openConfirmation(
    title: string,
    description: string,
    player: MarketPlayerWithOptions,
    action: () => void,
  ): void {
    this.confirmationTitle.set(title);
    this.confirmationDescription.set(description);
    this.selectedPlayerForModal.set(player);
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
    this.selectedPlayerForModal.set(null);
  }

  // ============================================================
  // OFFER ACTIONS
  // ============================================================

  onAcceptOfferClick(player: MarketPlayerWithOptions): void {
    const offer = player.currentOffer?.[0];
    if (!offer?.id) return;

    const formattedMoney = new Intl.NumberFormat('es-ES').format(offer.money);
    const playerName = player.playerMaster?.nickname || player.playerMaster?.name || 'Jugador';

    this.openConfirmation(
      '¿Aceptar Oferta?',
      `Vas a vender a ${playerName} de forma definitiva por un importe de ${formattedMoney}€. Esta transacción modificará tu presupuesto de inmediato.`,
      player,
      () => this.acceptOffer(player),
    );
  }

  onRejectOfferClick(player: MarketPlayerWithOptions): void {
    const offer = player.currentOffer?.[0];
    if (!offer?.id) return;

    const playerName = player.playerMaster?.nickname || player.playerMaster?.name || 'Jugador';

    this.openConfirmation(
      '¿Rechazar Oferta?',
      `Estás a punto de rechazar la oferta recibida por ${playerName}. El dinero retenido al pujador le será devuelto de inmediato.`,
      player,
      () => this.rejectOffer(player),
    );
  }

  protected acceptOffer(player: MarketPlayerWithOptions): void {
    const offerId = player.currentOffer?.[0]?.id;
    if (!offerId) return;

    this.apiMarketOffers
      .acceptMarketOffer(player.id, offerId, player.currentOffer?.[0]?.money)
      .subscribe({
        next: () => {
          // Al completarse con éxito la petición HTTP, quitamos el jugador del cromo local
          this.removePlayerFromLocalList(player.id);
          this.toastr.success('Se ha Aceptado la oferta Correctamente!');
          this.updateTeamMoney();
        },
        error: (err) => {
          console.error('Error al aceptar la oferta en la API:', err);
        },
      });
  }

  protected rejectOffer(player: MarketPlayerWithOptions): void {
    const offerId = player.currentOffer?.[0]?.id;
    if (!offerId) return;

    this.apiMarketOffers.rejectMarketOffer(player.id, offerId).subscribe({
      next: () => {
        // Al completarse con éxito la petición HTTP, quitamos el jugador del cromo local
        this.removePlayerFromLocalList(player.id);
        this.toastr.success('Se ha Rechazado la oferta Correctamente!');
      },
      error: (err) => {
        console.error('Error al rechazar la oferta en la API:', err);
      },
    });
  }

  /**
   * Filtra la lista actual del signal excluyendo al jugador procesado
   */
  private removePlayerFromLocalList(playerId: string): void {
    this.leagueMarket.update((currentList) => currentList.filter((item) => item.id !== playerId));
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
