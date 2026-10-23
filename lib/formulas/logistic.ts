/**
 * Logistic regression with a ridge penalty — pure, no dependencies (prop engine v2, A4).
 * Newton / IRLS: β ← β + (XᵀWX + λI)⁻¹ (Xᵀ(y − p) − λβ), the intercept unpenalized.
 * Deterministic (starts at 0, no randomness). Solver: Gaussian elimination with partial
 * pivoting. Bad input (no rows, ragged rows, a singular system) returns null.
 */

export interface LogisticModel {
  weights: number[];
  intercept: number;
  iterations: number;
}

export interface LogisticOptions {
  /** Ridge strength λ (0 = plain logistic). */
  l2: number;
  maxIter: number;
  /** Stop when the largest step is below this. */
  tol: number;
}

export function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z));
}

/** Solve A x = b in place (copies); null when singular. */
export function solveLinear(a: readonly (readonly number[])[], b: readonly number[]): number[] | null {
  const n = b.length;
  const m = a.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r;
    if (Math.abs(m[pivot][col]) < Number.EPSILON) return null;
    [m[col], m[pivot]] = [m[pivot], m[col]];
    for (let r = col + 1; r < n; r++) {
      const f = m[r][col] / m[col][col];
      for (let c = col; c <= n; c++) m[r][c] -= f * m[col][c];
    }
  }
  const x = new Array<number>(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = m[r][n];
    for (let c = r + 1; c < n; c++) s -= m[r][c] * x[c];
    x[r] = s / m[r][r];
  }
  return x;
}

export function fitLogistic(X: readonly (readonly number[])[], y: readonly number[], o: LogisticOptions): LogisticModel | null {
  const n = X.length;
  if (n === 0 || y.length !== n) return null;
  const d = X[0].length;
  if (!X.every((r) => r.length === d && r.every(Number.isFinite)) || !y.every((v) => v === 0 || v === 1)) return null;
  // Column 0 = intercept.
  const beta = new Array<number>(d + 1).fill(0);
  for (let iter = 1; iter <= o.maxIter; iter++) {
    const grad = new Array<number>(d + 1).fill(0);
    const hess = Array.from({ length: d + 1 }, () => new Array<number>(d + 1).fill(0));
    for (let i = 0; i < n; i++) {
      const row = [1, ...X[i]];
      const p = sigmoid(row.reduce((s, v, j) => s + v * beta[j], 0));
      const w = p * (1 - p);
      for (let j = 0; j <= d; j++) {
        grad[j] += (y[i] - p) * row[j];
        for (let k = j; k <= d; k++) hess[j][k] += w * row[j] * row[k];
      }
    }
    for (let j = 0; j <= d; j++) {
      for (let k = 0; k < j; k++) hess[j][k] = hess[k][j];
      if (j > 0) {
        grad[j] -= o.l2 * beta[j];
        hess[j][j] += o.l2;
      }
    }
    const step = solveLinear(hess, grad);
    if (!step) return null;
    let biggest = 0;
    for (let j = 0; j <= d; j++) {
      beta[j] += step[j];
      biggest = Math.max(biggest, Math.abs(step[j]));
    }
    if (biggest < o.tol) return { intercept: beta[0], weights: beta.slice(1), iterations: iter };
  }
  return { intercept: beta[0], weights: beta.slice(1), iterations: o.maxIter };
}

export function predictLogistic(m: Pick<LogisticModel, 'weights' | 'intercept'>, x: readonly number[]): number {
  return sigmoid(m.intercept + x.reduce((s, v, j) => s + v * (m.weights[j] ?? 0), 0));
}
