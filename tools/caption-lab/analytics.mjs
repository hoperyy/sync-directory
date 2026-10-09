// Shared GA4 integration. Only fixed, allow-listed feature labels are collected.
export const MEASUREMENT_ID = 'G-NCGJMGKSW2';
export const CONSENT_KEY = 'site-factory-analytics-v1';
export const COOKIE_PREFIX = 'sitefactory';
const EVENTS = new Set(['page_view','tool_complete','tool_download','tool_copy','estimate_complete','estimate_save','estimate_export','estimate_share','estimate_print']);
const LABELS = {
  tool_id: new Set(['srt-to-vtt','vtt-to-srt','text','shift','check','fdm','resin']),
  input_format: new Set(['srt','vtt']),
  output_format: new Set(['srt','vtt','txt','csv']),
};

export function safeLocation(value) {
  try { const url = new URL(value); return ['https:','http:'].includes(url.protocol) ? url.origin+url.pathname : ''; }
  catch { return ''; }
}
export function safeParameters(parameters = {}) {
  const safe = {};
  for (const [key,allowed] of Object.entries(LABELS)) if (allowed.has(parameters[key])) safe[key] = parameters[key];
  return safe;
}

export function initializeAnalytics({win,doc,storage,site,base,measurementId = MEASUREMENT_ID}) {
  let choice;
  try { choice = storage.getItem(CONSENT_KEY); } catch {}
  const allowedHost = win.location.hostname === 'hoperyy.github.io' && win.location.protocol === 'https:';
  let initialized = false;
  let loaded = false;
  const gtag = (...args) => { win.dataLayer ??= []; win.dataLayer.push(args); };
  const denied = {analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'};
  const banner = doc.getElementById('analytics-banner');
  const config = () => ({
    send_page_view:false,
    page_location:safeLocation(win.location.href),
    page_referrer:safeLocation(doc.referrer),
    content_group:site,
    cookie_prefix:COOKIE_PREFIX,
    cookie_domain:'none',
    cookie_path:base,
    allow_google_signals:false,
    allow_ad_personalization_signals:false,
  });
  function track(name,parameters = {}) {
    if (choice !== 'granted' || !initialized || !allowedHost || !EVENTS.has(name)) return;
    gtag('event',name,{
      ...safeParameters(parameters),send_to:measurementId,content_group:site,
      page_location:safeLocation(win.location.href),page_referrer:safeLocation(doc.referrer),
    });
  }
  function start() {
    if (!allowedHost || choice !== 'granted') return;
    win[`ga-disable-${measurementId}`] = false;
    if (!initialized) {
      gtag('consent','default',denied);
      gtag('js',new Date());
      gtag('consent','update',{...denied,analytics_storage:'granted'});
      gtag('config',measurementId,config());
      initialized = true;
    } else gtag('consent','update',{...denied,analytics_storage:'granted'});
    track('page_view');
    if (!loaded) {
      const script = doc.createElement('script'); script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
      doc.head.append(script); loaded = true;
    }
  }
  function choose(value) {
    choice = value;
    try { storage.setItem(CONSENT_KEY,value); } catch {}
    if (banner) banner.hidden = true;
    if (choice === 'granted') start();
    else {
      win[`ga-disable-${measurementId}`] = true;
      // Remove only this bundle's cookies, keeping other projects' preferences intact.
      for (const cookie of doc.cookie.split(';')) {
        const name = cookie.split('=')[0].trim();
        if (name.startsWith(`${COOKIE_PREFIX}_ga`)) doc.cookie = `${name}=; Max-Age=0; Path=${base}; SameSite=Lax; Secure`;
      }
    }
  }
  doc.getElementById('analytics-allow')?.addEventListener('click',() => choose('granted'));
  doc.getElementById('analytics-decline')?.addEventListener('click',() => choose('denied'));
  doc.getElementById('analytics-settings')?.addEventListener('click',() => {if (banner) {banner.hidden = false; doc.getElementById('analytics-allow')?.focus();}});
  if (banner) banner.hidden = !allowedHost || ['granted','denied'].includes(choice);
  if (choice === 'granted') start();
  return {track};
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const site = document.querySelector('meta[name="site-id"]')?.content;
  const base = document.querySelector('meta[name="site-base"]')?.content;
  if (site && base) {
    let storage;
    try {storage=window.localStorage;} catch {storage={getItem:() => null,setItem:() => {}};}
    window.siteAnalytics = initializeAnalytics({win:window,doc:document,storage,site,base});
  }
}
