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

## Test automatici

I test verificano tutti i tool in un browser vero (Chromium, tramite [Playwright](https://playwright.dev)) e controllano che il codice comune sia identico nei 7 tool. Su GitHub partono da soli a ogni push (scheda **Actions**).

Per eseguirli sul proprio computer serve [Node.js](https://nodejs.org) 20 o successivo:

```
npm ci                              # una volta: installa Playwright
npx playwright install chromium     # una volta: scarica il browser per i test
npm test                            # controllo del codice comune + tutti i test
npm run test:ui                     # interfaccia grafica per eseguire e ispezionare i singoli test
npm run check                       # solo il controllo del codice comune (veloce, senza browser)
```

| File | Cosa verifica |
|---|---|
| `tools/check-common.js` | codice comune identico nei 7 tool; nessun `alert`/`confirm`/`prompt` del browser |
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
