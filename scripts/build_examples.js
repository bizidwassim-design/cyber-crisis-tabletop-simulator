#!/usr/bin/env node
// Replays the scripted, fictional runs in data/samples.js and writes their reports to examples/ (JSON and Markdown).
// CI re-runs this script and fails if the committed examples differ, so they always match the engine and the data.
"use strict";
var fs = require("fs");
var path = require("path");
var data = require(path.join(__dirname, "..", "data", "scenarios.js"));
var samples = require(path.join(__dirname, "..", "data", "samples.js"));
var E = require(path.join(__dirname, "..", "assets", "engine.js"));

var out = path.join(__dirname, "..", "examples");
fs.mkdirSync(out, { recursive: true });
samples.forEach(function (run) {
  var s = E.scenarioById(data, run.scenario);
  var sess = E.newSession(data, run.scenario, { seconds: run.seconds, names: run.names, startedAt: "2026-11-04T09:00:00Z" });
  run.plays.forEach(function (p, i) {
    var inj = s.injects[i];
    var informed = p[3] || inj.inform.filter(function (k) { return k !== p[2]; });
    E.decide(data, sess, { option: p[0], informed: informed, seconds: p[1] });
  });
  sess.finishedAt = "2026-11-04T10:00:00Z";
  var rep = E.report(data, sess);
  fs.writeFileSync(path.join(out, run.file + ".json"), JSON.stringify(rep, null, 2) + "\n");
  fs.writeFileSync(path.join(out, run.file + ".md"), E.toMarkdown(data, rep));
  console.log(run.file + ": " + rep.score.pct + "% " + rep.score.band.label + ", uninsured " + E.money(rep.uninsuredCost));
});
