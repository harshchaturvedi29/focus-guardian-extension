let timeLeft = 0;
let timerInterval = null;

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.command === "start") {
    chrome.storage.local.get("customTime", (data) => {
      timeLeft = data.customTime || 1500; // default: 25 min

      if (timerInterval) clearInterval(timerInterval);

      timerInterval = setInterval(() => {
        timeLeft--;

        if (timeLeft <= 0) {
          clearInterval(timerInterval);
          timerInterval = null;

          chrome.runtime.sendMessage({ command: "playSound" });

          chrome.notifications.create({
            type: "basic",
            iconUrl: "icons/icon128.png",
            title: "Focus Session Complete!",
            message: "Time's up! 🎯",
            priority: 2
          });
        }
      }, 1000);
    });
  }

  if (msg.command === "reset") {
    clearInterval(timerInterval);
    timerInterval = null;
    timeLeft = 0;
  }

  if (msg.command === "getTime") {
    sendResponse({ timeLeft });
  }
});
