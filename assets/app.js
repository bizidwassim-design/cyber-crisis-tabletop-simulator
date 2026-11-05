/*
 * Cyber Crisis & Tabletop Exercise Simulator: browser app.
 * DOM only; the rules live in engine.js and the content in data/scenarios.js.
 */
(function () {
  "use strict";

  var D = window.TTX_DATA, E = window.TTXEngine, SAMPLES = window.TTX_SAMPLES;
  var STORE = "ttx-session-v1", THEME = "ttx-theme";
  var session = null, scenario = null, isSample = false;
  var timer = { id: 0, start: 0, used: 0, paused: false, warned: {} };

  /* ---------- helpers ---------- */
  function $(s) { return document.querySelector(s); }
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === "text") n.textContent = attrs[k];
      else if (k === "class") n.className = attrs[k];
      else if (attrs[k] !== null && attrs[k] !== undefined && attrs[k] !== false) n.setAttribute(k, attrs[k] === true ? "" : attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return n;
  }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); return n; }
  function find(list, key, v) { for (var i = 0; i < list.length; i++) if (list[i][key] === v) return list[i]; return null; }
  function roleName(k) { return find(D.roles, "key", k).name; }
  function who(k) { return session && session.names[k] ? roleName(k) + " · " + session.names[k] : roleName(k); }
  function shName(k) { return find(D.stakeholders, "key", k).name; }
  function refUrl(r) { return D.playbookBase + r.doc + (r.anchor ? "#" + r.anchor : ""); }
  function say(t) { var a = $("#announcer"); a.textContent = ""; window.setTimeout(function () { a.textContent = t; }, 30); }
  function store(get, val) {
    try {
      if (get) return JSON.parse(localStorage.getItem(STORE) || "null");
      if (val === null) localStorage.removeItem(STORE); else localStorage.setItem(STORE, JSON.stringify(val));
    } catch (e) { return null; }
    return null;
  }
  function save() { if (!isSample) store(false, session); }

  var SCREENS = ["#screen-start", "#screen-brief", "#screen-play", "#screen-report"];
  function show(id) {
    SCREENS.forEach(function (s) { $(s).hidden = s !== id; });
    $("#btn-home").hidden = id === "#screen-start";
    window.scrollTo(0, 0);
  }

  /* ---------- theme ---------- */
  function applyTheme(t) {
    if (t) document.documentElement.setAttribute("data-theme", t); else document.documentElement.removeAttribute("data-theme");
    var dark = t === "dark" || (!t && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
    $("#theme-toggle").textContent = dark ? "Light theme" : "Dark theme";
    $("#theme-toggle").setAttribute("aria-pressed", String(dark));
  }
  function initTheme() {
    var t = null; try { t = localStorage.getItem(THEME); } catch (e) { t = null; }
    applyTheme(t || "light");
    if (window.matchMedia) {
      var mq = window.matchMedia("(prefers-color-scheme: dark)");
      var follow = function () { if (!document.documentElement.getAttribute("data-theme")) applyTheme(null); };
      if (mq.addEventListener) mq.addEventListener("change", follow);
    }
    $("#theme-toggle").addEventListener("click", function () {
      var dark = $("#theme-toggle").getAttribute("aria-pressed") === "true", next = dark ? "light" : "dark";
      try { localStorage.setItem(THEME, next); } catch (e) { /* private mode */ }
      applyTheme(next);
    });
  }

  /* ---------- start ---------- */
  function renderStart() {
    var list = clear($("#scenario-list"));
    D.scenarios.forEach(function (s, i) {
      var id = "sc-" + s.id;
      list.appendChild(el("label", { class: "scenario", for: id }, [
        el("input", { type: "radio", name: "scenario", id: id, value: s.id, checked: i === 0 }),
        el("span", { class: "scenario-body" }, [
          el("span", { class: "scenario-type", text: s.type }),
          el("span", { class: "scenario-title", text: s.title }),
          el("span", { class: "scenario-brief", text: s.briefing }),
          el("span", { class: "scenario-meta", text: s.duration })
        ])
      ]));
    });
    var roles = clear($("#role-inputs"));
    D.roles.concat([{ key: "facilitator", name: "Facilitator", owns: "Reads the injects, keeps time, runs the hot wash" }]).forEach(function (r) {
      roles.appendChild(el("label", { class: "field", for: "name-" + r.key }, [
        el("span", { class: "field-label" }, [el("strong", { text: r.name }), el("small", { text: r.owns })]),
        el("input", { id: "name-" + r.key, type: "text", maxlength: "40", autocomplete: "off", placeholder: "Name or initials" })
      ]));
    });
    var saved = store(true);
    var resumable = saved && saved.schema === D.schema && E.scenarioById(D, saved.scenario);
    $("#resume").hidden = !resumable;
    if (resumable) {
      var s = E.scenarioById(D, saved.scenario);
      $("#resume-text").textContent = saved.finished
        ? "Your last exercise, \"" + s.title + "\", is finished."
        : "Exercise in progress: \"" + s.title + "\", inject " + (saved.index + 1) + " of " + s.injects.length + ".";
      $("#btn-resume").textContent = saved.finished ? "View its report" : "Resume";
    }
  }

  function startFromForm(ev) {
    ev.preventDefault();
    var pick = document.querySelector("input[name=scenario]:checked");
    var names = {};
    ["ciso", "cio", "legal", "facilitator"].forEach(function (k) { names[k] = $("#name-" + k).value.trim(); });
    isSample = false;
    session = E.newSession(D, pick.value, { seconds: Number($("#seconds").value), names: names, organisation: $("#org").value.trim() || undefined });
    scenario = E.scenarioById(D, session.scenario);
    renderBrief();
    show("#screen-brief");
    $("#brief-title").setAttribute("tabindex", "-1");
    $("#brief-title").focus();
  }

  /* ---------- briefing ---------- */
  function renderBrief() {
    $("#brief-type").textContent = scenario.type + " · " + scenario.duration;
    $("#brief-title").textContent = scenario.title;
    $("#brief-setting").textContent = scenario.setting.replace("Northwind Logistics (fictional)", session.organisation);
    $("#brief-text").textContent = scenario.briefing;
    $("#key-time").hidden = !session.seconds;
    var rl = clear($("#brief-roles"));
    D.roles.forEach(function (r) {
      var n = scenario.injects.filter(function (i) { return i.lead === r.key; }).length;
      rl.appendChild(el("li", null, [el("strong", { text: who(r.key) }), el("span", { text: r.owns + ". Leads " + n + " decision" + (n === 1 ? "" : "s") + "." })]));
    });
    if (session.names.facilitator) rl.appendChild(el("li", null, [el("strong", { text: "Facilitator · " + session.names.facilitator }), el("span", { text: "Reads the injects aloud, keeps time, runs the hot wash." })]));
    var pl = clear($("#brief-playbooks"));
    scenario.playbooks.forEach(function (p) {
      pl.appendChild(el("li", null, [el("a", { href: D.playbookBase + "playbooks/" + p + ".md", text: p.replace(/-/g, " ") })]));
    });
  }

  /* ---------- board ---------- */
  function renderBoard(deltas) {
    $("#board-scenario").textContent = scenario.title;
    var cur = E.currentInject(D, session);
    $("#board-clock").textContent = (cur || scenario.injects[scenario.injects.length - 1]).clock;
    var pr = clear($("#board-progress"));
    scenario.injects.forEach(function (inj, i) {
      var e = session.log[i], cls = "step", label = inj.id + ": " + inj.title;
      if (e) { var pts = e.score.decision + (e.score.timeliness || 0) + e.score.communication; cls += pts >= e.max - 1 ? " good" : pts >= e.max / 2 ? " mid" : " bad"; label += ", " + pts + " of " + e.max + " points"; }
      else if (i === session.index) { cls += " now"; label += ", current"; }
      pr.appendChild(el("li", { class: cls, title: label }, [el("span", { class: "sr-only", text: label }), el("span", { "aria-hidden": "true", text: inj.id })]));
    });
    renderMeters($("#board-meters"), session.meters, deltas);
    $("#board-cost").textContent = E.money(session.cost);
  }

  function renderMeters(ul, meters, deltas) {
    clear(ul);
    D.meters.forEach(function (m) {
      var v = meters[m.key], state = v >= 70 ? "ok" : v >= 40 ? "warn" : "crit";
      var fill = el("span", { class: "meter-fill " + state });
      fill.style.width = v + "%";
      var d = deltas && deltas[m.key];
      ul.appendChild(el("li", { class: "meter" }, [
        el("span", { class: "meter-row" }, [
          el("span", { class: "meter-name", text: m.name, title: m.hint }),
          el("span", { class: "meter-val" }, [String(v), d ? el("span", { class: "delta " + (d > 0 ? "up" : "down"), text: (d > 0 ? " +" : " ") + d }) : null])
        ]),
        el("span", { class: "meter-track", role: "img", "aria-label": m.name + " " + v + " out of 100" }, [fill])
      ]));
    });
  }

  /* ---------- inject ---------- */
  function renderInject() {
    var inj = E.currentInject(D, session);
    var notes = E.arrive(D, session);
    save();
    $("#inject").hidden = false; $("#outcome").hidden = true;
    $("#inject-id").textContent = inj.id + " / " + scenario.injects.length;
    $("#inject-clock").textContent = inj.clock;
    $("#inject-from").textContent = "From: " + inj.from;
    $("#inject-title").textContent = inj.title;
    $("#inject-owner").textContent = "Decision owner: " + who(inj.lead);
    $("#inject-text").textContent = E.injectText(inj, session.flags);
    var arr = clear($("#inject-arrival"));
    arr.hidden = !notes.length;
    notes.forEach(function (n) { arr.appendChild(el("p", null, [el("strong", { text: "Consequence of an earlier decision: " }), n.note])); });

    var opts = clear($("#inject-options"));
    inj.options.forEach(function (o, i) {
      var id = "opt-" + o.id;
      opts.appendChild(el("label", { class: "option", for: id }, [
        el("input", { type: "radio", name: "option", id: id, value: o.id }),
        el("span", { class: "option-key", text: String.fromCharCode(65 + i) }),
        el("span", { class: "option-text", text: o.label })
      ]));
    });
    var inf = clear($("#inject-inform"));
    D.stakeholders.forEach(function (s) {
      var id = "inf-" + s.key;
      inf.appendChild(el("label", { class: "chip", for: id }, [el("input", { type: "checkbox", id: id, value: s.key }), el("span", { text: s.name })]));
    });
    $("#inject-note").value = "";
    $("#inject-error").textContent = "";
    renderBoard();
    startTimer();
    $("#inject-title").setAttribute("tabindex", "-1");
    $("#inject-title").focus();
  }

  /* ---------- timer ---------- */
  function elapsed() { return timer.used + (timer.paused ? 0 : (performance.now() - timer.start) / 1000); }
  function startTimer() {
    stopTimer();
    timer = { id: 0, start: performance.now(), used: 0, paused: false, warned: {} };
    var timed = session.seconds > 0;
    $("#timer").classList.toggle("untimed", !timed);
    $("#btn-pause").textContent = "Pause"; $("#btn-pause").setAttribute("aria-pressed", "false");
    $("#btn-pause").hidden = !timed;
    if (!timed) { $("#timer-num").textContent = "Untimed"; $("#timer-fill").style.width = "100%"; return; }
    say(session.seconds + " seconds for this decision.");
    tick();
    timer.id = window.setInterval(tick, 250);
  }
  function stopTimer() { if (timer.id) window.clearInterval(timer.id); timer.id = 0; }
  function tick() {
    var left = Math.max(0, session.seconds - elapsed());
    var whole = Math.ceil(left);
    $("#timer-num").textContent = Math.floor(whole / 60) + ":" + String(whole % 60).padStart(2, "0");
    $("#timer-fill").style.width = (left / session.seconds * 100) + "%";
    $("#timer").classList.toggle("urgent", left <= 15);
    [30, 10].forEach(function (s) { if (left <= s && !timer.warned[s] && session.seconds > s) { timer.warned[s] = true; say(s + " seconds left."); } });
    if (left <= 0) { stopTimer(); submit(true); }
  }
  function togglePause() {
    if (timer.paused) { timer.paused = false; timer.start = performance.now(); timer.id = window.setInterval(tick, 250); }
    else { timer.used = elapsed(); timer.paused = true; stopTimer(); }
    $("#btn-pause").textContent = timer.paused ? "Resume" : "Pause";
    $("#btn-pause").setAttribute("aria-pressed", String(timer.paused));
    $("#timer").classList.toggle("paused", timer.paused);
    say(timer.paused ? "Clock paused." : "Clock running.");
  }

  /* ---------- decide ---------- */
  function submit(timedOut) {
    var pick = document.querySelector("input[name=option]:checked");
    if (!timedOut && !pick) { $("#inject-error").textContent = "Choose one of the three decisions, or let the clock run out."; return; }
    stopTimer();
    var informed = Array.prototype.map.call(document.querySelectorAll("#inject-inform input:checked"), function (c) { return c.value; });
    var used = session.seconds > 0 ? Math.min(session.seconds, elapsed()) : elapsed();
    var entry = E.decide(D, session, { option: timedOut ? null : pick.value, informed: informed, seconds: used, note: $("#inject-note").value.trim() });
    save();
    renderOutcome(entry);
  }

  function renderOutcome(e) {
    var inj = find(scenario.injects, "id", e.inject);
    $("#inject").hidden = true; $("#outcome").hidden = false;
    var pts = e.score.decision + (e.score.timeliness || 0) + e.score.communication;
    $("#outcome-eyebrow").textContent = e.inject + " · " + e.clock + " · " + pts + " of " + e.max + " points";
    $("#outcome-title").textContent = e.timedOut ? "The clock ran out" : e.best ? "Sound call" : e.score.decision === 1 ? "Defensible, with a cost" : "This made it worse";
    $("#outcome-choice").textContent = e.timedOut ? "No decision was recorded." : "You decided: " + e.choice;
    $("#outcome-consequence").textContent = e.consequence;

    var pl = clear($("#outcome-points"));
    pl.appendChild(el("li", null, [el("span", { text: "Decision" }), el("strong", { text: e.score.decision + " / 2" })]));
    if (e.score.timeliness !== null) pl.appendChild(el("li", null, [el("span", { text: e.timedOut ? "Timeliness: no decision in time" : "Timeliness: " + e.seconds + " s" }), el("strong", { text: e.score.timeliness + " / 1" })]));
    var commText = e.missed.length ? "Missed: " + e.missed.map(shName).join(", ") : e.extra.length > 2 ? "Too many people told: " + e.extra.map(shName).join(", ") : "Right people informed";
    pl.appendChild(el("li", null, [el("span", { text: "Communication. " + commText }), el("strong", { text: e.score.communication + " / 1" })]));

    var dl = clear($("#outcome-deltas"));
    var any = false;
    D.meters.forEach(function (m) { var d = e.applied[m.key]; if (d) { any = true; dl.appendChild(el("li", { class: d > 0 ? "up" : "down" }, [el("span", { text: m.name }), el("strong", { text: (d > 0 ? "+" : "") + d })])); } });
    if (e.applied.cost) { any = true; dl.appendChild(el("li", { class: "down" }, [el("span", { text: "Uninsured cost" }), el("strong", { text: "+" + E.money(e.applied.cost) })])); }
    if (!any) dl.appendChild(el("li", null, [el("span", { text: "No change to the board." })]));

    $("#outcome-guidance").textContent = inj.guidance.text + (e.best ? "" : " " + (e.timedOut ? "" : e.lesson));
    var rl = clear($("#outcome-refs"));
    inj.guidance.refs.forEach(function (r) { rl.appendChild(el("li", null, [el("a", { href: refUrl(r), text: r.label })])); });
    $("#btn-next").textContent = session.finished ? "See the report" : "Next inject";
    renderBoard(e.applied);
    say($("#outcome-title").textContent + ". " + pts + " of " + e.max + " points.");
    $("#outcome-title").focus();
  }

  /* ---------- report ---------- */
  var lastReport = null;
  function renderReport(rep, sample) {
    lastReport = rep;
    stopTimer();
    $("#sample-banner").hidden = !sample;
    $("#report-eyebrow").textContent = rep.scenario.type + " · " + rep.organisation;
    $("#report-title").textContent = "Debrief: " + rep.scenario.title;
    $("#report-score").textContent = rep.score.pct + "%";
    var b = $("#report-band"); b.textContent = rep.score.band.label; b.className = "pill " + rep.score.band.key;
    $("#report-band-text").textContent = rep.score.band.text + " " + rep.score.got + " of " + rep.score.max + " points.";

    var k = clear($("#report-kpis"));
    [["Decision quality", rep.dimensions.decision + "%", rep.bestDecisions + " of " + rep.log.length + " best calls"],
     ["Timeliness", rep.timed ? rep.dimensions.timeliness + "%" : "Not timed", rep.timed ? rep.timeouts + " timed out · avg " + rep.averageSeconds + " s" : "facilitator-paced"],
     ["Communication", rep.dimensions.communication + "%", "right people, at the right time"],
     ["Uninsured cost", E.money(rep.uninsuredCost), "simulated, fictional"]]
      .forEach(function (x) { k.appendChild(el("div", { class: "kpi" }, [el("small", { text: x[0] }), el("b", { text: x[1] }), el("small", { text: x[2] })])); });

    var rr = clear($("#report-roles"));
    rep.roles.forEach(function (r) {
      rr.appendChild(el("tr", null, [el("td", { text: r.name ? r.role + " · " + r.name : r.role }), el("td", { text: String(r.decisions) }), el("td", { text: r.pct === null ? "n/a" : r.pct + "%" })]));
    });
    renderMeters($("#report-meters"), rep.meters);

    var lg = clear($("#report-log"));
    rep.log.forEach(function (e) {
      lg.appendChild(el("tr", { class: e.points >= e.max - 1 ? "good" : e.points >= e.max / 2 ? "mid" : "bad" }, [
        el("td", { class: "mono", text: e.clock }),
        el("td", null, [el("strong", { text: e.inject + " " }), e.title]),
        el("td", { text: roleName(e.lead) }),
        el("td", null, [e.choice, e.note ? el("small", { class: "note", text: "Note: " + e.note }) : null]),
        el("td", { class: "mono", text: e.timedOut ? "timed out" : e.seconds + " s" }),
        el("td", { text: e.missed.length ? e.missed.map(shName).join(", ") : "none" }),
        el("td", { class: "mono", text: e.points + " / " + e.max })
      ]));
    });

    var ac = clear($("#report-actions"));
    if (!rep.actions.length) ac.appendChild(el("li", { text: "None: every decision matched the playbook and everyone required was informed." }));
    rep.actions.forEach(function (a) {
      var li = el("li", null, [el("strong", { text: a.inject + " · " + roleName(a.owner) + ": " }), a.action]);
      (a.refs || []).forEach(function (r) { li.appendChild(document.createTextNode(" ")); li.appendChild(el("a", { href: refUrl(r), text: r.label })); });
      ac.appendChild(li);
    });
    var hw = clear($("#report-hotwash"));
    rep.hotwash.forEach(function (q) { hw.appendChild(el("li", { text: q })); });
    show("#screen-report");
    $("#report-title").setAttribute("tabindex", "-1");
    $("#report-title").focus();
  }

  function download(name, text, type) {
    var url = URL.createObjectURL(new Blob([text], { type: type }));
    var a = el("a", { href: url, download: name });
    document.body.appendChild(a); a.click();
    window.setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 500);
  }
  function fileStem() { return "tabletop-" + lastReport.scenario.id + "-" + (lastReport.finishedAt || lastReport.startedAt).slice(0, 10); }

  function openSample(i) {
    var run = SAMPLES[i || 0];
    var s = E.scenarioById(D, run.scenario);
    var sess = E.newSession(D, run.scenario, { seconds: run.seconds, names: run.names, startedAt: "2026-11-04T09:00:00Z" });
    run.plays.forEach(function (p, k) {
      var inj = s.injects[k];
      E.decide(D, sess, { option: p[0], informed: p[3] || inj.inform.filter(function (x) { return x !== p[2]; }), seconds: p[1] });
    });
    sess.finishedAt = "2026-11-04T10:00:00Z";
    isSample = true; session = sess; scenario = s;
    renderReport(E.report(D, sess), true);
  }

  /* ---------- wiring ---------- */
  function goHome() {
    stopTimer();
    if (session && !session.finished && !isSample && session.log.length) say("Exercise saved. You can resume it from the start page.");
    isSample = false;
    renderStart();
    show("#screen-start");
  }

  function init() {
    initTheme();
    renderStart();
    $("#setup").addEventListener("submit", startFromForm);
    $("#btn-sample").addEventListener("click", function () { openSample(0); });
    $("#btn-back").addEventListener("click", goHome);
    $("#btn-home").addEventListener("click", goHome);
    $("#btn-go").addEventListener("click", function () { show("#screen-play"); renderInject(); });
    $("#inject").addEventListener("submit", function (ev) { ev.preventDefault(); submit(false); });
    $("#btn-pause").addEventListener("click", togglePause);
    $("#btn-next").addEventListener("click", function () {
      if (session.finished) renderReport(E.report(D, session), false); else renderInject();
    });
    $("#btn-resume").addEventListener("click", function () {
      var saved = store(true); if (!saved) return;
      isSample = false; session = saved; scenario = E.scenarioById(D, saved.scenario);
      if (session.finished) renderReport(E.report(D, session), false);
      else { show("#screen-play"); renderInject(); }
    });
    $("#btn-discard").addEventListener("click", function () { store(false, null); renderStart(); say("Saved exercise discarded."); });
    $("#btn-new").addEventListener("click", goHome);
    $("#btn-md").addEventListener("click", function () { download(fileStem() + ".md", E.toMarkdown(D, lastReport), "text/markdown"); });
    $("#btn-json").addEventListener("click", function () { download(fileStem() + ".json", JSON.stringify(lastReport, null, 2) + "\n", "application/json"); });
    $("#btn-print").addEventListener("click", function () { window.print(); });
    document.addEventListener("keydown", function (ev) {
      if ($("#screen-play").hidden || $("#inject").hidden || ev.target.tagName === "INPUT" && ev.target.type === "text") return;
      var k = ev.key.toLowerCase(), idx = ["a", "b", "c"].indexOf(k);
      if (idx >= 0) { var r = document.querySelectorAll("#inject-options input")[idx]; if (r) { r.checked = true; r.focus(); } }
    });
    var q = new URLSearchParams(window.location.search);
    if (q.get("sample")) openSample(q.get("sample") === "bec" ? 1 : 0);
  }

  init();
})();

