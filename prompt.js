chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.command === "promptDomain") {
    const domain = msg.domain;
    if (!domain) return;

    // Check if prompt already shown on this domain in this tab (optional)

    let userResponse = confirm(
      `Do you want to allow time tracking on ${domain}?\nPress OK to allow, Cancel to ignore.`
    );

    if (userResponse) {
      let timeLimitStr = prompt(
        "Set time limit for this domain (e.g., 10m, 30s, 1h, 600). Leave blank for default 5 minutes."
      );
      let timeLimit = parseFlexibleTime(timeLimitStr);
      if (isNaN(timeLimit) || timeLimit <= 0) {
        timeLimit = 300; // default 5 minutes
      }

      chrome.runtime.sendMessage({
        command: "domainPermissionResponse",
        domain,
        permission: "accepted",
        timeLimit,
      });
    } else {
      chrome.runtime.sendMessage({
        command: "domainPermissionResponse",
        domain,
        permission: "rejected",
      });
    }
  }
});

function parseFlexibleTime(input) {
  if (!input) return NaN;
  input = input.trim().toLowerCase();
  let total = 0;
  const regex = /(\d+)([hms]?)/g;
  let match;
  while ((match = regex.exec(input)) !== null) {
    let value = parseInt(match[1], 10);
    let unit = match[2];
    if (unit === "h") total += value * 3600;
    else if (unit === "m") total += value * 60;
    else if (unit === "s" || unit === "") total += value;
  }
  return total;
}
