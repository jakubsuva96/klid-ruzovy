// Kontrola instalace: `npm run check`
// Ověří Node.js, Claude Code, přihlášení a že Klid umí odpovědět (jedna krátká zkušební zpráva).
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir, tmpdir } from 'node:os';

const WIN = process.platform === 'win32';
let ok = true;
const good = (m) => console.log(`  ✓ ${m}`);
const bad = (m, fix) => { ok = false; console.log(`  ✗ ${m}${fix ? `\n    → ${fix}` : ''}`); };

console.log('Kontrola Klida\n');

const major = Number(process.versions.node.split('.')[0]);
major >= 18 ? good(`Node.js ${process.versions.node}`) : bad(`Node.js ${process.versions.node} je moc starý`, 'Nainstaluj Node.js 18 nebo novější (nodejs.org).');

let claude = null;
try { claude = execFileSync(WIN ? 'where' : 'which', ['claude'], { encoding: 'utf8' }).split(/\r?\n/)[0].trim(); } catch {}
if (!claude) claude = [join(homedir(), '.local', 'bin', WIN ? 'claude.exe' : 'claude'), '/opt/homebrew/bin/claude', '/usr/local/bin/claude'].find(existsSync) || null;
if (!claude) bad('Claude Code nenalezen', 'Nainstaluj ho: https://docs.claude.com/en/docs/claude-code/setup');
else {
  const v = spawnSync(claude, ['--version'], { encoding: 'utf8' });
  good(`Claude Code ${String(v.stdout || '').trim()}`);
  const a = spawnSync(claude, ['auth', 'status'], { encoding: 'utf8' });
  let st = {}; try { st = JSON.parse(a.stdout); } catch {}
  st.loggedIn ? good(`Přihlášeno (${st.authMethod || 'claude'})`) : bad('Claude Code není přihlášený', 'Spusť v terminálu: claude auth login');

  if (st.loggedIn && process.argv.includes('--test')) {
    const r = spawnSync(claude, ['-p', 'Odpověz jen slovem: funguju', '--model', process.env.KLID_MODEL || 'claude-sonnet-5-5',
      '--no-session-persistence', '--tools', '', '--setting-sources', '', '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}'],
      { encoding: 'utf8', timeout: 120000, cwd: tmpdir() });
    const out = String(r.stdout || '').trim();
    out ? good(`Zkušební odpověď: „${out.slice(0, 60)}“`) : bad('Claude neodpověděl', String(r.stderr || '').trim().split('\n').pop());
  }
}

console.log(ok ? '\nVšechno je připravené. Spusť Klida: npm start' : '\nNěco chybí – oprav body se ✗ a spusť kontrolu znovu.');
process.exit(ok ? 0 : 1);
