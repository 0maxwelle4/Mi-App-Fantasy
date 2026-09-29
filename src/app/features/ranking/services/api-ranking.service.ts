import { computed, inject, Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  EMPTY,
  Observable,
  catchError,
  defer,
  expand,
  forkJoin,
  from,
  map,
  mergeMap,
  of,
  reduce,
  toArray,
} from 'rxjs';

import { environment } from '../../../../environments/environment';
import { RankingInterface } from '../../../shared/interfaces/ranking/ranking.interface';
import { ActivitiesInterface } from '../../../shared/interfaces/league/activities.interface';
import { SquadInterface } from '../../../shared/interfaces/squad/squad.interface';
import { MarketValuePointInterface } from '../../../shared/interfaces/players/market-value.interface';
import { AppState } from '../../../core/states/app-state.state';

// ==========================================================
// CONFIGURACIÓN DEL CÁLCULO
// ==========================================================

/** Todos los managers empiezan con 100M. */
const STARTING_BUDGET = 100_000_000;

/** Al subir una cláusula pagando X, la cláusula sube X * 2. */
const CLAUSE_MULTIPLIER = 2;

/** Límite de seguridad para la paginación de actividades. */
const MAX_ACTIVITY_PAGES = 100;

/** Peticiones simultáneas al pedir el histórico de valor de cada jugador. */
const MARKET_HISTORY_CONCURRENCY = 6;

const ACTIVITY_TYPE = {
  TRANSFER: 1, // Traspaso / clausulazo (user1 compra a user2)
  WEEK_BONUS: 6, // Premio de jornada
  IDEAL_ELEVEN: 12, // Once ideal
  MARKET_SIGNING: 31, // Fichaje de mercado
  SALE_TO_LEAGUE: 33, // Venta a la liga
} as const;

// ==========================================================
// TIPOS
// ==========================================================

export interface BudgetEstimate {
  /** Presupuesto estimado (o real si es tu equipo). */
  budget: number;
  /** true si es el dinero real (tu propio equipo). */
  isExact: boolean;

  // Ingresos
  leagueSales: number;
  managerSales: number;
  bonuses: number;

  // Gastos
  marketSpent: number;
  managerPurchases: number;
  clauseSpent: number;

  /** Jugadores a los que se les ha detectado una subida manual de cláusula. */
  raisedClausePlayers: { playerId: string; playerName: string; raised: number }[];
}

interface TeamSquad {
  teamId: string;
  squad: SquadInterface;
}

interface Acquisition {
  price: number;
  time: number;
}

// ==========================================================
// CÁLCULO (función pura)
// ==========================================================

function emptyEstimate(): BudgetEstimate {
  return {
    budget: 0,
    isExact: false,
    leagueSales: 0,
    managerSales: 0,
    bonuses: 0,
    marketSpent: 0,
    managerPurchases: 0,
    clauseSpent: 0,
    raisedClausePlayers: [],
  };
}

function calculateBudgetEstimates(
  activities: ActivitiesInterface[],
  squads: TeamSquad[],
  marketHistories: Map<string, MarketValuePointInterface[]>,
): Map<string, BudgetEstimate> {
  const byManager = new Map<string, BudgetEstimate>();

  for (const { squad } of squads) {
    byManager.set(String(squad.manager.id), emptyEstimate());
  }

  // "managerId:playerId" -> última compra (precio y momento)
  const lastAcquisition = new Map<string, Acquisition>();

  // 1) Recorremos TODOS los movimientos de la liga
  for (const activity of activities) {
    const user1 = String(activity.user1Id);
    const user2 = activity.user2Id != null ? String(activity.user2Id) : undefined;
    const amount = activity.amount ?? 0;

    switch (activity.activityTypeId) {
      case ACTIVITY_TYPE.MARKET_SIGNING: {
        const manager = byManager.get(user1);
        if (manager) manager.marketSpent += amount;
        registerAcquisition(lastAcquisition, user1, activity, amount);
        break;
      }

      case ACTIVITY_TYPE.TRANSFER: {
        const buyer = byManager.get(user1);
        if (buyer) buyer.managerPurchases += amount;

        const seller = user2 ? byManager.get(user2) : undefined;
        if (seller) seller.managerSales += amount;

        registerAcquisition(lastAcquisition, user1, activity, amount);
        break;
      }

      case ACTIVITY_TYPE.SALE_TO_LEAGUE: {
        const manager = byManager.get(user1);
        if (manager) manager.leagueSales += amount;
        break;
      }

      case ACTIVITY_TYPE.WEEK_BONUS:
      case ACTIVITY_TYPE.IDEAL_ELEVEN: {
        const manager = byManager.get(user1);
        if (manager) manager.bonuses += amount;
        break;
      }
    }
  }

  // 2) Cláusulas subidas: cláusula actual vs. baseline
  //    baseline = max(precio de compra, valor de mercado máximo desde que lo tiene)
  for (const { squad } of squads) {
    const managerId = String(squad.manager.id);
    const manager = byManager.get(managerId);
    if (!manager) continue;

    for (const player of squad.players) {
      const playerId = String(player.playerMaster.id);
      const acquisition = lastAcquisition.get(`${managerId}:${playerId}`);
      const history = marketHistories.get(playerId) ?? [];

      const relevantValues = (
        acquisition
          ? history.filter((point) => Date.parse(point.date) >= acquisition.time)
          : history
      ).map((point) => point.marketValue);

      // Siempre incluimos el valor de mercado actual como suelo de seguridad,
      // por si el histórico todavía no ha publicado el dato de hoy.
      const maxSinceAcquisition = Math.max(
        0,
        player.playerMaster.marketValue ?? 0,
        ...relevantValues,
      );

      const baseline = Math.max(acquisition?.price ?? 0, maxSinceAcquisition);
      const excess = player.buyoutClause - baseline;

      if (excess > 0) {
        const raised = excess / CLAUSE_MULTIPLIER;
        manager.clauseSpent += raised;
        manager.raisedClausePlayers.push({
          playerId,
          playerName: player.playerMaster.nickname ?? player.playerMaster.name,
          raised,
        });
      }
    }
  }

  // 3) Presupuesto final por equipo
  const result = new Map<string, BudgetEstimate>();

  for (const { teamId, squad } of squads) {
    const estimate = byManager.get(String(squad.manager.id));
    if (!estimate) continue;

    estimate.budget =
      STARTING_BUDGET +
      estimate.leagueSales +
      estimate.managerSales +
      estimate.bonuses -
      estimate.marketSpent -
      estimate.managerPurchases -
      estimate.clauseSpent;

    // Tu propio equipo: la API devuelve el dinero real
    if (squad.teamMoney != null) {
      estimate.budget = squad.teamMoney;
      estimate.isExact = true;
    }

    result.set(teamId, estimate);
  }

  return result;
}

function registerAcquisition(
  map: Map<string, Acquisition>,
  buyerId: string,
  activity: ActivitiesInterface,
  price: number,
): void {
  if (activity.playerMasterId == null) return;

  const key = `${buyerId}:${activity.playerMasterId}`;
  const time = Date.parse(activity.createdAt);
  const previous = map.get(key);

  if (!previous || time > previous.time) {
    map.set(key, { price, time });
  }
}

// ==========================================================
// SERVICIO
// ==========================================================

@Service()
export class ApiRankingService {
  private http: HttpClient = inject(HttpClient);
  private readonly baseUrl = environment.baseUrl;
  private readonly appState = inject(AppState);

  readonly preSelectedLeagueId = computed(() => this.appState.league.preSelectedLeague()?.id);

  // Obtener el ranking
  getLeagueRanking(): Observable<RankingInterface[]> {
    const leagueId = this.preSelectedLeagueId();
    return this.http.get<RankingInterface[]>(
      `${this.baseUrl}/v1/competition/1/leagues/` + leagueId + `/standing`,
    );
  }

  // ========================================================
  // PRESUPUESTO ESTIMADO
  // ========================================================

  /**
   * Descarga todas las actividades de la liga, todas las plantillas y el
   * histórico de valor de mercado de cada jugador, y calcula el
   * presupuesto estimado de cada equipo.
   */
  getBudgetEstimates(teamIds: string[]): Observable<Map<string, BudgetEstimate>> {
    if (!teamIds.length) {
      return of(new Map<string, BudgetEstimate>());
    }

    const squads$ = forkJoin(
      teamIds.map((teamId) =>
        this.getSquad(teamId).pipe(
          map((squad): TeamSquad | null => ({ teamId, squad })),
          catchError((error) => {
            console.error(`Error cargando la plantilla ${teamId}:`, error);
            return of(null);
          }),
        ),
      ),
    );

    return forkJoin({
      activities: this.getAllActivities(),
      squads: squads$,
    }).pipe(
      map(({ activities, squads }) => ({
        activities,
        squads: squads.filter((s): s is TeamSquad => s !== null),
      })),
      switchMapWithHistory((data) =>
        this.getPlayersMarketHistory(this.collectPlayerIds(data.squads)).pipe(
          map((histories) => calculateBudgetEstimates(data.activities, data.squads, histories)),
        ),
      ),
    );
  }

  private collectPlayerIds(squads: TeamSquad[]): string[] {
    const ids = new Set<string>();

    for (const { squad } of squads) {
      for (const player of squad.players) {
        ids.add(String(player.playerMaster.id));
      }
    }

    return Array.from(ids);
  }

  private getSquad(teamId: string): Observable<SquadInterface> {
    const leagueId = this.preSelectedLeagueId();

    return this.http.get<SquadInterface>(
      `${this.baseUrl}/v1/competition/1/leagues/${leagueId}/teams/${teamId}`,
    );
  }

  private getActivitiesPage(page: number): Observable<ActivitiesInterface[]> {
    const leagueId = this.preSelectedLeagueId();

    return this.http.get<ActivitiesInterface[]>(
      `${this.baseUrl}/v1/competition/1/leagues/${leagueId}/activity/${page}`,
    );
  }

  /** Pide páginas (0, 1, 2...) hasta que llegue una vacía o sin datos nuevos. */
  private getAllActivities(): Observable<ActivitiesInterface[]> {
    return defer(() => {
      const seen = new Set<string>();

      const fetchPage = (page: number) =>
        this.getActivitiesPage(page).pipe(
          map((items) => {
            const fresh = (items ?? []).filter((item) => !seen.has(String(item.id)));
            fresh.forEach((item) => seen.add(String(item.id)));
            return { page, items: fresh };
          }),
        );

      return fetchPage(0).pipe(
        expand(({ page, items }) =>
          items.length > 0 && page < MAX_ACTIVITY_PAGES ? fetchPage(page + 1) : EMPTY,
        ),
        reduce((all, { items }) => all.concat(items), [] as ActivitiesInterface[]),
      );
    });
  }

  private getPlayerMarketHistory(playerId: string): Observable<MarketValuePointInterface[]> {
    return this.http
      .get<MarketValuePointInterface[]>(
        `${this.baseUrl}/v1/competition/1/player/${playerId}/market-value`,
      )
      .pipe(
        catchError((error) => {
          console.error(`Error cargando histórico del jugador ${playerId}:`, error);
          return of([] as MarketValuePointInterface[]);
        }),
      );
  }

  /**
   * Pide el histórico de valor de mercado de cada jugador único,
   * limitando la concurrencia para no saturar la API.
   */
  private getPlayersMarketHistory(
    playerIds: string[],
  ): Observable<Map<string, MarketValuePointInterface[]>> {
    if (!playerIds.length) {
      return of(new Map<string, MarketValuePointInterface[]>());
    }

    return from(playerIds).pipe(
      mergeMap(
        (playerId) =>
          this.getPlayerMarketHistory(playerId).pipe(
            map((history) => [playerId, history] as const),
          ),
        MARKET_HISTORY_CONCURRENCY,
      ),
      toArray(),
      map((entries) => new Map(entries)),
    );
  }
}

/** Pequeño helper para encadenar un switchMap sin importar switchMap arriba dos veces. */
function switchMapWithHistory<T, R>(project: (value: T) => Observable<R>) {
  return (source: Observable<T>) =>
    new Observable<R>((subscriber) => {
      let inner: ReturnType<typeof project> | null = null;
      const outerSub = source.subscribe({
        next: (value) => {
          inner = project(value);
          inner.subscribe(subscriber);
        },
        error: (err) => subscriber.error(err),
        complete: () => {
          if (!inner) subscriber.complete();
        },
      });
      return () => outerSub.unsubscribe();
    });
}
