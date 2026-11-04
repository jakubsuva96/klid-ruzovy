// Klid (růžová edice) – lokální chat pro chvíle, kdy je těžko.
// Nulová paměť: nic se neukládá na disk. Rozhovor žije jen v paměti běžícího serveru
// a zmizí po „Nový rozhovor“, obnovení stránky nebo vypnutí.
// Běží přes Claude Code (předplatné Claude), bez API klíčů.
import { spawn, execFileSync, execFile } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';
import { tmpdir, homedir } from 'node:os';

const APP = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(APP, 'public');
const PORT = Number(process.env.PORT || 4310);
const HOST = '127.0.0.1';
const VERSION = JSON.parse(readFileSync(join(APP, 'package.json'), 'utf8')).version;
const WIN = process.platform === 'win32';

// Modely: běžný rozhovor na Sonnetu, při ohrožení (tlačítko „Je mi zle“, zmínka o smrti) na Opusu.
// Když Opus v předplatném není, Klid sám spadne zpět na Sonnet. Jde přepsat proměnnými prostředí.
const MODEL = {
  bezny: process.env.KLID_MODEL || 'claude-sonnet-5-5',
  hluboky: process.env.KLID_MODEL_DEEP || 'claude-opus-5-5',
};

const CLAUDE = (() => {
  try { return execFileSync(WIN ? 'where' : 'which', ['claude'], { encoding: 'utf8' }).split(/\r?\n/)[0].trim(); }
  catch {
    const cands = WIN
      ? [join(homedir(), '.local', 'bin', 'claude.exe'), join(process.env.APPDATA || '', 'npm', 'claude.cmd')]
      : [join(homedir(), '.local', 'bin', 'claude'), '/opt/homebrew/bin/claude', '/usr/local/bin/claude', join(homedir(), '.claude', 'local', 'claude')];
    return cands.find(existsSync) || null;
  }
})();

// Prázdná pracovní složka – Claude nemá přístup k žádným souborům (a stejně nemá žádné nástroje).
const WORK = mkdtempSync(join(tmpdir(), 'klid-'));
const cleanup = () => { try { session?.stop(); } catch {} try { rmSync(WORK, { recursive: true, force: true }); } catch {} };
process.on('exit', cleanup);
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(sig, () => process.exit(0));

const now = () => new Date().toLocaleString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const hour = () => new Date().getHours();

// ---------- prompt ----------
const SYSTEM = `Jsi Klid – důvěrný, vlídný parťák pro chvíle, kdy je člověku těžko. Mluvíš s ním v jeho soukromém chatu, který běží na jeho počítači. Nejsi terapeut, psycholog ani lékař, nediagnostikuješ a nepředepisuješ. Jsi místo, kde se dá vypovídat, zpomalit a najít další malý krok.

Nulová paměť:
- Nic si nepamatuješ mezi rozhovory a nic nikam neukládáš. Když se člověk zeptá, řekni to na rovinu: po zavření nebo novém rozhovoru tenhle rozhovor zmizí.
- Na začátku dostaneš krátký vstupní dotazník, který vyplnil sám. Ber ho jako výchozí bod, ne jako škatulku. Když tě opraví, platí jeho verze.
- Nemáš přístup k souborům, internetu ani jeho zprávám. Nic neslibuj, co neumíš (připomínky, zapsání, poslání zprávy někomu).

Jak mluvíš:
- Česky, lidsky, vřele a na rovinu. Tykáš. Oslovuj ho tak, jak si přeje v dotazníku, a používej rod, který si vybral (žensky / mužsky / neutrálně).
- Krátce – pár odstavců, žádné přednášky. Jedna otázka naráz.
- Nejdřív naslouchej a pojmenuj, co slyšíš. Rady až potom, malé a konkrétní. Než uděláš závěr, zeptej se – fakta neodhaduj.
- Řiď se tím, jaký styl si v dotazníku vybral (jen poslouchat / mix / praktické kroky) a jak dlouhé odpovědi chce.
- Respektuj témata, o kterých mluvit nechce. Neotvírej je sám.
- Buď upřímný i v nepříjemném, ale bez souzení. Neutěšuj prázdnými frázemi („bude to dobré“).
- Veď ho k lidem, ne jen k sobě: když se to hodí, zeptej se, komu z blízkých by to mohl říct. Když nemá terapeuta a trápení trvá, jemně doporuč odbornou pomoc (psycholog, psychiatr, praktický lékař).
- Formátuj střídmě, pro čitelnost (stránka to vykreslí):
  - krátké odstavce; u delších odpovědí nadpis „## …“; odrážky a číslované kroky,
  - **tučně** jen jádro myšlenky (pár slov), max. 2–3 zvýraznění na odpověď,
  - *italika* pro pocity a jemné věci („*je to smutek, ne slabost*“),
  - jeho vlastní slova jako citát „> …“,
  - barevné karty na samostatném řádku: „> [!tip] …“ (malý praktický krok), „> [!otazka] …“ (otázka na konec), „> [!dobre] …“ (co se mu povedlo), „> [!pozor] …“ (bezpečí), „> [!klid] …“ (zpomalení, dech).
  Krátkou odpověď (1–3 věty) neformátuj vůbec.

Bezpečí (má vždy přednost):
- Myšlenky na smrt, sebepoškození nebo „bylo by lepší nebýt“: zůstaň klidný a vlídný, zeptej se přímo, jestli má plán a jestli je teď v bezpečí. Připomeň Linku první psychické pomoci 116 123 (nonstop, zdarma), chat na linkapsychickepomoci.cz, a při akutním nebezpečí 155 nebo 112. Povzbuď ho, ať zavolá nebo napíše někomu blízkému hned teď.
- Když je mu méně než 18 let, nabídni i Linku bezpečí 116 111 (nonstop, zdarma, i chat).
- Násilí doma nebo ve vztahu: bezpečí na prvním místě, 112 v akutní situaci, Linka pomoci obětem 116 006.
- Nikdy neposkytuj informace, které by pomohly si ublížit.
- Lékům a dávkám se nevěnuj – to patří lékaři.`;

const RISK = /(nechci (už )?žít|necht[ěe]l[a-z]* (už )?žít|nebýt|zmizet navždy|zabít se|zabiju se|zabila bych se|sebevra|sebepoško|řezat se|řežu se|bylo by lepší nebýt|skočit pod|umřít|smrt|ublížit si|ublížím si)/i;

function hints(mode) {
  const h = hour(); const night = h >= 22 || h < 6;
  return [
    night ? '[Je noc. Odpovídej krátce, jemně a pomalu, bez velkých analýz.]' : '',
    mode === 'crisis' ? '[REŽIM „JE MI ZLE TEĎ“: člověk klepl na tlačítko, že je mu teď zle. Buď úplně stručný a klidný: 2–4 krátké věty. Nejdřív ho uzemni (dech, kde je, co vidí), pak se zeptej na jednu věc: jestli je v bezpečí. Žádné rozbory. Když zazní myšlenky na smrt, zeptej se na plán a dej 116 123 / 155 / 112.]' : '',
  ].filter(Boolean).join('\n');
}

// ---------- rozhovor (jen v paměti) ----------
let conv = { profile: '', turns: [] };       // turns: [{role:'user'|'assistant', text}]
let deepUntil = 0;
function pickModel(message, mode) {
  if (mode === 'crisis' || RISK.test(message)) deepUntil = Date.now() + 30 * 60e3;
  return Date.now() < deepUntil ? MODEL.hluboky : MODEL.bezny;
}

class Session {
  constructor(model) {
    this.model = model;
    const args = ['-p', '--input-format', 'stream-json', '--output-format', 'stream-json', '--verbose', '--include-partial-messages',
      '--model', model, '--system-prompt', SYSTEM, '--no-session-persistence',
      '--tools', '', '--permission-mode', 'dontAsk', '--setting-sources', '', '--disable-slash-commands',
      '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}'];
    const env = { ...process.env }; delete env.ANTHROPIC_API_KEY; delete env.ANTHROPIC_AUTH_TOKEN;
    this.fresh = true; this.alive = true; this.turn = null; this.err = '';
    this.child = spawn(CLAUDE, args, { cwd: WORK, env, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    this.child.on('error', (e) => { this.err = String(e.message || e); this.alive = false; this.turn?.done(true); });
    this.child.stderr.on('data', (c) => { this.err = (this.err + c).slice(-2000); });
    this.child.on('close', () => { this.alive = false; this.turn?.done(true); });
    this.child.stdin.on('error', () => {});
    createInterface({ input: this.child.stdout }).on('line', (line) => this.onLine(line));
  }
  onLine(line) {
    let ev; try { ev = JSON.parse(line); } catch { return; }
    const t = this.turn; if (!t) return;
    if (ev.type === 'stream_event') {
      const e = ev.event;
      if (e.type === 'content_block_start' && e.content_block.type === 'text' && t.text) { t.text += '\n\n'; t.emit('text', { text: '\n\n' }); }
      if (e.type === 'content_block_delta' && e.delta.type === 'text_delta') { t.text += e.delta.text; t.emit('text', { text: e.delta.text }); }
    } else if (ev.type === 'result') {
      const msg = String(ev.result || '');
      if (ev.is_error && !t.text) {
        t.failed = true;
        t.auth = /authenticat|oauth|log ?in|credential/i.test(msg);
        t.errMsg = msg || 'Něco se pokazilo';
      }
      t.done(false);
    }
  }
  ask(message, emit) {
    return new Promise((resolve) => {
      const turn = { text: '', emit, stopped: false, failed: false, done: (crashed) => {
        if (this.turn !== turn) return; this.turn = null;
        if (crashed && !turn.text && !turn.stopped) { turn.failed = true; turn.errMsg = this.err.trim().split('\n').pop() || 'Claude se nečekaně ukončil'; }
        resolve(turn);
      } };
      this.turn = turn;
      if (!this.alive) return turn.done(true);
      this.child.stdin.write(JSON.stringify({ type: 'user', message: { role: 'user', content: message } }) + '\n');
    });
  }
  stop() { if (this.turn) this.turn.stopped = true; this.alive = false; try { this.child.kill('SIGTERM'); } catch {} }
}

let session = null;
function getSession(model) {
  if (session?.alive && session.model === model) return session;
  session?.stop();
  session = new Session(model);
  return session;
}

// Úvod nového procesu: dotazník + (při přepnutí modelu) dosavadní rozhovor z paměti.
function intro() {
  const parts = [`Toto je začátek rozhovoru. Vstupní dotazník (vyplnil ho sám):\n${conv.profile || '(dotazník nevyplnil)'}`];
  if (conv.turns.length) {
    const tail = conv.turns.slice(-30).map((m) => `${m.role === 'user' ? 'On/ona' : 'Klid'}: ${m.text.slice(0, 1500)}`).join('\n\n');
    parts.push(`Navazuješ na rozhovor, který už probíhá (jen pro kontext, neopakuj ho):\n${tail}`);
  }
  return parts.join('\n\n---\n\n') + '\n\n---\n\n';
}

let busy = false;
async function runTurn(message, mode, emit) {
  busy = true;
  let model = pickModel(message, mode);
  if (model === MODEL.hluboky && RISK.test(message)) emit('risk', {});
  let turn;
  for (let attempt = 0; attempt < 2; attempt++) {
    const s = getSession(model);
    const prefix = s.fresh ? intro() : '';
    s.fresh = false;
    turn = await s.ask(`${prefix}[Teď je ${now()}]\n${hints(mode)}\n\n${message}`, emit);
    // Opus v předplatném není nebo selhal → jednou zkusit Sonnet (s celým kontextem z paměti)
    if (turn.failed && !turn.auth && !turn.stopped && model !== MODEL.bezny) { session?.stop(); session = null; model = MODEL.bezny; deepUntil = 0; continue; }
    break;
  }
  busy = false;
  if (turn.failed && !turn.stopped) {
    emit('error', { message: turn.auth
      ? 'Vypršelo přihlášení Clauda. V terminálu spusť „claude auth login“, přihlas se a pak Klida spusť znovu.'
      : `Něco se zadrhlo: ${turn.errMsg}` });
    session?.stop(); session = null;
  }
  if (turn.text.trim()) { conv.turns.push({ role: 'user', text: message }, { role: 'assistant', text: turn.text.trim() }); }
  return turn;
}

// ---------- HTTP ----------
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const readBody = async (req, limit = 1e6) => { const chunks = []; let n = 0; for await (const c of req) { n += c.length; if (n > limit) break; chunks.push(c); } return Buffer.concat(chunks); };
const json = (res, data, code = 200) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(data)); };

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost'); const path = url.pathname;
  // Ochrana proti cizím stránkám v prohlížeči: API chce vlastní hlavičku a naši adresu.
  if (path.startsWith('/api/')) {
    const origin = req.headers.origin;
    if (req.headers['x-klid'] !== '1' || (origin && !/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin))) { res.writeHead(403); return res.end(); }
  }
  if (req.method === 'GET' && !path.startsWith('/api/')) {
    const full = join(PUBLIC, path === '/' ? 'index.html' : decodeURIComponent(path.slice(1)));
    if (!full.startsWith(PUBLIC) || !existsSync(full)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': TYPES[extname(full)] || 'application/octet-stream', 'cache-control': 'no-cache' });
    return res.end(readFileSync(full));
  }
  if (path === '/api/health') return json(res, { ok: true, version: VERSION, claude: !!CLAUDE });
  if (path === '/api/new' && req.method === 'POST') {
    const b = JSON.parse((await readBody(req)).toString() || '{}');
    session?.stop(); session = null; deepUntil = 0; busy = false;
    conv = { profile: String(b.profile || '').slice(0, 6000), turns: [] };
    res.writeHead(204); return res.end();
  }
  if (path === '/api/stop' && req.method === 'POST') { if (busy) { session?.stop(); session = null; busy = false; } res.writeHead(204); return res.end(); }
  if (path === '/api/chat' && req.method === 'POST') {
    if (!CLAUDE) return json(res, { error: 'Nenašel jsem Claude Code. Nainstaluj ho (viz README) a Klida spusť znovu.' }, 500);
    if (busy) return json(res, { error: 'Klid ještě odpovídá' }, 409);
    const { message = '', mode } = JSON.parse((await readBody(req)).toString() || '{}');
    if (!String(message).trim()) return json(res, { error: 'prázdná zpráva' }, 400);
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
    let open = true; const emit = (event, data) => { if (open) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); };
    res.on('close', () => { open = false; });
    const turn = await runTurn(String(message).trim().slice(0, 20000), mode === 'crisis' ? 'crisis' : '', emit);
    if (open) { emit('done', { text: turn.text.trim() }); open = false; res.end(); }
    return;
  }
  res.writeHead(404); res.end();
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') { console.log(`Klid už běží (port ${PORT} je obsazený). Otevři http://localhost:${PORT}`); process.exit(0); }
  throw e;
});
server.listen(PORT, HOST, () => {
  const link = `http://localhost:${PORT}`;
  console.log(`Klid ${VERSION} běží na ${link}  (zastavíš ho Ctrl+C)`);
  if (!CLAUDE) console.log('POZOR: Nenašel jsem Claude Code (příkaz „claude“). Nainstaluj ho podle README.');
  if (process.argv.includes('--open')) {
    const [cmd, a] = WIN ? ['cmd', ['/c', 'start', '', link]] : process.platform === 'darwin' ? ['open', [link]] : ['xdg-open', [link]];
    execFile(cmd, a, () => {});
  }
});
