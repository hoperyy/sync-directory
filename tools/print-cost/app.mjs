import { DEFAULTS, calculate, evaluatePrice } from './core.mjs?v=cb6f811bc9';
const $ = (id) => document.getElementById(id);
const form = $('calculator'), currency = $('currency');
$('receipt-tools').open = !matchMedia('(max-width: 650px)').matches;
const defaults = document.body.dataset.mode === 'resin' ? {...DEFAULTS,material:40,packagePrice:30} : DEFAULTS;
const costKeys = ['materialCost','powerCost','machineCost','laborCost','extras','setupCost','failureReserve','retryCost'];
let result, estimateTimer, pinNumber = 0;
const pins = [];
const track = (event, parameters = {}) => window.siteAnalytics?.track(event, {tool_id:document.body.dataset.mode,...parameters});
const values = () => Object.fromEntries(new FormData(form));
const money = (amount, code = currency.value) => new Intl.NumberFormat('en-US',{style:'currency',currency:code}).format(amount);
const status = (message, error = false) => {$('status').textContent = message; $('status').classList.toggle('error', error);};
const job = () => $('jobName').value.trim() || 'Your next print';
function basisLabels() {
  const plate = $('basis').value === 'plate';
  for(const label of form.querySelectorAll('[data-basis-label]')) {
    label.dataset.original ??= label.textContent;
    label.textContent = `${label.dataset.original} / ${plate ? 'plate' : 'item'}`;
  }
  $('basis-note').textContent = plate ? 'Enter totals for the whole plate: material, machine time, successful labor and extras. They are divided equally across the identical items. Changing modes keeps your numbers; review their units.' : 'Enter one item’s material, time, successful labor and extras. Quantity multiplies those costs. Order setup and fixed fees still happen once.';
}
function priceTest() {
  const verdict = $('price-verdict'); verdict.classList.remove('loss');
  if (!result) {verdict.textContent = 'Correct the worksheet inputs first.'; return;}
  if (!$('offered-price').value.trim()) {verdict.textContent = `Break-even: ${money(result.breakEven)} / item after entered fees.`; return;}
  try {
    const test = evaluatePrice(result,values(),$('offered-price').value);
    verdict.textContent = `${money(test.profit)} profit / item · ${test.margin.toFixed(1)}% margin after fees. ${test.profit < 0 ? 'Below break-even.' : 'Compare with your target margin.'}`;
    verdict.classList.toggle('loss',test.profit < 0);
  } catch(error) {verdict.textContent = error.message; verdict.classList.add('loss');}
}
function renderQuote() {
  if (!result) return;
  $('quote-job').textContent = job(); $('quote-description').textContent = job();
  $('quote-ref').textContent = $('reference').value.trim() ? `Reference: ${$('reference').value.trim()}` : 'Draft estimate';
  // A customer quote rounds its unit price before multiplying so the visible lines add up.
  const unit = Math.round((result.price+Number.EPSILON)*100)/100;
  $('quote-quantity').textContent = String(result.quantity); $('quote-unit').textContent = money(unit);
  $('quote-total').textContent = money(unit*result.quantity); $('quote-grand-total').textContent = money(unit*result.quantity);
}
function renderComparisons() {
  const root = $('comparisons'); root.replaceChildren();
  if(!pins.length) {
    const placeholder = document.createElement('div'); placeholder.className = 'comparison-empty';
    const mark = document.createElement('span'); mark.textContent = '+ / ='; mark.setAttribute('aria-hidden','true');
    const text = document.createElement('p'); text.textContent = 'Your first estimate is the starting point. Pin it above to keep it beside your next idea.';
    placeholder.append(mark,text); root.append(placeholder); return;
  }
  for(const pin of pins) {
    const card = document.createElement('article'); card.className = 'comparison-card';
    const top = document.createElement('div'); top.className = 'comparison-top';
    const title = document.createElement('h3'); title.textContent = `${pin.name} / ${pin.number}`;
    const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = '×'; remove.setAttribute('aria-label',`Remove estimate ${pin.number}`);
    remove.addEventListener('click', () => {pins.splice(pins.indexOf(pin),1); renderComparisons(); status('Comparison pin removed.');}); top.append(title,remove); card.append(top);
    const basis = document.createElement('p'); basis.className = 'comparison-basis'; basis.textContent = `${pin.values.basis === 'plate' ? 'Whole plate' : 'Per item'} · ${pin.result.quantity} items · ${pin.values.currency}`; card.append(basis);
    const dl = document.createElement('dl');
    for(const [label,amount] of [['Cost / item',pin.result.cost],['Price / item',pin.result.price],['Profit / item',pin.result.profit],['Order total',pin.result.total]]) {
      const dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = label; dd.textContent = money(amount,pin.values.currency); dl.append(dt,dd);
    }
    card.append(dl);
    const delta = document.createElement('p'); delta.className = 'comparison-delta';
    if(!result) delta.textContent = 'Correct the current inputs to compare.';
    else if(pin.values.currency !== currency.value) delta.textContent = 'Different currencies. No conversion or price delta is calculated.';
    else {const change = result.price - pin.result.price; delta.textContent = Math.abs(change) < .005 ? 'Current unit price matches this pin.' : `Current price is ${money(Math.abs(change))} ${change > 0 ? 'higher' : 'lower'} / item.`;}
    card.append(delta); root.append(card);
  }
}
function update() {
  $('share-url').hidden = true; basisLabels();
  try {
    result = calculate(values());
    for(const key of ['price','cost','profit','total','fees']) $(key).textContent = money(result[key]);
    $('result-job').textContent = job(); $('batch-label').textContent = `Order total / ${result.quantity} ${result.quantity === 1 ? 'item' : 'items'}`;
    for(const key of costKeys) {$(`${key}-value`).textContent = money(result[key]); $(`${key}-bar`).style.width = `${result.cost ? result[key]/result.cost*100 : 0}%`;}
    status('Estimate updated. Review the basis and assumptions before quoting. Tax and shipping are excluded.');
    for(const id of ['csv','share','print','save','pin','quote']) $(id).disabled = false;
    renderQuote();
  } catch(error) {
    result = undefined;
    for(const key of ['price','cost','profit','total','fees']) $(key).textContent = '—';
    for(const key of costKeys) {$(`${key}-value`).textContent = '—'; $(`${key}-bar`).style.width = '0%';}
    status(error.message,true); for(const id of ['csv','share','print','save','pin','quote']) $(id).disabled = true;
    $('customer-quote').hidden = true;
  }
  priceTest(); renderComparisons();
}
function fill(data) {
  const complete = {...defaults,jobName:'',reference:'',...data};
  for(const [key,value] of Object.entries(complete)) {
    const field = form.elements.namedItem(key); if(!field) continue;
    field.value = ['jobName','reference'].includes(key) ? String(value).slice(0,key === 'jobName' ? 80 : 40) : value;
  }
  update();
}
form.addEventListener('submit', (e) => e.preventDefault());
form.addEventListener('input', () => {update(); clearTimeout(estimateTimer); estimateTimer = setTimeout(() => {if(result) track('estimate_complete');},700);});
$('offered-price').addEventListener('input', priceTest);
$('reset').addEventListener('click', () => {fill(defaults); $('offered-price').value = ''; priceTest(); history.replaceState(null,'',location.pathname); status('Example values restored. Replace them with your own measured costs.');});
$('save').addEventListener('click', () => {try {localStorage.setItem(`print-cost-${document.body.dataset.mode}`,JSON.stringify(values())); status('Profile saved in this browser.'); track('estimate_save');} catch {status('Browser storage is unavailable. Export CSV to keep your estimate.',true);}});
$('load').addEventListener('click', () => {try {const data = localStorage.getItem(`print-cost-${document.body.dataset.mode}`); if(!data) {status('No saved profile yet. Choose Save locally first.'); return;} fill(JSON.parse(data)); if(result) status('Saved profile loaded. Review its assumptions.');} catch {status('Could not load the saved profile.',true);}});
$('forget').addEventListener('click', () => {try {localStorage.removeItem(`print-cost-${document.body.dataset.mode}`); status('Saved profile deleted from this browser.');} catch {status('Browser storage is unavailable.',true);}});
$('pin').addEventListener('click', () => {if(!result) return; if(pins.length >= 3) {status('Three estimates are pinned. Remove one before adding another.'); return;} pins.push({number:++pinNumber,name:job(),values:values(),result:{...result}}); renderComparisons(); status('Estimate pinned on this page. Change an assumption to compare; pins clear when you leave.');});
$('quote').addEventListener('click', () => {if(!result) return; renderQuote(); $('customer-quote').hidden = false; $('customer-quote').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',block:'start'});});
$('close-quote').addEventListener('click', () => {$('customer-quote').hidden = true; $('quote').focus();});
$('share').addEventListener('click', async () => {
  const url = new URL(location.href); url.hash = new URLSearchParams(values()).toString();
  try {await navigator.clipboard.writeText(url.href); status('Estimate link copied. It includes all job details and cost inputs.'); track('estimate_share');}
  catch {$('share-url').hidden = false; $('share-url').value = url.href; $('share-url').select(); status('Copy the selected link. Anyone with it can read all cost inputs.');}
});
$('csv').addEventListener('click', () => {
  if(!result) return;
  const rows = [['Print Cost estimate',currency.value],['Basis','result values per item; tax and shipping excluded'],...Object.entries(values()).map(([key,value]) => [`Input: ${key}`,value]),...Object.entries(result).map(([key,value]) => [key,String(value)])];
  const cell = (value) => {let text = String(value); if(/^[\s]*[=+@-]/.test(text)) text = "'"+text; return `"${text.replaceAll('"','""')}"`;};
  const csv = rows.map((row) => row.map(cell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'})); const a = document.createElement('a'); a.href = url; a.download = 'print-cost-estimate.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(url),1000); track('estimate_export',{output_format:'csv'});
});
$('print').addEventListener('click', () => {if(result) {renderQuote(); $('customer-quote').hidden = false; track('estimate_print'); window.print();}});
window.addEventListener('beforeprint', () => {if(result) {renderQuote(); $('customer-quote').hidden = false;}});
const params = new URLSearchParams(location.hash.slice(1));
if([...params].length) {
  const allowed = {}; for(const key of [...Object.keys(DEFAULTS),'jobName','reference']) if(params.has(key)) allowed[key] = params.get(key);
  if(allowed.currency && ![...currency.options].some((option) => option.value === allowed.currency)) delete allowed.currency;
  fill(allowed); if(result) status('Shared estimate loaded. Review its inputs before quoting.');
} else fill(defaults);
