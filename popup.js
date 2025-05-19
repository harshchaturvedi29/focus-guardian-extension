document.addEventListener("DOMContentLoaded", () => {
  const timerDisplay = document.getElementById("timer");
  const startButton = document.getElementById("startBtn");
  const resetButton = document.getElementById("resetBtn");

  function formatTime(seconds) {
    const m = String(Math.floor(seconds / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  function updateTimer() {
    chrome.runtime.sendMessage({ command: "getTime" }, (response) => {
      if (response) {
        timerDisplay.textContent = formatTime(response.timeLeft);
      }
    });
  }

  setInterval(updateTimer, 1000);
  updateTimer();

  startButton.addEventListener("click", () => {
    chrome.runtime.sendMessage({ command: "start" });
  });

  resetButton.addEventListener("click", () => {
    chrome.runtime.sendMessage({ command: "reset" });
  });

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.command === "playSound") {
      const audio = new Audio("sound.mp3");
      audio.play();
    }
  });
});
