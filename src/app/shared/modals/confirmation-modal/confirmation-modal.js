import { __decorate } from 'tslib';
import { Component, EventEmitter, Input, Output } from '@angular/core';
let ConfirmationModal = class ConfirmationModal {
  isOpen = false;
  title = '¿Estás seguro?';
  description = 'Esta acción modificará el estado del jugador.';
  confirmText = 'Confirmar';
  cancelText = 'Cancelar';
  eyebrow = '⚠️ ATENCIÓN';
  player;
  confirmed = new EventEmitter();
  cancelled = new EventEmitter();
  close() {
    this.cancelled.emit();
  }
  confirm() {
    this.confirmed.emit();
  }
  onOverlayClick(event) {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }
};
__decorate([Input()], ConfirmationModal.prototype, 'isOpen', void 0);
__decorate([Input()], ConfirmationModal.prototype, 'title', void 0);
__decorate([Input()], ConfirmationModal.prototype, 'description', void 0);
__decorate([Input()], ConfirmationModal.prototype, 'confirmText', void 0);
__decorate([Input()], ConfirmationModal.prototype, 'cancelText', void 0);
__decorate([Input()], ConfirmationModal.prototype, 'eyebrow', void 0);
__decorate([Input()], ConfirmationModal.prototype, 'player', void 0);
__decorate([Output()], ConfirmationModal.prototype, 'confirmed', void 0);
__decorate([Output()], ConfirmationModal.prototype, 'cancelled', void 0);
ConfirmationModal = __decorate(
  [
    Component({
      selector: 'app-confirmation-modal',
      imports: [],
      templateUrl: './confirmation-modal.html',
      styleUrl: './confirmation-modal.scss',
    }),
  ],
  ConfirmationModal,
);
export { ConfirmationModal };
