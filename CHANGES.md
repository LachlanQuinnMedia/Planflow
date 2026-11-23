# QPlan changes, 23 November 2026

Built from HPC Planning's handwritten notes (3 November 2026) and Lachlan's answers to the open questions. Numbers match the breakdown agreed on 4 and 23 November.

## What changed, item by item

### 1. Public holidays and business days
- DA stage deadlines are now counted in business days. Weekends, Queensland public holidays, the council's show holiday and 26 December to 1 January are skipped.
- Where: a job's **DA Stages** tab. Start a stage (or set its start date) and the end date fills in by itself. Each stage shows "X business days remaining" and lists the holidays it skipped.
- The end date can still be typed by hand. QPlan then shows what the calculated date would be, with a "Use calculated date" link.
- Stopping the clock for N business days pushes the end date out by N business days.
- Dashboard deadline badges now count business days as well.
- The Calendar marks public holidays (and the Brisbane and Gold Coast show days) in red in the week header.
- Holiday dates loaded: Queensland public holidays for 2026, 2027 and 2028. Show holidays for 2026 and 2027 for Brisbane, Gold Coast, Logan, Moreton Bay, Redland, Scenic Rim, Lockyer Valley, Somerset, Ipswich and Noosa.
- Source: Queensland Government public holiday and show holiday lists, and the Planning Act 2016 definition of business day. Checked 23 November 2026.
- Code: `src/businessDays.js`. Add each new year's dates there once the Government publishes them.

### 2. "Linking issue between"
Not actioned. On hold until HPC says what it was.

### 3. Job folder created when the job is created
- The New Job form has a **Job folder · Microsoft 365** section. Default is "Create a new folder for this job". The folder is created inside the firm's jobs folder and linked to the job when you click Create.
- Other options: link a folder that already exists, or no folder for now.
- One-off setup, directors only: on the New Job form click "Set where new job folders are created" and pick the folder that holds all job folders. Every job after that goes there.
- If a folder with the same name already exists, QPlan links that folder and does not make a duplicate.
- If Microsoft 365 is down or refuses, the job is still saved and a message says to link the folder from the Documents tab.

### 4. More profile colours
- Planners > Edit my profile now offers 24 colours (was 10). A small dot marks colours a teammate already uses.
- Avatars are filled with the chosen colour so people are easy to tell apart.

### 5, 7, 9. Application types
New types in the dropdown on New Job, Edit Job and the Jobs filter:
- CDM · Combined Application
- MC · Minor Change
- OC · Other Change
- PS · Plan Sealing
- PM · Project Management

Code: one list in `src/jobMeta.js` (APP_TYPES). Add or rename types there.

### 6. Generic letterhead
- Templates > Miscellaneous > Letterhead > **Generic Letterhead (blank)**. Also in a job's Generate docs list.
- HPC logo with the Brisbane and Gold Coast details at the top of page one. Nothing below it.
- Copied from the header of HPC's Referral Cover Letter.
- File: `public/templates/Generic_Letterhead.docx`.

### 8, 10. Individual or company clients
- New Job and Edit Job have a "Client is" dropdown: an individual, or a company.
- Company shows a Company name field plus a Contact person (first name, last name, email, phone).
- The company name shows in the job's client details, the job name, the folder name, the summary page and Xero.
- Templates: `{client_name}` is the company for a company client. `{client_first_name}` stays the contact person. New tags available: `{client_company}`, `{contact_name}`, `{client_phone}`, `{app_type_name}`.
- Xero: a company client is invoiced as the company, with the contact person recorded on the Xero contact.

### 11. NSW version
Not built, as instructed.

### 12. Job summary page by link
- On a job, click **Share summary**, then Create summary link, then Copy link.
- Anyone with the link sees a read-only page: client, site, application details, the team with contact details, service stages, DA stages, key dates. No login. They cannot change anything. The page always shows the job as it is now.
- Two tick boxes control what else shows: hours and budget (on by default, includes HPC stage fees) and job notes (off by default).
- "Turn off link" kills the link straight away.

### 13. Prompt to change job in the time tracker
- Opening a job selects it in the time tracker.
- If the timer is already running on a different job, QPlan asks "Switch the timer to this job?". Switch saves the time so far to the old job and starts a new entry on the job you opened. Keep current timer leaves it alone.

### 14. Naming format
- Jobs are named `[Client Name] - [Address] [Job Number]`, for example `Josh Richards - 18 Parma Court, Mount Nathan QLD 4211 2026-003`.
- Used for the job title, dropdowns, the summary page and the OneDrive folder name.
- Existing jobs show in the new format straight away. Their existing OneDrive folders are not renamed.

### 15. Time tracker shows job number and address
- The tracker dropdown and the Log time form read `2026-003 · 18 Parma Court, Mount Nathan QLD 4211`.

## Also fixed along the way
- Generated Word documents were about three times the size of the template. They are now compressed.
- Job search on the Jobs page and Dashboard now also matches company names.

## Things to confirm with HPC
1. **Brisbane address.** The Referral Cover Letter header reads "Level 12, 126 Maragret Street". The letterhead uses "Margaret". HPC's printed notepad shows "Level 11, 127 Creek Street". Ask which address is current. If the templates in QPlan carry the "Maragret" typo, they need correcting too.
2. **Letterhead footer.** The original letter has a grey footer line ("Urban Planning | Urban Design | Project Management | Development Advice"). It was left off because the instruction was the top only. It can be added back in a minute.
3. **Christmas Eve.** It is a public holiday only from 6pm, so QPlan counts 24 December as a business day.
4. **Show holidays outside South East Queensland** are not loaded, and neither are councils where the show holiday covers only part of the area (Sunshine Coast, Toowoomba, Gympie, Bundaberg). The DA Stages tab says so on those jobs. Adjust the end date by hand there.
5. **What "CDM" stands for.** It is labelled "Combined Application" as written in the notes.
6. **Summary link contents.** Hours, budget and stage fees show by default. Untick "Hours and budget" on any job where the link goes to someone who should not see them.

## Not tested against the real services
The whole change set was tested in a browser against a stand-in database. Two paths need one real run each after deploy:
- Creating a job with "Create a new folder" against the real Microsoft 365 connection.
- Pushing an invoice to Xero for a company client. Do this on a real job only, since Xero is HPC's live file.

## Database and server changes (already applied)
- `jobs`: new columns `company_id`, `client_type`, `client_company`, `share_token`, `share_include_budget`, `share_include_notes`, `share_created_by`, `share_created_at`.
- `msgraph_tokens`: new columns `jobs_drive_id`, `jobs_folder_id`, `jobs_folder_name`, `jobs_folder_path`, `jobs_folder_url`, `jobs_folder_set_by`.
- New database function `get_job_summary(p_token)`: returns one job's summary for a valid share link.
- Edge function `ms-graph` v9: new actions `set_jobs_folder` and `create_folder`. `status` also returns the jobs folder.
- Edge function `xero-auth` v12: `create_contact` accepts a company name.
