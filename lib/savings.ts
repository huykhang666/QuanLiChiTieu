/**
 * Công thức tiết kiệm đề xuất theo tuần.
 * Nếu tuần đó âm (chi nhiều hơn thu) thì tiết kiệm đề xuất = 0,
 * vì thu nhập sinh viên không cố định.
 */
export function calcSuggestedSavings(
  weeklyIncome: number,
  weeklyExpense: number,
  savingsRate: number = 0.25
): number {
  const balance = weeklyIncome - weeklyExpense;
  if (balance <= 0) return 0;
  return Math.round(balance * savingsRate);
}
