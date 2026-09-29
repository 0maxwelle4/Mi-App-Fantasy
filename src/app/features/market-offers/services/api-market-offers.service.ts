import { computed, inject, Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { forkJoin, map, Observable, of, switchMap } from 'rxjs';
import { MarketPlayerInterface } from '../../../shared/interfaces/market/market-player.interface';
import { AppState } from '../../../core/states/app-state.state';

@Service()
export class ApiMarketOffersService {
  private http: HttpClient = inject(HttpClient);
  private readonly baseUrl = environment.baseUrl;
  private readonly appState = inject(AppState);

  readonly preSelectedLeagueId = computed(() => this.appState.league.preSelectedLeague()?.id);

  getLeagueMarket(): Observable<MarketPlayerInterface[]> {
    const leagueId = this.preSelectedLeagueId();
    return this.http.get<MarketPlayerInterface[]>(
      `${this.baseUrl}/v1/competition/1/league/${leagueId}/market`,
    );
  }

  getOfferById(playerTeamId: string) {
    const leagueId = this.preSelectedLeagueId();
    return this.http.get(
      `${this.baseUrl}/v1/competition/1/league/${leagueId}/playerTeam/${playerTeamId}/offer`,
    );
  }

  getMarketWithOffers(): Observable<MarketPlayerInterface[]> {
    return this.getLeagueMarket().pipe(
      switchMap((players) => {
        // 1. Filtramos qué jugadores cumplen la condición estricta
        const playersWithOffersToFetch = players.filter(
          (player) => (player.numberOfOffers ?? 0) > 0 && player.sellerTeam?.teamMoney !== null,
        );

        // Si ningún jugador cumple la condición, devolvemos los jugadores intactos inmediatamente
        if (playersWithOffersToFetch.length === 0) {
          return of(players);
        }

        // 2. Creamos un array de peticiones HTTP en paralelo utilizando forkJoin
        const offerRequests$ = playersWithOffersToFetch.map((player) =>
          this.getOfferById(player.playerTeam.playerTeamId).pipe(
            // Mapeamos la respuesta para estructurarla junto con el ID del jugador
            map((offer) => ({ playerId: player.id, offer })),
          ),
        );

        return forkJoin(offerRequests$).pipe(
          map((offersResults) => {
            // 3. Cruzamos los datos: fusionamos cada oferta con su jugador correspondiente
            return players.map((player) => {
              const foundOfferObj = offersResults.find((o) => o.playerId === player.id);
              return foundOfferObj
                ? { ...player, currentOffer: foundOfferObj.offer } // Le inyectamos la oferta al jugador
                : player;
            });
          }),
        );
      }),
    );
  }

  rejectMarketOffer(marketId: string, offerId: string) {
    const leagueId = this.preSelectedLeagueId();
    return this.http.post(
      `${this.baseUrl}/v1/competition/1/league/${leagueId}/market/${marketId}/offer/${offerId}/reject`,
      {},
    );
  }

  acceptMarketOffer(marketId: string, offerId: string, offerMoney?: number) {
    const leagueId = this.preSelectedLeagueId();
    const body = {
      offerMoney: offerMoney || 0,
    };
    return this.http.post(
      `${this.baseUrl}/v1/competition/1/league/${leagueId}/market/${marketId}/offer/${offerId}/accept`,
      body,
    );
  }
}
