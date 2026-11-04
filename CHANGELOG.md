# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [1.0.0] — 2026-11-04

### Added
- Browser simulator (`index.html`, `assets/`): scenario choice, role names, time per decision, briefing, timed injects
  with pause, decision owner badge, stakeholder notification, outcome with playbook guidance, situation board
  (four meters, uninsured cost, progress), and a performance report with Markdown and JSON download and print.
- Two fictional scenarios in `data/scenarios.js`: *Locked at month-end* (ransomware with data theft, 8 injects) and
  *The new bank details* (business email compromise and payment fraud, 7 injects), with branching through flags,
  variants and arrival effects.
- Engine (`assets/engine.js`) shared by the app and Node: consequences, scoring (decision, timeliness,
  communication), report and Markdown export.
- Sample report (`?sample=1`, `?sample=bec`) and generated `examples/`.
- Facilitator guide and scenario-writing guide in `docs/`.
- CI: syntax check, scenario validation with every decision path played, regenerated examples, HTML validation,
  and a check that no external resources are loaded.
