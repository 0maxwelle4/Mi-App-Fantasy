import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Service()
export class ApiAuthLoginService {
  private http: HttpClient = inject(HttpClient);

  //Login
  loginDirecto(correo: string, contrasena: string): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded',
    });

    const body = new URLSearchParams();
    body.set('grant_type', 'password');
    body.set('client_id', 'af88bcff-1157-40a0-b579-030728aacf0b');
    body.set('scope', 'openid af88bcff-1157-40a0-b579-030728aacf0b offline_access');
    body.set('redirect_uri', 'authredirect://com.lfp.laligafantasy');
    body.set('username', correo.trim());
    body.set('password', contrasena);
    body.set('response_type', 'id_token');

    // 🔥 LLAMADA DIRECTA A INTERNET: Sin pasar por proxies locales
    const urlRealAzure =
      'https://login.laliga.es/laligadspprob2c.onmicrosoft.com/oauth2/v2.0/token?p=B2C_1A_ResourceOwnerv2';

    return this.http.post(urlRealAzure, body.toString(), { headers });
  }
}
