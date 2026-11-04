# Klid (růžová edice)

Když tě uživatel požádá o instalaci, aktualizaci nebo opravu Klida, řiď se souborem `INSTALL.md`. Mluv česky a jednoduše.

- Projekt nemá žádné závislosti z npm; spouští se `npm start` (port 4310).
- Kontrola: `npm run check -- --test`.
- Klid nesmí nic ukládat na disk (nulová paměť) a Claude v něm nemá nástroje – při úpravách to zachovej.
- Nikdy nepřihlašuj uživatele za něj a nežádej hesla; přihlášení dělá sám příkazem `claude auth login`.
