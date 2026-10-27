# GSTDesk: Master Build Prompts

**Prompt 1** builds the complete web app (Ionic + Angular).
**Prompt 2** turns that finished app into an Electron desktop app.
Use them in order, in the same project. Run `npm run verify` after each.

---

## PROMPT 1: Build the app (web)

Build **GSTDesk**: a desktop-first invoicing app for small businesses in **India and abroad**. Local-only storage, no backend, no Electron yet.

### Stack and scaffold
- Scaffold with `ionic start gst-desk blank --type=angular --capacitor` (standalone components), then make sure the versions are **Ionic 9
  (`@ionic/angular`), Angular 22, Capacitor 8, TypeScript 6, Vitest** for unit tests (`ng test`), ESLint with `angular-eslint`.
- Install `@capacitor/preferences`, `@capacitor/app`, `@capacitor/haptics`, `@capacitor/status-bar`, `@capacitor/keyboard`, `ionicons`.
- npm scripts: `start`, `build`, `lint`, `test:ci` (`ng test --watch=false`) and `verify` (= lint + test:ci + build). The production build must set
  `optimization.styles.inlineCritical = false` in `angular.json` (needed later for Electron's strict CSP).
- Import every Ionic component from `@ionic/angular` (in Ionic 9 that is the standalone entry). `provideIonicAngular()` with no `mode`.
- Capacitor plugins are used only through injection tokens in `tokens/native-plugins.tokens.ts` (`PREFERENCES`, `APP_PLUGIN`, …); specs provide mocks
  from `src/testing/native-mocks.ts` (an in-memory Preferences).

### Architecture rules (follow strictly)
- Standalone components, `ChangeDetectionStrategy.OnPush`, `inject()`, `@if / @for (track) / @switch`.
- **Signals everywhere**: `signal`, `computed`, `effect`, `input()` / `input.required()`, `output()`. Services own state in a private writable
  signal exposed with `.asReadonly()`. No BehaviorSubject, no `async` pipe, no NgModules.
- Folder layout: `pages/<name>/ components/<name>/ services/<name>/ utils/ enums/ interfaces/ tokens/`.
- Pure business logic lives in `utils/` with a `.spec.ts` each; every service, page and component with logic also has a spec.
- Colours, spacing and type only through tokens in `src/theme/variables.scss`; system font stack, no CDN. Dark mode = the `ion-palette-dark` class on
  `<html>`, toggled by a `ThemeService` (system / light / dark, persisted). The printed invoice uses separate `--app-paper-*` tokens (always black on white).
- `provideAppInitializer`: call `inject()` for every dependency before the first `await`; then load theme, business and customers, then invoices, then
  seed demo data on a brand-new install, then reload invoices.
- UI copy never mentions the platform shell.

### Country rules as data (the key design)
One `TaxRegime` object per country in `utils/tax-regimes.ts`, with: `code, name, defaultCountry, domesticCountries, currency, locale, engine, taxName,
taxIdLabel, taxIdPlaceholder, itemCodeLabel, documentTitle, rates, defaultRate, splitLabels, interLabel, regionLabel, regions, defaultRegion,
roundToWhole, fiscalYearStartMonth, bankCodeLabel, paymentIdLabel, paymentIdPlaceholder, exemptLabel, exemptNote`.
Regimes: **IN** (GST; rates 0/5/12/18/28; CGST+SGST / IGST; HSN/SAC; round to a whole rupee; April fiscal year; IFSC; UPI), **US** (Sales tax,
manual rate, 50 states + DC, "INVOICE", routing number), **GB** (VAT 0/5/20, "VAT INVOICE", April year), **EU** (VAT, EUR, rates 0/5/7/10/19/20/21/23,
domestic = 13 EU countries), **AU** (GST 0/10, ABN, July year), **SG** (GST 0/9), **AE** (VAT 0/5, TRN), **CUSTOM** (user-named tax, manual rate).
Three engines:
- `split-by-region`: same region → two labelled parts (CGST, SGST; the last part takes the odd paisa), other region → one part (IGST).
- `single-rate`: one part labelled with the tax name.
- `manual-rate`: one part; the user types the rate per line (Settings has a default rate).
Tax is computed **line by line, then summed**. `TaxContext = { regime, sameRegion, treatment: 'standard' | 'exempt', roundWhole }`; exempt means no tax parts
and the regime's `exemptNote` is printed. `roundWhole` is true only when the regime rounds **and** the invoice is in that regime's currency (an Indian
export billed in USD is not rounded to a whole dollar). `calcTotals` returns `{ subtotal, taxLines[{key,label,amount}], totalTax, exactTotal, roundOff,
grandTotal }`; `summarizeByRate` gives the per-rate table printed on the invoice.
Components never write "₹", "GST", "GSTIN" or "State" literally: they read labels, currency and locale from the regime. Adding a country must mean adding
one object and one spec, nothing else. Rates are invoicing defaults, not tax advice.

### Data model (generic names)
- `Business`: name, country (regime code), currency, taxId, regionCode, customTaxName, defaultTaxRate, address, email, phone, invoicePrefix, bankName,
  accountNumber, bankCode, paymentId.
- `Customer`: id, name, taxId (empty = unregistered), country (ISO), regionCode (only used for domestic customers when the regime has regions), email, phone, address.
- `Invoice`: id, number, customerId, issueDate, dueDate (ISO `yyyy-mm-dd`), status `draft | unpaid | paid` ("overdue" is derived: unpaid and past due, never
  stored), `regime`, `currency`, `exchangeRate` (home currency per 1 invoice currency), `taxTreatment`, items `{id, description, itemCode, quantity, rate, taxRate}`, notes.
  An invoice snapshots regime, currency, rate and treatment at creation so changing Settings never rewrites it.
- Storage keys prefixed `gstdesk.`; a typed `StorageService` over Preferences (JSON, drops corrupt values).
- `utils/migrate.util.ts`: upgrades records saved with older India-only names (`gstin, stateCode, ifsc, upiId, hsn, gstRate`) to the names above, used on
  load and on backup import.

### Behaviour
- **Invoice numbers**: `<prefix>/<fiscal year short>/<3-digit sequence>`, sequence per fiscal year, e.g. `INV/26-27/001` (April year) or `INV/2026/001` (calendar year).
  Default due date = issue date + 15 days; payment-term chips Net 7 / 15 / 30 / 45.
- **GSTIN**: 15 characters, shape `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$`, 15th character is a base-36 Luhn-style checksum of the first 14
  (weights 1,2,1,2…; add `floor(p/36) + p%36`; check = `(36 - sum%36) % 36`). A valid GSTIN fills the state from its first two digits.
  Other tax IDs use a loose shape check; blank always means unregistered.
- **Money**: `round2` = `Math.round((v + Number.EPSILON) * 100) / 100`. Cached `Intl.NumberFormat` helpers `formatMoney`, `formatMoneyWhole`, `formatAmount`,
  `formatMoneyCompact` (rupees: `₹2.5L`, `₹3.2Cr`, `K`; others via Intl compact). `amountInWords(value, currency)`: lakh/crore for INR, thousand/million/billion otherwise,
  with currency words (Rupees/Paise, US Dollars/Cents, Pounds/Pence…).
- **Export switch**: choosing a customer outside the regime's `domesticCountries` turns tax treatment to exempt automatically (one tap to undo).
- **Dashboard** (home currency; each invoice converted with its exchange rate; drafts never count; headline figures for the current fiscal year):
  billed, collected (paid), outstanding (unpaid + overdue), overdue amount and count, tax collected by label, last 6 months billed vs collected,
  month-over-month %, top 4 customers by share.
- **Native-shell bridge** (so desktop is a drop-in later): `NativeShellService` listens for the window events `gstdesk-navigate` and `gstdesk-print` and the
  Capacitor App `appUrlOpen` event (`gstdesk://invoices/new`), and navigates only to the whitelist `/dashboard /invoices /invoices/new /customers /settings`.
  On the web it does nothing. Editor shortcuts: Cmd/Ctrl+S saves.

### Screens and routes
Lazy standalone routes: `/dashboard`, `/invoices`, `/invoices/new`, `/invoices/:id` (route param bound with `withComponentInputBinding`), `/customers`, `/settings`;
`''` and `**` redirect to `/dashboard`. Layout: `ion-split-pane` with a dark sidebar (brand, "New invoice", nav, business chip with tax ID) that becomes a hamburger menu on phones.
1. **Dashboard**: hero card with billed + progress meter, KPI cards (outstanding, overdue, tax collected), billed-vs-collected bar chart, tax-split donut, recent
   invoices, top customers. Empty state with a call to action.
2. **Invoices**: status segments with counts, search (number, customer, tax ID), per-row issued/due dates, total in its own currency, tax amount or "No tax",
   status badge, mark-paid button, home-currency total for what is on screen.
3. **Invoice editor**: form + live paper preview side by side on wide screens, Edit/Preview toggle on narrow ones. Customer, number (read-only), dates, terms chips,
   currency select and exchange rate (shown only for a foreign currency), exempt switch with a plain-English tax note, line items (item code, qty, rate, tax rate as a select or a
   number input depending on the engine), totals with each tax part and round-off, notes. Buttons: Print/PDF, Save draft, Save invoice, Mark paid, Delete (confirm).
   Validation blocks issuing, never drafts.
4. **Customers**: cards, search, add/edit modal (name, country, tax ID, region), delete with confirm.
5. **Settings**: country/tax rules (changing it resets currency, region, default rate, tax ID, bank codes), home currency, tax ID, region, custom tax name, default tax rate,
   address, prefix, bank and payment details (labels from the regime), theme, JSON backup export/import (`version: 2`), load demo data, start fresh.
- **Charts**: hand-written SVG Angular components (bar chart with "nice" axis maximum, donut with segments) driven by signals, taking `currency` and `locale` inputs. No chart library.
- **Invoice paper**: header with seller and tax ID, document title, number/dates, billed-to with the right tax-ID label, place of supply (India) or "Supply to", items table
  (item-code column only when needed), per-rate tax summary, totals, amount in words, exchange-rate note, bank details, notes, "computer-generated" footer, PAID stamp.

### Printing (do exactly this)
`printElement(source)` in `utils/print.util.ts` clones the invoice paper into a `#print-root` div appended to `<body>`, adds the class `is-printing` on `<html>`, calls
`window.print()`, and removes both on `afterprint`. `global.scss` has `@page { size: A4; margin: 0 }` and, under `html.is-printing`, hides every `body > *` except `#print-root`
and forces exact colours. **Never** use `body * { visibility: hidden }`: Ionic's shadow-DOM scroller prints a blank page.

### Demo data (first launch, deterministic)
Seller "Aarav Digital Studio", Pune (state 27), India. 8 Indian customers (one unregistered, several states, Maharashtra customers twice as likely), 6 months of invoices
(3 to 5 per month, older ones almost all paid, recent ones mixed unpaid/overdue), one draft dated today. GSTINs are fictional but generated with the real checksum function.

### Tests and definition of done
- Specs for: tax engines (India split and IGST, odd paisa, VAT, US manual rate, exempt, no whole-dollar rounding on exports), regimes (unique codes, fallbacks, tax-ID validation),
  money formats and amount in words, GSTIN, dates (April, July and calendar fiscal years), dashboard (FY, currency conversion, tax breakdown), migration, print util, seed, every
  service, every page and the invoice paper for IN / export / US / GB.
- `npm run verify` is green.
- Real Chrome "Save as PDF" shows a full one-page invoice for: Indian same-state (CGST+SGST), inter-state (IGST), an export in USD (no tax, no round-off, LUT note),
  a US sales-tax invoice and a UK VAT invoice. Check by actually generating the PDFs, not by eye on the screen.
- README says rates and wording are defaults, not tax advice.

---

## PROMPT 2: Convert it to an Electron desktop app

Using the finished GSTDesk web app, add a desktop build with the **Capawesome Capacitor Electron platform**. Do not change app features.
Use the official docs: https://capawesome.io/docs/sdks/capacitor/electron/

1. Install: `npm install @capawesome/capacitor-electron`, then `npx cap add @capawesome/capacitor-electron`, then `cd electron && npm install && cd ..`.
   **Always use the full package name** with the Capacitor CLI (`npx cap sync electron` targets a different package and silently does nothing).
2. In `electron/package.json` set `productName` to `GSTDesk` (it names the user-data folder; changing it later orphans saved data). Commit `electron/package-lock.json`.
3. Root `package.json` scripts:
   `"electron:sync": "ng build && cap sync @capawesome/capacitor-electron"`, `"electron:run": "npm run electron:sync && cap run @capawesome/capacitor-electron"`,
   `"electron:pack": "npm run electron:sync && cd electron && npm run pack"`, and `"postinstall": "cd electron && npm ci && cd .."` so a fresh clone installs the Electron side.
4. `capacitor.config.ts`: `appId: 'in.gstdesk.app'`, `appName: 'GSTDesk'`, `webDir: 'www'`. Confirm `optimization.styles.inlineCritical` is `false` in `angular.json`
   (otherwise the stylesheet stays stuck on `media="print"` under Electron's strict CSP).
5. `electron/capacitor.electron.config.ts` with `defineConfig`: window 1280×820 (min 960×640, background `#0b1a16`); `deepLinks: { scheme: 'gstdesk' }`; a small splash
   (`assets/splash.html`, 420×300, minimum 900 ms); an `onWindowCreated` hook that sets a native menu:
   File (New Invoice `CmdOrCtrl+N`, Print / Save as PDF `CmdOrCtrl+P`, quit/close), Edit, Go (Dashboard `CmdOrCtrl+1`, Invoices `+2`, Customers `+3`, Settings `CmdOrCtrl+,`), View, Window.
   Menu items talk to the page by dispatching the window events `gstdesk-navigate` (detail = path) and `gstdesk-print` through `webContents.executeJavaScript`. The web app already
   handles them in `NativeShellService`.
6. `electron/electron-builder.config.js`: appId, productName, `mac: { identity: null }` for local builds, `directories.buildResources: 'assets'`, and in `files` keep
   `'assets/**/*'` explicitly (the build-resources folder is not packaged by default, so the splash would be missing in the installed app).
7. Add an app icon (`electron/assets/icon.png`, 1024×1024).
8. Verify: `npm run verify`, `npm run electron:run` (window opens, menu shortcuts work, `open gstdesk://customers` navigates, Print / Save as PDF produces a full invoice), then
   `npm run electron:pack` and open the installer from `electron/dist`.
9. Be honest in the video: an Electron app bundles Chromium and Node (about 80 to 150 MB); mobile-only plugins (status bar, haptics) do nothing on desktop; Preferences, App and
   Clipboard work.

---

## Optional follow-up prompts
1. "Add a new country (Canada: GST/HST/PST by province) as a new `TaxRegime`. Touch no component."
2. "Add CSV export of invoices for the accountant."
3. "Add a recurring-invoice option (monthly) that creates a draft on the due day."
4. "Translate the UI into Hindi with Transloco."
