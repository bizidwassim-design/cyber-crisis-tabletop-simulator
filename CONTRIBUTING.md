# Contributing

Thanks for helping improve this simulator. Welcome contributions: new scenarios, better injects and consequences,
translations, accessibility fixes and documentation.

## Ground rules

* **Fictional data only.** Use fictional organisations (Northwind Logistics, Contoso, Fabrikam, Woodgrove). Never
  commit a real incident, real people, hostnames, amounts or internal details.
* **Original content.** Reference laws and standards by name; do not paste their text. Notification deadlines are
  illustrations and must say so.
* **No build step, no dependencies, no network.** The app must keep working when opened as a local file with the
  Content-Security-Policy in `index.html` unchanged.
* Be kind: see the [Code of Conduct](CODE_OF_CONDUCT.md).

## Where things live

| Path | Change it when |
|------|----------------|
| `data/scenarios.js` | You add or edit a scenario. See [docs/writing-scenarios.md](docs/writing-scenarios.md). |
| `data/samples.js` | You change the scripted sample runs. |
| `examples/` | Never by hand: run `node scripts/build_examples.js`. |
| `assets/engine.js` | Scoring or consequence rules. Keep it free of DOM code. |
| `assets/app.js`, `assets/style.css`, `index.html` | Behaviour, styling, markup. |

## Making a change

1. Fork and branch (`feat/scenario-insider`, `fix/timer-pause`).
2. Run the checks that CI runs:

   ```bash
   for f in assets/*.js data/*.js scripts/*.js; do node --check "$f"; done
   node scripts/check_scenarios.js
   node scripts/build_examples.js && git diff --exit-code -- examples/
   npx --yes html-validate@8 index.html
   ```

3. Open `index.html`, play the changed scenario once timed and once untimed, and read the report.
4. Commit the source **and** the regenerated examples, then open a pull request that explains what changed and why.
