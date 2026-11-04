# Klid 🌸

**Soukromý chat na chvíle, kdy je těžko.** Klid je vlídný parťák, se kterým si můžeš popovídat, když je ti úzko, smutno, nemůžeš spát nebo se potřebuješ vypovídat. Běží na tvém počítači přes [Claude Code](https://docs.claude.com/en/docs/claude-code/overview) a **nic si nepamatuje**.

- 🩷 **Růžová edice** – tmavý i světlý režim, živá 3D koule, která dýchá, přemýšlí a píše.
- 🧾 **Vstupní dotazník** – na začátku pár otázek (jak ti říkat, co tě trápí, jaký styl odpovědí chceš, o čem mluvit nechceš). Klid se podle nich řídí.
- 🫧 **Nulová paměť** – rozhovor existuje jen, dokud je otevřený. Po zavření, obnovení stránky nebo „Novém rozhovoru“ zmizí. Nic se neukládá na disk, ani historie v Claude Code.
- 🆘 **Je mi zle teď** – jedno tlačítko, Klid zpomalí, uzemní a ukáže kontakty na pomoc.
- 🔒 **Jen u tebe** – stránka běží jen na tvém počítači (localhost), Claude nemá přístup k žádným souborům ani internetu.

> **Klid není terapeut, lékař ani krizová linka.** Když je ti hodně zle:
> **Linka první psychické pomoci 116 123** (nonstop, zdarma, i [chat](https://www.linkapsychickepomoci.cz)) · **Záchranka 155** · **Tísňová linka 112** · Do 18 let **Linka bezpečí 116 111**

---

## Instalace přes Claude Code (nejjednodušší)

1. Měj nainstalovaný [Claude Code](https://docs.claude.com/en/docs/claude-code/setup) a přihlas se v něm ke svému účtu Claude (Pro nebo Max).
2. Otevři Claude Code (aplikace Claude → záložka **Code**, nebo v terminálu `claude`) a napiš:

   ```
   Nainstaluj mi Klida podle https://github.com/jakubsuva96/klid-ruzovy/blob/main/INSTALL.md
   ```

3. Claude zkontroluje Node.js, stáhne Klida, ověří, že funguje, udělá ti ikonku na plochu a Klida otevře. Na všechno důležité se tě zeptá.

## Ruční instalace

Potřebuješ **Node.js 18+** ([nodejs.org](https://nodejs.org)) a **Claude Code** přihlášený příkazem `claude auth login`.

```bash
git clone https://github.com/jakubsuva96/klid-ruzovy.git ~/Klid
```

```bash
cd ~/Klid && npm install && npm run check -- --test
```

```bash
npm start
```

Otevře se prohlížeč na **http://localhost:4310**. Bez gitu: stáhni ZIP z [Releases](https://github.com/jakubsuva96/klid-ruzovy/releases/latest), rozbal a ve složce spusť `npm start`.

**Spouštění dvojklikem:** na Macu `start.command`, na Windows `start.bat`. Okno terminálu nech otevřené, dokud Klida používáš – zavřením ho vypneš.

## Jak to funguje

```
prohlížeč (localhost:4310)  →  server.mjs (Node, bez závislostí)  →  claude -p  →  Claude (tvůj účet)
```

- `server.mjs` spustí Claude Code v neinteraktivním režimu bez nástrojů, bez přístupu k souborům, bez MCP a s vypnutým ukládáním relací (`--no-session-persistence`). Pracovní složka je prázdná dočasná složka, která se při vypnutí smaže.
- Běžný rozhovor jede na **Claude Sonnet 5.5**. Když klepneš na „Je mi zle teď“ nebo zazní myšlenky na smrt či sebepoškození, Klid na 30 minut přepne na **Claude Opus 5.5**. Když ho tvoje předplatné nemá, zůstane u Sonnetu.
- Odpovědi z dotazníku jsou uložené jen v tvém prohlížeči (`localStorage`) a posílají se na začátku každého rozhovoru. Smažeš je v **Já → Smazat moje údaje**.
- Zprávy se zpracovávají u Anthropicu přes tvůj účet Claude a čerpají z tvého předplatného – stejně jako když píšeš do Claude.

## Nastavení

| Proměnná | Výchozí | K čemu |
|---|---|---|
| `PORT` | `4310` | port stránky |
| `KLID_MODEL` | `claude-sonnet-5-5` | model běžného rozhovoru |
| `KLID_MODEL_DEEP` | `claude-opus-5-5` | model v těžkých chvílích |

## Když něco nejde

- **„Vypršelo přihlášení Clauda“** → v terminálu `claude auth login`, pak Klida spusť znovu.
- **„Nenašel jsem Claude Code“** → nainstaluj ho podle [návodu](https://docs.claude.com/en/docs/claude-code/setup).
- **Stránka se nenačte** → běží okno s Klidem? Spusť `npm start` znovu.
- Kontrola všeho najednou: `npm run check -- --test`.

## Aktualizace a odinstalace

- Aktualizace: `git pull` ve složce Klida (nebo nový ZIP z Releases).
- Odinstalace: smaž složku `Klid` a v prohlížeči **Já → Smazat moje údaje**.

## Licence

MIT. Knihovny ve `public/vendor` (marked, DOMPurify, three.js) mají vlastní licence uvedené v jejich hlavičkách.
