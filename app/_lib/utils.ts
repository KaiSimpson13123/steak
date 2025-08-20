const TOTAL_TILES = 25;
const MAX_MULTIPLIER = 14;

export function calculateWinningAmount(betAmount: number, selectedTiles: number, mines: number): number {
  const multiplier = calculateMultiplier(selectedTiles, mines);
  return Number((betAmount * multiplier).toFixed(2));
}

export function calculatePerMineMultiplier(numberOfMines: number): number {
  if (numberOfMines <= 0) return 1;
  const base = 0.15; // small incremental increase
  return 1 + base * Math.log2(numberOfMines + 1);
}


export function calculateBaseMultiplier(numberOfMines: number): number {
  const baseMultiplier = 1 + numberOfMines * 0.1;
  return baseMultiplier;
}

export function calculateCurrentProfit(
  betAmount: number,
  numberOfMines: number,
  numberOfSuccessfulClicks: number
): number {
  const baseMultiplier = calculateBaseMultiplier(numberOfMines);
  const multiplier = Math.pow(baseMultiplier, numberOfSuccessfulClicks);
  const profit = betAmount * multiplier;
  return profit;
}

export function calculateMultiplier(selectedTiles: number, mines: number): number {
  if (
    selectedTiles < 1 ||
    selectedTiles > TOTAL_TILES - 1 ||
    mines < 1 ||
    mines > TOTAL_TILES - selectedTiles
  ) {
    throw new Error("Invalid number of selected tiles or mines");
  }

  // Probability of not hitting a mine
  const probability = 1 - mines / TOTAL_TILES;

  // Base multiplier grows slowly with each successful click
  const BASE_INCREMENT = 1.05; // 5% per safe tile
  let multiplier = Math.pow(BASE_INCREMENT, selectedTiles) * (1 + mines / TOTAL_TILES);

  // Factor in probability but prevent runaway scaling
  multiplier *= probability * 1.5;

  // Cap multiplier
  multiplier = Math.min(multiplier, MAX_MULTIPLIER);

  return Number(multiplier.toFixed(2));
}

export function getMultiplier(selectedTiles: number, mines: number): number {
  return calculateMultiplier(selectedTiles, mines);
}
