# Instalace Klida – návod pro Claude Code

> Tenhle soubor je psaný pro **Claude Code**. Když uživatel napíše „Nainstaluj mi Klida“ (nebo vloží odkaz na tohle repo), postupuj podle kroků níže. Mluv s ním česky, jednoduše, bez technického žargonu. Před každým krokem, který něco instaluje do systému, mu jednou větou řekni, co se stane, a počkej na souhlas.

## Co Klid potřebuje

- **Node.js 18 nebo novější** (bez dalších balíčků – Klid nemá žádné závislosti z npm).
- **Claude Code** (příkaz `claude`) přihlášený k účtu Claude s předplatným Pro nebo Max. Když tohle čteš v Claude Code, už je nainstalovaný.
- Git (na stažení) – nebo stáhnout ZIP z Releases.

## Kroky

1. **Zjisti systém** (macOS / Windows / Linux) a ověř Node.js: `node --version`.
   - Chybí nebo je starší než 18:
     - macOS s Homebrew: `brew install node`; bez Homebrew poraď stáhnout instalátor LTS z https://nodejs.org a počkej, až ho uživatel nainstaluje.
     - Windows: `winget install OpenJS.NodeJS.LTS`, pak je potřeba otevřít nový terminál.
     - Linux: balíčkovač distribuce nebo https://nodejs.org.

2. **Stáhni Klida** do domovské složky:
   - macOS / Linux: `git clone https://github.com/jakubsuva96/klid-ruzovy.git ~/Klid`
   - Windows (PowerShell): `git clone https://github.com/jakubsuva96/klid-ruzovy.git $HOME\Klid`
   - Když `git` chybí, stáhni ZIP nejnovější verze z https://github.com/jakubsuva96/klid-ruzovy/releases/latest, rozbal ho do složky `Klid` v domovské složce.
   - Když složka `Klid` už existuje, nic nepřepisuj – zeptej se, jestli jde o aktualizaci (pak viz „Aktualizace“).

3. **Nainstaluj moduly** ve složce Klida: `npm install` (nic nestahuje, jen ověří projekt).

4. **Zkontroluj instalaci**: `npm run check -- --test`
   - Ověří Node.js, Claude Code, přihlášení a pošle jednu krátkou zkušební zprávu.
   - „Claude Code není přihlášený“ → ať uživatel spustí `claude auth login` a přihlásí se ve svém prohlížeči. Přihlášení nikdy nedělej za něj a nežádej heslo.

5. **Udělej spouštěč na plochu**:
   - macOS: zkopíruj `start.command` na plochu jako `Klid.command`, ale s absolutní cestou do složky Klida, např.:
     ```bash
     printf '#!/bin/bash\ncd "%s" && ./start.command\n' "$HOME/Klid" > "$HOME/Desktop/Klid.command" && chmod +x "$HOME/Desktop/Klid.command"
     ```
     Při prvním spuštění může macOS varovat – pravým tlačítkem → Otevřít.
   - Windows: vytvoř na ploše `Klid.bat` s obsahem `@call "%USERPROFILE%\Klid\start.bat"`.
   - Linux: stačí `cd ~/Klid && npm start`.

6. **Spusť Klida**: `npm start` ve složce Klida. Otevře se prohlížeč na http://localhost:4310 a ukáže vstupní dotazník.
   - Spuštění na pozadí uživateli nevysvětluj složitě: stačí „okno terminálu nech otevřené, dokud Klida používáš; zavřením ho vypneš“.

7. **Na konci** uživateli řekni:
   - jak Klida příště spustí (dvojklik na Klid na ploše),
   - že Klid si nic nepamatuje a odpovědi z dotazníku jsou jen v jeho prohlížeči,
   - že zprávy jdou přes jeho účet Claude a čerpají z jeho předplatného,
   - že v nouzi je tu Linka první psychické pomoci **116 123**, záchranka **155** a **112**.

## Aktualizace

Ve složce Klida: `git pull` (nebo stáhnout nový ZIP z Releases a přepsat soubory), pak znovu `npm run check`.

## Odinstalace

Smazat složku `Klid` a spouštěč na ploše. V prohlížeči se odpovědi z dotazníku smažou tlačítkem **Já → Smazat moje údaje**.

## Když něco nejde

| Potíž | Řešení |
|---|---|
| „Vypršelo přihlášení Clauda“ | `claude auth login`, pak Klida spustit znovu |
| „Klid už běží (port je obsazený)“ | Klid je otevřený v jiném okně – stačí otevřít http://localhost:4310 |
| Chce jiný port | `PORT=4320 npm start` (Windows PowerShell: `$env:PORT=4320; npm start`) |
| Předplatné nemá model Opus | nic – Klid sám použije Sonnet |
| Chce jiný model | proměnné `KLID_MODEL` (běžný) a `KLID_MODEL_DEEP` (krizový) |
