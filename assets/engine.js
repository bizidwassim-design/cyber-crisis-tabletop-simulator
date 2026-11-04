/*
 * Cyber Crisis & Tabletop Exercise Simulator: engine.
 * Pure functions, no DOM: session state, consequences, scoring, report and Markdown export.
 * Used by the browser app (window.TTXEngine) and by the Node scripts and CI (module.exports).
 *
 * Scoring follows the tabletop kit in incident-response-playbooks: for each inject, did the team make the
 * decision, make it in time, and communicate it to the right people?
 *   decision      0-2  best option 2, defensible 1, harmful or none 0
 *   timeliness    0-1  decided before the timer ran out (not scored in untimed mode)
 *   communication 0-1  every required stakeholder informed, at most two extra
 */
(function (root) {
  "use strict";

  var METER_KEYS = ["ops", "data", "legal", "rep"];
  var EXTRA_ALLOWED = 2;

  function clamp(n) { return Math.max(0, Math.min(100, n)); }
  function copy(o) { return JSON.parse(JSON.stringify(o)); }

  function find(list, key, value) {
    for (var i = 0; i < list.length; i++) if (list[i][key] === value) return list[i];
    return null;
  }

  function matches(when, flags) {
    return Object.keys(when || {}).every(function (k) { return (flags[k] === undefined ? false : flags[k]) === when[k]; });
  }

  function scenarioById(data, id) { return find(data.scenarios, "id", id); }

  function newSession(data, scenarioId, settings) {
    var s = scenarioById(data, scenarioId);
    if (!s) throw new Error("Unknown scenario: " + scenarioId);
    var seconds = settings && settings.seconds != null ? Number(settings.seconds) : 90;
    var names = (settings && settings.names) || {};
    return {
      schema: data.schema,
      scenario: s.id,
      seconds: seconds > 0 ? seconds : 0,
      names: { ciso: names.ciso || "", cio: names.cio || "", legal: names.legal || "", facilitator: names.facilitator || "" },
      organisation: (settings && settings.organisation) || "Northwind Logistics (fictional)",
      startedAt: (settings && settings.startedAt) || new Date().toISOString(),
      index: 0,
      flags: {},
      meters: { ops: 100, data: 100, legal: 100, rep: 100 },
      cost: 0,
      arrivals: {},
      log: [],
      finished: false
    };
  }

  function apply(session, effects) {
    var applied = {};
    METER_KEYS.forEach(function (k) {
      if (effects && typeof effects[k] === "number" && effects[k] !== 0) {
        var before = session.meters[k];
        session.meters[k] = clamp(before + effects[k]);
        applied[k] = session.meters[k] - before;
      }
    });
    if (effects && typeof effects.cost === "number" && effects.cost !== 0) { session.cost += effects.cost; applied.cost = effects.cost; }
    return applied;
  }

  function currentInject(data, session) {
    var s = scenarioById(data, session.scenario);
    return s && session.index < s.injects.length ? s.injects[session.index] : null;
  }

  // Text of the inject as the team sees it, after conditional variants based on earlier decisions.
  function injectText(inject, flags) {
    var extra = (inject.variants || []).filter(function (v) { return matches(v.when, flags); }).map(function (v) { return v.text; });
    return [inject.text].concat(extra).join(" ");
  }

  // Applies conditional effects that earlier decisions cause when this inject arrives. Idempotent.
  function arrive(data, session) {
    var inject = currentInject(data, session);
    if (!inject || session.arrivals[inject.id]) return session.arrivals[inject ? inject.id : ""] || [];
    var notes = [];
    (inject.arrival || []).forEach(function (a) {
      if (matches(a.when, session.flags)) notes.push({ note: a.note, applied: apply(session, a.effects) });
    });
    session.arrivals[inject.id] = notes;
    return notes;
  }

  function scoreCommunication(required, informed) {
    var set = {}; (informed || []).forEach(function (k) { set[k] = true; });
    var missed = required.filter(function (k) { return !set[k]; });
    var extra = (informed || []).filter(function (k) { return required.indexOf(k) < 0; });
    return { points: missed.length === 0 && extra.length <= EXTRA_ALLOWED ? 1 : 0, missed: missed, extra: extra };
  }

  /*
   * Records the team's decision on the current inject.
   * choice: { option: "a" | null (timer ran out), informed: [stakeholder keys], seconds: time taken, note: text }
   */
  function decide(data, session, choice) {
    var inject = currentInject(data, session);
    if (!inject) throw new Error("The scenario is already finished.");
    arrive(data, session);
    var opt = choice && choice.option ? find(inject.options, "id", choice.option) : null;
    if (choice && choice.option && !opt) throw new Error("Unknown option " + choice.option + " for inject " + inject.id);
    var timedOut = !opt;
    var outcome = opt || inject.timeout;
    var applied = apply(session, outcome.effects || {});
    Object.keys(outcome.sets || {}).forEach(function (k) { session.flags[k] = outcome.sets[k]; });

    var timed = session.seconds > 0;
    var comm = timedOut ? { points: 0, missed: inject.inform.slice(), extra: [] } : scoreCommunication(inject.inform, choice.informed);
    var entry = {
      inject: inject.id,
      clock: inject.clock,
      title: inject.title,
      lead: inject.lead,
      option: opt ? opt.id : null,
      choice: opt ? opt.label : "No decision in time",
      consequence: outcome.consequence,
      seconds: Math.max(0, Math.round((choice && choice.seconds) || 0)),
      timedOut: timedOut,
      informed: timedOut ? [] : (choice.informed || []).slice(),
      missed: comm.missed,
      extra: comm.extra,
      note: (choice && choice.note) ? String(choice.note).slice(0, 500) : "",
      score: {
        decision: opt ? opt.decision : 0,
        timeliness: timed ? (timedOut ? 0 : 1) : null,
        communication: comm.points
      },
      max: timed ? 4 : 3,
      best: opt ? opt.decision === 2 : false,
      lesson: opt ? (opt.lesson || "") : "No decision was made in time: " + inject.guidance.text,
      applied: applied,
      arrival: session.arrivals[inject.id] || []
    };
    session.log.push(entry);
    session.index += 1;
    var s = scenarioById(data, session.scenario);
    if (session.index >= s.injects.length) { session.finished = true; session.finishedAt = new Date().toISOString(); }
    return entry;
  }

  function total(entry) { return entry.score.decision + (entry.score.timeliness || 0) + entry.score.communication; }

  function band(pct) {
    if (pct >= 80) return { key: "ready", label: "Ready", text: "The team made sound decisions in time and kept the right people informed." };
    if (pct >= 60) return { key: "developing", label: "Developing", text: "Core decisions were right, with gaps in timing, communication or a few calls to revisit." };
    return { key: "at-risk", label: "At risk", text: "Several decisions would have made the incident worse. Rehearse with the playbooks before a real event." };
  }

  function report(data, session) {
    var s = scenarioById(data, session.scenario);
    var timed = session.seconds > 0;
    var got = 0, max = 0;
    var dims = { decision: { got: 0, max: 0 }, timeliness: { got: 0, max: 0 }, communication: { got: 0, max: 0 } };
    var byRole = {};
    data.roles.forEach(function (r) { byRole[r.key] = { role: r.name, name: session.names[r.key] || "", got: 0, max: 0, decisions: 0 }; });
    session.log.forEach(function (e) {
      got += total(e); max += e.max;
      dims.decision.got += e.score.decision; dims.decision.max += 2;
      if (timed) { dims.timeliness.got += e.score.timeliness; dims.timeliness.max += 1; }
      dims.communication.got += e.score.communication; dims.communication.max += 1;
      var r = byRole[e.lead]; r.got += total(e); r.max += e.max; r.decisions += 1;
    });
    function pct(a, b) { return b ? Math.round((a / b) * 100) : null; }
    var overall = pct(got, max);
    var avgSeconds = session.log.length ? Math.round(session.log.reduce(function (n, e) { return n + e.seconds; }, 0) / session.log.length) : 0;

    var actions = [];
    session.log.forEach(function (e) {
      var inj = find(s.injects, "id", e.inject);
      if (!e.best) actions.push({ inject: e.inject, owner: e.lead, action: e.lesson, refs: inj.guidance.refs });
      if (e.missed.length) actions.push({ inject: e.inject, owner: e.lead, action: "Add " + e.missed.map(function (k) { return find(data.stakeholders, "key", k).name; }).join(", ") + " to the notification list for this decision.", refs: [] });
    });

    return {
      schema: data.schema,
      organisation: session.organisation,
      scenario: { id: s.id, title: s.title, type: s.type },
      startedAt: session.startedAt,
      finishedAt: session.finishedAt || null,
      timed: timed,
      secondsPerDecision: session.seconds,
      names: session.names,
      score: { got: got, max: max, pct: overall, band: band(overall === null ? 0 : overall) },
      dimensions: {
        decision: pct(dims.decision.got, dims.decision.max),
        timeliness: timed ? pct(dims.timeliness.got, dims.timeliness.max) : null,
        communication: pct(dims.communication.got, dims.communication.max)
      },
      roles: data.roles.map(function (r) { var x = byRole[r.key]; return { key: r.key, role: x.role, name: x.name, decisions: x.decisions, pct: pct(x.got, x.max) }; }),
      meters: copy(session.meters),
      uninsuredCost: session.cost,
      bestDecisions: session.log.filter(function (e) { return e.best; }).length,
      timeouts: session.log.filter(function (e) { return e.timedOut; }).length,
      averageSeconds: avgSeconds,
      log: session.log.map(function (e) {
        return { inject: e.inject, clock: e.clock, title: e.title, lead: e.lead, choice: e.choice, seconds: e.seconds, timedOut: e.timedOut,
          informed: e.informed, missed: e.missed, note: e.note, score: e.score, points: total(e), max: e.max, consequence: e.consequence };
      }),
      actions: actions,
      hotwash: s.hotwash.slice()
    };
  }

  function money(n) { return "CAD " + Math.round(n).toLocaleString("en-CA"); }

  function toMarkdown(data, rep) {
    function role(k) { return find(data.roles, "key", k).name; }
    function who(k) { return rep.names[k] ? role(k) + " (" + rep.names[k] + ")" : role(k); }
    function sh(keys) { return keys.length ? keys.map(function (k) { return find(data.stakeholders, "key", k).name; }).join(", ") : "none"; }
    function cell(t) { return String(t).replace(/\|/g, "\\|").replace(/\n/g, " "); }
    var L = [];
    L.push("# Tabletop exercise report: " + rep.scenario.title);
    L.push("");
    L.push("*" + rep.scenario.type + " · " + rep.organisation + " · fictional training scenario*");
    L.push("");
    L.push("| | |");
    L.push("|---|---|");
    L.push("| Overall | **" + rep.score.pct + "%** (" + rep.score.got + " / " + rep.score.max + ") · " + rep.score.band.label + " |");
    L.push("| Decision quality | " + rep.dimensions.decision + "% |");
    L.push("| Timeliness | " + (rep.timed ? rep.dimensions.timeliness + "% (" + rep.secondsPerDecision + " s per decision)" : "not timed") + " |");
    L.push("| Communication | " + rep.dimensions.communication + "% |");
    L.push("| Best decisions | " + rep.bestDecisions + " of " + rep.log.length + " |");
    L.push("| Uninsured cost (simulated) | " + money(rep.uninsuredCost) + " |");
    L.push("| End state | Operations " + rep.meters.ops + " · Data protection " + rep.meters.data + " · Legal & regulatory " + rep.meters.legal + " · Reputation " + rep.meters.rep + " |");
    L.push("");
    L.push(rep.score.band.text);
    L.push("");
    L.push("## By role");
    L.push("");
    L.push("| Role | Decisions led | Score |");
    L.push("|---|---|---|");
    rep.roles.forEach(function (r) { L.push("| " + cell(who(r.key)) + " | " + r.decisions + " | " + (r.pct === null ? "n/a" : r.pct + "%") + " |"); });
    L.push("");
    L.push("## Decision log");
    L.push("");
    L.push("| Clock | Inject | Lead | Decision | Time | Informed | Missed | Points |");
    L.push("|---|---|---|---|---|---|---|---|");
    rep.log.forEach(function (e) {
      L.push("| " + cell(e.clock) + " | " + cell(e.inject + " " + e.title) + " | " + role(e.lead) + " | " + cell(e.choice) + " | " +
        (e.timedOut ? "timed out" : e.seconds + " s") + " | " + cell(sh(e.informed)) + " | " + cell(sh(e.missed)) + " | " + e.points + " / " + e.max + " |");
    });
    L.push("");
    L.push("## Improvement actions");
    L.push("");
    if (!rep.actions.length) L.push("None: every decision matched the playbook and everyone required was informed.");
    rep.actions.forEach(function (a) {
      var refs = (a.refs || []).map(function (r) { return "[" + r.label + "](" + data.playbookBase + r.doc + (r.anchor ? "#" + r.anchor : "") + ")"; }).join(", ");
      L.push("- **" + a.inject + " · " + role(a.owner) + ":** " + a.action + (refs ? " See " + refs + "." : ""));
    });
    L.push("");
    L.push("## Hot wash");
    L.push("");
    rep.hotwash.forEach(function (q) { L.push("- " + q); });
    L.push("");
    L.push("---");
    L.push("Generated by the Cyber Crisis & Tabletop Exercise Simulator. All organisations, people and amounts are fictional.");
    return L.join("\n") + "\n";
  }

  // Structural validation of the scenario bank, used by scripts/check_scenarios.js and CI.
  function validate(data) {
    var errs = [];
    var roles = data.roles.map(function (r) { return r.key; });
    var sh = data.stakeholders.map(function (x) { return x.key; });
    var ids = {};
    function effectsOk(where, eff) {
      Object.keys(eff || {}).forEach(function (k) {
        if (METER_KEYS.indexOf(k) < 0 && k !== "cost") errs.push(where + ": unknown effect " + k);
        else if (typeof eff[k] !== "number") errs.push(where + ": effect " + k + " must be a number");
      });
    }
    if (!data.scenarios.length) errs.push("no scenarios");
    data.scenarios.forEach(function (s) {
      if (ids[s.id]) errs.push("duplicate scenario id " + s.id); ids[s.id] = true;
      ["title", "type", "setting", "briefing"].forEach(function (k) { if (!s[k]) errs.push(s.id + ": missing " + k); });
      if (!s.hotwash || s.hotwash.length < 3) errs.push(s.id + ": needs at least 3 hot-wash questions");
      if (s.injects.length < 5) errs.push(s.id + ": needs at least 5 injects");
      var led = {};
      s.injects.forEach(function (inj) {
        var w = s.id + "/" + inj.id;
        if (ids[w]) errs.push("duplicate inject " + w); ids[w] = true;
        ["clock", "from", "title", "text"].forEach(function (k) { if (!inj[k]) errs.push(w + ": missing " + k); });
        if (roles.indexOf(inj.lead) < 0) errs.push(w + ": lead must be one of " + roles.join(", "));
        led[inj.lead] = true;
        if (!inj.inform || !inj.inform.length) errs.push(w + ": at least one stakeholder to inform");
        (inj.inform || []).forEach(function (k) { if (sh.indexOf(k) < 0) errs.push(w + ": unknown stakeholder " + k); });
        if (!inj.options || inj.options.length !== 3) errs.push(w + ": exactly 3 options");
        var scores = (inj.options || []).map(function (o) { return o.decision; }).sort().join(",");
        if (scores !== "0,1,2") errs.push(w + ": options must score 0, 1 and 2 once each (got " + scores + ")");
        var oid = {};
        (inj.options || []).forEach(function (o) {
          if (oid[o.id]) errs.push(w + ": duplicate option " + o.id); oid[o.id] = true;
          if (!o.label || !o.consequence) errs.push(w + "/" + o.id + ": label and consequence required");
          if (o.decision < 2 && !o.lesson) errs.push(w + "/" + o.id + ": a non-best option needs a lesson");
          effectsOk(w + "/" + o.id, o.effects);
        });
        if (!inj.timeout || !inj.timeout.consequence) errs.push(w + ": timeout consequence required");
        else effectsOk(w + "/timeout", inj.timeout.effects);
        (inj.arrival || []).forEach(function (a, i) { if (!a.when || !a.note) errs.push(w + "/arrival " + i + ": when and note required"); effectsOk(w + "/arrival " + i, a.effects); });
        if (!inj.guidance || !inj.guidance.text || !inj.guidance.refs || !inj.guidance.refs.length) errs.push(w + ": guidance text and at least one playbook reference");
        (inj.guidance && inj.guidance.refs || []).forEach(function (r) { if (!/^(playbooks|templates|docs)\/[a-z0-9-]+\.md$/.test(r.doc)) errs.push(w + ": bad reference " + r.doc); });
      });
      roles.forEach(function (r) { if (!led[r]) errs.push(s.id + ": role " + r + " never leads a decision"); });
    });
    return errs;
  }

  var api = {
    METER_KEYS: METER_KEYS, matches: matches, scenarioById: scenarioById, newSession: newSession, currentInject: currentInject,
    injectText: injectText, arrive: arrive, decide: decide, scoreCommunication: scoreCommunication, report: report,
    toMarkdown: toMarkdown, validate: validate, money: money, band: band
  };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.TTXEngine = api;
})(this);
