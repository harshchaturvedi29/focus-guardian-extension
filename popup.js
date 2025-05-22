document.addEventListener("DOMContentLoaded", () => {
  let timerDisplay = document.getElementById("timer");
  let startPauseBtn = document.getElementById("startPauseBtn");
  let resetBtn = document.getElementById("resetBtn");
  let customTimeInput = document.getElementById("customTime");
  let domainInfo = document.getElementById("domainInfo");
  let domainProgress = document.querySelector("#domainProgress .progress");
  let domainsList = document.getElementById("domains");
  let blockedList = document.getElementById("blockedList");

  let isRunning = false;

  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  }

  function updateTimerDisplay(timeLeft) {
    timerDisplay.textContent = formatTime(timeLeft);
  }

  function updateDomainDisplay(domain, timeSpent, limit) {
    if (!domain) {
      domainInfo.textContent = "No active domain";
      domainProgress.style.width = "0%";
      return;
    }

    const minutes = Math.floor(timeSpent / 60);
    const seconds = timeSpent % 60;
    const timeString = `${minutes}m ${seconds}s`;
    const percentage = Math.min((timeSpent / limit) * 100, 100);

    domainInfo.textContent = `${domain}: ${timeString} / ${Math.floor(limit / 60)}m`;
    domainProgress.style.width = `${percentage}%`;
  }

  function updateDomainsList(timeSpent, limits, permissions) {
    domainsList.innerHTML = "";
    blockedList.innerHTML = "";

    Object.entries(permissions || {}).forEach(([domain, permission]) => {
      const time = timeSpent[domain] || 0;
      const limit = limits[domain] || 0;

      // Only show if limit > 0 and permission is accepted and limit is not absurdly large
      if (permission === "accepted" && limit > 0 && limit < 24 * 3600 * 100) { // less than 100 days
        const minutes = Math.floor(time / 60);
        const seconds = time % 60;
        const limitMinutes = Math.floor(limit / 60);
        const limitSeconds = limit % 60;
        const domainItem = document.createElement("div");
        domainItem.className = "domain-item";
        domainItem.innerHTML = `
          <span class="domain-name">${domain}</span>
          <span class="domain-time">${minutes}m ${seconds}s / ${limitMinutes}m ${limitSeconds}s</span>
        `;
        domainsList.appendChild(domainItem);
      } else if (permission === "rejected") {
        // Blocked domains
        const blockedItem = document.createElement("div");
        blockedItem.className = "domain-item blocked";
        blockedItem.innerHTML = `
          <span class="domain-name">${domain}</span>
          <button class="unblock-btn" data-domain="${domain}">Unblock</button>
        `;
        blockedList.appendChild(blockedItem);
      }
    });

    // Add unblock button event listeners
    document.querySelectorAll('.unblock-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const domain = e.target.dataset.domain;
        chrome.runtime.sendMessage({ command: "unblockDomain", domain });
        setTimeout(initializePopup, 500);
      });
    });
  }

  function initializePopup() {
    chrome.runtime.sendMessage({ command: "getTime" }, (response) => {
      if (response) {
        updateTimerDisplay(response.timeLeft);
        isRunning = response.isRunning;
        startPauseBtn.textContent = isRunning ? "Pause" : "Start";
      }
    });

    // Show current active domain
    chrome.storage.local.get("activeDomain", (data) => {
      const activeDomain = data.activeDomain;
      if (activeDomain) {
        domainInfo.textContent = activeDomain;
      } else {
        domainInfo.textContent = "No active domain";
      }
    });

    chrome.runtime.sendMessage({ command: "getDomainTimes" }, (timeSpent) => {
      chrome.storage.local.get(["domainLimits", "activeDomain", "domainPermissions"], (data) => {
        const limits = data.domainLimits || {};
        const permissions = data.domainPermissions || {};
        updateDomainsList(timeSpent, limits, permissions);
      });
    });

    chrome.storage.local.get("customTime", (data) => {
      if (data.customTime) {
        customTimeInput.value = Math.floor(data.customTime / 60);
      }
    });
  }

  setInterval(initializePopup, 1000);
  initializePopup();

  startPauseBtn.addEventListener("click", () => {
    const command = startPauseBtn.textContent.toLowerCase();
    chrome.runtime.sendMessage({ command });
    startPauseBtn.textContent = command === "start" ? "Pause" : "Start";
  });

  resetBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ command: "reset" });
    startPauseBtn.textContent = "Start";
    updateTimerDisplay(0);
  });

  customTimeInput.addEventListener("change", () => {
    const minutes = parseInt(customTimeInput.value);
    if (minutes > 0) {
      const seconds = minutes * 60;
      chrome.storage.local.set({ customTime: seconds });
      chrome.runtime.sendMessage({ command: "reset" });
      updateTimerDisplay(seconds);
    }
  });

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.command === "playSound") {
      const audio = new Audio("sound.mp3");
      audio.play().catch(error => {
        console.error("Error playing sound:", error);
        // Fallback to a simple beep if sound file fails
        const context = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = context.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, context.currentTime);
        oscillator.connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + 0.5);
      });
    } else if (msg.command === "updateTimer") {
      updateTimerDisplay(msg.timeLeft);
    } else if (msg.command === "updateDomain") {
      updateDomainDisplay(msg.domain, msg.timeSpent, msg.limit);
    }
  });
});
