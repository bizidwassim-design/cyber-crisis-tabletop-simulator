/*
 * Two scripted, fictional exercise runs. The app replays them for "Open the sample report";
 * scripts/build_examples.js replays them to produce examples/*.json and *.md.
 * plays: [option or null for a timeout, seconds taken, stakeholder left out (optional), full informed list (optional)]
 */
(function (root) {
  "use strict";
  var NAMES = { ciso: "A. Martin", cio: "R. Haddad", legal: "S. Tremblay", facilitator: "J. Okafor" };
  var SAMPLES = [
    { file: "northwind-ransomware-report", scenario: "ransomware-month-end", seconds: 90, names: NAMES,
      plays: [["a", 41], ["c", 77], ["a", 35], ["a", 62], ["b", 58, null, ["staff", "customers", "comms"]], ["a", 70, "regulator"], ["a", 49], ["a", 66]] },
    { file: "northwind-bec-report", scenario: "bec-bank-details", seconds: 90, names: NAMES,
      plays: [["c", 84], ["a", 52], [null, 90], ["a", 61, "insurer"], ["a", 73], ["b", 45], ["a", 38]] }
  ];
  if (typeof module === "object" && module.exports) module.exports = SAMPLES;
  else root.TTX_SAMPLES = SAMPLES;
})(this);
