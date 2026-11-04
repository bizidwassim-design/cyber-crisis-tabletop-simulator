# Writing a scenario

All content lives in `data/scenarios.js`. A scenario is an object in the `scenarios` array; the engine and the
app need no change. Use fictional organisations only (Northwind Logistics, Contoso, Fabrikam, Woodgrove).

## Scenario fields

| Field | Purpose |
|---|---|
| `id` | Lower-case, hyphenated, unique. Used in file names. |
| `title`, `type`, `duration` | Shown on the scenario card. |
| `setting` | Two or three sentences: who, where, when. |
| `briefing` | What the team will have to decide, without giving the answers. |
| `playbooks` | File names (without `.md`) from the playbooks pack, linked on the briefing screen. |
| `injects` | Five or more injects, in order. |
| `hotwash` | Three to five questions for the debrief. |

## Inject fields

| Field | Purpose |
|---|---|
| `id`, `clock`, `from`, `title`, `text` | The message as it reaches the team. `clock` reads like a log line: `Sat 03:10 · T+4:00`. |
| `lead` | Decision owner: `ciso`, `cio` or `legal`. Every role must lead at least one inject. |
| `inform` | Stakeholder keys that must be told now. Pick the ones the playbook's RACI marks as informed or consulted. |
| `options` | Exactly three, scored `decision: 2`, `1` and `0` once each. Each has a `label`, a `consequence`, `effects`, optional `sets` (flags), and a `lesson` unless it is the best option. |
| `timeout` | What happens when the clock runs out: `effects`, `sets`, `consequence`. Usually between the 1-point and 0-point options. |
| `variants` | Extra sentences shown when flags match, for example `{ when: { paid: true }, text: "..." }`. |
| `arrival` | Effects applied when the inject arrives if flags match, with a `note` shown to the team. |
| `guidance` | `text` that says what the playbook recommends, and `refs` to the playbook file and anchor. |

## Effects

`ops`, `data`, `legal` and `rep` move the four meters (0 to 100, starting at 100). `cost` adds to the uninsured
cost in CAD. Keep effects proportional: a harmful option typically costs 15 to 25 points on one meter; a sound
option often costs a little operations time, because containment is never free.

## Writing good options

* Three plausible options. If one is obviously wrong, the inject teaches nothing.
* The best option is the playbook's answer. The 1-point option is what a reasonable person under pressure might do.
  The 0-point option is a common real-world mistake.
* Consequences describe what happens next, not a verdict. The lesson carries the verdict.

## Check your work

```bash
node scripts/check_scenarios.js    # structure, scores 0/1/2, references, every path played
node scripts/build_examples.js     # only if you changed a sampled scenario
```

Then open `index.html`, play the scenario once in each timing mode, and read the report.
