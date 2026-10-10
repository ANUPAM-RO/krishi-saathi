# Manual QA checklist (pilot readiness)

Run these on at least one low-end Android device (2–3 GB RAM) with network throttled to "slow 3G" for part of the session.

## Onboarding
- [ ] First launch shows the language picker. Pick বাংলা, हिन्दी and English in turn and check that every screen switches.
- [ ] An invalid mobile number shows a clear error.
- [ ] The OTP arrives (or the dev code is shown in dev builds). A wrong OTP shows an error, and requesting again within 30 seconds is blocked.
- [ ] The profile is saved, and the app then leads into Add Farm and Add Crop. Skipping still reaches the dashboard.

## Farms and crops
- [ ] Add a farm in bigha, acre and hectare. GPS capture works, and refusing the GPS permission is handled.
- [ ] Edit and delete a farm. Deleting asks for confirmation.
- [ ] Add a crop sown today, one sown 30 days ago and one with a future sowing date. Check the harvest date preview, the activities generated, the "assumed done" past activities and the PLANNED status.
- [ ] Change the sowing date and check that pending activities move.
- [ ] Mark the crop harvested and check that it moves to the completed list.

## Tasks and notifications
- [ ] Today, upcoming, overdue and completed lists are correct. Complete and undo a task.
- [ ] Notification permission prompt: test both allow and deny.
- [ ] Admin runs `POST /admin/jobs/reminders/run`. The device gets a push in the farmer's language, and tapping it opens the crop.
- [ ] An admin broadcast reaches only the targeted district or language.

## Weather and mandi
- [ ] The weather screen shows current conditions, a 7-day forecast and the last-updated time.
- [ ] Block the network to the weather provider (or stop the API's outbound internet): the stale data warning appears and the app doesn't crash.
- [ ] Mandi prices filter by crop and district and show the date and freshness.

## Expenses and profit
- [ ] Add, edit and delete expenses in each category. The totals match.
- [ ] Every profit figure is labelled as an estimate, with its assumptions visible.
- [ ] With no mandi price and no farmer price, the revenue estimate is shown as unavailable, never as ₹0.

## Offline and error states
- [ ] Turn on airplane mode: the offline banner shows and cached screens still open.
- [ ] Every list has empty, loading and error-with-retry states.

## Security
- [ ] Farmer B can't open farmer A's farm, crop or expense IDs (automated e2e test, spot-check manually).
- [ ] A farmer token gets 403 on `/api/admin/*`.
- [ ] A deactivated farmer is logged out on their next action.

## Admin
- [ ] Create a crop and calendar template and check the preview timeline. A new farmer crop uses the template.
- [ ] CSV import with good and bad rows: the error rows are reported.
- [ ] Publish an advisory with notify on. The audit log shows each change.
