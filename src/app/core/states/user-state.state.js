import { __decorate } from 'tslib';
import { Injectable, signal } from '@angular/core';
let UserState = class UserState {
  _user = signal(null);
  user = this._user.asReadonly();
  // ============================================================
  // SET USER
  // ============================================================
  setUser(user) {
    this._user.set(user);
  }
  // ============================================================
  // UPDATE USER
  // ============================================================
  updateUser(data) {
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
  clear() {
    this._user.set(null);
  }
};
UserState = __decorate(
  [
    Injectable({
      providedIn: 'root',
    }),
  ],
  UserState,
);
export { UserState };
