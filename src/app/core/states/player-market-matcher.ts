import { PlayerInterface } from '../../shared/interfaces/players/player.interface';

import { MarketTendencyInterface } from './market-state.state';

// ============================================================
// FIND MARKET PLAYER
// ============================================================

export function findMarketPlayer(
  player: PlayerInterface,
  marketPlayers: MarketTendencyInterface[],
): MarketTendencyInterface | undefined {
  if (!marketPlayers.length) {
    return undefined;
  }

  let bestMatch: MarketTendencyInterface | undefined;
  let bestScore = 0;

  for (const marketPlayer of marketPlayers) {
    const score = calculateMatchScore(player, marketPlayer);

    if (score > bestScore) {
      bestScore = score;
      bestMatch = marketPlayer;
    }
  }

  // ============================================================
  // SAFETY THRESHOLD
  // ============================================================

  if (bestScore < 80) {
    return undefined;
  }

  return bestMatch;
}

// ============================================================
// MATCH SCORE
// ============================================================

function calculateMatchScore(player: PlayerInterface, market: MarketTendencyInterface): number {
  let score = 0;

  // ==========================================================
  // PLAYER IDENTITIES
  // ==========================================================

  const playerNickname = normalizeName(player.nickname ?? '');

  const playerName = normalizeName(player.name ?? '');

  const playerSlug = normalizeName(slugToName(player.slug ?? ''));

  const marketName = normalizeName(market.name ?? '');

  // ==========================================================
  // EXACT NICKNAME
  // ==========================================================

  if (playerNickname && marketName && playerNickname === marketName) {
    score += 150;
  }

  // ==========================================================
  // EXACT NAME
  // ==========================================================

  if (playerName && marketName && playerName === marketName) {
    score += 150;
  }

  // ==========================================================
  // EXACT SLUG
  //
  // "kylian-mbappe"
  //       ↓
  // "kylian mbappe"
  // ==========================================================

  if (playerSlug && marketName && playerSlug === marketName) {
    score += 150;
  }

  // ==========================================================
  // NICKNAME CONTAINS MARKET NAME
  // ==========================================================

  if (
    playerNickname.length >= 5 &&
    marketName.length >= 5 &&
    (playerNickname.includes(marketName) || marketName.includes(playerNickname))
  ) {
    score += 100;
  }

  // ==========================================================
  // PLAYER NAME CONTAINS MARKET NAME
  // ==========================================================

  if (
    playerName.length >= 5 &&
    marketName.length >= 5 &&
    (playerName.includes(marketName) || marketName.includes(playerName))
  ) {
    score += 100;
  }

  // ==========================================================
  // SLUG CONTAINS MARKET NAME
  // ==========================================================

  if (
    playerSlug.length >= 5 &&
    marketName.length >= 5 &&
    (playerSlug.includes(marketName) || marketName.includes(playerSlug))
  ) {
    score += 100;
  }

  // ==========================================================
  // TOKENS
  // ==========================================================

  const playerTokens = [
    ...new Set([
      ...getNameTokens(player.nickname ?? ''),
      ...getNameTokens(player.name ?? ''),
      ...getNameTokens(player.slug ?? ''),
    ]),
  ];

  const marketTokens = getNameTokens(market.name);

  const commonTokens = marketTokens.filter((token) => playerTokens.includes(token));

  for (const token of commonTokens) {
    if (token.length >= 6) {
      score += 35;
    } else if (token.length >= 4) {
      score += 20;
    } else if (token.length >= 3) {
      score += 10;
    }
  }

  // ==========================================================
  // LAST NAME
  // ==========================================================

  const playerParts = getNameParts(player.name || player.nickname);

  const marketParts = getNameParts(market.name);

  if (
    playerParts.lastName &&
    marketParts.lastName &&
    playerParts.lastName === marketParts.lastName
  ) {
    score += 70;
  }

  // ==========================================================
  // INITIAL + LAST NAME
  // ==========================================================

  if (
    playerParts.firstInitial &&
    marketParts.firstInitial &&
    playerParts.lastName &&
    marketParts.lastName &&
    playerParts.firstInitial === marketParts.firstInitial &&
    playerParts.lastName === marketParts.lastName
  ) {
    score += 90;
  }

  // ==========================================================
  // SINGLE NAME
  // ==========================================================

  if (
    marketTokens.length === 1 &&
    marketTokens[0].length >= 5 &&
    playerTokens.includes(marketTokens[0])
  ) {
    score += 100;
  }

  if (
    playerTokens.length === 1 &&
    playerTokens[0].length >= 5 &&
    marketTokens.includes(playerTokens[0])
  ) {
    score += 100;
  }

  // ==========================================================
  // MARKET VALUE
  // ==========================================================

  const playerValue = Number(player.marketValue);

  const marketValue = Number(market.marketValue);

  if (playerValue > 0 && marketValue > 0) {
    const difference = Math.abs(playerValue - marketValue);

    const percentage = difference / playerValue;

    if (percentage <= 0.005) {
      score += 80;
    } else if (percentage <= 0.01) {
      score += 60;
    } else if (percentage <= 0.03) {
      score += 40;
    } else if (percentage <= 0.05) {
      score += 20;
    }
  }

  // ==========================================================
  // POSITION
  // ==========================================================

  const playerPosition = normalizeName(getPositionName(player.positionId));

  const marketPosition = normalizeName(market.position);

  if (playerPosition && marketPosition && playerPosition === marketPosition) {
    score += 20;
  }

  return score;
}

// ============================================================
// NAME PARTS
// ============================================================

function getNameParts(name: string): {
  firstInitial: string;
  lastName: string;
} {
  const normalized = normalizeName(name);

  const parts = normalized.split(' ').filter(Boolean);

  if (!parts.length) {
    return {
      firstInitial: '',
      lastName: '',
    };
  }

  if (parts.length === 1) {
    return {
      firstInitial: parts[0].charAt(0),

      lastName: parts[0],
    };
  }

  return {
    firstInitial: parts[0].charAt(0),

    lastName: parts[parts.length - 1],
  };
}

// ============================================================
// NAME TOKENS
// ============================================================

function getNameTokens(name: string): string[] {
  return [
    ...new Set(
      normalizeName(name)
        .split(' ')
        .filter((token) => token.length >= 2),
    ),
  ];
}

// ============================================================
// SLUG → NAME
// ============================================================

function slugToName(slug: string): string {
  return slug.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
}

// ============================================================
// NORMALIZE NAME
// ============================================================

function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ============================================================
// POSITION
// ============================================================

function getPositionName(positionId: string): string {
  const positions: Record<string, string> = {
    '1': 'portero',

    '2': 'defensa',

    '3': 'centrocampista',

    '4': 'delantero',
  };

  return positions[String(positionId)] ?? '';
}
