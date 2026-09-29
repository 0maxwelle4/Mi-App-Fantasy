import { __decorate } from 'tslib';
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ApiActivitiesService } from './services/api-activities.service';
import { EMPTY } from 'rxjs';
import { expand, reduce } from 'rxjs/operators';
let Activities = class Activities {
  apiActivities = inject(ApiActivitiesService);
  // Señal que contendrá TODOS los elementos combinados al finalizar
  leagueActivities = toSignal(this.getAllActivities());
  getAllActivities() {
    let currentPage = 0;
    return this.apiActivities.getLeagueActivities(currentPage).pipe(
      expand((response) => {
        // Si la API devuelve un array vacío, detenemos la recursión
        if (!response || response.length === 0) {
          return EMPTY;
        }
        // Si hay datos, incrementamos la página y llamamos al siguiente índice
        currentPage++;
        return this.apiActivities.getLeagueActivities(currentPage);
      }),
      // 'expand' emite los resultados de cada página por separado.
      // 'reduce' los junta todos en un único array final.
      reduce((acc, current) => [...acc, ...current], []),
    );
  }
};
Activities = __decorate(
  [
    Component({
      selector: 'app-activities',
      imports: [],
      templateUrl: './activities.html',
      styleUrl: './activities.scss',
    }),
  ],
  Activities,
);
export { Activities };
