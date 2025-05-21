let timeLeft = 0;
let timerInterval = null;

let domainLimits = {
  "youtube.com": 10 // For testing, 10 seconds
};

let timeSpent = {};
let activeDomain = null;
let domainTimerInterval = null;

// ----- ⏱️ GENERAL POMODORO TIMER -----
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.command === "start") {
    chrome.storage.local.get("customTime", (data) => {
      timeLeft = data.customTime || 1500; // default 25 minutes

      if (timerInterval) clearInterval(timerInterval);

      timerInterval = setInterval(() => {
        timeLeft--;

        if (timeLeft <= 0) {
          clearInterval(timerInterval);
          timerInterval = null;

          chrome.runtime.sendMessage({ command: "playSound" }, () => {
            if (chrome.runtime.lastError) {
              console.warn("Popup not open, skipping sound");

              // Optional fallback: Chrome notification
              chrome.notifications.create({
                type: "basic",
                iconUrl: "icons/icon128.png",
                title: "Focus Session Complete!",
                message: "Time's up!",
                priority: 2
              });
            }
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

  if (msg.command === "getDomainTimes") {
    sendResponse(timeSpent);
  }
});

// ----- 🌐 URL-SPECIFIC TIME LIMIT TRACKER -----

function getDomainFromUrl(url) {
  try {
    const domain = new URL(url).hostname;
    return domain.replace("www.", "");
  } catch (e) {
    return null;
  }
}

function startDomainTracking(domain) {
  if (!domainLimits[domain]) return;

  if (!timeSpent[domain]) timeSpent[domain] = 0;

  if (domainTimerInterval) clearInterval(domainTimerInterval);

  domainTimerInterval = setInterval(() => {
    timeSpent[domain]++;
    console.log(`Tracking ${domain}: ${timeSpent[domain]} sec`);

    if (timeSpent[domain] >= domainLimits[domain]) {
      clearInterval(domainTimerInterval);
      domainTimerInterval = null;
      blockDomain(domain);
    }
  }, 1000);
}

function stopDomainTracking() {
  if (domainTimerInterval) {
    clearInterval(domainTimerInterval);
    domainTimerInterval = null;
  }
}

function blockDomain(domain) {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      const tabDomain = getDomainFromUrl(tab.url);
      if (tabDomain === domain) {
        chrome.tabs.remove(tab.id);
      }
    });
  });

  chrome.notifications.create({
    type: "basic",
    iconUrl: "icons/icon128.png",
    title: "Time Limit Exceeded",
    message: `${domain} has been blocked for today.`,
    priority: 2
  });
}

// When active tab changes
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    const domain = getDomainFromUrl(tab.url);
    if (domain !== activeDomain) {
      stopDomainTracking();
      activeDomain = domain;
      startDomainTracking(domain);
    }
  });
});

// When tab URL is updated
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.active && changeInfo.status === "complete") {
    const domain = getDomainFromUrl(tab.url);
    if (domain !== activeDomain) {
      stopDomainTracking();
      activeDomain = domain;
      startDomainTracking(domain);
    }
  }
});
