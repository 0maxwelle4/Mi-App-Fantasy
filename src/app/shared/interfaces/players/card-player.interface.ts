export interface CardPlayerModel {
  id: string;
  name: string;
  positionText: string;
  status: string; // 'ok', 'injured', etc.
  image: string;
  teamName: string;
  teamBadge: string;
  points: number;
  marketValue: number;
  extraPriceLabel: string; // "CLÁUSULA", "PRECIO SALIDA", etc.
  extraPriceValue: number;
}
