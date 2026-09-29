import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-confirmation-modal',
  imports: [],
  templateUrl: './confirmation-modal.html',
  styleUrl: './confirmation-modal.scss',
})
export class ConfirmationModal {
  @Input() isOpen = false;

  @Input() title = '¿Estás seguro?';

  @Input() description = 'Esta acción modificará el estado del jugador.';

  @Input() confirmText = 'Confirmar';

  @Input() cancelText = 'Cancelar';

  @Input() eyebrow = '⚠️ ATENCIÓN';

  @Input() player?: {
    name: string;
    positionId?: string | number;
    image?: string;
    teamName?: string;
  };

  @Output() confirmed = new EventEmitter<void>();

  @Output() cancelled = new EventEmitter<void>();

  close(): void {
    this.cancelled.emit();
  }

  confirm(): void {
    this.confirmed.emit();
  }

  onOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }
}
