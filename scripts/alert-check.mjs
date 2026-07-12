import puppeteer from 'puppeteer';
import fs from 'fs';

const SITE_URL = 'https://drsharma994-rgb.github.io/hardgate/';
const STATE_FILE = 'alert-state.json';

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch (e) {
    return { delta: null, coindcx: null };
  }
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + '\n');
}

async function main() {
  const prevState = loadState();
  console.log('Previous alert state:', JSON.stringify(prevState));

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  page.on('console', (msg) => console.log('[page]', msg.text()));
  page.on('pageerror', (err) => console.error('[page error]', err.message));

  const cacheBuster = Date.now();
  await page.goto(SITE_URL + '?nocache=' + cacheBuster, {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  await page.waitForSelector('#bestRun', { timeout: 30000 });
  // small settle delay so init scripts (emailjs.init, exchange setup) finish running
  await new Promise((r) => setTimeout(r, 3000));

  const newState = await page.evaluate(async (prev) => {
    if (typeof S !== 'undefined' && S.lastAlertKey) {
      S.lastAlertKey.delta = prev.delta;
      S.lastAlertKey.coindcx = prev.coindcx;
    }
    await runAlertCycle();
    return { delta: S.lastAlertKey.delta, coindcx: S.lastAlertKey.coindcx };
  }, prevState);

  await browser.close();

  console.log('New alert state:', JSON.stringify(newState));
  saveState(newState);

  const changed = JSON.stringify(prevState) !== JSON.stringify(newState);
  console.log(
    changed
      ? 'State changed for at least one exchange - a new-setup email should have been sent via EmailJS (check inbox / spam).'
      : 'No change since last cycle - no new email expected (either still WAIT, or same setup as last alert).'
  );
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
