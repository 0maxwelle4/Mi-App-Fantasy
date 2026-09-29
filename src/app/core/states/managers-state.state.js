import { __decorate } from 'tslib';
import { Injectable, computed, signal } from '@angular/core';
let ManagersState = class ManagersState {
  _managers = signal([]);
  managers = this._managers.asReadonly();
  managersById = computed(() => {
    const map = new Map();
    for (const manager of this._managers()) {
      map.set(String(manager.id), manager);
    }
    return map;
  });
  setManagers(managers) {
    this._managers.set(managers);
  }
  addManager(manager) {
    this._managers.update((managers) => {
      if (managers.some((item) => String(item.id) === String(manager.id))) {
        return managers;
      }
      return [...managers, manager];
    });
  }
  getManagerById(managerId) {
    return this.managersById().get(String(managerId));
  }
  clear() {
    this._managers.set([]);
  }
};
ManagersState = __decorate(
  [
    Injectable({
      providedIn: 'root',
    }),
  ],
  ManagersState,
);
export { ManagersState };
