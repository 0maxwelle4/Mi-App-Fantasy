import { __decorate } from 'tslib';
import { computed, inject, Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { forkJoin, map, of, switchMap } from 'rxjs';
import { AppState } from '../../../core/states/app-state.state';
let ApiMarketOffersService = class ApiMarketOffersService {
  http = inject(HttpClient);
  baseUrl = environment.baseUrl;
  appState = inject(AppState);
  preSelectedLeagueId = computed(() => this.appState.league.preSelectedLeague()?.id);
  userRegionId = computed(() => this.appState.user.user()?.id);
  regionId = this.userRegionId();
  getLeagueMarket() {
    const leagueId = this.preSelectedLeagueId();
    return this.http.get(
      `${this.baseUrl}/v1/competition/${this.regionId}/league/${leagueId}/market`,
    );
  }
  getOfferById(playerTeamId) {
    const leagueId = this.preSelectedLeagueId();
    return this.http.get(
      `${this.baseUrl}/v1/competition/${this.regionId}/league/${leagueId}/playerTeam/${playerTeamId}/offer`,
    );
  }
  getMarketWithOffers() {
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
  rejectMarketOffer(marketId, offerId) {
    const leagueId = this.preSelectedLeagueId();
    return this.http.post(
      `${this.baseUrl}/v1/competition/${this.regionId}/league/${leagueId}/market/${marketId}/offer/${offerId}/reject`,
      {},
    );
  }
  acceptMarketOffer(marketId, offerId, offerMoney) {
    const leagueId = this.preSelectedLeagueId();
    const body = {
      offerMoney: offerMoney || 0,
    };
    return this.http.post(
      `${this.baseUrl}/v1/competition/${this.regionId}/league/${leagueId}/market/${marketId}/offer/${offerId}/accept`,
      body,
    );
  }
};
ApiMarketOffersService = __decorate([Service()], ApiMarketOffersService);
export { ApiMarketOffersService };
