# SonarCloud setup

This repository is analysed by SonarQube Cloud (SonarCloud). This note explains
how the analysis is scoped and the two one-time steps needed to enable a
computed, passing Quality Gate with code coverage.

## What is analysed

A Shopify theme ships with a large amount of code we neither wrote nor maintain:
the compiled theme bundle (`theme.js`, `theme.min.js`), third-party libraries
(`swiper-chunk.js`, `photoswipe-chunk.js`, `nouislider-chunk.js`,
`polyfill-inert-chunk.js`), the vendor stylesheet (`theme.css`), icon fonts and
locale files. Grading that code tells us nothing useful, so analysis is scoped
to the files our team actually authored (see `sonar-project.properties`):

- `assets/cart-counter.js`
- `assets/collection-sku-sort.js`
- `assets/custom-events.js`
- `assets/custom.css`

These first-party scripts are covered by unit tests in `tests/`.

## One-time setup (required for the Quality Gate + coverage)

Coverage can only be imported through a CI-based analysis, not SonarCloud's
"Automatic Analysis". Two settings need to be changed once, by someone with
access to the SonarCloud project and the GitHub repository:

1. **Turn off Automatic Analysis** in SonarCloud
   Project → *Administration* → *Analysis Method* → disable *Automatic Analysis*.
   (CI-based analysis and Automatic Analysis cannot both run.)

2. **Add the `SONAR_TOKEN` secret** to GitHub
   - In SonarCloud: *My Account* → *Security* → generate a token.
   - In GitHub: repo → *Settings* → *Secrets and variables* → *Actions* →
     *New repository secret* → name `SONAR_TOKEN`, paste the token.

After that, every push to `main` and every pull request runs
`.github/workflows/sonarcloud.yml`, which installs dependencies, runs the tests
with coverage, and uploads the results to SonarCloud.

> Before the first run, confirm `sonar.projectKey` and `sonar.organization` in
> `sonar-project.properties` match your project (SonarCloud → project →
> *Information*). They are usually `spchandera_Pastelpines` and `spchandera`.

## Running the tests locally

```bash
npm install
npm run test:coverage
```

Coverage is written to `coverage/lcov.info`, the same report the CI job uploads.
