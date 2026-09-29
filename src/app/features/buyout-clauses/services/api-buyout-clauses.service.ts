import { computed, inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { filter, forkJoin, map, Observable, switchMap } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { AppState } from '../../../core/states/app-state.state';

import { SquadInterface } from '../../../shared/interfaces/squad/squad.interface';
import { SquadPlayerInterface } from '../../../shared/interfaces/squad/squad-player.interface';
import { toObservable } from '@angular/core/rxjs-interop';

export interface BuyoutPlayerInterface extends SquadPlayerInterface {
  managerId: any;
  managerName: string;
  managerAvatar: string;
  teamId: string;
}

@Injectable()
export class ApiBuyoutClausesService {
  private readonly http = inject(HttpClient);
  private readonly appState = inject(AppState);

  private readonly baseUrl = environment.baseUrl;

  readonly preSelectedLeagueId = computed(() => this.appState.league.preSelectedLeague()?.id);

  private readonly managers = computed(() => {
    return this.appState.managers.managers();
  });

  /**
   * IMPORTANTE: toObservable() se crea UNA SOLA VEZ aqui, como
   * campo de la clase. Los campos de un servicio @Injectable se
   * inicializan durante la construccion del propio servicio,
   * que Angular SIEMPRE ejecuta dentro de un contexto de
   * inyeccion valido — sin importar si getAllManagersPlayers()
   * se llama despues desde un constructor de componente o desde
   * un manejador de click.
   *
   * Si toObservable() se llamara dentro del propio metodo
   * getAllManagersPlayers() (como estaba antes), cada llamada
   * necesitaria volver a ejecutarse en contexto de inyeccion,
   * lo cual falla en manejadores de eventos como (click).
   */
  private readonly managers$ = toObservable(this.managers);

  buyoutClause(clauseToPay: number, playerTeamId: string) {
    const leagueId = this.preSelectedLeagueId();

    const body = {
      buyoutClauseToPay: clauseToPay,
    };

    return this.http.post(
      `${this.baseUrl}/v1/competition/1/league/${leagueId}/buyout/${playerTeamId}/pay`,
      body,
    );
  }

  private getSquad(teamId: string): Observable<SquadInterface> {
    const leagueId = this.preSelectedLeagueId();

    return this.http.get<SquadInterface>(
      `${this.baseUrl}/v1/competition/1/leagues/${leagueId}/teams/${teamId}`,
    );
  }

  getAllManagersPlayers(): Observable<BuyoutPlayerInterface[]> {
    // 1. Reutilizamos el Observable de managers ya creado como campo
    return this.managers$.pipe(
      // 2. Filtramos para que no continue si el arreglo esta vacio (cuando refrescas)
      filter((managers) => managers && managers.length > 0),
      // 3. Cuando ya tengan datos, hacemos el forkJoin
      switchMap((managers) =>
        forkJoin(
          managers.map((manager) =>
            this.getSquad(manager.teamId).pipe(
              map((squad) =>
                squad.players.map((player): BuyoutPlayerInterface => ({
                  ...player,
                  managerId: manager.id,
                  managerName: manager.managerName,
                  managerAvatar: manager.avatar,
                  teamId: manager.teamId,
                })),
              ),
            ),
          ),
        ).pipe(map((squads) => squads.flat())),
      ),
    );
  }
}
