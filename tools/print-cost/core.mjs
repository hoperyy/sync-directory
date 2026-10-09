export const DEFAULTS = Object.freeze({currency: 'USD', basis:'item', material: 75, packageSize: 1000, packagePrice: 24, hours: 5, watts: 120, electricity: 0.18, machineRate: 0.5, laborMinutes: 20, laborRate: 18, extras: 1, failure: 5, margin: 30, quantity: 1, setupMinutes:0, retryMinutes:0, feePercent:0, feeFixed:0});
export function calculate(values) {
  const v = {};
  for (const key of Object.keys(DEFAULTS).filter((key) => !['currency','basis'].includes(key))) {
    const value = values[key] ?? (['setupMinutes','retryMinutes','feePercent','feeFixed'].includes(key) ? 0 : undefined);
    if (value === '' || value == null) throw new Error('Fill every cost field. Use 0 for a cost you want to exclude.');
    v[key] = Number(value);
    if (!Number.isFinite(v[key]) || v[key] < 0 || v[key] > 1e9) throw new Error('Costs and quantities must be finite, nonnegative values below 1 billion.');
  }
  if (!v.packageSize) throw new Error('Material package size must be greater than 0.');
  if (!Number.isInteger(v.quantity) || v.quantity < 1 || v.quantity > 10000) throw new Error('Quantity must be a whole number from 1 to 10,000.');
  if (v.failure >= 100 || v.margin >= 100) throw new Error('Failure rate and profit margin must be below 100%.');
  if (v.feePercent + v.margin >= 100) throw new Error('Selling fees plus target margin must be below 100%.');
  const basis = values.basis ?? 'item';
  if (!['item','plate'].includes(basis)) throw new Error('Choose a per-item or whole-plate input basis.');
  const divisor = basis === 'plate' ? v.quantity : 1;
  const materialCost = v.material / v.packageSize * v.packagePrice / divisor;
  const powerCost = v.hours * v.watts / 1000 * v.electricity / divisor;
  const machineCost = v.hours * v.machineRate / divisor;
  const laborCost = v.laborMinutes / 60 * v.laborRate / divisor;
  const setupCost = v.setupMinutes / 60 * v.laborRate / v.quantity;
  const retryCost = v.retryMinutes / 60 * v.laborRate * (v.failure / 100) / (1 - v.failure / 100) / divisor;
  const extras = v.extras / divisor;
  const repeatable = materialCost + powerCost + machineCost;
  const failureReserve = repeatable / (1 - v.failure / 100) - repeatable;
  const cost = repeatable + failureReserve + laborCost + extras + setupCost + retryCost;
  const price = (cost + v.feeFixed / v.quantity) / (1 - (v.margin + v.feePercent) / 100);
  const fees = price * v.feePercent / 100 + v.feeFixed / v.quantity;
  const profit = price - cost - fees;
  const breakEven = (cost + v.feeFixed / v.quantity) / (1 - v.feePercent / 100);
  return {materialCost, powerCost, machineCost, laborCost, extras, setupCost, retryCost, failureReserve, fees, breakEven, cost, price, profit, total: price * v.quantity, quantity: v.quantity};
}

export function evaluatePrice(result, values, offeredPrice) {
  const price = Number(offeredPrice);
  if (!Number.isFinite(price) || price <= 0) throw new Error('Enter a selling price greater than 0.');
  const fees = price * Number(values.feePercent ?? 0) / 100 + Number(values.feeFixed ?? 0) / result.quantity;
  const profit = price - result.cost - fees;
  return {profit, margin:profit / price * 100};
}
