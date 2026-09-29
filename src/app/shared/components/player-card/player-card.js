import { __decorate } from 'tslib';
import { Component, computed, inject, Input, input, output, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { AppState } from '../../../core/states/app-state.state';
const POSITION_MAP = {
  1: 'PORTERO',
  2: 'DEFENSA',
  3: 'CENTROCAMPISTA',
  4: 'DELANTERO',
  5: 'ENTRENADOR',
};
let PlayerCard = class PlayerCard {
  players = input.required();
  appState = inject(AppState);
  config = {
    isOwnPlayer: true,
    isMarketOpen: true,
    hasShieldsAvailable: true,
  };
  onBid = output();
  onModifyBid = output();
  onCancelBid = output();
  /** SQUAD OR MARKET DATA **/
  squadData = computed(() => {
    const player = this.players();
    return 'buyoutClause' in player ? player : null;
  });
  marketData = computed(() => {
    const player = this.players();
    return 'discr' in player ? player : null;
  });
  playerTeam = computed(() => {
    const player = this.players().playerMaster;
    const teamId = player.teamId ?? player.team?.id;
    if (!teamId) {
      return undefined;
    }
    return this.appState.teams.getTeamById(String(teamId));
  });
  isShielded = computed(() => {
    const player = this.players();
    if ('isShielded' in player) {
      return player.isShielded;
    }
    return false;
  });
  onActionClick = output();
  // 1. Señales para controlar el texto y el estado de la cuenta atrás
  countdownText = signal('---');
  timerId = null;
  positionText = computed(() => {
    const player = this.players();
    if (!player || !player.playerMaster) return 'DESCONOCIDO';
    return POSITION_MAP[player.playerMaster.positionId] ?? 'DESCONOCIDO';
  });
  positionClass = computed(() => {
    const player = this.players();
    if (!player || !player.playerMaster) return '';
    const classMap = {
      1: 'por',
      2: 'df',
      3: 'cc',
      4: 'dl',
      5: 'ch',
    };
    return classMap[player.playerMaster.positionId] ?? '';
  });
  market = computed(() =>
    this.appState.market.getMarketTendenciesByPlayerId(this.players()?.playerMaster.id),
  );
  ngOnChanges(changes) {
    if (changes['players']) {
      this.startCountdown();
    }
  }
  ngOnDestroy() {
    this.clearTimer();
  }
  startCountdown() {
    this.clearTimer();
    const player = this.players();
    if (!player) {
      this.countdownText.set('SIN FECHA');
      return;
    }
    let endTimeStr;
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
  updateTime(endTimeStr) {
    const endTime = new Date(endTimeStr).getTime();
    const now = new Date().getTime();
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
    const pad = (num) => String(num).padStart(2, '0');
    if (days > 0) {
      this.countdownText.set(`${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
    } else {
      this.countdownText.set(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
    }
  }
  clearTimer() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }
  /** MARKET **/
  isMarketPlayer = computed(() => {
    return 'discr' in this.players();
  });
  hasBid = computed(() => {
    const player = this.players();
    if (!('discr' in player)) {
      return false;
    }
    return !!player.bid && player.bid.status === 'pending';
  });
  myBidAmount = computed(() => {
    const player = this.players();
    if (!('discr' in player) || !player.bid) {
      return null;
    }
    return player.bid.money;
  });
  numberOfBids = computed(() => {
    const player = this.players();
    if (!('discr' in player)) {
      return 0;
    }
    return player.numberOfBids ?? 0;
  });
  placeBid() {
    const player = this.players();
    if (!('discr' in player)) {
      return;
    }
    this.onBid.emit(player);
  }
  modifyBid() {
    const player = this.players();
    if (!('discr' in player)) {
      return;
    }
    this.onModifyBid.emit(player);
  }
  cancelBid() {
    const player = this.players();
    if (!('discr' in player)) {
      return;
    }
    this.onCancelBid.emit(player);
  }
};
__decorate([Input()], PlayerCard.prototype, 'config', void 0);
PlayerCard = __decorate(
  [
    Component({
      selector: 'app-player-card',
      imports: [DecimalPipe],
      templateUrl: './player-card.html',
      styleUrl: './player-card.scss',
    }),
  ],
  PlayerCard,
);
export { PlayerCard };
