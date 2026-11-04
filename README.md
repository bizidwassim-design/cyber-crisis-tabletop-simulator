# Cyber Crisis & Tabletop Exercise Simulator

[![Demo](https://img.shields.io/badge/demo-open%20the%20live%20simulator-C62F2F?style=for-the-badge&logo=githubpages&logoColor=white)](https://bizidwassim-design.github.io/cyber-crisis-tabletop-simulator/)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE) [![CI](https://github.com/bizidwassim-design/cyber-crisis-tabletop-simulator/actions/workflows/ci.yml/badge.svg)](https://github.com/bizidwassim-design/cyber-crisis-tabletop-simulator/actions/workflows/ci.yml) [![Fictional data](https://img.shields.io/badge/scenario%20data-fictional-informational)](SECURITY.md)

**Incident Response · Crisis Management · Executive Readiness**

An interactive simulator that trains a leadership team to make decisions during a cyberattack. Each inject arrives
with a clock. The decision owner (CISO, CIO or Legal counsel) picks one of three calls and says who must be informed.
The situation board then shows the simulated consequences on operations, data, legal exposure, reputation and
uninsured cost. At the end the team gets a scored performance report, role by role, with the playbook reference
behind every decision.

It runs entirely in the browser: no account, no server, no tracking. Open the [live simulator](https://bizidwassim-design.github.io/cyber-crisis-tabletop-simulator/)
or the [sample report](https://bizidwassim-design.github.io/cyber-crisis-tabletop-simulator/?sample=1).

> 🇫🇷 Résumé en français en bas de page.

## What it does

| Feature | Detail |
|---|---|
| **Scenarios** | *Locked at month-end*: ransomware with data theft (8 injects). *The new bank details*: business email compromise and payment fraud (7 injects). |
| **Timed decisions** | 60, 90, 120 or 180 seconds per inject, or untimed for a facilitated discussion. Pause for the facilitator. When the clock runs out, the inject resolves as "no decision" and the situation gets worse. |
| **Roles** | Each inject has a decision owner: CISO, CIO or Legal counsel. Names entered at the start appear on the owner badge and in the report. A facilitator reads the injects aloud. |
| **Simulated consequences** | Four meters (operations, data protection, legal and regulatory, reputation and trust) and an uninsured cost. Earlier decisions change later injects: unprotected backups cost 11 days of data, a chat channel the attacker reads ends up quoted in the ransom note, a slow bank call loses the frozen funds. |
| **Who do you inform?** | Twelve stakeholders, from the executive sponsor to the insurer, the regulator and the bank fraud desk. Missing someone the playbook requires costs a point. |
| **Performance report** | Overall score and band (Ready, Developing, At risk), decision quality, timeliness, communication, score by role, decision log with time taken, improvement actions linked to the playbooks, and hot-wash questions. Download as Markdown or JSON, or print to PDF. |

## How scoring works

The model comes from the tabletop kit in [Incident Response Playbooks](https://github.com/bizidwassim-design/incident-response-playbooks/blob/main/docs/tabletop-exercise-kit.md):
for each inject, did the team make the decision, make it in time, and tell the right people?

| Dimension | Points | Earned when |
|---|---|---|
| Decision | 0 to 2 | 2 for the call the playbook recommends, 1 for a defensible call with a cost, 0 for a harmful one or none |
| Timeliness | 0 or 1 | Decided before the clock ran out (not scored in untimed mode) |
| Communication | 0 or 1 | Every required stakeholder informed, with at most two extra |

Bands: **Ready** 80% and above, **Developing** 60 to 79%, **At risk** below 60%.

## Built on the Incident Response Playbooks

Every inject cites the decision point it rehearses in the crisis-level [Incident Response Playbooks](https://github.com/bizidwassim-design/incident-response-playbooks)
pack, and the report links each improvement action to it.

| Scenario | Playbooks and decision points |
|---|---|
| Locked at month-end | Malware outbreak D1, D4, D7 · Privileged account compromise D1, D3 to D5, D7, D8 · Data breach D1 to D7 · DDoS with extortion D5 · Severity matrix |
| The new bank details | Supply chain and vendor compromise D1, D3, D5 to D7 · Privileged account compromise D3, D4 · Data breach D1, D2, D7 · Post-incident review template |

The roles follow the pack's `templates/roles-raci.csv`: Legal owns privilege, the insurer and regulators; the CIO
owns identity, backups and recovery order; the CISO owns containment and the statement on the incident.

## Layout

```
index.html                 the app: start, briefing, injects, outcomes, report
assets/engine.js           rules: session, consequences, scoring, report, Markdown export (no DOM, also runs in Node)
assets/app.js              browser UI: timer, situation board, screens, downloads
assets/style.css           light and dark themes, phone layout, print layout for the report
data/scenarios.js          the scenario bank: roles, stakeholders, meters, injects, options, consequences, guidance
data/samples.js            two scripted fictional runs used for the sample report and the examples
examples/                  generated sample reports (JSON and Markdown)
docs/facilitator-guide.md  how to run a session with a leadership team
docs/writing-scenarios.md  how to add your own scenario
scripts/                   check_scenarios.js (validation, every path played) and build_examples.js
```

## Run a session

1. Open the [live simulator](https://bizidwassim-design.github.io/cyber-crisis-tabletop-simulator/) on a screen everyone can see, or open `index.html` locally.
2. Choose a scenario, enter the names of the CISO, CIO, Legal counsel and facilitator, and set the time per decision.
3. Read the briefing aloud, then start the clock. The decision owner has the final word; the others advise.
4. After each decision, read the outcome and the playbook guidance before moving on.
5. Run the hot wash from the report, then download it and attach it to your post-incident review.

The [facilitator guide](docs/facilitator-guide.md) covers preparation, timing and the debrief.

## Add a scenario

Scenarios are plain data in `data/scenarios.js`. Each inject has a decision owner, three options scored 2, 1 and 0,
a consequence and effects for each option, a timeout outcome, the stakeholders to inform, and a playbook reference.
Variants and arrival effects let earlier decisions change later injects. See [docs/writing-scenarios.md](docs/writing-scenarios.md), then run:

```bash
node scripts/check_scenarios.js
node scripts/build_examples.js
```

## Design choices

* **Decisions, not technique.** The injects ask for the calls a leadership team owns: isolate or wait, pay or not,
  notify now or later, what to tell the press. The analyst work lives in the playbooks.
* **One owner per decision.** Every inject names who decides, so the report shows which role needs practice.
* **Consequences that carry forward.** Flags set by one decision change the text and the cost of later injects, so
  a team that protected its backups plays a different restore than one that did not.
* **Nothing leaves the browser.** A strict Content-Security-Policy allows only the app's own files; progress is kept
  in local storage so a session survives a reload. No build step, no dependencies.
* **Tested like code.** CI validates the scenario bank, plays every option of every inject in timed and untimed mode,
  checks that a perfect run scores 100% and a run of timeouts scores 0%, and regenerates the example reports.

## Disclaimer

A training aid. The scenarios, organisations, people, amounts and outcomes are fictional and simplified. Notification
deadlines and legal positions are illustrations: confirm the rules that apply to you with counsel, your insurer and
your regulators. Scores measure the exercise, not your organisation's real readiness.

## AI assistance

Built with Claude Code as a coding and writing assistant. **Editor and reviewer: Wassim Bizid**, who set the scope,
the scenarios and the crisis-management approach, edited the content and decided what was published. Automated tests
in CI check the scenario bank and the generated reports. This is a maintainer review, not an independent one.

## License

[MIT](LICENSE) © 2026 Wassim Bizid

## 🇫🇷 Résumé

Simulateur interactif d'exercice de crise cyber pour entraîner une équipe de direction à décider pendant une
cyberattaque. Deux scénarios fictifs : rançongiciel avec vol de données, et compromission de messagerie avec fraude
au virement. Chaque inject arrive avec un chronomètre ; le décideur (RSSI, DSI ou juriste) choisit parmi trois
décisions et indique qui informer. Le tableau de situation montre les conséquences simulées (opérations, données,
juridique, réputation, coût non assuré), et les décisions précédentes modifient la suite. Le rapport final note la
qualité des décisions, le respect du temps et la communication, par rôle, avec un renvoi vers les
[Incident Response Playbooks](https://github.com/bizidwassim-design/incident-response-playbooks) pour chaque décision.
Tout s'exécute dans le navigateur, sans serveur ni suivi. Licence MIT.
