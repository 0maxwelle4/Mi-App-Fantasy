import { __decorate } from 'tslib';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  EventEmitter,
  HostListener,
  inject,
  Input,
  Output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfirmationModal } from '../../modals/confirmation-modal/confirmation-modal';
import { ApiMoneyStatusService } from '../../services/api-money-status.service';
import { AppState } from '../../../core/states/app-state.state';
let PlayerModalComponent = class PlayerModalComponent {
  // ============================================================
  // INPUTS
  // ============================================================
  isOpen = false;
  player;
  config = {
    isOwnPlayer: true,
    isMarketOpen: true,
    hasShieldsAvailable: true,
  };
  /**
   * Permite abrir directamente una acción.
   *
   * Ejemplo:
   *
   * 'buy-offer'  -> abre directamente el formulario de puja
   * 'modify-bid' -> abre directamente el formulario de modificar
   */
  initialAction = null;
  minPrice = 0;
  budget = 0;
  // ============================================================
  // OUTPUTS
  // ============================================================
  closed = new EventEmitter();
  actionSelected = new EventEmitter();
  buyOffer = new EventEmitter();
  modifyBid = new EventEmitter();
  cancelBid = new EventEmitter();
  loanRequest = new EventEmitter();
  addToMarket = new EventEmitter();
  removeFromMarket = new EventEmitter();
  // ============================================================
  // SERVICES
  // ============================================================
  appState = inject(AppState);
  apiMoneyService = inject(ApiMoneyStatusService);
  // ============================================================
  // STATE
  // ============================================================
  currentStep = signal('ACTIONS');
  currentAction = signal(null);
  amount = null;
  // ============================================================
  // TEAM DATA
  // ============================================================
  teamMoney = computed(() => this.appState.league.preSelectedLeague()?.teamMoney ?? 0);
  teamId = computed(() => this.appState.league.preSelectedLeague()?.teamId ?? 0);
  teamValue = computed(() => this.appState.league.preSelectedLeague()?.teamValue ?? 0);
  maxBid = computed(() => this.teamMoney() + 0.2 * this.teamValue());
  // ============================================================
  // CONFIRMATION MODAL
  // ============================================================
  confirmationOpen = signal(false);
  confirmationTitle = signal('');
  confirmationDescription = signal('');
  // Almacena la función que se ejecutará si el usuario confirma
  pendingAction = null;
  openConfirmation(title, description, action) {
    this.confirmationTitle.set(title);
    this.confirmationDescription.set(description);
    this.pendingAction = action;
    this.confirmationOpen.set(true);
  }
  onConfirmationSuccess() {
    if (this.pendingAction) {
      this.pendingAction(); // Ejecuta la acción guardada (ej: removePlayerFromMarket o onSubmitImmediateSell)
    }
    this.closeConfirmation();
  }
  closeConfirmation() {
    this.confirmationOpen.set(false);
    this.pendingAction = null;
  }
  // ============================================================
  // PLAYER DATA
  // ============================================================
  isMarketPlayer = computed(() => {
    return 'discr' in this.player;
  });
  /**
   * Buyout para ambos tipos.
   */
  buyoutClause = computed(() => {
    const player = this.player;
    if (!player) {
      return 0;
    }
    if ('buyoutClause' in player) {
      return player.buyoutClause;
    }
    return player.playerTeam.buyoutClause;
  });
  /**
   * Fecha de bloqueo para ambos tipos.
   */
  buyoutClauseLockedEndTime = computed(() => {
    const player = this.player;
    if (!player) {
      return null;
    }
    if ('buyoutClauseLockedEndTime' in player) {
      return player.buyoutClauseLockedEndTime;
    }
    return player.playerTeam.buyoutClauseLockedEndTime;
  });
  /**
   * Blindaje para ambos tipos.
   */
  isShielded = computed(() => {
    const player = this.player;
    if (!player) {
      return false;
    }
    if ('isShielded' in player) {
      return player.isShielded;
    }
    return player.playerTeam.isShielded;
  });
  // ============================================================
  // LIFECYCLE
  // ============================================================
  ngOnChanges(changes) {
    if (
      (changes['isOpen']?.currentValue === true || changes['player']) &&
      this.player?.playerMaster
    ) {
      if (this.initialAction === 'modify-bid' && this.player.bid) {
        // MODIFICAR → usar la puja anterior
        this.amount = this.player.bid.money;
      } else {
        // PUJA NUEVA → usar valor de mercado
        this.amount = this.player.playerMaster.marketValue;
      }
      // Abrir directamente el paso correspondiente
      if (this.isOpen && this.initialAction) {
        this.currentAction.set(this.initialAction);
        if (this.initialAction === 'buy-offer' || this.initialAction === 'modify-bid') {
          this.currentStep.set('OFFER');
        }
      }
    }
  }
  // ============================================================
  // ACTIONS
  // ============================================================
  selectAction(actionId) {
    this.actionSelected.emit(actionId);
    this.currentAction.set(actionId);
    switch (actionId) {
      case 'buy-offer':
      case 'modify-bid':
      case 'loan-offer':
      case 'add-to-market':
      case 'raise-clause':
        {
          this.currentStep.set('OFFER');
        }
        break;
      case 'sell-now': {
        const halfValue = this.player.playerMaster.marketValue / 2;
        const formattedValue = new Intl.NumberFormat('es-ES', {
          maximumFractionDigits: 0,
        }).format(halfValue);
        this.openConfirmation(
          `¿Venta Inmediata de ${this.player.playerMaster.name}?`,
          `¡Atención! Estás a punto de vender a ${this.player.playerMaster.name} de forma inmediata por ${formattedValue}€. Se pagará el 50 % del valor de mercado. ¿Estás seguro?`,
          () => this.onSubmitImmediateSell(),
        );
        break;
      }
      case 'remove-from-market': {
        if (!this.isSquadPlayer() || !this.player.playerMarket) {
          return;
        }
        this.openConfirmation(
          '¿Retirar del Mercado?',
          `Estás a punto de retirar a ${this.player.playerMaster.nickname} del mercado. Se rechazarán todas las ofertas recibidas.`,
          () => this.removePlayerFromMarket(),
        );
        break;
      }
      default:
        this.close();
        break;
    }
  }
  // ============================================================
  // DIRECT BID ACTION
  // ============================================================
  openBid(action) {
    this.currentAction.set(action);
    this.currentStep.set('OFFER');
    this.amount = this.player.playerMaster.marketValue;
  }
  // ============================================================
  // OFFER
  // ============================================================
  submitBuyOffer() {
    if (this.amount === null || this.amount <= 0) {
      return;
    }
    if (this.currentAction() === 'modify-bid') {
      this.modifyBid.emit(this.amount);
    } else {
      this.buyOffer.emit(this.amount);
    }
    this.close();
  }
  // ============================================================
  // CANCEL BID
  // ============================================================
  submitCancelBid() {
    this.cancelBid.emit();
    this.close();
  }
  // ============================================================
  // LOAN
  // ============================================================
  submitLoanRequest() {
    this.loanRequest.emit();
    this.close();
  }
  // ============================================================
  // SELL
  // ============================================================
  onSubmitImmediateSell() {
    console.log('Venta inmediata:', this.player);
    this.close();
  }
  // ============================================================
  // MARKET
  // ============================================================
  addMarket() {
    if (!this.isSquadPlayer()) {
      return;
    }
    this.addToMarket.emit({
      playerId: this.player.playerTeamId,
      salePrice: this.amount || 0,
    });
    this.close();
  }
  removePlayerFromMarket() {
    if (!this.isSquadPlayer()) {
      return;
    }
    if (!this.player.playerMarket) {
      return;
    }
    this.removeFromMarket.emit({
      marketId: this.player.playerMarket.id,
    });
    this.close();
  }
  // ============================================================
  // TYPE GUARDS
  // ============================================================
  isSquadPlayer() {
    return !!this.player && 'buyoutClause' in this.player;
  }
  // ============================================================
  // CLAUSE
  // ============================================================
  isClauseUnlocked(endTimeString) {
    if (!endTimeString) {
      return false;
    }
    const endTime = new Date(endTimeString).getTime();
    return Date.now() > endTime;
  }
  // ============================================================
  // NAVIGATION
  // ============================================================
  goBack() {
    this.currentStep.set('ACTIONS');
    this.currentAction.set(null);
    this.amount = this.player?.playerMaster?.marketValue ?? null;
  }
  close() {
    this.currentStep.set('ACTIONS');
    this.currentAction.set(null);
    this.amount = null;
    this.closed.emit();
  }
  // ============================================================
  // OVERLAY
  // ============================================================
  onOverlayClick(event) {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }
  // ============================================================
  // ESC
  // ============================================================
  onEscape() {
    if (this.isOpen) {
      this.close();
    }
  }
};
__decorate([Input()], PlayerModalComponent.prototype, 'isOpen', void 0);
__decorate([Input({ required: true })], PlayerModalComponent.prototype, 'player', void 0);
__decorate([Input()], PlayerModalComponent.prototype, 'config', void 0);
__decorate([Input()], PlayerModalComponent.prototype, 'initialAction', void 0);
__decorate([Input()], PlayerModalComponent.prototype, 'minPrice', void 0);
__decorate([Input()], PlayerModalComponent.prototype, 'budget', void 0);
__decorate([Output()], PlayerModalComponent.prototype, 'closed', void 0);
__decorate([Output()], PlayerModalComponent.prototype, 'actionSelected', void 0);
__decorate([Output()], PlayerModalComponent.prototype, 'buyOffer', void 0);
__decorate([Output()], PlayerModalComponent.prototype, 'modifyBid', void 0);
__decorate([Output()], PlayerModalComponent.prototype, 'cancelBid', void 0);
__decorate([Output()], PlayerModalComponent.prototype, 'loanRequest', void 0);
__decorate([Output()], PlayerModalComponent.prototype, 'addToMarket', void 0);
__decorate([Output()], PlayerModalComponent.prototype, 'removeFromMarket', void 0);
__decorate(
  [HostListener('document:keydown.escape')],
  PlayerModalComponent.prototype,
  'onEscape',
  null,
);
PlayerModalComponent = __decorate(
  [
    Component({
      selector: 'app-player-modal',
      standalone: true,
      imports: [CommonModule, FormsModule, ConfirmationModal],
      templateUrl: './player-modal.html',
      styleUrls: ['./player-modal.scss'],
      changeDetection: ChangeDetectionStrategy.OnPush,
    }),
  ],
  PlayerModalComponent,
);
export { PlayerModalComponent };
