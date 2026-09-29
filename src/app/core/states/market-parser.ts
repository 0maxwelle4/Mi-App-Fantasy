import { MarketTendencyInterface } from './market-state.state';

export function parseMarketHtml(html: string): MarketTendencyInterface[] {
  if (!html) {
    return [];
  }

  const parser = new DOMParser();

  const document = parser.parseFromString(html, 'text/html');

  const rows = document.querySelectorAll('tr.elemento_jugador[data-id]');

  return Array.from(rows)
    .map((row) => {
      const element = row as HTMLElement;

      return {
        id: element.dataset['id'] ?? '',

        name: element.dataset['nombre'] ?? '',

        position: element.dataset['posicion'] ?? '',

        team: element.dataset['equipo'] ?? '',

        marketValue: Number(element.dataset['valor'] ?? 0),

        value1d: Number(element.dataset['valor1'] ?? 0),

        value2d: Number(element.dataset['valor2'] ?? 0),

        value3d: Number(element.dataset['valor3'] ?? 0),

        value7d: Number(element.dataset['valor7'] ?? 0),

        value14d: Number(element.dataset['valor14'] ?? 0),

        value30d: Number(element.dataset['valor30'] ?? 0),

        difference24h: Number(element.dataset['diferencia1'] ?? 0),

        difference2d: Number(element.dataset['diferencia2'] ?? 0),

        difference3d: Number(element.dataset['diferencia3'] ?? 0),

        difference7d: Number(element.dataset['diferencia7'] ?? 0),

        difference14d: Number(element.dataset['diferencia14'] ?? 0),

        difference30d: Number(element.dataset['diferencia30'] ?? 0),

        differencePct24h: Number(element.dataset['diferenciaPct1'] ?? 0),

        differencePct2d: Number(element.dataset['diferenciaPct2'] ?? 0),

        differencePct3d: Number(element.dataset['diferenciaPct3'] ?? 0),

        differencePct7d: Number(element.dataset['diferenciaPct7'] ?? 0),

        differencePct14d: Number(element.dataset['diferenciaPct14'] ?? 0),

        differencePct30d: Number(element.dataset['diferenciaPct30'] ?? 0),

        trend: Number(element.dataset['tendencia'] ?? 0),

        acceleration: Number(element.dataset['aceleracion'] ?? 0),
      };
    })
    .filter((market) => !!market.id);
}
