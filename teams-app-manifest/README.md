# HelpdeskPro Teams app package

This folder becomes the `.zip` you sideload/publish into Microsoft Teams once
the Azure Bot resource exists (see the Teams tab in Admin → HelpdeskPro for
the full setup walkthrough).

## Steps

1. Replace both `PASTE-YOUR-BOT-APP-ID-HERE` values in `manifest.json` with
   the **Microsoft App ID** from your Azure Bot resource (same value you'll
   enter as "Application (Client) ID" in the admin Teams tab).
2. Add two PNG icons to this folder:
   - `color.png` — 192x192px, full color
   - `outline.png` — 32x32px, transparent background, white/outline only
3. Zip the **contents** of this folder (`manifest.json`, `color.png`,
   `outline.png` — not the folder itself) into `helpdeskpro-teams-app.zip`.
4. In Teams: **Apps → Manage your apps → Upload an app → Upload a custom
   app**, and pick the zip. For org-wide availability instead, upload it via
   the **Teams Admin Center → Manage apps → Upload new app** and publish it.
