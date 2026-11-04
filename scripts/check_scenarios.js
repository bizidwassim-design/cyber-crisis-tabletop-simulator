#!/usr/bin/env node
// Validates the scenario bank structure and plays every path once to make sure the engine never throws.
"use strict";
var path = require("path");
var data = require(path.join(__dirname, "..", "data", "scenarios.js"));
var E = require(path.join(__dirname, "..", "assets", "engine.js"));

var errs = E.validate(data);
var paths = 0;
data.scenarios.forEach(function (s) {
  // Every option of every inject, plus a timeout, played against a fresh session that reached that inject.
  s.injects.forEach(function (inj, i) {
    inj.options.map(function (o) { return o.id; }).concat([null]).forEach(function (choice) {
      [0, 90].forEach(function (seconds) {
        var sess = E.newSession(data, s.id, { seconds: seconds, startedAt: "2026-11-04T09:00:00Z" });
        for (var k = 0; k < i; k++) E.decide(data, sess, { option: "a", informed: s.injects[k].inform, seconds: 30 });
        var e = E.decide(data, sess, { option: choice, informed: inj.inform, seconds: 30 });
        if (e.max !== (seconds ? 4 : 3)) errs.push(s.id + "/" + inj.id + ": wrong max");
        E.report(data, sess);
        paths++;
      });
    });
  });
  // Worst path: every inject times out; meters must stay within 0-100.
  var worst = E.newSession(data, s.id, { seconds: 60 });
  s.injects.forEach(function () { E.decide(data, worst, { option: null }); });
  E.METER_KEYS.forEach(function (k) { if (worst.meters[k] < 0 || worst.meters[k] > 100) errs.push(s.id + ": meter out of range"); });
  if (E.report(data, worst).score.pct !== 0) errs.push(s.id + ": all-timeout run must score 0");
  // Best path scores 100%.
  var best = E.newSession(data, s.id, { seconds: 60 });
  s.injects.forEach(function (inj) { E.decide(data, best, { option: inj.options.filter(function (o) { return o.decision === 2; })[0].id, informed: inj.inform, seconds: 20 }); });
  if (E.report(data, best).score.pct !== 100) errs.push(s.id + ": best path must score 100%");
});

if (errs.length) { errs.forEach(function (e) { console.error("ERROR " + e); }); process.exit(1); }
var injects = data.scenarios.reduce(function (n, s) { return n + s.injects.length; }, 0);
console.log("OK: " + data.scenarios.length + " scenarios, " + injects + " injects, " + paths + " decision paths played, roles " +
  data.roles.map(function (r) { return r.name; }).join(", "));
