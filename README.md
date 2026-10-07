# Krishna Kuteer Apartment – Maintenance App (Netlify)

Static website. All data is stored in your Google Sheet through Google Apps Script.
`SCRIPT_URL` in `index.html` is set to the new Web app URL.

```
index.html            the app
_headers              security headers (Netlify reads this file)
robots.txt            keeps search engines out
apps-script/Code.gs   backend code (already pasted into your Google Sheet)
```

## Deploy on Netlify (no GitHub needed)
1. Unzip this file so you have a normal folder (index.html directly inside).
2. Go to https://app.netlify.com/drop and log in.
3. Drag the whole folder onto the page. Wait ~30 seconds.
4. Open the link Netlify gives you and sign in.
5. Optional: Site configuration > Change site name.

To update later: Deploys tab > drag the updated folder in again.

## First login
- Admin: `1234` / `987654`
- Residents: flat number / `123456` (e.g. `101`)
Everyone must set a new password on first sign-in.

## If something fails
- Open your /exec URL in an Incognito window. It must say "Krishna Kuteer API is running".
  If not: Apps Script > Deploy > Manage deployments: Web app, Execute as Me, Access Anyone.
- Sheet has no tabs? Run `setup` once in Apps Script.
- Changed Code.gs? Deploy > Manage deployments > Edit > New version.
- Login blocked on the live site? Press F12 > Console. If you see "blocked", delete the
  Content-Security-Policy line in `_headers` and deploy again.
- Edit the `flats` and `users` tabs in the Sheet to match your real flats.
  Do not share the Sheet with residents (it holds login data).

## Update: Maintenance log, Celebrations, Documents
1. Apps Script: paste the new `apps-script/Code.gs`, run `setup` once (adds the `maintenance_log` and `celebrations` tabs), then Deploy > Manage deployments > Edit > New version.
2. Netlify: drag the folder in again.
3. The old fee screen is now called **Payments**. **Maintenance** is the new work log (Sl.No, Date, Details, Status).
4. Documents opens the Drive folder. Share that folder as "Anyone with the link: Viewer" so residents can open it.

## Speed update (IMPORTANT: do both steps)
1. Apps Script: paste the new `apps-script/Code.gs` (replace everything), then Deploy > Manage deployments > Edit > **New version**.
2. Netlify: unzip, then drag the whole folder in again (it now also contains `hero.webp`).

What changed: the backend remembers the Sheet data for 5 minutes and sends the updated data back with every save,
the app shows your last-seen data instantly and refreshes in the background, and the big photo is now a small cached file.

- If you edit the Sheet by hand (flats, users, rates...), changes can take up to 5 minutes to show.
  To see them at once, run `clearCache` in Apps Script.
- Role changes in the `users` tab also take up to 5 minutes to apply to people who are already signed in.

## Animations update
Only `index.html` changed (no new files, no libraries, +~6 KB). Just drag the folder into Netlify again.
- Branded loading splash that shows instantly, before any script runs
- Skeleton placeholders instead of "Loading…"
- Thin progress bar at the top while saving/loading, and a spinner on the button you pressed (also blocks double-taps)
- Pages rise in with a light stagger on tab change; dashboard numbers count up
- Login card fade-in, shake on wrong password, hero photo fades in
- Menu drawer items slide in; toast and password pop-up animate
- Uses only transform/opacity (GPU-friendly) and is switched off automatically for people with "reduce motion" enabled

## Sign-in dropdown
Fixed list (matches the `users` tab): Flat 101, 102, 201, 202, 301, 302, 401, 402, 501, 502, Executive, President, Secretary, Treasurer.
To change it later, edit `IDS` near the top of the script in index.html.

## Committee sign-ins (secretary, treasurer, executive, president)
In Apps Script, run `addCommittee` once (select it in the function list, press Run). It adds any of these IDs that are missing
and prints each starting password in View > Logs. Each person must set their own password on first sign-in.
They then appear in the sign-in dropdown. `executive` can view everything but cannot add or change records (same as `president`, who can also post notices).

## Home screen
Home now opens with a greeting for every login (e.g. "Namaste 🙏, Flat 102" or "Namaste 🙏, President"). Clicking "Krishna Kuteer" (top bar or menu) always returns to Home. Home also shows, today's date, quick-action buttons that jump to Payments, Maintenance, Documents, Notices (plus Expenses and Statement for committee), and the two latest notices.

## New: dashboard, Complaints, Meetings, Voting (IMPORTANT: run setup once)
1. Apps Script: paste the new `apps-script/Code.gs`, then **run `setup` once** (it creates the new tabs: complaints, meetings, polls, votes, status; your existing data is untouched), then Deploy > Manage deployments > Edit > **New version**.
2. Netlify: upload this folder again.

Home: summary cards, quick actions, apartment status (committee taps a tile to change Active / Attention / Maintenance), upcoming events, latest notices, recent activity.
Complaints: everyone can raise one; residents see only their own; committee (admin, treasurer, secretary, president) sees all and updates progress.
Meetings & events: secretary / president / admin add them. Voting: they create polls; every flat votes once; votes are anonymous.

## Print everywhere
Every tab now has a "🖨 Print this page" button (top right). It prints the screen on the Krishna Kuteer letterhead, without buttons or forms. The existing detailed print buttons (statements, payments, expenses, celebrations, notices) are unchanged.

## Print fix (all places)
Printing now happens inside the page itself instead of a hidden frame or pop-up window, so it works on phones (Android/iPhone) as well as computers, and is not blocked by pop-up blockers.
- Every "🖨 Print…" button, every receipt, the monthly/yearly statement and "Print this page" use the same print path.
- "Print this page" now keeps information cards (e.g. "Maintenance per Flat") and only drops entry forms and buttons; it no longer deletes whole cards that contain a form field.
- Admin (ID 1234) is no longer printed as "Flat 1234".
- On a phone, choose "Save as PDF" in the print dialog to get a file you can share.
Only `index.html` changed: drag the folder into Netlify again.

## "You do not have permission to do this" when raising a complaint
1. Apps Script: paste the latest `apps-script/Code.gs` (replace everything), run `setup` once, then **Deploy > Manage deployments > pencil icon > Version: New version > Deploy**. Just saving the file is not enough; the live web app keeps running the old code until a new version is deployed.
2. Run `clearCache` once so the sign-in role is re-read.
3. In the `users` tab the `role` column must be exactly: resident, admin, treasurer, secretary, president or executive (the new code ignores capital letters and spaces).

## Speed update (mobile first)
**1. Apps Script** – paste the new `apps-script/Code.gs` (replace everything), then:
   - run **`installKeepWarm`** once (select it in the function list > Run, allow permissions). This is the biggest speed-up: Google normally puts the script to sleep, making the first tap slow. This wakes it every 5 minutes and keeps the data cached.
   - Deploy > Manage deployments > pencil > **New version** > Deploy. Then run `clearCache` once.
   - (To undo: run `removeKeepWarm`.)
**2. Netlify** – drag the whole folder in again (new files: `sw.js`, `manifest.webmanifest`, `icon-192.png`, `icon-512.png`).

What changed:
- Sign-in sends your data back with the password check, so one full Google round-trip is saved (about 40% faster sign-in in testing).
- The app is cached on the phone (service worker): repeat opens show the screen straight from the phone, even with a weak or no connection. When a new version is uploaded, a "Tap here to refresh" message appears.
- Add to Home Screen now installs it like an app (icon, full screen, no browser bar). Android: menu > Install app. iPhone: Share > Add to Home Screen.
- Lighter on cheap phones: removed the blur effect on the bottom bar and shortened page animations.
- Sheet data is cached for 15 minutes on the server and refreshed every 5 minutes by the keep-warm trigger. Hand edits in the Sheet show within 5 minutes (or run `clearCache`).

## Update: CCTV + Solar Fencing status, rich animations
Only `index.html` (and the `sw.js` version) changed. No Apps Script change and no new Sheet tab needed: the new tiles save to the existing `status` tab automatically the first time a committee member taps them.
- Apartment status now has **CCTV** (panning camera, blinking REC light, red scan beam) and **Solar Fencing** (rotating sun, spark running along the fence). Each tile also has a live pulsing status dot (calm = Active, faster = Attention, fastest = Maintenance).
- New motion: drifting aurora background, flowing header, shimmer on cards, 3D tilt + pointer spotlight on status tiles, button ripples, scroll-reveal, animated progress bars and timeline.
- Fully switched off for people with "reduce motion" enabled. Upload the folder to Netlify again.

## Update: Visitors count, Sponsors, time dropdown
1. Apps Script: paste the new `apps-script/Code.gs`, run `setup` once (adds the `visitors` tab), then Deploy > Manage deployments > Edit > New version.
2. Netlify: drag the folder in again.
3. **Visitors** tab: enter a date and a number. Totals show for today, this week (Mon-Sun), this month and this year, with Daily / Weekly / Monthly / Yearly lists.

## New: E-mail verification + Forgot password (IMPORTANT: 4 steps)
1. Apps Script: paste the new `apps-script/Code.gs` (replace everything), then **run `setup` once** (it adds the `email` and `email_verified` columns to the `users` tab; existing data is untouched).
2. Run **`authorizeMail`** once and click **Allow** (this lets the script send the code e-mails from your Gmail).
3. Deploy > Manage deployments > pencil > **New version** > Deploy.
4. Netlify: drag the folder in again.

How it works
- After signing in (and setting a new password), each person is asked to add their Gmail and enter the 6-digit code mailed to it. The e-mail is saved in the `users` tab and marked `email_verified = yes`. It is **mandatory**: nobody can open the site (the backend also refuses to send data or accept changes) until their email is verified. It is asked only once; after that they go straight in. Later: Change password > "Add / Change recovery e-mail".
- On the sign-in screen: **Forgot password?** > select ID > a 6-digit code is mailed to the verified e-mail > enter code + new password.
- Codes last 10 minutes, 5 wrong tries cancel the code, max 3 codes per hour per ID. Gmail allows about 100 mails/day for a normal account.
- If someone never verified an e-mail: in the `users` tab clear `password_hash` and `salt`, and type a temporary password in `temp_password`.

## New: photos in Complaints + Documents
Run `setup` (adds the `photos` column and the `gallery` tab), run `authorizeMail` again and click Allow (it now also asks for Google Drive), then Deploy > New version. Pictures are saved in a Drive folder "Krishna Kuteer Photos"; the sheet keeps each picture's ID. Residents: up to 3 photos per complaint. President/secretary/admin: upload pictures in Documents; everyone can see them.

## New: login activity log + PDF documents
Run `setup` (creates the `login_log` tab and the new gallery columns), then Deploy > New version. `login_log` shows username, role, login_at, logout_at, last_seen, minutes and device for every sign-in. If someone just closes the app without signing out, logout_at stays blank and minutes = time until their last activity. Passwords are never stored in readable form. President/secretary/admin can upload PDFs (max 3.5 MB) in Documents; everyone can open them.

## Update: photos and PDFs are now stored INSIDE the Google Sheet (no Google Drive needed)
Run `setup` (creates the `file_data` tab), then Deploy > New version. Every photo is auto-compressed on the phone to under 1 MB; PDFs must already be under 1 MB. The file is saved in `file_data` in pieces of 45,000 characters (one file = up to about 30 rows), and the `gallery` / `complaints` rows keep the file's ID. Do not edit or sort the `file_data` tab by hand.

## Update: folders, download buttons, export to Drive
Paste the new Code.gs > run `setup` (adds the `folder` column) > run `exportToDrive` once and click Allow (needs Google Drive permission) > Deploy > New version. `exportToDrive` makes the Drive folder "Krishna Kuteer Apartment Documents" with sub-folders and saves every photo/PDF there. It can be run again any time (it skips files already saved). You can also run it from the sheet menu: Krishna Kuteer > Export all files to Drive (after reopening the sheet).

## Update: e-mail is optional + new uploads also go to Google Drive automatically
1. Apps Script: paste the new `apps-script/Code.gs` (replace everything), run **`authorizeDrive`** once and click **Allow**, then Deploy > Manage deployments > pencil > **New version** > Deploy. Run `clearCache` once.
2. Netlify: drag the folder in again.
- E-mail verification is no longer required. The page has a **Skip for now** button (remembered on that device); people can add an e-mail later from Change password. Without a verified e-mail, "Forgot password" will not work for that ID (the admin resets it in the `users` tab).
- Every new PDF / photo in Documents and every complaint photo is saved to the Drive folder "Krishna Kuteer Apartment Documents" (right category sub-folder) as soon as it is uploaded. Files uploaded earlier: run `exportToDrive` once. Deleting a file in the app does not delete it from Drive.

## Host on Cloudflare Pages from GitHub (free)
1. Create a **private** GitHub repository (this folder holds first-login passwords, so keep it private) and upload every file in this folder to the repo root (`index.html` must be at the top level, not inside a sub-folder).
2. Cloudflare dashboard > Workers & Pages > Create > Pages > Connect to Git > pick the repo.
3. Build settings: Framework preset **None**, Build command **(leave empty)**, Build output directory **/** (or `.`). Save and Deploy.
4. Your site is live at `https://<project-name>.pages.dev`. Every time you commit a change to GitHub, Cloudflare redeploys automatically.
5. `_headers` is read by Cloudflare Pages too (same format as Netlify), so security headers and caching keep working.
6. Optional: Custom domains tab to attach your own domain.

Data note: the website files come from GitHub, but residents' data (logins, payments, notices) still lives in the Google Sheet through Apps Script. A static site cannot safely write to GitHub files.
