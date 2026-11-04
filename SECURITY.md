# Security policy

## Reporting a vulnerability

If you find a security problem in this repository (a way to run script through scenario data, a weakness in the
Content-Security-Policy, a dependency issue in the CI workflow, or any content that could put a user at risk),
please report it privately:

1. **GitHub private vulnerability reporting**: open the *Security* tab of this repository and choose
   *Report a vulnerability*. This is the preferred channel.
2. Or through the contact section of [my portfolio](https://bizidwassim-design.github.io/wassim-bizid-portfolio/#contact).

Please do **not** open a public issue for security reports.

You will receive an acknowledgement within **5 business days** and a resolution or a status update within **30 days**.
Credit is given in the changelog unless you prefer to stay anonymous.

## Scope

* All files in this repository (scenarios, scripts, documentation, web assets).
* The GitHub Pages site built from this repository.

Out of scope: the laws, standards and playbooks referenced, and the way you deploy or adapt the content in your own
environment.

## Supported versions

Only the latest commit on `main` is supported.

## Design commitments

* All text from scenario data and user input is inserted with `textContent`, never as HTML.
* A strict Content-Security-Policy allows only the app's own scripts and styles; nothing is fetched at run time.
* No telemetry, analytics, tracking or third-party scripts. Session progress stays in the browser's local storage.
* No real incidents, indicators, client names or internal data: fictional scenarios only.
