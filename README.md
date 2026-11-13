# Suite D&D 5E

Strumenti web per il Dungeon Master di D&D 5E, pubblicati su GitHub Pages:
https://dcamuti.github.io/dnd5e-suite/

| Cartella | Tool |
|---|---|
| `characters/` | Schede PG |
| `npcs/` | Generatore NPC |
| `encounters/` | Generatore incontri e tracker di combattimento |
| `world/` | Generatore del mondo |
| `journal/` | Diario di campagna |
| `puzzles/` | Enigmi e rompicapi |
| `maps/` | Editor di mappe di battaglia |

Ogni tool è un singolo `index.html` autonomo. I tool condividono i dati tramite il localStorage del browser (stessa origine) e si collegano fra loro con percorsi relativi, quindi funzionano sia online sia aprendo il repository in locale.

Questo repository unifica i precedenti repo `dnd5e-tool-*`, di cui conserva la storia.

## Codice comune

Storage, backup, finestre, menu e stile di base sono uguali in tutti i tool. La loro unica fonte è la cartella `common/`: uno script li copia dentro i 7 `index.html`, tra i marcatori `>>> COMUNE` e `<<< COMUNE`. I file pubblicati restano autonomi: `common/` non viene caricata dal sito.

Per cambiare il codice comune:

1. modificare il file in `common/` (mai il testo tra i marcatori: verrebbe sovrascritto);
2. eseguire `node tools/build-common.js` (oppure `npm run build`), che aggiorna i 7 tool;
3. fare il commit di `common/` e dei tool insieme.

| Blocco | File in `common/` | Contenuto |
|---|---|---|
| `stile` | `stile-*.css` | focus e controlli touch, intestazione e menu, finestre, sezioni comprimibili, icone |
| `storage` | `storage.js` | chiavi dei dati, lettura e scrittura, migrazioni |
| `dati` | `dati-esterni.js`, `id-visibilita.js` | pulizia di ciò che viene importato, ID, visibilità e proprietà |
| `motore` | `motore.js`, `diario.js` | generatore casuale, profilo di campagna, invio al Diario (assente nelle Schede PG) |
| `interfaccia` | `immagini.js`, `backup.js`, `finestre.js`, `menu.js`, `interfaccia.js` | libreria immagini, backup e ripristino, finestre e Annulla, menu Dati, preferenze e accessibilità |

Dove un tool deve differire, la variante è scritta nel file comune con righe `/*#if tool*/ … /*#else*/ … /*#endif*/`. Oggi sono due: negli Enigmi l'HTML importato è ammesso (e ripulito), negli Incontri c'è una regola in più per i pulsanti dei punti ferita.

`tools/build-monster-index.js` funziona allo stesso modo per l'elenco dei mostri dell'editor di mappe, ricavato dal bestiario degli Incontri.

## Test automatici

I test verificano tutti i tool in un browser vero (Chromium, tramite [Playwright](https://playwright.dev)) e controllano che il codice comune dei 7 tool corrisponda a `common/`. Su GitHub partono da soli a ogni push (scheda **Actions**).

Per eseguirli sul proprio computer serve [Node.js](https://nodejs.org) 20 o successivo:

```
npm ci                              # una volta: installa Playwright
npx playwright install chromium     # una volta: scarica il browser per i test
npm test                            # controllo del codice comune + tutti i test
npm run test:ui                     # interfaccia grafica per eseguire e ispezionare i singoli test
npm run check                       # solo il controllo del codice comune (veloce, senza browser)
npm run build                       # copia common/ nei 7 tool dopo una modifica al codice comune
```

| File | Cosa verifica |
|---|---|
| `tools/check-common.js` | codice comune dei 7 tool uguale a `common/`; nessun `alert`/`confirm`/`prompt` del browser |
| `tests/01-base` | ogni tool si apre senza errori, barra e menu Dati, smartphone, controlli raggiungibili da tastiera |
| `tests/02-storage` | migrazione delle vecchie chiavi, ID, backup e ripristino (anche di backup vecchi) |
| `tests/03-sicurezza` | testi con HTML o script in dati salvati e importati non vengono eseguiti |
| `tests/04-incontri` | tracker, XP di fine combattimento, PG omonimi, sincronizzazione con le schede |
| `tests/05-diario-collegamenti` | invio al Diario senza doppioni, link all'originale, fazioni, sezioni comprimibili |
| `tests/06-schede` | generazione, salvataggio, Annulla, salita di livello dal Diario, regole di stampa |
| `tests/07-mappe` | disegno, elementi, annulla, export/import, token collegati, nebbia e vista giocatori |
| `tests/08-finestre-immagini` | finestre della suite da tastiera, Annulla, conferma del ripristino, libreria immagini |

Ogni test fallisce anche se la pagina genera un errore JavaScript o apre una finestra nativa del browser.

Le icone dell'editor di mappe provengono da [game-icons.net](https://game-icons.net) (autori Lorc, Delapouite, Skoll) e sono distribuite con licenza [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/).

Le icone dei comandi dell'interfaccia provengono da [Lucide](https://lucide.dev) e sono distribuite con licenza ISC (© Lucide Contributors; parti © Cole Bemis, Feather, licenza MIT). Le icone dei tool provengono da [game-icons.net](https://game-icons.net) (autori Lorc, Delapouite), licenza [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/).
