import {
  ChangeDetectionStrategy,
  Component,
  computed,
  EventEmitter,
  HostListener,
  inject,
  Input,
  OnChanges,
  Output,
  signal,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SquadPlayerInterface } from '../../interfaces/squad/squad-player.interface';
import { MarketPlayerInterface } from '../../interfaces/market/market-player.interface';
import { AppState } from '../../../core/states/app-state.state';

export type PlayerActionType = 'buy-offer' | 'modify-bid' | 'raise-clause' | 'add-to-market';

type Player = SquadPlayerInterface | MarketPlayerInterface;

@Component({
  selector: 'app-player-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './player-modal.html',
  styleUrls: ['./player-modal.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerModalComponent implements OnChanges {
  // ============================================================
  // INPUTS
  // ============================================================

  @Input() isOpen = false;

  @Input({ required: true })
  player!: Player;

  /**
   * Acción con la que se abre el modal directamente.
   * 'buy-offer' / 'modify-bid' → pujas (mercado u oferta directa sobre jugador rival).
   * 'raise-clause' → aumentar la cláusula de tu jugador.
   * 'add-to-market' → poner tu jugador a la venta.
   */
  @Input()
  initialAction: PlayerActionType | null = null;

  // ============================================================
  // OUTPUTS
  // ============================================================

  @Output()
  closed = new EventEmitter<void>();

  @Output()
  buyOffer = new EventEmitter<number>();

  @Output()
  modifyBid = new EventEmitter<number>();

  @Output()
  cancelBid = new EventEmitter<void>();

  @Output()
  raiseClause = new EventEmitter<number>();

  @Output()
  addToMarket = new EventEmitter<number>();

  // ============================================================
  // SERVICES
  // ============================================================

  private readonly appState = inject(AppState);

  // ============================================================
  // STATE
  // ============================================================

  readonly currentAction = signal<PlayerActionType | null>(null);

  amount: number | null = null;

  // ============================================================
  // TEAM DATA
  // ============================================================

  readonly teamMoney = computed(() => this.appState.league.preSelectedLeague()?.teamMoney ?? 0);
  readonly teamId = computed(() => this.appState.league.preSelectedLeague()?.teamId ?? 0);
  readonly teamValue = computed(() => this.appState.league.preSelectedLeague()?.teamValue ?? 0);

  /**
   * Puja máxima "de mercado" (fórmula histórica): solo se usa cuando se puja
   * sobre un jugador que SÍ está en el Mercado (tiene `discr`).
   */
  readonly maxBid = computed(() => this.teamMoney() + 0.2 * this.teamValue());

  /**
   * Cláusula actual del jugador (aplica tanto a tu propio jugador —Aumentar Cláusula/
   * Añadir a Mercado— como a un jugador rival de una plantilla —Oferta Directa—).
   */
  readonly buyoutClause = computed(() => {
    const player = this.player;

    if (!player) {
      return 0;
    }

    if ('buyoutClause' in player) {
      return player.buyoutClause;
    }

    return 0;
  });

  /**
   * true cuando la puja/modificación es una OFERTA DIRECTA sobre un jugador de
   * plantilla (rival) — es decir, el jugador tiene `buyoutClause` en vez de `discr`.
   * false cuando el jugador es de Mercado.
   */
  readonly isDirectOffer = computed(() => {
    const player = this.player;

    return !!player && 'buyoutClause' in player;
  });

  // ============================================================
  // LIFECYCLE
  // ============================================================

  ngOnChanges(changes: SimpleChanges): void {
    if (
      (changes['isOpen']?.currentValue === true || changes['player']) &&
      this.player?.playerMaster
    ) {
      if (this.initialAction === 'modify-bid' && this.player.bid) {
        // MODIFICAR (mercado) → usar la puja anterior
        this.amount = this.player.bid.money;
      } else if (
        this.initialAction === 'modify-bid' &&
        'playerMarket' in this.player &&
        this.player.playerMarket?.offer
      ) {
        // MODIFICAR (oferta directa sobre jugador rival) → usar la puja anterior
        this.amount = this.player.playerMarket.offer.money;
      } else if (this.initialAction === 'raise-clause') {
        // AUMENTAR CLAUSULA → partir de 0 (cantidad a invertir)
        this.amount = 0;
      } else {
        // PUJA NUEVA (mercado) / AÑADIR AL MERCADO → usar valor de mercado
        this.amount = this.player.playerMaster.marketValue;
      }

      if (this.isOpen && this.initialAction) {
        this.currentAction.set(this.initialAction);
      }
    }
  }

  // ============================================================
  // AUMENTAR CLÁUSULA — cálculo de la nueva cláusula
  // ============================================================

  /**
   * Nueva cláusula resultante = (cantidad invertida * 2) + cláusula actual.
   */
  newClauseAmount(): number {
    return (this.amount ?? 0) * 2 + this.buyoutClause();
  }

  // ============================================================
  // VALIDACIÓN
  // ============================================================

  isValidAmount(): boolean {
    if (this.amount === null || this.amount <= 0) {
      return false;
    }

    const action = this.currentAction();

    if (action === 'raise-clause' || action === 'add-to-market') {
      return this.amount > 0;
    }

    // buy-offer / modify-bid
    if (this.isDirectOffer()) {
      // Oferta directa sobre jugador rival: entre la cláusula actual y tu presupuesto
      return this.amount >= this.player.playerMaster.marketValue && this.amount <= this.teamMoney();
    }

    // Puja de mercado
    return this.amount >= this.player.playerMaster.marketValue && this.amount <= this.maxBid();
  }

  // ============================================================
  // SUBMIT
  // ============================================================

  submit(): void {
    if (!this.isValidAmount() || this.amount === null) {
      return;
    }

    const action = this.currentAction();

    if (action === 'modify-bid') {
      this.modifyBid.emit(this.amount);
    } else if (action === 'raise-clause') {
      this.raiseClause.emit(this.amount);
    } else if (action === 'add-to-market') {
      this.addToMarket.emit(this.amount);
    } else {
      this.buyOffer.emit(this.amount);
    }

    this.close();
  }

  // ============================================================
  // CANCEL BID
  // ============================================================

  submitCancelBid(): void {
    this.cancelBid.emit();

    this.close();
  }

  close(): void {
    this.currentAction.set(null);

    this.amount = null;

    this.closed.emit();
  }

  // ============================================================
  // OVERLAY
  // ============================================================

  onOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  // ============================================================
  // ESC
  // ============================================================

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen) {
      this.close();
    }
  }
}
