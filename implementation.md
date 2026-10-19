# Implementation – Del A: plan och implementation med Claude Code

**Projekt:** pr-conventions-reviewer, en GitHub Action som granskar PR:er mot repots egna regler i `CLAUDE.md`.
**Utgångsläge:** repot innehöll bara `CLAUDE.md`. Analysen gällde därför hur grunden ska se ut enligt CLAUDE.md, inte befintlig kod.

**Arbetssätt:**
1. Agenten gjorde en analys, utan lösning.
2. Agenten skrev en plan i planeringsläget.
3. Planen implementerades i 6 steg, med verifiering och en commit efter varje steg.

## 1. Vad identifierade agenten?
Agenten hittade 15 luckor och risker i CLAUDE.md. De viktigaste:
- **Säkerhet och beteende:** regelfilen kan läsas från PR:ens head, så författaren kan ändra reglerna och slippa granskningen. PR:er från forks saknar API-nyckel, så actionen kraschar. Promptinjektion via diffen.
- **Svåraste logiken:** att koppla modellens fynd till rader som faktiskt finns i diffen kräver en egen hunk-parser.
- **Oklarheter som blir teknisk skuld:** hur schemat ska valideras (bibliotek eller egen kod), att Node-versionen inte är angiven, att det är oklart vad "max diff size" mäts i, och hur genererade filer ska kännas igen.
- **Arkitekturen hålls bara om den kontrolleras:** att `review/` ska vara ren är bara en konvention, det finns ingen felhierarki, och klienterna måste skickas in som parametrar för att kunna testas.

Grunden byggdes utifrån fem av punkterna:
- egen schemavalidator
- låst Node-version
- ESLint-regler som tvingar fram lagergränserna
- felhierarki
- injicerade beroenden

Övriga v1-punkter sparas till nästa plan.

## 2. Vad ville agenten göra som stoppades, och varför?
- **En CI-kontroll av att `dist/` är aktuell, och hantering av dubbla reviews vid varje push.** Båda ströks, eftersom de bryter mot CLAUDE.md:s regel *"Do not expand scope"*. De blir issues i stället.
- **Promptinjektion som en egen åtgärd.** Den ströks, eftersom schemavalideringen och filtreringen mot diffen redan täcker den största risken.
- **Nya beroenden.** CLAUDE.md kräver godkännande, så agenten listade i planen de paket som inte stod i teknikstacken (`typescript`, `@types/node`, `eslint`, `typescript-eslint`). De godkändes innan något installerades. zod valdes bort till förmån för en egen validator.
- **Modulformat.** När ESM-problemet upptäcktes (se punkt 3) fick agenten inte välja själv. Den presenterade två alternativ: byta till ESM eller låsa `@actions/core` till 1.x. Valet blev ESM, eftersom det håller även när fler paket läggs till.

*Självkritiskt:* planen godkändes i första versionen utan iteration. Strykningarna ovan föreslogs av agenten och godkändes, de initierades inte av mig.

## 3. Vad missade agenten?
- **TypeScript 7 fungerar inte med ncc.** Planen angav ingen version, och npm valde TS 7. Den saknar JS-API:t som ncc använder. Felet upptäcktes vid ett provbygge i steg 1, och lösningen blev att låsa till TS 6 och lägga till `rootDir`.
- **`@actions/core` 3 är ESM-only, och bygget "lyckades" ändå.** `npm run build` gav exit 0, men bundeln kraschade vid körning (`Cannot find module '@actions/core'`, exit 1). På GitHub hade den fått användarens CI att fallera, alltså precis det CLAUDE.md förbjuder. Planens verifiering ("kör build") räckte inte. Felet syntes först när `dist/index.js` kördes utanför projektmappen. Lösningen blev att byta projektet till ESM.
- **`github-token` behöver en default i `action.yml`.** Planen sa "inga defaults i action.yml", men `${{ github.token }}` finns bara i Actions-miljön och kan inte ligga i `config/`.
- **Att `cause` inte loggas är bara en regel.** Testerna visar att `cause` inte läcker in i `message`. Men inget hindrar att någon senare skriver `console.log(error)`.

Lint-reglerna från steg 2 stoppade dessutom agenten två gånger, för `any` och för en onödig typomvandling i testerna. Båda gångerna skrevs koden om i stället för att regeln stängdes av.

## 4. Är projektet körbart efter implementationen?
**Ja.** Actionen startar, validerar sina inputs, maskerar hemligheter och avslutas alltid med exit 0. Själva PR-granskningen är inte byggd än, och README säger det uttryckligen.

Verifierat efter sista steget:
| Kontroll | Resultat |
|---|---|
| `npm run lint` (ESLint + tsc) | ✅ |
| `npm test` (Vitest) | ✅ 28 av 28 |
| `npm run build` | ✅ 1 043 kB bundle |
| `node dist/index.js` utan inputs, körd utanför repot | ✅ `::warning::`, exit 0 |
| Ogiltig `fail-on-findings` | ✅ `::warning::`, exit 0 |
| Giltiga inputs | ✅ info-rader, exit 0 |
| Hemligheter i utskriften utanför `::add-mask::` | ✅ 0 träffar |

Arkitekturreglerna testades manuellt. Tillfälliga filer med `node:fs` och `process.env` i `review/`, `@anthropic-ai/sdk` i `config/` och `any` gav 5 lint-fel. Filerna togs sedan bort.

**Commits:** sex commits, en per steg (`ec468f7` till `6909cfa`). Inget har pushats.
