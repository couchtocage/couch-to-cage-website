# Weight history edit hotfix

- Adds a visible EDIT button to every fighter weigh-in history row, including older entries.
- Editing happens inline with SAVE/CANCEL controls.
- Correcting the latest weigh-in also updates the fighter current-weight card and last-updated timestamp.
- Correcting an older weigh-in preserves the current-weight card.
- A correction clears any invalid flag/admin correction comment for that entry.
- Fighter portal JS/HTML are served with no-cache headers during this release to prevent stale mobile browser code.
