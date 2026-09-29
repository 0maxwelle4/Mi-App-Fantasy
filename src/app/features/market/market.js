import { __decorate } from 'tslib';
import { Component, computed, inject, signal } from '@angular/core';
import { PlayerCard } from '../../shared/components/player-card/player-card';
import { PlayerModalComponent } from '../../shared/modals/player-modal/player-modal';
import { ApiMarketService } from './services/api-market.service';
import { ToastrService } from 'ngx-toastr';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiMoneyStatusService } from '../../shared/services/api-money-status.service';
import { AppState } from '../../core/states/app-state.state';
let Market = class Market {
  // ============================================================
  // INJECTS
  // ============================================================
  apiMarket = inject(ApiMarketService);
  toastr = inject(ToastrService);
  appState = inject(AppState);
  apiMoneyService = inject(ApiMoneyStatusService);
  teamId = computed(() => this.appState.league.preSelectedLeague()?.teamId ?? 0);
  preSelectedLeagueId = computed(() => this.appState.league.preSelectedLeague()?.id);
  // ============================================================
  // LOADING
  // ============================================================
  loadingMarket = signal(true);
  teamMoney = computed(() => this.appState.league.preSelectedLeague()?.teamMoney ?? 0);
  teamValue = computed(() => this.appState.league.preSelectedLeague()?.teamValue ?? 0);
  activeBidsCount = computed(() => {
    return this.playersMarket().reduce((sum, player) => sum + (player.numberOfBids ?? 0), 0);
  });
  // Skeletons del mercado
  skeletonPlayers = Array.from({ length: 8 }, (_, index) => index);
  // ============================================================
  // FILTER & SORT STATE (SIGNALS)
  // ============================================================
  searchQuery = signal('');
  selectedPosition = signal('TODOS');
  selectedSort = signal('recent');
  // ============================================================
  // MARKET
  // ============================================================
  leagueMarket = signal([]);
  playersMarket = computed(() => {
    return this.leagueMarket().filter((player) => player.discr === 'marketPlayerLeague');
  });
  // NUEVO: Computed con soporte para la tendencia del appState
  filteredPlayers = computed(() => {
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
  selectedPlayer = signal(null);
  isModalOpen = signal(false);
  modalAction = signal(null);
  constructor() {
    this.loadMarket();
  }
  // ============================================================
  // LOAD MARKET
  // ============================================================
  loadMarket() {
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
      },
    });
  }
  // ============================================================
  // CARD ACTION
  // ============================================================
  onPlayerCardAction(player) {
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
  onPlayerBid(player) {
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
  onPlayerModifyBid(player) {
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
  onPlayerCancelBid(player) {
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
  onBuyOffer(amount) {
    const player = this.selectedPlayer();
    if (!player) {
      return;
    }
    this.apiMarket.makeBidMarket(player.id, amount).subscribe({
      next: (bid) => {
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
  onModifyBid(amount) {
    const player = this.selectedPlayer();
    if (!player?.bid) {
      return;
    }
    this.apiMarket.modifyBidMarket(player.id, amount, player.bid.id).subscribe({
      next: (bid) => {
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
  onCancelBid() {
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
  closeModal() {
    this.isModalOpen.set(false);
    this.selectedPlayer.set(null);
    this.modalAction.set(null);
  }
  // ============================================================
  // TYPE GUARD
  // ============================================================
  isMarketPlayer(player) {
    return 'discr' in player;
  }
  // ============================================================
  // LOCAL BID STATE
  // ============================================================
  addBidToPlayer(playerId, bid) {
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
  updateBidOnPlayer(playerId, bid) {
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
  removeBidFromPlayer(playerId) {
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
  updateTeamMoney() {
    this.apiMoneyService.getTeamMoney(this.teamId()).subscribe({
      next: (data) => {},
      error: (err) => {
        console.error('Error al obtener el dinero del equipo:', err);
      },
    });
  }
};
Market = __decorate(
  [
    Component({
      selector: 'app-market',
      imports: [PlayerCard, PlayerModalComponent, DecimalPipe, FormsModule, RouterLink],
      templateUrl: './market.html',
      styleUrl: './market.scss',
    }),
  ],
  Market,
);
export { Market };
