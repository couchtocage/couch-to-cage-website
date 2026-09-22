# Request button hotfix

- Request Weight Update and Request Bloodwork now show a confirmation prompt before sending.
- Buttons show Sending, Request Sent, or Already Requested feedback.
- The profile status area shows success or the actual server error.
- Update requests automatically opens after a successful request so the new/pending request is visible.
- The Netlify request-create endpoint now reuses an existing pending request of the same type instead of silently creating duplicates.
- No database migration is required for this hotfix.
