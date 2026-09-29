import { Component, computed, inject, signal, Signal } from '@angular/core';
import { DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  EMPTY,
  Subject,
  catchError,
  combineLatest,
  filter,
  forkJoin,
  map,
  of,
  startWith,
  switchMap,
} from 'rxjs';

import { PlayerCard } from '../../shared/components/player-card/player-card';
import { ApiSquadService } from './services/api-squad.service';

import {
  PlayerModalComponent,
  PlayerActionType,
} from '../../shared/modals/player-modal/player-modal';

import { ConfirmationModal } from '../../shared/modals/confirmation-modal/confirmation-modal';

import { SquadPlayerInterface } from '../../shared/interfaces/squad/squad-player.interface';
import { MarketPlayerInterface } from '../../shared/interfaces/market/market-player.interface';
import { MarketBidInterface } from '../../shared/interfaces/market/market-bid.interface';
import { SquadInterface } from '../../shared/interfaces/squad/squad.interface';

import { ToastrService } from 'ngx-toastr';
import { AppState } from '../../core/states/app-state.state';
import { ApiMoneyStatusService } from '../../shared/services/api-money-status.service';

type SortOption = 'POINTS_DESC' | 'POINTS_ASC' | 'TREND_DESC' | 'TREND_ASC' | 'NONE';

@Component({
  selector: 'app-squad',
  imports: [
    DecimalPipe,
    NgTemplateOutlet,
    PlayerCard,
    PlayerModalComponent,
    ConfirmationModal,
    RouterLink,
  ],
  templateUrl: './squad.html',
  styleUrl: './squad.scss',
})
export class Squad {
  readonly appState = inject(AppState);

  private readonly apiSquad = inject(ApiSquadService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);
  private readonly apiMoneyService = inject(ApiMoneyStatusService);

  protected readonly teamId = Number(this.route.snapshot.paramMap.get('id'));

  get isPointsPage(): boolean {
    return this.router.url.includes('/points');
  }

  readonly preSelectedLeagueId = computed(() => this.appState.league.preSelectedLeague()?.id);

  // ==========================================================
  // LOADING / REFRESH
  // ==========================================================

  readonly loading = signal(true);

  readonly skeletons = Array.from({ length: 8 }, (_, index) => index);

  private readonly refresh$ = new Subject<void>();

  refresh(): void {
    if (this.loading()) return;

    this.refresh$.next();
    this.updateTeamMoney();
  }

  // ==========================================================
  // SQUAD
  // ==========================================================

  readonly squad = signal<SquadInterface | null>(null);

  readonly lineupId = toSignal(this.route.paramMap.pipe(map((params) => params.get('id'))));

  constructor() {
    this.updateTeamMoney();

    const teamId$ = this.route.paramMap.pipe(
      map((params) => params.get('id')),
      filter((id): id is string => !!id),
    );

    combineLatest([teamId$, this.refresh$.pipe(startWith(undefined))])
      .pipe(
        switchMap(([id]) => {
          this.loading.set(true);

          return this.apiSquad.getSquad(id).pipe(
            catchError((error) => {
              console.error('Error al actualizar plantilla:', error);
              this.loading.set(false);
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((squadData) => {
        this.squad.set(squadData);

        if (squadData) {
          this.appState.league.updateTeamValue(squadData.teamValue);
        }

        this.loading.set(false);
      });
  }

  // ==========================================================
  // MARKET ACTIONS (jugador propio)
  // ==========================================================

  addToMarket(playerId: string, salePrice: number): void {
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
      },

      error: (error) => {
        console.error('Error poniendo jugador en venta:', error);
      },
    });
  }

  removeFromMarket(marketId: string): void {
    this.apiSquad.removeFromMarket(marketId).subscribe({
      next: () => {
        this.squad.update((squad) => {
          if (!squad) {
            return squad;
          }

          return {
            ...squad,

            players: squad.players.map((player): SquadPlayerInterface => {
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
      },

      error: (error) => {
        console.error('Error al quitar al jugador del mercado:', error);
      },
    });
  }

  // ==========================================================
  // FILTERS / SORT
  // ==========================================================

  readonly searchName = signal<string>('');

  readonly filterShielded = signal<string>('ALL');

  readonly sortBy = signal<SortOption>('NONE');

  // ==========================================================
  // COMPUTED
  // ==========================================================

  readonly getNumShields = computed(() => {
    const squad = this.squad();

    if (!squad) {
      return 0;
    }

    return squad.players.filter((player) => player.isShielded).length;
  });

  readonly playersList: Signal<SquadPlayerInterface[]> = computed(() => {
    const data = this.squad();

    return data ? data.players : [];
  });

  readonly playersNotInMarket = computed(() => {
    return this.playersList().filter((player) => !player.playerMarket);
  });

  readonly playersInMarket = computed(() => {
    return this.playersList().filter((player) => !!player.playerMarket);
  });

  readonly totalDifference24h = computed(() => {
    return this.playersList().reduce((total, player) => {
      const market = this.appState.market.getMarketTendenciesByPlayerId(player.playerMaster.id);

      return total + (market?.difference24h ?? 0);
    }, 0);
  });

  readonly positionCounts = computed(() => {
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

  readonly filteredPlayers = computed(() => {
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
  // AÑADIR / QUITAR TODOS DEL MERCADO
  // ==========================================================

  readonly addAllConfirmationOpen = signal(false);
  readonly addAllConfirmationDescription = signal('');

  readonly removeAllConfirmationOpen = signal(false);
  readonly removeAllConfirmationDescription = signal('');

  openAddAllConfirmation(): void {
    const eligible = this.playersNotInMarket();

    if (!eligible.length) {
      this.toastr.info('Todos tus jugadores ya están en el mercado.');
      return;
    }

    const alreadyInMarket = this.playersInMarket().length;

    let description = `Se añadirán al mercado ${eligible.length} jugador(es), usando su valor de mercado actual como precio de venta.`;

    if (alreadyInMarket > 0) {
      description += ` Los ${alreadyInMarket} jugador(es) que ya están en venta se omitirán (no se tocan).`;
    }

    this.addAllConfirmationDescription.set(description);
    this.addAllConfirmationOpen.set(true);
  }

  onAddAllConfirmed(): void {
    const eligible = this.playersNotInMarket();

    this.addAllConfirmationOpen.set(false);

    this.bulkAddToMarket(eligible);
  }

  onAddAllCancelled(): void {
    this.addAllConfirmationOpen.set(false);
  }

  openRemoveAllConfirmation(): void {
    const eligible = this.playersInMarket();

    if (!eligible.length) {
      this.toastr.info('No tienes ningún jugador en el mercado actualmente.');
      return;
    }

    const notInMarket = this.playersNotInMarket().length;

    let description = `Se retirarán del mercado ${eligible.length} jugador(es). Se rechazarán TODAS las ofertas/pujas recibidas sobre esos jugadores.`;

    if (notInMarket > 0) {
      description += ` Los ${notInMarket} jugador(es) que no están en el mercado se omitirán.`;
    }

    this.removeAllConfirmationDescription.set(description);
    this.removeAllConfirmationOpen.set(true);
  }

  onRemoveAllConfirmed(): void {
    const eligible = this.playersInMarket();

    this.removeAllConfirmationOpen.set(false);

    this.bulkRemoveFromMarket(eligible);
  }

  onRemoveAllCancelled(): void {
    this.removeAllConfirmationOpen.set(false);
  }

  private bulkAddToMarket(players: SquadPlayerInterface[]): void {
    if (!players.length) {
      return;
    }

    const requests = players.map((player) =>
      this.apiSquad.addToMarket(player.playerTeamId, player.playerMaster.marketValue).pipe(
        map((response) => ({ playerTeamId: player.playerTeamId, response, error: null as any })),
        catchError((error) => {
          console.error('Error añadiendo jugador al mercado (bulk):', error);
          return of({ playerTeamId: player.playerTeamId, response: null as any, error });
        }),
      ),
    );

    forkJoin(requests).subscribe((results) => {
      const successful = results.filter((r) => !r.error);
      const failed = results.filter((r) => r.error);

      if (successful.length) {
        this.squad.update((squad) => {
          if (!squad) {
            return squad;
          }

          return {
            ...squad,

            players: squad.players.map((p): SquadPlayerInterface => {
              const match = successful.find((r) => r.playerTeamId === p.playerTeamId);

              if (!match) {
                return p;
              }

              return {
                ...p,

                playerMarket: {
                  id: match.response.id,
                  salePrice: match.response.salePrice,
                  expirationDate: match.response.expirationDate,
                  numberOfOffers: match.response.numberOfOffers,
                  directOffer: match.response.directOffer,
                },
              };
            }),
          };
        });

        this.toastr.success(`${successful.length} jugador(es) añadidos al mercado correctamente!`);
      }

      if (failed.length) {
        this.toastr.error(`No se pudo añadir ${failed.length} jugador(es) al mercado.`);
      }
    });
  }

  private bulkRemoveFromMarket(players: SquadPlayerInterface[]): void {
    if (!players.length) {
      return;
    }

    const requests = players.map((player) =>
      this.apiSquad.removeFromMarket(player.playerMarket!.id).pipe(
        map(() => ({ playerTeamId: player.playerTeamId, error: null as any })),
        catchError((error) => {
          console.error('Error quitando jugador del mercado (bulk):', error);
          return of({ playerTeamId: player.playerTeamId, error });
        }),
      ),
    );

    forkJoin(requests).subscribe((results) => {
      const successful = results.filter((r) => !r.error);
      const failed = results.filter((r) => r.error);

      if (successful.length) {
        this.squad.update((squad) => {
          if (!squad) {
            return squad;
          }

          return {
            ...squad,

            players: squad.players.map((p): SquadPlayerInterface => {
              const match = successful.find((r) => r.playerTeamId === p.playerTeamId);

              if (!match) {
                return p;
              }

              return {
                ...p,
                playerMarket: undefined,
              };
            }),
          };
        });

        this.toastr.success(
          `${successful.length} jugador(es) retirados del mercado correctamente!`,
        );
      }

      if (failed.length) {
        this.toastr.error(`No se pudo retirar ${failed.length} jugador(es) del mercado.`);
      }
    });
  }

  // ==========================================================
  // MODAL
  // ==========================================================

  readonly selectedPlayer = signal<SquadPlayerInterface | null>(null);

  readonly isModalOpen = signal(false);

  readonly modalAction = signal<PlayerActionType | null>(null);

  onRaiseClauseClick(player: SquadPlayerInterface): void {
    this.selectedPlayer.set(player);

    this.modalAction.set('raise-clause');

    this.isModalOpen.set(true);
  }

  // ==========================================================
  // AUMENTAR CLÁUSULA — CONFIRMACIÓN
  // ==========================================================

  readonly raiseClauseConfirmationOpen = signal(false);

  readonly raiseClauseConfirmationTitle = signal('¿Aumentar cláusula?');

  readonly raiseClauseConfirmationDescription = signal('');

  readonly raiseClauseConfirmationPlayer = signal<{
    name: string;
    positionId?: string | number;
    image?: string;
    teamName?: string;
  }>({ name: '' });

  private pendingRaiseClause: {
    player: SquadPlayerInterface;
    amount: number;
  } | null = null;

  onRaiseClauseSubmit(amount: number): void {
    const player = this.selectedPlayer();

    if (!player) {
      return;
    }

    const currentClause = player.buyoutClause;
    const increaseValue = amount * 2;
    const newClause = currentClause + increaseValue;

    const formattedAmount = new Intl.NumberFormat('es-ES').format(amount);

    const formattedIncrease = new Intl.NumberFormat('es-ES').format(increaseValue);

    const formattedCurrentClause = new Intl.NumberFormat('es-ES').format(currentClause);

    const formattedNewClause = new Intl.NumberFormat('es-ES').format(newClause);

    this.pendingRaiseClause = {
      player,
      amount,
    };

    this.raiseClauseConfirmationTitle.set(`¿Aumentar cláusula de ${player.playerMaster.name}?`);

    this.raiseClauseConfirmationDescription.set(
      `Cantidad a pagar: ${formattedAmount}€ (se descontará de tu presupuesto) · ` +
        `Multiplicador: x2 · ` +
        `Valor del aumento: ${formattedIncrease}€ · ` +
        `Cláusula actual: ${formattedCurrentClause}€ · ` +
        `Nueva cláusula: ${formattedNewClause}€`,
    );

    this.raiseClauseConfirmationPlayer.set({
      name: player.playerMaster.name,
      positionId: player.playerMaster.positionId,
      image: player.playerMaster.images?.transparent?.['256x256'],
      teamName: player.playerMaster.team?.name,
    });

    this.closeModal();

    this.raiseClauseConfirmationOpen.set(true);
  }

  onRaiseClauseConfirmed(): void {
    const pending = this.pendingRaiseClause;

    if (!pending) {
      this.closeRaiseClauseConfirmation();
      return;
    }

    const { player, amount } = pending;

    this.apiSquad.raiseReleaseClause(player.playerTeamId, amount).subscribe({
      next: () => {
        const newBuyoutClause = player.buyoutClause + amount * 2;

        this.squad.update((squad) => {
          if (!squad) {
            return squad;
          }

          return {
            ...squad,

            players: squad.players.map((p): SquadPlayerInterface => {
              if (p.playerTeamId !== player.playerTeamId) {
                return p;
              }

              return {
                ...p,
                buyoutClause: newBuyoutClause,
              };
            }),
          };
        });

        this.toastr.success(
          `Se ha aumentado la cláusula de ${player.playerMaster.name} a ${new Intl.NumberFormat('es-ES').format(newBuyoutClause)}€`,
        );

        this.closeRaiseClauseConfirmation();
      },

      error: (error) => {
        console.error('Error aumentando cláusula:', error);

        this.closeRaiseClauseConfirmation();
      },
    });
  }

  onRaiseClauseCancelled(): void {
    this.closeRaiseClauseConfirmation();
  }

  private closeRaiseClauseConfirmation(): void {
    this.raiseClauseConfirmationOpen.set(false);

    this.pendingRaiseClause = null;
  }

  // ==========================================================
  // AÑADIR AL MERCADO
  // ==========================================================

  onAddToMarketClick(player: SquadPlayerInterface): void {
    this.selectedPlayer.set(player);

    this.modalAction.set('add-to-market');

    this.isModalOpen.set(true);
  }

  onAddToMarketSubmit(salePrice: number): void {
    const player = this.selectedPlayer();

    if (!player) {
      return;
    }

    this.addToMarket(player.playerTeamId, salePrice);

    this.closeModal();
  }

  // ==========================================================
  // PUJAR / MODIFICAR / CANCELAR / CLAUSULADO
  // ==========================================================

  // ==========================================================
  // CLAUSULADO — CONFIRMACIÓN
  // ==========================================================

  readonly buyoutConfirmationOpen = signal(false);

  readonly buyoutConfirmationTitle = signal('¿Ejecutar cláusula?');

  readonly buyoutConfirmationDescription = signal('');

  readonly buyoutConfirmationPlayer = signal<{
    name: string;
    positionId?: string | number;
    image?: string;
    teamName?: string;
  }>({ name: '' });

  private pendingBuyout: {
    player: SquadPlayerInterface;
  } | null = null;

  onPlayerBuyout(player: SquadPlayerInterface | MarketPlayerInterface): void {
    if (!this.isSquadPlayer(player)) {
      return;
    }

    const clauseToPay = player.buyoutClause;

    const formattedClause = new Intl.NumberFormat('es-ES').format(clauseToPay);

    this.pendingBuyout = {
      player,
    };

    this.buyoutConfirmationTitle.set(`¿Ejecutar cláusula de ${player.playerMaster.name}?`);

    this.buyoutConfirmationDescription.set(
      `Vas a pagar ${formattedClause}€. ` +
        `El importe se descontará de tu presupuesto y el jugador pasará a tu plantilla.`,
    );

    this.buyoutConfirmationPlayer.set({
      name: player.playerMaster.name,
      positionId: player.playerMaster.positionId,
      image: player.playerMaster.images?.transparent?.['256x256'],
      teamName: player.playerMaster.team?.name,
    });

    this.buyoutConfirmationOpen.set(true);
  }

  onBuyoutConfirmed(): void {
    const pending = this.pendingBuyout;

    if (!pending) {
      this.closeBuyoutConfirmation();
      return;
    }

    const { player } = pending;

    const marketId = player.playerTeamId;
    const clauseToPay = player.buyoutClause;

    this.apiSquad.buyoutClause(clauseToPay, marketId).subscribe({
      next: () => {
        this.toastr.success(
          'La cláusula para: ' + player.playerMaster.name + ' se ha ejecutado correctamente!',
        );

        this.closeBuyoutConfirmation();
      },

      error: (error) => {
        this.toastr.error('No se ha podido ejecutar la cláusula!' + error.error.message);

        console.error('Error ejecutando cláusula sobre jugador rival:', +error);

        this.closeBuyoutConfirmation();
      },
    });
  }

  onBuyoutCancelled(): void {
    this.closeBuyoutConfirmation();
  }

  private closeBuyoutConfirmation(): void {
    this.buyoutConfirmationOpen.set(false);

    this.pendingBuyout = null;
  }

  // ==========================================================
  // PUJA DIRECTA
  // ==========================================================

  onPlayerBid(player: SquadPlayerInterface | MarketPlayerInterface): void {
    if (!this.isSquadPlayer(player)) {
      return;
    }

    this.selectedPlayer.set(player);

    this.modalAction.set('buy-offer');

    this.isModalOpen.set(true);
  }

  onPlayerModifyBid(player: SquadPlayerInterface | MarketPlayerInterface): void {
    if (!this.isSquadPlayer(player)) {
      return;
    }

    this.selectedPlayer.set(player);

    this.modalAction.set('modify-bid');

    this.isModalOpen.set(true);
  }

  onPlayerCancelBid(player: SquadPlayerInterface | MarketPlayerInterface): void {
    if (!this.isSquadPlayer(player) || !player.playerMarket?.offer) {
      return;
    }

    const marketId = player.playerMarket.id;
    const offerId = player.playerMarket.offer.id;

    this.apiSquad.cancelDirectOffer(marketId, offerId).subscribe({
      next: () => {
        this.removeOfferFromPlayer(player.playerTeamId);

        this.toastr.success(
          'La puja para: ' + player.playerMaster.name + ' se ha cancelado correctamente!',
        );
      },

      error: (error) => {
        console.error('Error cancelando puja sobre jugador rival:', error);
      },
    });
  }

  onBuyOffer(amount: number): void {
    const player = this.selectedPlayer();

    if (!player || !player.playerMarket) {
      return;
    }

    this.apiSquad.makeDirectOffer(player.playerMarket.id, amount).subscribe({
      next: (bid: MarketBidInterface) => {
        this.addOfferToPlayer(player.playerTeamId, bid);

        this.toastr.success(
          'La puja para: ' + player.playerMaster.name + ' se ha realizado correctamente!',
        );

        this.closeModal();
      },

      error: (error) => {
        console.error('Error realizando puja sobre jugador rival:', error);
      },
    });
  }

  onModifyBid(amount: number): void {
    const player = this.selectedPlayer();

    if (!player?.playerMarket?.offer) {
      return;
    }

    const marketId = player.playerMarket.id;
    const offerId = player.playerMarket.offer.id;

    this.apiSquad.modifyDirectOffer(offerId, marketId, amount).subscribe({
      next: (bid: any) => {
        this.updateOfferOnPlayer(player.playerTeamId, {
          ...player.playerMarket!.offer!,
          money: amount,
          updatedAt: bid?.updatedAt ?? new Date().toISOString(),
        });

        this.toastr.success(
          'Se ha modificado correctamente la puja para: ' + player.playerMaster.nickname,
        );

        this.closeModal();
      },

      error: (error) => {
        console.error('Error modificando puja sobre jugador rival:', error);
      },
    });
  }

  onCancelBid(): void {
    const player = this.selectedPlayer();

    if (!player?.playerMarket?.offer) {
      return;
    }

    this.onPlayerCancelBid(player);

    this.closeModal();
  }

  // ==========================================================
  // HELPERS
  // ==========================================================

  private isSquadPlayer(
    player: SquadPlayerInterface | MarketPlayerInterface,
  ): player is SquadPlayerInterface {
    return 'buyoutClause' in player;
  }

  private addOfferToPlayer(playerTeamId: string, offer: MarketBidInterface): void {
    this.squad.update((squad) => {
      if (!squad) {
        return squad;
      }

      return {
        ...squad,

        players: squad.players.map((player) => {
          if (player.playerTeamId !== playerTeamId || !player.playerMarket) {
            return player;
          }

          return {
            ...player,

            playerMarket: {
              ...player.playerMarket,
              offer,
              numberOfOffers: (player.playerMarket.numberOfOffers ?? 0) + 1,
            },
          };
        }),
      };
    });
  }

  private updateOfferOnPlayer(playerTeamId: string, offer: MarketBidInterface): void {
    this.squad.update((squad) => {
      if (!squad) {
        return squad;
      }

      return {
        ...squad,

        players: squad.players.map((player) => {
          if (player.playerTeamId !== playerTeamId || !player.playerMarket) {
            return player;
          }

          return {
            ...player,

            playerMarket: {
              ...player.playerMarket,
              offer,
            },
          };
        }),
      };
    });
  }

  private removeOfferFromPlayer(playerTeamId: string): void {
    this.squad.update((squad) => {
      if (!squad) {
        return squad;
      }

      return {
        ...squad,

        players: squad.players.map((player) => {
          if (player.playerTeamId !== playerTeamId || !player.playerMarket) {
            return player;
          }

          return {
            ...player,

            playerMarket: {
              ...player.playerMarket,
              offer: undefined,
              numberOfOffers: Math.max(0, (player.playerMarket.numberOfOffers ?? 0) - 1),
            },
          };
        }),
      };
    });
  }

  // ==========================================================
  // CERRAR PLAYER MODAL
  // ==========================================================

  closeModal(): void {
    this.isModalOpen.set(false);

    this.selectedPlayer.set(null);

    this.modalAction.set(null);
  }

  // ============================================================
  // UPDATES
  // ============================================================

  updateTeamMoney() {
    this.apiMoneyService.getTeamMoney(this.teamId).subscribe({
      next: (data) => {},
      error: (err) => {
        console.error('Error al obtener el dinero del equipo:', err);
      },
    });
  }
}
