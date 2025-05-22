# Focus Guardian Chrome Extension

Focus Guardian is a productivity-focused Chrome extension that helps you manage your time on distracting websites. It allows you to set daily time limits for specific domains, tracks your usage, and blocks access once your limit is reached. It also includes a Pomodoro timer for general productivity.

## Features

- **Per-Domain Time Tracking:** Tracks time spent on each website (domain) you visit.
- **Flexible Time Limits:** Set daily time limits for each domain in minutes, seconds, or hours (e.g., `10m`, `30s`, `1h`).
- **Automatic Blocking:** Once your daily limit for a domain is reached, all tabs for that domain are closed and blocked for the rest of the day.
- **Prompt on First Visit:** When you visit a new domain for the first time each day, you are prompted to set a time limit or ignore tracking for that domain.
- **Daily Reset:** All limits and decisions reset at the start of each new day.
- **Pomodoro Timer:** Built-in Pomodoro timer for general productivity, independent of domain tracking.
- **Popup UI:** View tracked and blocked domains, unblock domains, and control your Pomodoro timer from the extension popup.
- **Persistent Storage:** All data is stored locally and resets daily.

## Installation

1. Clone or download this repository to your computer.
2. Open Chrome and go to `chrome://extensions/`.
3. Enable "Developer mode" (top right).
4. Click "Load unpacked" and select the extension directory.
5. The Focus Guardian icon will appear in your Chrome toolbar.

## Usage

1. **Set Domain Limits:**
   - Visit any website. On first visit each day, you'll be prompted to allow tracking and set a time limit (e.g., `5m` for 5 minutes).
   - If you click "Cancel," the domain will be ignored for the day.
2. **Timer Tracking:**
   - The timer for a domain only counts when its tab is active.
   - When your time is up, all tabs for that domain are closed and the domain is blocked for the rest of the day.
3. **Popup Controls:**
   - Click the extension icon to view your Pomodoro timer, tracked domains, and blocked domains.
   - Unblock any domain from the popup if needed.
4. **Daily Reset:**
   - All tracking and limits reset automatically at midnight.

## Known Issues

- **Timer Start Delay:** The timer for a newly accepted domain may only start after you switch tabs and return, due to Chrome event sync limitations. This will be addressed in a future update (likely by moving timer logic to a content script).
- **chrome:// and Internal URLs:** The extension does not track or block Chrome internal pages.

## Contributing

Pull requests and suggestions are welcome! Please open an issue to discuss any major changes.

---

Made with ❤️ by Harsh Chaturvedi


