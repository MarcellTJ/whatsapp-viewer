# Contact Ledger
Open dist/index.html in a modern browser. Import one or more CSV files with date,time,number columns (optional header). Dates accept DD-MM-YYYY, DD/MM/YYYY, or YYYY-MM-DD. Original log times are used.
Data stays in localStorage on the current browser and origin. Preserve original CSV files. Re-importing skips matching contact-and-timestamp rows; two genuine events with the same contact and exact timestamp cannot be distinguished by this format.
Numbers are grouped after removing spacing, punctuation, and leading + / 00. Local 08 and international 628 formats remain distinct because the country is not supplied. Contact names are retained as shown.
The CSV does not identify calls versus messages. Counts and history therefore represent logged interactions.
This standalone HTML/CSS/JavaScript module can be integrated into a larger app later. It does not capture WhatsApp notifications or sync OneDrive automatically.
