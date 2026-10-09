import { DEFAULTS, calculate } from './core.mjs?v=9f20d3ecf6';
const $ = (id) => document.getElementById(id);
const form = $('calculator');
const currency = $('currency');
let result;
let estimateTimer;
const track = (event, parameters = {}) => window.siteAnalytics?.track(event, {tool_id:document.body.dataset.mode,...parameters});
const defaults = document.body.dataset.mode === 'resin' ? {...DEFAULTS, material: 40, packageSize: 1000, packagePrice: 30} : DEFAULTS;
const values = () => Object.fromEntries(new FormData(form));
const money = (amount) => new Intl.NumberFormat('en-US', {style:'currency',currency:currency.value}).format(amount);
const status = (message, error = false) => { $('status').textContent = message; $('status').classList.toggle('error', error); };
function update() {
  try {
    result = calculate(values());
    $('price').textContent = money(result.price); $('cost').textContent = money(result.cost); $('profit').textContent = money(result.profit); $('total').textContent = money(result.total);
    $('batch-label').textContent = `Total for ${result.quantity} ${result.quantity === 1 ? 'item' : 'items'}`;
    for (const key of ['materialCost','powerCost','machineCost','laborCost','extras','failureReserve']) {
      $(`${key}-value`).textContent = money(result[key]);
      $(`${key}-bar`).style.width = `${result.cost ? result[key] / result.cost * 100 : 0}%`;
    }
    status('Estimate updated. Inputs describe one item. Taxes and shipping are excluded.');
    for (const id of ['csv','share','print','save']) $(id).disabled = false;
  } catch (error) {
    result = undefined; $('price').textContent = '—'; $('cost').textContent = '—'; $('profit').textContent = '—'; $('total').textContent = '—';
    for (const key of ['materialCost','powerCost','machineCost','laborCost','extras','failureReserve']) { $(`${key}-value`).textContent = '—'; $(`${key}-bar`).style.width = '0%'; }
    status(error.message, true); for (const id of ['csv','share','print','save']) $(id).disabled = true;
  }
}
function fill(data) { for (const [key,value] of Object.entries(data)) if (form.elements.namedItem(key)) form.elements.namedItem(key).value = value; update(); }
form.addEventListener('submit', (e) => e.preventDefault());
form.addEventListener('input', () => {
  update(); clearTimeout(estimateTimer);
  estimateTimer = setTimeout(() => {if (result) track('estimate_complete');},700);
});
$('reset').addEventListener('click', () => { fill(defaults); history.replaceState(null, '', location.pathname); status('Example values restored. Change them to match your own printer and costs.'); });
$('save').addEventListener('click', () => { try { localStorage.setItem(`print-cost-${document.body.dataset.mode}`, JSON.stringify(values())); status('Profile saved in this browser.'); track('estimate_save'); } catch { status('Browser storage is unavailable. Export CSV to keep your estimate.', true); } });
$('load').addEventListener('click', () => { try { const stored = localStorage.getItem(`print-cost-${document.body.dataset.mode}`); if (!stored) { status('No saved profile yet. Choose Save profile first.'); return; } fill(JSON.parse(stored)); if (result) status('Saved profile loaded.'); } catch { status('Could not load the saved profile.', true); } });
$('forget').addEventListener('click', () => { try { localStorage.removeItem(`print-cost-${document.body.dataset.mode}`); status('Saved profile deleted from this browser.'); } catch { status('Browser storage is unavailable.', true); } });
$('share').addEventListener('click', async () => {
  const url = new URL(location.href); url.hash = new URLSearchParams(values()).toString();
  try { await navigator.clipboard.writeText(url.href); status('Estimate link copied. Anyone with this link can see the cost inputs.'); track('estimate_share'); }
  catch { $('share-url').hidden = false; $('share-url').value = url.href; $('share-url').select(); status('Copy the selected estimate link. It includes your cost inputs.'); }
});
$('csv').addEventListener('click', () => {
  const rows = [['Print Cost estimate', currency.value], ['Basis', 'per item; tax and shipping excluded'], ...Object.entries(values()).map(([key,value]) => [`Input: ${key}`,value]), ...Object.entries(result).map(([key,value]) => [key, String(value)])];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"','""')}"`).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'})); const a = document.createElement('a'); a.href = url; a.download = 'print-cost-estimate.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
  track('estimate_export', {output_format:'csv'});
});
$('print').addEventListener('click', () => {track('estimate_print'); window.print();});
const params = new URLSearchParams(location.hash.slice(1));
if ([...params].length) {
  const allowed = {}; for (const key of Object.keys(DEFAULTS)) if (params.has(key)) allowed[key] = params.get(key);
  if (allowed.currency && ![...currency.options].some((o) => o.value === allowed.currency)) delete allowed.currency;
  fill({...defaults,...allowed}); if (result) status('Shared estimate loaded. Review its inputs before using it.');
} else fill(defaults);
