import { Injectable, computed, signal } from '@angular/core';

import { ManagerInterface } from '../../shared/interfaces/users/manager.interface';

@Injectable({
  providedIn: 'root',
})
export class ManagersState {
  private readonly _managers = signal<ManagerInterface[]>([]);

  readonly managers = this._managers.asReadonly();

  readonly managersById = computed(() => {
    const map = new Map<string, ManagerInterface>();

    for (const manager of this._managers()) {
      map.set(String(manager.id), manager);
    }

    return map;
  });

  setManagers(managers: ManagerInterface[]): void {
    this._managers.set(managers);
  }

  addManager(manager: ManagerInterface): void {
    this._managers.update((managers) => {
      if (managers.some((item) => String(item.id) === String(manager.id))) {
        return managers;
      }

      return [...managers, manager];
    });
  }

  getManagerById(managerId: string): ManagerInterface | undefined {
    return this.managersById().get(String(managerId));
  }

  clear(): void {
    this._managers.set([]);
  }
}
