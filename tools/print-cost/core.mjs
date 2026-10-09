export const DEFAULTS = Object.freeze({currency: 'USD', material: 75, packageSize: 1000, packagePrice: 24, hours: 5, watts: 120, electricity: 0.18, machineRate: 0.5, laborMinutes: 20, laborRate: 18, extras: 1, failure: 5, margin: 30, quantity: 1});
export function calculate(values) {
  const v = {};
  for (const key of Object.keys(DEFAULTS).filter((key) => key !== 'currency')) {
    if (values[key] === '' || values[key] == null) throw new Error('Fill every cost field. Use 0 for a cost you want to exclude.');
    v[key] = Number(values[key]);
    if (!Number.isFinite(v[key]) || v[key] < 0 || v[key] > 1e9) throw new Error('Costs and quantities must be finite, nonnegative values below 1 billion.');
  }
  if (!v.packageSize) throw new Error('Material package size must be greater than 0.');
  if (!Number.isInteger(v.quantity) || v.quantity < 1 || v.quantity > 10000) throw new Error('Quantity must be a whole number from 1 to 10,000.');
  if (v.failure >= 100 || v.margin >= 100) throw new Error('Failure rate and profit margin must be below 100%.');
  const materialCost = v.material / v.packageSize * v.packagePrice;
  const powerCost = v.hours * v.watts / 1000 * v.electricity;
  const machineCost = v.hours * v.machineRate;
  const laborCost = v.laborMinutes / 60 * v.laborRate;
  const repeatable = materialCost + powerCost + machineCost;
  const failureReserve = repeatable / (1 - v.failure / 100) - repeatable;
  const cost = repeatable + failureReserve + laborCost + v.extras;
  const price = cost / (1 - v.margin / 100);
  const profit = price - cost;
  return {materialCost, powerCost, machineCost, laborCost, extras: v.extras, failureReserve, cost, price, profit, total: price * v.quantity, quantity: v.quantity};
}
