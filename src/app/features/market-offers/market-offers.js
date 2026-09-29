import { __decorate } from 'tslib';
import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe, DatePipe, UpperCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiMarketOffersService } from './services/api-market-offers.service';
import { ConfirmationModal } from '../../shared/modals/confirmation-modal/confirmation-modal';
import { ToastrService } from 'ngx-toastr';
import { ApiMoneyStatusService } from '../../shared/services/api-money-status.service';
import { AppState } from '../../core/states/app-state.state';
let MarketOffers = class MarketOffers {
  apiMarketOffers = inject(ApiMarketOffersService);
  appState = inject(AppState);
  // ============================================================
  // LOADING && INJECTS
  // ============================================================
  loadingMarket = signal(true);
  toastr = inject(ToastrService);
  apiMoneyService = inject(ApiMoneyStatusService);
  // ============================================================
  // MARKET
  // ============================================================
  leagueMarket = signal([]);
  // ============================================================
  // STATE
  // ============================================================
  preSelectedLeagueId = computed(() => this.appState.league.preSelectedLeague()?.id);
  teamMoney = computed(() => this.appState.league.preSelectedLeague()?.teamMoney ?? 0);
  teamValue = computed(() => this.appState.league.preSelectedLeague()?.teamValue ?? 0);
  teamId = computed(() => this.appState.league.preSelectedLeague()?.teamId ?? 0);
  totalOffersCount = computed(() => this.leagueMarket().length);
  activeBidsCount = computed(() => {
    return this.leagueMarket().reduce((sum, player) => sum + (player.numberOfBids ?? 0), 0);
  });
  // ============================================================
  // CONFIRMATION MODAL STATE
  // ============================================================
  confirmationOpen = signal(false);
  confirmationTitle = signal('');
  confirmationDescription = signal('');
  selectedPlayerForModal = signal(null);
  pendingAction = null;
  // ============================================================
  // INIT
  // ============================================================
  constructor() {
    this.loadMarket();
  }
  // ============================================================
  // API
  // ============================================================
  loadMarket() {
    this.loadingMarket.set(true);
    this.apiMarketOffers.getMarketWithOffers().subscribe({
      next: (marketWithOffers) => {
        const onlyWithOffers = (marketWithOffers ?? []).filter(
          (player) => Array.isArray(player.currentOffer) && player.currentOffer.length > 0,
        );
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
  getTeamByPlayer(player) {
    const teamId = player?.playerMaster?.teamId || player?.playerMaster?.team?.id;
    if (!teamId) {
      return undefined;
    }
    return this.appState.teams.getTeamById(String(teamId));
  }
  // ============================================================
  // CONFIRMATION MODAL HANDLERS
  // ============================================================
  openConfirmation(title, description, player, action) {
    this.confirmationTitle.set(title);
    this.confirmationDescription.set(description);
    this.selectedPlayerForModal.set(player);
    this.pendingAction = action;
    this.confirmationOpen.set(true);
  }
  onConfirmationSuccess() {
    if (this.pendingAction) {
      this.pendingAction();
    }
    this.closeConfirmation();
  }
  closeConfirmation() {
    this.confirmationOpen.set(false);
    this.pendingAction = null;
    this.selectedPlayerForModal.set(null);
  }
  // ============================================================
  // OFFER ACTIONS
  // ============================================================
  onAcceptOfferClick(player) {
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
  onRejectOfferClick(player) {
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
  acceptOffer(player) {
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
  rejectOffer(player) {
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
  removePlayerFromLocalList(playerId) {
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
};
MarketOffers = __decorate(
  [
    Component({
      selector: 'app-market-offers',
      imports: [DecimalPipe, DatePipe, UpperCasePipe, RouterLink, ConfirmationModal],
      templateUrl: './market-offers.html',
      styleUrl: './market-offers.scss',
    }),
  ],
  MarketOffers,
);
export { MarketOffers };
