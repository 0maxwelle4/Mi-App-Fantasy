import { __decorate } from 'tslib';
import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map, filter, switchMap } from 'rxjs';
import { PlayerCard } from '../../shared/components/player-card/player-card';
import { ApiSquadService } from './services/api-squad.service';
import { PlayerModalComponent } from '../../shared/modals/player-modal/player-modal';
import { ToastrService } from 'ngx-toastr';
import { AppState } from '../../core/states/app-state.state';
let Squad = class Squad {
  appState = inject(AppState);
  apiSquad = inject(ApiSquadService);
  route = inject(ActivatedRoute);
  toastr = inject(ToastrService);
  // ==========================================================
  // LOADING
  // ==========================================================
  loading = signal(true);
  skeletons = Array.from({ length: 8 }, (_, index) => index);
  // ==========================================================
  // SQUAD
  // ==========================================================
  squad = signal(null);
  lineupId = toSignal(this.route.paramMap.pipe(map((params) => params.get('id'))));
  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => params.get('id')),
        filter((id) => !!id),
        switchMap((id) => {
          this.loading.set(true);
          return this.apiSquad.getSquad(id);
        }),
      )
      .subscribe({
        next: (squadData) => {
          this.squad.set(squadData);
          if (squadData) {
            this.appState.league.updateTeamValue(squadData.teamValue);
          }
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error al actualizar plantilla por URL:', error);
          this.loading.set(false);
        },
      });
  }
  // ==========================================================
  // MARKET ACTIONS
  // ==========================================================
  addToMarket(playerId, salePrice) {
    this.apiSquad.addToMarket(playerId, salePrice).subscribe({
      next: (response) => {
        this.squad.update((squad) => {
          if (!squad) {
            return squad;
          }
          return {
            ...squad,
            players: squad.players.map((player) => {
              if (player.playerTeamId !== playerId) {
                return player;
              }
              return {
                ...player,
                playerMarket: {
                  id: response.id,
                  salePrice: response.salePrice,
                  expirationDate: response.expirationDate,
                  numberOfOffers: response.numberOfOffers,
                  directOffer: response.directOffer,
                },
              };
            }),
          };
        });
        this.toastr.success('El Jugador ha sido añadido al mercado correctamente!');
        this.closeAllModals();
      },
      error: (error) => {
        console.error('Error poniendo jugador en venta:', error);
      },
    });
  }
  removeFromMarket(marketId) {
    this.apiSquad.removeFromMarket(marketId).subscribe({
      next: () => {
        this.squad.update((squad) => {
          if (!squad) {
            return squad;
          }
          return {
            ...squad,
            players: squad.players.map((player) => {
              if (player.playerMarket?.id !== marketId) {
                return player;
              }
              return {
                ...player,
                playerMarket: undefined,
              };
            }),
          };
        });
        this.toastr.success('El Jugador ha sido eliminado del mercado correctamente!');
        this.closeAllModals();
      },
      error: (error) => {
        console.error('Error al quitar al jugador del mercado:', error);
      },
    });
  }
  // ==========================================================
  // FILTERS / SORT
  // ==========================================================
  searchName = signal('');
  filterShielded = signal('ALL');
  sortBy = signal('NONE');
  // ==========================================================
  // COMPUTED
  // ==========================================================
  getNumShields = computed(() => {
    const squad = this.squad();
    if (!squad) {
      return 0;
    }
    return squad.players.filter((player) => player.isShielded).length;
  });
  playersList = computed(() => {
    const data = this.squad();
    return data ? data.players : [];
  });
  totalDifference24h = computed(() => {
    return this.playersList().reduce((total, player) => {
      const market = this.appState.market.getMarketTendenciesByPlayerId(player.playerMaster.id);
      return total + (market?.difference24h ?? 0);
    }, 0);
  });
  positionCounts = computed(() => {
    const players = this.playersList();
    const counts = {
      porters: 0,
      defenders: 0,
      midfielders: 0,
      forwards: 0,
      coaches: 0,
    };
    players.forEach((player) => {
      const id = player.playerMaster.positionId;
      if (id === 1) {
        counts.porters++;
      } else if (id === 2) {
        counts.defenders++;
      } else if (id === 3) {
        counts.midfielders++;
      } else if (id === 4) {
        counts.forwards++;
      } else if (id === 5) {
        counts.coaches++;
      }
    });
    return counts;
  });
  filteredPlayers = computed(() => {
    const players = this.playersList();
    const search = this.searchName().toLowerCase().trim();
    const shieldedFilter = this.filterShielded();
    const currentSort = this.sortBy();
    if (!players.length) {
      return [];
    }
    const result = players.filter((player) => {
      const matchesName = !search || player.playerMaster.name.toLowerCase().includes(search);
      const matchesShield =
        shieldedFilter === 'ALL' ||
        (shieldedFilter === 'SHIELDED' && player.isShielded) ||
        (shieldedFilter === 'NOT_SHIELDED' && !player.isShielded);
      return matchesName && matchesShield;
    });
    return [...result].sort((a, b) => {
      if (currentSort === 'NONE') {
        return 0;
      }
      if (currentSort === 'TREND_DESC' || currentSort === 'TREND_ASC') {
        const trendA =
          this.appState.market.getMarketTendenciesByPlayerId(a.playerMaster.id)?.difference24h ?? 0;
        const trendB =
          this.appState.market.getMarketTendenciesByPlayerId(b.playerMaster.id)?.difference24h ?? 0;
        return currentSort === 'TREND_DESC' ? trendB - trendA : trendA - trendB;
      }
      if (currentSort === 'POINTS_DESC' || currentSort === 'POINTS_ASC') {
        const pointsA = a.playerMaster.points ?? 0;
        const pointsB = b.playerMaster.points ?? 0;
        return currentSort === 'POINTS_DESC' ? pointsB - pointsA : pointsA - pointsB;
      }
      return 0;
    });
  });
  // ==========================================================
  // MODAL
  // ==========================================================
  isModalOpen = signal(false);
  selectedPlayer = signal(null);
  userBudget = signal(15000000);
  modalConfig = computed(() => {
    const player = this.selectedPlayer();
    if (!player) {
      return {
        isOwnPlayer: true,
        isMarketOpen: true,
        hasShieldsAvailable: true,
      };
    }
    return {
      isOwnPlayer: this.squad()?.teamMoney != null,
      isMarketOpen: !!player.playerMarket,
      hasShieldsAvailable: this.getNumShields() < 2,
    };
  });
  onPlayerCardAction(player) {
    if (!('buyoutClause' in player)) {
      return;
    }
    this.selectedPlayer.set(player);
    this.isModalOpen.set(true);
  }
  onActionSelected(actionId) {
    if (actionId === 'shield') {
      this.closeAllModals();
    }
  }
  closeAllModals() {
    this.isModalOpen.set(false);
    this.selectedPlayer.set(null);
  }
  onBuyOfferSubmitted(amount) {
    this.closeAllModals();
    // PONER UPDATE MONEY
  }
  onLoanRequestSubmitted() {
    this.closeAllModals();
    // PONER UPDATE MONEY
  }
};
Squad = __decorate(
  [
    Component({
      selector: 'app-squad',
      imports: [DecimalPipe, NgTemplateOutlet, PlayerCard, PlayerModalComponent],
      templateUrl: './squad.html',
      styleUrl: './squad.scss',
    }),
  ],
  Squad,
);
export { Squad };
