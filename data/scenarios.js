/*
 * Cyber Crisis & Tabletop Exercise Simulator: scenario bank.
 * Single source of truth for roles, stakeholders, meters and scenarios. Everything here is FICTIONAL:
 * Northwind Logistics, Contoso Freight and every person, amount and system are invented for training.
 * Decision guidance cites the crisis-level playbooks in the sibling repository
 * https://github.com/bizidwassim-design/incident-response-playbooks (same author).
 * Validate after editing: node scripts/check_scenarios.js
 */
(function (root) {
  "use strict";

  var DATA = {
    schema: "cyber-crisis-tabletop/1.0",
    playbookBase: "https://github.com/bizidwassim-design/incident-response-playbooks/blob/main/",

    roles: [
      { key: "ciso", name: "CISO", owns: "Containment, security operations, external statements on the incident" },
      { key: "cio", name: "CIO", owns: "Infrastructure, identity, backups, recovery order and service restoration" },
      { key: "legal", name: "Legal counsel", owns: "Privilege, insurer, regulators, contracts, extortion and law enforcement" }
    ],

    // People the decision owner can inform. The three player roles are always in the room.
    stakeholders: [
      { key: "exec", name: "CEO / executive sponsor" },
      { key: "cfo", name: "CFO" },
      { key: "comms", name: "Communications" },
      { key: "dpo", name: "Data protection officer" },
      { key: "hr", name: "HR" },
      { key: "staff", name: "All staff" },
      { key: "customers", name: "Customers and suppliers" },
      { key: "insurer", name: "Cyber insurer" },
      { key: "irfirm", name: "External IR firm" },
      { key: "law", name: "Law enforcement" },
      { key: "regulator", name: "Data protection regulator" },
      { key: "bank", name: "Bank fraud desk" }
    ],

    meters: [
      { key: "ops", name: "Operations", hint: "Can the business run?" },
      { key: "data", name: "Data protection", hint: "How much data is exposed or at risk" },
      { key: "legal", name: "Legal & regulatory", hint: "Deadlines met, privilege kept, no misstatements" },
      { key: "rep", name: "Reputation & trust", hint: "Staff, customers, press" }
    ],

    scenarios: [
      {
        id: "ransomware-month-end",
        title: "Locked at month-end",
        type: "Ransomware with data theft",
        duration: "8 injects · about 45 minutes",
        setting: "Northwind Logistics (fictional): 2,400 employees in Québec, France and the UK; three warehouses run on a warehouse management system hosted on a VMware cluster. It is Friday, 23:10. Payroll runs on Monday morning.",
        briefing: "Ransomware is encrypting servers on a Friday night before payroll. You will decide on containment, backups, the insurer, the ransom, data-breach notification, the press and the return to service.",
        playbooks: ["malware-outbreak", "privileged-account-compromise", "data-breach-personal-data", "ddos"],
        injects: [
          {
            id: "R1", clock: "Fri 23:10 · T+0:00", from: "SOC on-call analyst", lead: "ciso",
            title: "Mass encryption on the server estate",
            text: "The EDR raises 312 alerts in nine minutes: files renamed to *.nwlock on 40 Windows servers and on the VMware cluster that hosts the warehouse management system. A note, README-NWL.txt, sits on every share. The night shift in the Laval warehouse can no longer print pick lists.",
            inform: ["exec", "staff"],
            options: [
              { id: "a", decision: 2, label: "Open an S1 crisis bridge, isolate the affected servers and network segments through the EDR and firewall rules, and cut remote access (VPN and RDP gateways) until the scope is known.",
                effects: { ops: -15, cost: 20000 }, sets: { contained: true },
                consequence: "Encryption stops spreading at 23:31: 52 servers are hit. The warehouses switch to paper pick lists, and the bridge has an incident manager and a scribe." },
              { id: "b", decision: 1, label: "Power off the whole data centre to stop encryption everywhere at once.",
                effects: { ops: -30, data: -5, cost: 60000 }, sets: { contained: true },
                consequence: "The spread stops, but memory evidence and the attacker's live sessions are lost, and clean file servers at two sites go down with the rest. Restarting safely will take hours of checks.",
                lesson: "Isolate at the smallest level that stops the spread; a full power-off destroys evidence and takes down clean systems." },
              { id: "c", decision: 0, label: "Wait for the managed service provider to confirm it is ransomware before disrupting month-end processing.",
                effects: { ops: -35, data: -20, cost: 150000 }, sets: { contained: false },
                consequence: "By 00:40 encryption has reached 140 servers, including the HR file server. The provider confirms what the ransom note already said.",
                lesson: "A ransom note is confirmation enough. Contain first; encryption at scale is S1." }
            ],
            timeout: { effects: { ops: -25, data: -10, cost: 100000 }, sets: { contained: false },
              consequence: "No decision was recorded in time. Encryption kept running while the bridge debated, and 90 more servers were hit." },
            guidance: { text: "Isolate at the smallest level that stops the spread; if it spreads faster than you can isolate host by host, move to segment or site level. Severity S1: identity, backups and core operations are in play.",
              refs: [{ doc: "playbooks/malware-outbreak.md", anchor: "4-decision-points", label: "Malware outbreak · D1" }, { doc: "templates/severity-matrix.md", anchor: "levels", label: "Severity matrix · S1" }] }
          },
          {
            id: "R2", clock: "Fri 23:50 · T+0:40", from: "Infrastructure lead", lead: "cio",
            title: "Someone is in the backup console",
            text: "The backup console shows that at 22:58 the domain admin account adm-svc-backup signed in from a jump server, set retention to one day and started deleting restore points. The immutable cloud copy lives in a separate tenant; its last snapshot is Thursday 02:00.",
            inform: ["exec", "irfirm"],
            options: [
              { id: "a", decision: 2, label: "Treat identity and backups as compromised: move the response to an out-of-band channel, lock the cloud backup tenant with break-glass accounts, disable the account, and plan a full rotation of privileged credentials, including the Kerberos ticket-granting key twice.",
                effects: { ops: -5, cost: 15000 }, sets: { backupsProtected: true, channelCompromised: false },
                consequence: "The deletion job stops with Thursday's immutable copy intact. The bridge moves to a separate messaging tenant and phones; the attacker loses sight of your plans." },
              { id: "b", decision: 0, label: "Start restoring the warehouse system from the newest restore point tonight so it is ready for Monday.",
                effects: { ops: -20, data: -10, cost: 80000 }, sets: { backupsProtected: false, channelCompromised: true },
                consequence: "The restored servers are re-encrypted within two hours: the attacker still holds a domain admin account. The deletion job also reaches the cloud copy through synchronised credentials.",
                lesson: "Never restore into an environment the attacker still controls. Secure identity and the backups first." },
              { id: "c", decision: 1, label: "Disable adm-svc-backup, reset its password, and keep coordinating on the usual email and chat.",
                effects: { legal: -5, rep: -5, cost: 10000 }, sets: { backupsProtected: true, channelCompromised: true },
                consequence: "The deletion stops, but the attacker holds a second admin account and reads your chat channel: the negotiator will later quote your own messages.",
                lesson: "With a domain admin compromised, assume email and chat are read: move to an out-of-band channel." }
            ],
            timeout: { effects: { data: -10, cost: 90000 }, sets: { backupsProtected: false, channelCompromised: true },
              consequence: "No decision was recorded in time. The deletion job finished and reached the cloud copy." },
            guidance: { text: "For a Tier 0 compromise, move to an out-of-band channel, contain now, use break-glass accounts and rotate the whole tier. Verify backup and EDR consoles before trusting them.",
              refs: [{ doc: "playbooks/privileged-account-compromise.md", anchor: "4-decision-points", label: "Privileged account compromise · D1, D3, D4, D5" }] }
          },
          {
            id: "R3", clock: "Sat 00:40 · T+1:30", from: "Insurance broker (by phone)", lead: "legal",
            title: "The policy clock",
            text: "The cyber policy requires notice within 24 hours and the use of the insurer's panel incident-response firm; fees of non-panel firms are not covered. The ransom note says: \"We took 200 GB. Leak site in 72 hours.\"",
            inform: ["insurer", "law", "irfirm"],
            options: [
              { id: "a", decision: 2, label: "Notify the insurer now, engage the panel breach coach so that forensic work runs under legal privilege, and report the extortion to law enforcement.",
                effects: { cost: 5000 }, sets: { insurerNotified: true },
                consequence: "The panel firm is on the bridge by 02:00 under counsel's engagement letter. Forensic costs are covered, and the police case number goes in the record." },
              { id: "b", decision: 0, label: "Wait until forensics confirm whether data left before calling the insurer, to avoid a premium increase.",
                effects: { legal: -15, cost: 250000 }, sets: { insurerNotified: false },
                consequence: "At hour 30 the insurer points to the 24-hour notice clause and reserves its rights. Every cost so far is uninsured.",
                lesson: "Insurer notice periods are contractual clocks. Notify on suspicion, not on proof." },
              { id: "c", decision: 1, label: "Hire the forensic firm you already know directly tonight, and notify the insurer on Monday.",
                effects: { legal: -5, cost: 120000 }, sets: { insurerNotified: false },
                consequence: "Work starts fast, but the firm is not on the panel: the insurer covers 40% of the fees and the reports are not privileged.",
                lesson: "Engage forensics through counsel and the insurer's panel so that the work is privileged and covered." }
            ],
            timeout: { effects: { legal: -10, cost: 150000 }, sets: { insurerNotified: false },
              consequence: "No decision was recorded in time. Nobody owned the insurer call, and the notice period kept running." },
            guidance: { text: "Engage external IR through Legal for privilege; notify the insurer within its notice period; report extortion and data theft to law enforcement.",
              refs: [{ doc: "playbooks/privileged-account-compromise.md", anchor: "4-decision-points", label: "Privileged account compromise · D7" }, { doc: "playbooks/data-breach-personal-data.md", anchor: "4-decision-points", label: "Data breach · D5, D7" }] }
          },
          {
            id: "R4", clock: "Sat 03:10 · T+4:00", from: "CEO", lead: "legal",
            title: "The ransom demand",
            text: "The attackers' portal demands 45 BTC, about CAD 4 million, halved if paid within 48 hours. The CEO wants a recommendation from the three of you before 06:00.",
            variants: [{ when: { channelCompromised: true }, text: "The portal message quotes a line from your own chat channel: \"restore by Monday or we miss payroll\"." }],
            inform: ["exec", "insurer", "law"],
            options: [
              { id: "a", decision: 2, label: "Recommend no payment decision tonight: run a sanctions check, let the insurer's negotiator open contact only to gain time and information, and decide on the basis of whether a clean restore is possible.",
                effects: {}, sets: { paid: false },
                consequence: "The negotiator buys four days and gets a file listing that shows what was taken. The CEO accepts the recommendation and records it." },
              { id: "b", decision: 0, label: "Recommend paying the discounted ransom now to get the decryptor and stop the leak.",
                effects: { legal: -20, rep: -10, data: -10, cost: 2000000 }, sets: { paid: true },
                consequence: "The decryptor works on 60% of the servers, slowly. Three weeks later part of the data appears on the leak site anyway, and the sanctions check you skipped flags the wallet.",
                lesson: "Paying buys neither deletion nor speed. Decide only after a sanctions check and an honest view of restore options." },
              { id: "c", decision: 1, label: "Ask IT to reply to the attackers directly, asking for proof of data and more time.",
                effects: { legal: -5, rep: -5 }, sets: { paid: false },
                consequence: "The attackers now know who to pressure. They email the IT manager's personal address with threats and cut the deadline to 24 hours.",
                lesson: "Do not let staff reply to an extortionist. Contact goes through a negotiator under counsel's direction." }
            ],
            timeout: { effects: { legal: -5, rep: -5 }, sets: { paid: false },
              consequence: "No recommendation reached the CEO by 06:00, and the CEO started talking to the attackers' portal alone." },
            guidance: { text: "Do not reply and do not pay in a hurry. Preserve the message, involve law enforcement, and let the executive sponsor decide on Legal's advice.",
              refs: [{ doc: "playbooks/ddos.md", anchor: "4-decision-points", label: "DDoS with extortion · D5" }, { doc: "docs/tabletop-exercise-kit.md", anchor: "inject-bank-for-your-own-scenarios", label: "Tabletop kit · inject bank" }] }
          },
          {
            id: "R5", clock: "Sat 07:10 · T+8:00", from: "Infrastructure lead", lead: "cio",
            title: "The restore plan",
            text: "Identity is being rebuilt from a clean domain controller. You must now decide how to bring 140 servers back.",
            variants: [
              { when: { backupsProtected: true }, text: "The immutable copy from Thursday 02:00 is intact and verified clean on an isolated network. A full restore takes about 60 hours at current bandwidth." },
              { when: { backupsProtected: false }, text: "The backup catalogue is gone and the cloud copy was reached through synchronised credentials. The only clean copy is an 11-day-old offline tape set: about 90 hours to restore, and 11 days of transactions to re-enter." }
            ],
            arrival: [{ when: { backupsProtected: false }, effects: { ops: -15, cost: 150000 }, note: "Backups lost: 11 days of transactions to re-enter by hand." }],
            inform: ["staff", "customers"],
            options: [
              { id: "a", decision: 2, label: "Restore into a clean, isolated environment in business order (identity, then payroll and the warehouse system, then the rest), publish that order, and keep the warehouses on paper meanwhile.",
                effects: { ops: 20, cost: 60000 }, sets: { reinfected: false },
                consequence: "Payroll is back on Sunday evening and the warehouse system on Monday at 05:00. Everyone knows what comes back when." },
              { id: "b", decision: 1, label: "Restore all 140 servers in parallel to finish sooner.",
                effects: { ops: 5, data: -5, cost: 90000 }, sets: { reinfected: false },
                consequence: "Bandwidth saturates and nothing is usable for 48 hours; two restored servers still carry the attacker's scheduled task and have to be rebuilt.",
                lesson: "Recover by business priority and publish the order; parallel restores starve the systems that matter." },
              { id: "c", decision: 0, label: "Restore onto the existing network before the credential rotation is finished, to save a day.",
                effects: { ops: 10, data: -15, cost: 200000 }, sets: { reinfected: true },
                consequence: "The attacker's persistence on two old domain controllers survives. On Sunday night encryption starts again on restored servers.",
                lesson: "Restore only after rotation and a persistence hunt; otherwise you restore the attacker too." }
            ],
            timeout: { effects: { ops: -15, cost: 80000 }, sets: { reinfected: false },
              consequence: "No restore order was set in time; teams restored whatever they owned, and payroll lost a day." },
            guidance: { text: "Recover by business priority: identity and core infrastructure first, then safety- and revenue-critical systems, then everyone else. Publish the order. Validate backups from a separate copy before relying on them.",
              refs: [{ doc: "playbooks/malware-outbreak.md", anchor: "4-decision-points", label: "Malware outbreak · D4" }, { doc: "playbooks/privileged-account-compromise.md", anchor: "4-decision-points", label: "Privileged account compromise · D5" }] }
          },
          {
            id: "R6", clock: "Sat 13:10 · T+14:00", from: "External IR lead", lead: "legal",
            title: "What left the building",
            text: "Forensics confirm that 180 GB was copied to a cloud storage service on Wednesday night, two days before the encryption. It includes the HR share (2,400 employees: home addresses, dates of birth and payroll bank details) and customer contracts with pricing. Employees live in Québec, France and the UK.",
            inform: ["dpo", "regulator", "staff"],
            options: [
              { id: "a", decision: 2, label: "Record the awareness time now, start the clocks (GDPR 72 hours, Québec Law 25, PIPEDA), submit a phased notification to the lead regulator with what is known, and prepare the employee letter with payroll safeguards.",
                effects: { cost: 40000 }, sets: { notified: true },
                consequence: "The lead regulator receives an initial notice on Sunday with a follow-up date. The employee letter is ready with a payroll call line and a monitoring offer." },
              { id: "b", decision: 0, label: "Wait for the final forensic report, due in two weeks, before deciding whether to notify.",
                effects: { legal: -25, rep: -10, cost: 300000 }, sets: { notified: false },
                consequence: "The 72-hour deadline passes on Tuesday. The regulator learns of the breach from the leak site and opens an inquiry into the delay.",
                lesson: "Notification clocks start at awareness, not at the final report. Notify in phases." },
              { id: "c", decision: 1, label: "Email every employee and customer tonight, before telling the regulator.",
                effects: { legal: -10, rep: -5, cost: 60000 }, sets: { notified: false },
                consequence: "People are warned, but the email is incomplete and triggers 600 support calls; the regulator hears about it from the press first.",
                lesson: "Notify the lead regulator within the deadline and tell individuals when your advice is actionable." }
            ],
            timeout: { effects: { legal: -15, cost: 100000 }, sets: { notified: false },
              consequence: "No decision was recorded in time. The awareness time was never written down, and the clocks are now disputed." },
            guidance: { text: "Personal data is in scope, so the clocks start now. Assess the risk to individuals, notify the lead authority within 72 hours even if facts are incomplete, and offer monitoring when financial data is exposed.",
              refs: [{ doc: "playbooks/data-breach-personal-data.md", anchor: "4-decision-points", label: "Data breach · D1 to D4, D6" }] }
          },
          {
            id: "R7", clock: "Sat 21:10 · T+22:00", from: "Communications", lead: "ciso",
            title: "The leak site and the journalist",
            text: "The group posts 20 sample files on its leak site, including a payroll extract. A business journalist asks for comment by 18:00 tomorrow and mentions \"a ransom negotiation\".",
            variants: [{ when: { paid: true }, text: "The leak-site post also claims that Northwind \"paid fast like a good customer\"." }],
            inform: ["comms", "exec", "staff", "customers"],
            options: [
              { id: "a", decision: 2, label: "Approve a factual holding statement: incident confirmed, systems being restored, personal data involved and people being contacted, no comment on any negotiation. Brief staff and key customers before it goes out.",
                effects: { rep: 5 }, sets: { misstatement: false },
                consequence: "The article quotes your statement in full. Staff and the three largest customers heard it from you first." },
              { id: "b", decision: 1, label: "Reply \"no comment\" until the investigation is finished.",
                effects: { rep: -10 }, sets: { misstatement: false },
                consequence: "The article runs with the attackers' version and a picture of the leak site.",
                lesson: "Silence lets the attacker write the story; a short factual statement is safer." },
              { id: "c", decision: 0, label: "State that no customer or employee data was taken.",
                effects: { legal: -25, rep: -25 }, sets: { misstatement: true },
                consequence: "Two days later the leak site publishes the payroll file. Your statement is quoted next to it, and the regulator asks why it was made.",
                lesson: "Never announce \"no data was taken\" before scoping is complete." }
            ],
            timeout: { effects: { rep: -15 }, sets: { misstatement: false },
              consequence: "The deadline passed without a statement; the article says Northwind \"did not respond\"." },
            guidance: { text: "Use the press holding statement: reactive, factual, nothing on negotiations. Tell staff and customers before the press.",
              refs: [{ doc: "playbooks/data-breach-personal-data.md", anchor: "6-communication-templates", label: "Data breach · communication templates" }] }
          },
          {
            id: "R8", clock: "Sun 23:10 · T+48:00", from: "CEO", lead: "cio",
            title: "Back by Monday 07:00?",
            text: "The CEO wants every site running on Monday at 07:00. Identity is rebuilt and privileged credentials are rotated; the persistence hunt has covered 70% of the dwell period.",
            variants: [{ when: { reinfected: true }, text: "Encryption restarted on some restored servers on Sunday night; the hunt has traced it to two old domain controllers." }],
            inform: ["exec", "staff", "customers"],
            options: [
              { id: "a", decision: 2, label: "Bring back identity, payroll and the warehouse system under heightened monitoring, keep everything else isolated until the hunt over the full dwell period is clean, and write down the criteria for \"contained\" and \"evicted\".",
                effects: { ops: 15, cost: 30000 },
                consequence: "Payroll runs on time and the warehouses ship on Monday. The remaining servers return on Wednesday after a clean hunt." },
              { id: "b", decision: 0, label: "Reconnect everything on Monday at 07:00 as asked.",
                effects: { ops: 5, data: -15, cost: 250000 },
                consequence: "A forgotten scheduled task on a file server calls back to the attacker on Monday at 11:00; the network goes down again for a day.",
                lesson: "Stand down only against written criteria: full rotation, a clean hunt over the dwell period, and clean monitoring." },
              { id: "c", decision: 1, label: "Keep everything down until the final forensic report.",
                effects: { ops: -20, cost: 400000 },
                consequence: "No re-infection, but payroll is late and two major customers move volume to a competitor for the week.",
                lesson: "Return critical services in stages under monitoring rather than waiting for a perfect report." }
            ],
            timeout: { effects: { ops: -10, cost: 150000 },
              consequence: "No decision reached the CEO, who reconnected the warehouses alone on Monday morning." },
            guidance: { text: "Contained: no new detections for 24 hours with blocking rules live. Evicted: full rotation, a clean persistence hunt over the whole dwell period, and 72 hours of clean monitoring.",
              refs: [{ doc: "playbooks/malware-outbreak.md", anchor: "4-decision-points", label: "Malware outbreak · D7" }, { doc: "playbooks/privileged-account-compromise.md", anchor: "4-decision-points", label: "Privileged account compromise · D8" }] }
          }
        ],
        hotwash: [
          "Who owned the decision to isolate, and how long did it take to make it?",
          "Did we know the insurer's notice period and panel requirements before tonight?",
          "Were the backups really out of reach of a domain admin account?",
          "Where was the awareness time for the data breach recorded, and by whom?",
          "What would we have done if the CEO had been unreachable?"
        ]
      },

      {
        id: "bec-bank-details",
        title: "The new bank details",
        type: "Business email compromise and payment fraud",
        duration: "7 injects · about 40 minutes",
        setting: "Northwind Logistics (fictional) pays its main carrier, Contoso Freight (fictional), about CAD 1.2 million a month. Accounts payable works from a process in the ERP and a Microsoft 365 mailbox. It is Tuesday, 09:30.",
        briefing: "A payment went to a fraudster's account after a supplier's mailbox was hijacked, and your own mailbox is involved. You will decide on the bank recall, mailbox containment, the identity gap, personal data, the supplier dispute, your customers and the lasting control fix.",
        playbooks: ["supply-chain-vendor-compromise", "privileged-account-compromise", "data-breach-personal-data"],
        injects: [
          {
            id: "B1", clock: "Tue 09:30 · T+0:00", from: "Accounts payable", lead: "legal",
            title: "The payment that never arrived",
            text: "Contoso Freight calls: they have not received last week's CAD 1.2 million. Accounts payable released it yesterday at 16:00 to new bank details received on Thursday from Contoso's usual contact, inside the same email thread as their invoices.",
            inform: ["bank", "law", "cfo"],
            options: [
              { id: "a", decision: 2, label: "Call the bank's fraud desk now to request a recall and a freeze on the beneficiary account, file a police report, and preserve the emails with their headers.",
                effects: {}, sets: { bankFast: true },
                consequence: "The bank sends a recall request within the hour and contacts the receiving bank. The police case number is in the incident record by 10:15." },
              { id: "b", decision: 0, label: "Reply in the Contoso email thread asking them to confirm the new account.",
                effects: { rep: -5 }, sets: { bankFast: false, tippedOff: true },
                consequence: "The reply reaches the attacker, who confirms the account politely and moves the money that afternoon.",
                lesson: "Never verify through the channel that may be compromised; call a known number." },
              { id: "c", decision: 1, label: "Wait for the internal investigation to confirm fraud before involving the bank.",
                effects: {}, sets: { bankFast: false },
                consequence: "The investigation confirms fraud at 15:00. By then the receiving bank has processed two outgoing transfers.",
                lesson: "In payment fraud the first hours decide what can be recovered; call the bank on suspicion." }
            ],
            timeout: { effects: {}, sets: { bankFast: false },
              consequence: "No decision was recorded in time, and nobody called the bank this morning." },
            guidance: { text: "Speed of the bank recall is the main lever. Preserve evidence and report the fraud to law enforcement.",
              refs: [{ doc: "playbooks/data-breach-personal-data.md", anchor: "4-decision-points", label: "Data breach · D7 (law enforcement)" }, { doc: "playbooks/supply-chain-vendor-compromise.md", anchor: "4-decision-points", label: "Supply chain · D1" }] }
          },
          {
            id: "B2", clock: "Tue 10:00 · T+0:30", from: "SOC analyst", lead: "ciso",
            title: "Whose mailbox?",
            text: "Message trace shows Thursday's email really came from Contoso's tenant: their contact's mailbox was compromised and the attacker replied inside an existing thread. In your own tenant, the accounts payable clerk's mailbox has an inbox rule, created nine days ago, that moves any email containing \"bank\", \"payment\" or \"invoice\" to the RSS Feeds folder.",
            inform: ["customers", "exec"],
            options: [
              { id: "a", decision: 2, label: "Treat the clerk's mailbox as compromised: revoke sessions, reset the password, remove the rule and any MFA method or app consent the attacker added, then hunt the tenant for the same rule pattern and sign-ins. Warn Contoso by phone that their mailbox is compromised.",
                effects: { cost: 5000 }, sets: { mailboxContained: true },
                consequence: "Two more mailboxes with the same rule are found in Finance and cleaned. Contoso's IT starts its own response after your call." },
              { id: "b", decision: 0, label: "Delete the inbox rule and remind the clerk to be careful.",
                effects: { data: -10 }, sets: { mailboxContained: false },
                consequence: "The attacker still holds a valid session token and recreates the rule within the hour.",
                lesson: "A malicious inbox rule means the account is compromised: revoke sessions and reset, then hunt for the same pattern." },
              { id: "c", decision: 1, label: "Block Contoso's domain at the email gateway.",
                effects: { ops: -10 }, sets: { mailboxContained: false },
                consequence: "Real invoices and delivery notices from your main carrier now bounce, and your clerk's mailbox is still under the attacker's control.",
                lesson: "Contain your own compromised account first; blocking a supplier breaks business without removing the attacker." }
            ],
            timeout: { effects: { data: -10 }, sets: { mailboxContained: false },
              consequence: "No decision was recorded in time; the attacker kept reading the accounts payable mailbox." },
            guidance: { text: "Contain fast when data or money is at risk. Treat the supplier's indicators as present in your environment until a hunt says otherwise.",
              refs: [{ doc: "playbooks/privileged-account-compromise.md", anchor: "4-decision-points", label: "Privileged account compromise · D3" }, { doc: "playbooks/supply-chain-vendor-compromise.md", anchor: "4-decision-points", label: "Supply chain · D3" }] }
          },
          {
            id: "B3", clock: "Tue 10:30 · T+1:00", from: "Identity team", lead: "cio",
            title: "How they got in",
            text: "Sign-in logs show the clerk signed in eleven days ago from an unfamiliar country through IMAP, a legacy protocol that does not support MFA. Fourteen other accounts, mostly shared mailboxes and two Finance users, still allow legacy authentication.",
            inform: ["staff"],
            options: [
              { id: "a", decision: 2, label: "Block legacy authentication tenant-wide now with Conditional Access, document the two integrations that break, and give their owners a dated migration plan.",
                effects: { ops: -3, cost: 3000 }, sets: { legacyBlocked: true },
                consequence: "Password-spray attempts against the shared mailboxes start failing the same afternoon. A scanner and an old reporting tool need a fix by Friday." },
              { id: "b", decision: 0, label: "Raise a change request for next month's change window.",
                effects: { data: -10 }, sets: { legacyBlocked: false },
                consequence: "Four days later a shared Finance mailbox is taken over through the same protocol.",
                lesson: "An open path the attacker already used is an emergency change, not a scheduled one." },
              { id: "c", decision: 1, label: "Disable legacy authentication on the clerk's account only.",
                effects: { data: -5 }, sets: { legacyBlocked: false },
                consequence: "The clerk is protected, but the 14 other accounts stay exposed to the same technique.",
                lesson: "Close the technique, not just the account." }
            ],
            timeout: { effects: { data: -5 }, sets: { legacyBlocked: false },
              consequence: "No decision was recorded in time; legacy authentication stays open across the tenant." },
            guidance: { text: "Close the access path the attacker used for every account that shares it, then verify with sign-in monitoring.",
              refs: [{ doc: "playbooks/privileged-account-compromise.md", anchor: "4-decision-points", label: "Privileged account compromise · D4" }] }
          },
          {
            id: "B4", clock: "Tue 12:00 · T+2:30", from: "Data protection officer", lead: "legal",
            title: "What did they read?",
            text: "The clerk's mailbox holds three years of supplier correspondence, 40 employee expense claims with bank details, and a customer master-data export that Sales sent in March. The attacker had access for eleven days.",
            inform: ["dpo", "insurer"],
            options: [
              { id: "a", decision: 2, label: "Run a scoped search of the mailbox audit log for items accessed and synchronised during the eleven days, record the awareness time, and assess the risk to individuals against the 72-hour clock.",
                effects: { cost: 15000 }, sets: { dataScoped: true },
                consequence: "The audit log shows the attacker synchronised the whole mailbox. The DPO assesses a risk to individuals and schedules the regulator notice within the deadline." },
              { id: "b", decision: 0, label: "Assume nothing was read: the attacker only wanted the payment.",
                effects: { legal: -20, data: -10 }, sets: { dataScoped: false },
                consequence: "Six weeks later employees report phishing that quotes their own expense claims. The breach is now late to notify.",
                lesson: "Assume personal data is in scope until the audit log proves otherwise." },
              { id: "c", decision: 1, label: "Notify every customer and employee now, before any scoping.",
                effects: { rep: -5, cost: 30000 }, sets: { dataScoped: false },
                consequence: "The notice is vague and alarms 900 people whose data was never in the mailbox.",
                lesson: "Scope first, quickly; notify with actionable facts within the deadline." }
            ],
            timeout: { effects: { legal: -10 }, sets: { dataScoped: false },
              consequence: "No decision was recorded in time; nobody wrote down when the organisation became aware." },
            guidance: { text: "Decide whether personal data is in scope (it sets the clocks), then assess the risk to individuals.",
              refs: [{ doc: "playbooks/data-breach-personal-data.md", anchor: "4-decision-points", label: "Data breach · D1, D2" }] }
          },
          {
            id: "B5", clock: "Tue 14:30 · T+5:00", from: "Bank relationship manager", lead: "legal",
            title: "Who owes what?",
            text: "Contoso's finance director says you still owe the full invoice: \"you paid the wrong account, that is your problem.\"",
            variants: [
              { when: { bankFast: true }, text: "The receiving bank froze CAD 410,000 still in the account; the rest left in three transfers abroad." },
              { when: { bankFast: false }, text: "The beneficiary account was emptied yesterday evening; the bank can only file a recall request." }
            ],
            arrival: [{ when: { bankFast: false }, effects: { cost: 410000 }, note: "Funds that a fast recall would have frozen are gone." }],
            inform: ["insurer", "customers", "cfo"],
            options: [
              { id: "a", decision: 2, label: "Notify the insurer under the crime and social-engineering cover, review the contract's payment-change clauses with counsel, and answer Contoso in writing without admitting liability, proposing a joint review of their compromised mailbox.",
                effects: { cost: 200000 },
                consequence: "The insurer accepts the claim under the social-engineering sub-limit. Contoso agrees to a joint review, and deliveries continue." },
              { id: "b", decision: 1, label: "Pay Contoso again today to protect the relationship, and sort out liability later.",
                effects: { cost: 790000, legal: -5 },
                consequence: "Deliveries are safe, but the second payment weakens your insurance claim and your position on Contoso's share of the loss.",
                lesson: "Settle the commercial dispute after the insurer and counsel have reviewed the contract." },
              { id: "c", decision: 0, label: "Tell Contoso the fraud was their fault and refuse any discussion.",
                effects: { ops: -15, rep: -15 },
                consequence: "Contoso slows your deliveries pending payment, and its lawyers send a formal notice.",
                lesson: "Keep the supplier relationship working while liability is assessed; the facts are rarely one-sided." }
            ],
            timeout: { effects: { ops: -5, cost: 100000 },
              consequence: "No answer went to Contoso, which put your account on hold." },
            guidance: { text: "Use contractual remedies after containment and capture the facts now; decide on the relationship from the vendor's transparency and remediation.",
              refs: [{ doc: "playbooks/supply-chain-vendor-compromise.md", anchor: "4-decision-points", label: "Supply chain · D6, D7" }] }
          },
          {
            id: "B6", clock: "Tue 16:30 · T+7:00", from: "Sales director", lead: "ciso",
            title: "Your mailbox, their fraud",
            text: "Two customers forward emails sent last week from your clerk's real mailbox, announcing that Northwind's bank details have changed. One customer has already paid CAD 85,000 to the attacker's account.",
            variants: [{ when: { mailboxContained: false }, text: "A third email of the same kind left the clerk's mailbox 20 minutes ago." }],
            arrival: [{ when: { mailboxContained: false }, effects: { rep: -10 }, note: "The uncontained mailbox kept sending fraud emails to customers." }],
            inform: ["customers", "comms", "exec"],
            options: [
              { id: "a", decision: 2, label: "Call every customer the mailbox wrote to in the last eleven days on a known phone number, warn them and explain how to verify payment instructions, then confirm in writing.",
                effects: { rep: 5, cost: 10000 },
                consequence: "One more customer was about to pay and stops. Customers thank Sales for the call." },
              { id: "b", decision: 1, label: "Publish a generic fraud warning on the website.",
                effects: { rep: -5 },
                consequence: "Few customers see it; a second customer pays CAD 40,000 to the attacker the next day.",
                lesson: "Warn the people who were actually targeted, directly." },
              { id: "c", decision: 0, label: "Say nothing to customers to avoid reputational damage.",
                effects: { rep: -20, legal: -10 },
                consequence: "Three customers lose money in total. One of them learns that you knew and says so in a trade publication.",
                lesson: "Silence turns your incident into your customers' losses." }
            ],
            timeout: { effects: { rep: -10 },
              consequence: "No decision was recorded in time; customers kept receiving fraud emails without a warning." },
            guidance: { text: "When your environment was used against customers, tell them directly and give them a way to verify; follow contracts and data-protection clocks.",
              refs: [{ doc: "playbooks/supply-chain-vendor-compromise.md", anchor: "4-decision-points", label: "Supply chain · D5" }, { doc: "playbooks/data-breach-personal-data.md", anchor: "6-communication-templates", label: "Data breach · communication templates" }] }
          },
          {
            id: "B7", clock: "Wed 09:30 · T+24:00", from: "CFO", lead: "cio",
            title: "Never again",
            text: "The CFO wants a control change approved by the board on Friday.",
            inform: ["exec", "staff", "cfo"],
            options: [
              { id: "a", decision: 2, label: "Call back on a known number for any bank-detail change, dual approval for changes to the ERP supplier master, alerts on master-data changes and new payees, legacy authentication blocked, and inbox-rule detection in the SOC.",
                effects: { ops: -2, cost: 25000 },
                consequence: "The board approves the package. The first alert fires a month later on a real change request, and the call-back works." },
              { id: "b", decision: 1, label: "Buy an AI email-security add-on.",
                effects: { cost: 80000 },
                consequence: "It catches some lookalike domains but not emails sent from a real, compromised supplier mailbox.",
                lesson: "Payment fraud is stopped by process controls on the payment, not only by email filtering." },
              { id: "c", decision: 0, label: "Run a phishing-awareness reminder for accounts payable.",
                effects: { rep: -5 },
                consequence: "Six months later a new clerk approves another bank-detail change received by email.",
                lesson: "Training supports controls; it does not replace a call-back and dual approval." }
            ],
            timeout: { effects: { rep: -5 },
              consequence: "No proposal reached the board; the control gap stays open." },
            guidance: { text: "Turn the post-incident review into owned, dated actions, and check whether the same root cause appeared before.",
              refs: [{ doc: "templates/post-incident-review.md", anchor: "", label: "Post-incident review template" }] }
          }
        ],
        hotwash: [
          "How long did it take from the supplier's call to the bank's recall request?",
          "Which channel did we use to verify facts, and could the attacker read it?",
          "Who knew that legacy authentication was still allowed, and why was it?",
          "Which customers were told directly, and who decided?",
          "What single control would have stopped this payment?"
        ]
      }
    ]
  };

  if (typeof module === "object" && module.exports) module.exports = DATA;
  else root.TTX_DATA = DATA;
})(this);
