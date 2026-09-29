import { Component, computed, inject, signal } from '@angular/core';
import { PlayerCard } from '../../shared/components/player-card/player-card';
import { PlayerModalComponent } from '../../shared/modals/player-modal/player-modal';
import { ApiMarketService } from './services/api-market.service';
import { SquadPlayerInterface } from '../../shared/interfaces/squad/squad-player.interface';
import { MarketPlayerInterface } from '../../shared/interfaces/market/market-player.interface';
import { MarketBidInterface } from '../../shared/interfaces/market/market-bid.interface';
import { ToastrService } from 'ngx-toastr';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiMoneyStatusService } from '../../shared/services/api-money-status.service';
import { AppState } from '../../core/states/app-state.state';

@Component({
  selector: 'app-market',
  imports: [PlayerCard, PlayerModalComponent, DecimalPipe, FormsModule, RouterLink],
  templateUrl: './market.html',
  styleUrl: './market.scss',
})
export class Market {
  // ============================================================
  // INJECTS
  // ============================================================

  private readonly apiMarket = inject(ApiMarketService);
  private readonly toastr = inject(ToastrService);
  private readonly appState = inject(AppState);
  private readonly apiMoneyService = inject(ApiMoneyStatusService);
  readonly teamId = computed(() => this.appState.league.preSelectedLeague()?.teamId ?? 0);
  readonly preSelectedLeagueId = computed(() => this.appState.league.preSelectedLeague()?.id);

  // ============================================================
  // LOADING
  // ============================================================

  /**
   * Loading inicial: mientras se descarga el mercado por
   * primera vez (muestra el header y las tarjetas en skeleton).
   */
  readonly loadingMarket = signal(true);

  /**
   * Alias de loadingMarket para el template. El botón de
   * refrescar solo es visible una vez loadingMarket() es false,
   * asi que en la practica loading() siempre valdra false ahi,
   * pero se mantiene para no tener que tocar el html.
   */
  readonly loading = this.loadingMarket;

  /**
   * Loading visual del boton "Refrescar".
   *
   * Se activa al pulsar el boton y se apaga cuando termina
   * de recargar tanto el mercado como el dinero del equipo.
   */
  readonly marketLoading = signal(false);

  /**
   * Evita lanzar varias recargas del mercado simultaneamente.
   */
  private loadingMarketRequest = false;

  readonly teamMoney = computed(() => this.appState.league.preSelectedLeague()?.teamMoney ?? 0);
  readonly teamValue = computed(() => this.appState.league.preSelectedLeague()?.teamValue ?? 0);

  readonly activeBidsCount = computed(() => {
    return this.playersMarket().reduce((sum, player) => sum + (player.numberOfBids ?? 0), 0);
  });

  // Skeletons del mercado

  readonly skeletonPlayers = Array.from({ length: 8 }, (_, index) => index);

  // ============================================================
  // FILTER & SORT STATE (SIGNALS)
  // ============================================================
  readonly searchQuery = signal<string>('');
  readonly selectedPosition = signal<string>('TODOS');
  readonly selectedSort = signal<string>('recent');

  // ============================================================
  // MARKET
  // ============================================================

  readonly leagueMarket = signal<MarketPlayerInterface[]>([]);

  readonly playersMarket = computed(() => {
    return this.leagueMarket().filter((player) => player.discr === 'marketPlayerLeague');
  });

  // NUEVO: Computed con soporte para la tendencia del appState
  readonly filteredPlayers = computed(() => {
    let players = [...this.playersMarket()];

    // 1. Filtrar por posición de botón
    const pos = this.selectedPosition();
    if (pos !== 'TODOS') {
      players = players.filter((p) => p.playerMaster?.position?.toUpperCase() === pos);
    }

    // 2. Filtrar por texto de búsqueda (nombre, apodo, club o posición)
    const query = this.searchQuery().toLowerCase().trim();
    if (query) {
      players = players.filter(
        (p) =>
          p.playerMaster?.name?.toLowerCase().includes(query) ||
          p.playerMaster?.nickname?.toLowerCase().includes(query) ||
          p.playerMaster?.team?.name?.toLowerCase().includes(query) ||
          p.playerMaster?.position?.toLowerCase().includes(query),
      );
    }

    // 3. Ordenar los resultados según la selección
    const sortType = this.selectedSort();
    players.sort((a, b) => {
      switch (sortType) {
        case 'value': // Mayor valor / precio de salida
          return (b.playerMaster?.marketValue ?? 0) - (a.playerMaster?.marketValue ?? 0);

        case 'trend': // INTERSECCIÓN CON APPSTATE: Mayor subida (difference24h)
          const trendB =
            this.appState.market.getMarketTendenciesByPlayerId(b.playerMaster?.id)?.difference24h ??
            0;
          const trendA =
            this.appState.market.getMarketTendenciesByPlayerId(a.playerMaster?.id)?.difference24h ??
            0;
          return trendB - trendA;

        case 'points': // Mayor puntuación
          return (b.playerMaster?.points ?? 0) - (a.playerMaster?.points ?? 0);

        case 'price-low': // Menor precio
          return (a.playerMaster?.marketValue ?? 0) - (b.playerMaster?.marketValue ?? 0);

        case 'recent': // Más recientes
        default:
          return b.id.localeCompare(a.id);
      }
    });

    return players;
  });

  // ============================================================
  // MODAL
  // ============================================================

  readonly selectedPlayer = signal<MarketPlayerInterface | null>(null);

  readonly isModalOpen = signal(false);

  readonly modalAction = signal<'buy-offer' | 'modify-bid' | null>(null);

  constructor() {
    this.loadMarket();
    this.updateTeamMoney();
  }

  // ============================================================
  // LOAD MARKET
  // ============================================================

  /**
   * @param onComplete Callback opcional que se ejecuta cuando
   * termina la peticion (con exito o con error). Se usa para
   * apagar el spinner del boton "Refrescar".
   */
  private loadMarket(onComplete?: () => void): void {
    if (this.loadingMarketRequest) {
      onComplete?.();
      return;
    }

    this.loadingMarketRequest = true;
    this.loadingMarket.set(true);

    this.apiMarket.getLeagueMarket().subscribe({
      next: (market) => {
        this.leagueMarket.set(market);
      },

      error: (error) => {
        console.error('Error cargando mercado:', error);

        this.leagueMarket.set([]);
      },

      complete: () => {
        this.loadingMarket.set(false);
        this.loadingMarketRequest = false;

        onComplete?.();
      },
    });
  }

  // ============================================================
  // REFRESH
  // ============================================================

  /**
   * Refresca el mercado y el dinero del equipo.
   *
   * No vuelve a mostrar el skeleton inicial de forma manual:
   * solo gira el icono del boton mientras dura la peticion.
   */
  refresh(): void {
    if (this.marketLoading()) {
      return;
    }

    this.marketLoading.set(true);

    this.updateTeamMoney();

    this.loadMarket(() => {
      this.marketLoading.set(false);
    });
  }

  // ============================================================
  // CARD ACTION
  // ============================================================

  onPlayerCardAction(player: SquadPlayerInterface | MarketPlayerInterface): void {
    if (!this.isMarketPlayer(player)) {
      return;
    }

    this.selectedPlayer.set(player);

    this.modalAction.set(null);

    this.isModalOpen.set(true);
  }

  // ============================================================
  // BID
  // ============================================================

  onPlayerBid(player: SquadPlayerInterface | MarketPlayerInterface): void {
    if (!this.isMarketPlayer(player)) {
      return;
    }

    this.selectedPlayer.set(player);

    this.modalAction.set('buy-offer');

    this.isModalOpen.set(true);
  }

  // ============================================================
  // MODIFY BID
  // ============================================================

  onPlayerModifyBid(player: SquadPlayerInterface | MarketPlayerInterface): void {
    if (!this.isMarketPlayer(player)) {
      return;
    }

    this.selectedPlayer.set(player);

    this.modalAction.set('modify-bid');

    this.isModalOpen.set(true);
  }

  // ============================================================
  // CANCEL BID
  // ============================================================

  onPlayerCancelBid(player: SquadPlayerInterface | MarketPlayerInterface): void {
    if (!this.isMarketPlayer(player)) {
      return;
    }

    if (!player.bid) {
      return;
    }

    this.apiMarket.cancelBidMarket(player.id, player.bid.id).subscribe({
      next: () => {
        this.removeBidFromPlayer(player.playerMaster.id);
        this.toastr.success(
          'La puja para: ' + player.playerMaster.name + ' se ha Cancelado Correctamente!',
        );
        this.updateTeamMoney();
      },

      error: (error) => {
        console.error('Error cancelando puja:', error);
      },
    });
  }

  // ============================================================
  // BUY OFFER
  // ============================================================

  onBuyOffer(amount: number): void {
    const player = this.selectedPlayer();

    if (!player) {
      return;
    }

    this.apiMarket.makeBidMarket(player.id, amount).subscribe({
      next: (bid: any) => {
        this.addBidToPlayer(player.playerMaster.id, bid);

        this.toastr.success(
          'La puja para: ' + player.playerMaster.name + ' se ha realizado Correctamente!',
        );
        this.updateTeamMoney();
        this.closeModal();
      },

      error: (error) => {
        console.error('Error realizando puja:', error);
      },
    });
  }

  // ============================================================
  // MODIFY BID
  // ============================================================

  onModifyBid(amount: number): void {
    const player = this.selectedPlayer();

    if (!player?.bid) {
      return;
    }

    this.apiMarket.modifyBidMarket(player.id, amount, player.bid.id).subscribe({
      next: (bid: any) => {
        this.updateBidOnPlayer(player.playerMaster.id, bid);

        this.toastr.success(
          'Se ha Modificado correctamente la puja para: ' + player.playerMaster.nickname,
        );
        this.updateTeamMoney();
        this.closeModal();
      },

      error: (error) => {
        console.error('Error modificando puja:', error);
      },
    });
  }

  // ============================================================
  // CANCEL BID FROM MODAL
  // ============================================================

  onCancelBid(): void {
    const player = this.selectedPlayer();

    if (!player?.bid) {
      return;
    }

    this.onPlayerCancelBid(player);

    this.closeModal();
  }

  // ============================================================
  // CLOSE MODAL
  // ============================================================

  closeModal(): void {
    this.isModalOpen.set(false);

    this.selectedPlayer.set(null);

    this.modalAction.set(null);
  }

  // ============================================================
  // TYPE GUARD
  // ============================================================

  private isMarketPlayer(
    player: SquadPlayerInterface | MarketPlayerInterface,
  ): player is MarketPlayerInterface {
    return 'discr' in player;
  }

  // ============================================================
  // LOCAL BID STATE
  // ============================================================

  private addBidToPlayer(playerId: string, bid: MarketBidInterface): void {
    this.leagueMarket.update((players) =>
      players.map((player) =>
        player.playerMaster.id === playerId
          ? {
              ...player,

              bid,

              numberOfBids: player.numberOfBids + 1,
            }
          : player,
      ),
    );
  }

  private updateBidOnPlayer(playerId: string, bid: MarketBidInterface): void {
    this.leagueMarket.update((players) =>
      players.map((player) =>
        player.playerMaster.id === playerId
          ? {
              ...player,
              bid,
            }
          : player,
      ),
    );
  }

  private removeBidFromPlayer(playerId: string): void {
    this.leagueMarket.update((players) =>
      players.map((player) =>
        player.playerMaster.id === playerId
          ? {
              ...player,

              bid: undefined,

              numberOfBids: Math.max(0, player.numberOfBids - 1),
            }
          : player,
      ),
    );
  }

  // ============================================================
  // UPDATES
  // ============================================================

  private updateTeamMoney() {
    this.apiMoneyService.getTeamMoney(this.teamId()).subscribe({
      next: (data) => {},
      error: (err) => {
        console.error('Error al obtener el dinero del equipo:', err);
      },
    });
  }
}
