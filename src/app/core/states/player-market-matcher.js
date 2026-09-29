export function findMarketPlayer(player, marketPlayers) {
  if (!marketPlayers.length) {
    return undefined;
  }
  let bestMatch;
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
function calculateMatchScore(player, market) {
  let score = 0;
  const playerName = normalizeName(player.nickname);
  const marketName = normalizeName(market.name);
  const playerTokens = getNameTokens(player.nickname);
  const marketTokens = getNameTokens(market.name);
  // ==========================================================
  // EXACT NAME
  // ==========================================================
  if (playerName && marketName && playerName === marketName) {
    score += 150;
  }
  // ==========================================================
  // ONE CONTAINS THE OTHER
  // ==========================================================
  else if (
    playerName.length >= 5 &&
    marketName.length >= 5 &&
    (playerName.includes(marketName) || marketName.includes(playerName))
  ) {
    score += 100;
  }
  // ==========================================================
  // LAST NAME
  // ==========================================================
  const playerParts = getNameParts(player.nickname);
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
  // SHARED TOKENS
  // ==========================================================
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
function getNameParts(name) {
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
function getNameTokens(name) {
  return [
    ...new Set(
      normalizeName(name)
        .split(' ')
        .filter((token) => token.length >= 2),
    ),
  ];
}
// ============================================================
// NORMALIZE
// ============================================================
function normalizeName(name) {
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
function getPositionName(positionId) {
  const positions = {
    1: 'portero',
    2: 'defensa',
    3: 'centrocampista',
    4: 'delantero',
  };
  return positions[String(positionId)] ?? '';
}
