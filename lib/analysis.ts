
// Calculate Pearson Correlation Coefficient (r)
// Returns value between -1 and 1
export function calculateCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n !== y.length || n === 0) return 0;

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  if (denominator === 0) return 0;
  return numerator / denominator;
}

// Intepret correlation strength
export function getCorrelationStrength(r: number): string {
  const absR = Math.abs(r);
  if (absR > 0.7) return "Very Strong";
  if (absR > 0.5) return "Strong";
  if (absR > 0.3) return "Moderate";
  if (absR > 0.1) return "Weak";
  return "None";
}

// Calculate Linear Regression Line (y = mx + b)
export function calculateRegression(x: number[], y: number[]) {
  const n = x.length;
  if (n === 0) return { m: 0, b: 0 };

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

  const m = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const b = (sumY - m * sumX) / n;

  return { m, b };
}
