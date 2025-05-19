let timerDuration = 15; // Default 25 minutes
let timeLeft = timerDuration;
let timerRunning = false;
let timerInterval = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.command === "start") {
    if (!timerRunning) {
      timerRunning = true;
      timerInterval = setInterval(() => {
        timeLeft--;
        chrome.storage.local.set({ timeLeft });

        if (timeLeft <= 0) {
          clearInterval(timerInterval);
          timerRunning = false;
          timeLeft = timerDuration;

          // Notify user
          chrome.notifications.create({
            type: "basic",
            iconUrl: "icons/icon128.png",
            title: "Focus Guardian",
            message: "Pomodoro complete! Take a break!",
            priority: 2
          });

          // Optional: play sound
          chrome.runtime.sendMessage({ command: "playSound" });
        }
      }, 1000);
    }
  } else if (request.command === "reset") {
    clearInterval(timerInterval);
    timerRunning = false;
    timeLeft = timerDuration;
    chrome.storage.local.set({ timeLeft });
  } else if (request.command === "getTime") {
    sendResponse({ timeLeft, timerRunning });
  }
});
