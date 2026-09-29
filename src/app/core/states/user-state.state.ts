import { Injectable, signal } from '@angular/core';

import { UserInterface } from '../../shared/interfaces/users/user.interface';

@Injectable({
  providedIn: 'root',
})
export class UserState {
  private readonly _user = signal<UserInterface | null>(null);

  readonly user = this._user.asReadonly();

  // ============================================================
  // SET USER
  // ============================================================

  setUser(user: UserInterface): void {
    this._user.set(user);
  }

  // ============================================================
  // UPDATE USER
  // ============================================================

  updateUser(data: Partial<UserInterface>): void {
    const currentUser = this._user();

    if (!currentUser) {
      return;
    }

    this._user.set({
      ...currentUser,
      ...data,
    });
  }

  // ============================================================
  // CLEAR
  // ============================================================

  clear(): void {
    this._user.set(null);
  }
}
