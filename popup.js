document.addEventListener("DOMContentLoaded", () => {
  const timerDisplay = document.getElementById("timer");
  const startButton = document.getElementById("startBtn");
  const resetButton = document.getElementById("resetBtn");
  const customTimeInput = document.getElementById("customTime");

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
    const minutes = parseInt(customTimeInput.value);
    if (!isNaN(minutes) && minutes > 0) {
      chrome.storage.local.set({ customTime: minutes * 60 }, () => {
        chrome.runtime.sendMessage({ command: "start" });
      });
    } else {
      alert("Please enter a valid number of minutes.");
    }
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
