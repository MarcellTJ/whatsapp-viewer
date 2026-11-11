# Contact Ledger
Open dist/index.html in a modern browser. Import one or more CSV files with date,time,number columns (optional header). Dates accept DD-MM-YYYY, DD/MM/YYYY, or YYYY-MM-DD. Original log times are used.
Data stays in localStorage on the current browser and origin. Preserve original CSV files. Re-importing skips matching contact-and-timestamp rows; two genuine events with the same contact and exact timestamp cannot be distinguished by this format.
Numbers are grouped after removing spacing, punctuation, and leading + / 00. Local 08 and international 628 formats remain distinct because the country is not supplied. Contact names are retained as shown.
The CSV does not identify calls versus messages. Counts and history therefore represent logged interactions.
This standalone HTML/CSS/JavaScript module can be integrated into a larger app later. It does not capture WhatsApp notifications or sync OneDrive automatically.


## PDF report export
Click Export PDF. Choose all contacts, current search results, or individual contacts. Date limits are inclusive and apply to report counts, first/last timestamps, and activity history.
Use Include all / Exclude all or toggle individual fields. Summary and directory switches control their sections; history requires at least one history field. Phone masking preserves only the final four digits. Contact names are not masked.
Select paper size, orientation, and history order. Continue to PDF opens the browser print dialog; select Save as PDF. Disable browser headers and footers there if desired. No report data is uploaded.
Reports are created from the data currently imported in this browser. No automatic cloud synchronization is included.

## Update the existing GitHub Pages app
Replace the four files in D:/github/WA_Viewer with the files inside WA_Viewer in this ZIP (index.html, style.css, app.js, report.js). Then run in PowerShell:
    cd D:/github
    git add WA_Viewer
    git commit -m "Add configurable PDF report export"
    git push
After GitHub Pages finishes deploying, refresh the viewer. The browser storage key remains unchanged, preserving imported data on the same browser and site address.
