let timeLeft = 0;
let timerInterval = null;
let isRunning = false;

let domainLimits = {};
let timeSpent = {};
let activeDomain = null;
let domainTimerInterval = null;

// Add after the initial variable declarations
const DAILY_RESET_ALARM = 'dailyReset';

// Initialize daily reset alarm
chrome.runtime.onInstalled.addListener(() => {
  // Set up daily reset alarm
  chrome.alarms.create(DAILY_RESET_ALARM, {
    periodInMinutes: 24 * 60, // 24 hours
    when: getNextMidnight()
  });
});

// Handle daily reset
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === DAILY_RESET_ALARM) {
    resetDailyState();
  }
});

function getNextMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime();
}

function resetDailyState() {
  // Reset time spent for all domains
  timeSpent = {};
  
  // Clear domain permissions for the new day
  chrome.storage.local.get(['domainPermissions'], (data) => {
    const permissions = data.domainPermissions || {};
    Object.keys(permissions).forEach(domain => {
      permissions[domain] = undefined; // Reset to prompt again
    });
    chrome.storage.local.set({ 
      domainPermissions: permissions,
      timeSpent: timeSpent
    });
  });

  // Stop any active timers
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  if (domainTimerInterval) {
    clearInterval(domainTimerInterval);
    domainTimerInterval = null;
  }
}

// --- TIMER MESSAGE HANDLER ---

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.command === "start") {
    if (isRunning) return;
    isRunning = true;

    chrome.storage.local.get("customTime", (data) => {
      if (timeLeft <= 0) timeLeft = data.customTime || 1500;

      if (timerInterval) clearInterval(timerInterval);

      timerInterval = setInterval(() => {
        timeLeft--;
        if (timeLeft <= 0) {
          clearInterval(timerInterval);
          timerInterval = null;
          isRunning = false;

          chrome.runtime.sendMessage({ command: "playSound" });
          chrome.notifications.create({
            type: "basic",
            iconUrl: "icons/icon128.png",
            title: "Focus Session Complete!",
            message: "Time's up!",
            priority: 2,
          });
        }
      }, 1000);
    });
  }

  if (msg.command === "pause") {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
      isRunning = false;
    }
  }

  if (msg.command === "reset") {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
    timeLeft = 0;
    isRunning = false;
  }

  if (msg.command === "getTime") {
    sendResponse({ timeLeft, isRunning });
  }

  if (msg.command === "getDomainTimes") {
    sendResponse(timeSpent);
  }

  if (msg.command === "domainPermissionResponse") {
    const { domain, permission, timeLimit } = msg;

    chrome.storage.local.get(["domainPermissions", "domainLimits"], (data) => {
      let permissions = data.domainPermissions || {};
      let limits = data.domainLimits || {};

      permissions[domain] = permission;
      if (permission === "accepted" && timeLimit) {
        limits[domain] = timeLimit;
      }

      chrome.storage.local.set(
        { domainPermissions: permissions, domainLimits: limits, activeDomain: domain },
        () => {
          if (permission === "accepted") {
            chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
              if (tabs.length > 0) {
                chrome.tabs.update(tabs[0].id, {active: true}, () => {
                  stopDomainTracking();
                  startDomainTracking(domain, true);
                });
              }
            });
          }
        }
      );
    });
  } else if (msg.command === "unblockDomain") {
    unblockDomain(msg.domain);
  }
});

// --- DOMAIN TRACKING LOGIC ---

function getDomainFromUrl(url) {
  try {
    if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('about:') || url.startsWith('edge://') || url.startsWith('file://')) {
      return null;
    }
    const domain = new URL(url).hostname;
    return domain.replace("www.", "");
  } catch (e) {
    return null;
  }
}

function startDomainTracking(domain, forceFirstTick = false) {
  if (!domainLimits[domain]) return;

  chrome.storage.local.get(['timeSpent'], (data) => {
    timeSpent = data.timeSpent || {};
    if (!timeSpent[domain]) timeSpent[domain] = 0;

    if (domainTimerInterval) clearInterval(domainTimerInterval);

    let firstTick = forceFirstTick;
    domainTimerInterval = setInterval(() => {
      if (firstTick) {
        console.log('First tick for', domain);
        timeSpent[domain]++;
        chrome.storage.local.set({ timeSpent });
        firstTick = false;
      } else {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
          if (tabs.length === 0) return;
          const tabDomain = getDomainFromUrl(tabs[0].url);
          if (tabDomain !== domain) return;
          timeSpent[domain]++;
          chrome.storage.local.set({ timeSpent });
          if (timeSpent[domain] >= domainLimits[domain]) {
            clearInterval(domainTimerInterval);
            domainTimerInterval = null;
            blockDomain(domain);
          }
        });
        return;
      }
      if (timeSpent[domain] >= domainLimits[domain]) {
        clearInterval(domainTimerInterval);
        domainTimerInterval = null;
        blockDomain(domain);
      }
    }, 1000);
  });
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
      if (!tabDomain) return; // skip chrome:// etc.
      if (tabDomain === domain) {
        chrome.tabs.remove(tab.id);
      }
    });
  });

  // Set permission to 'rejected' so it appears in Blocked Domains
  chrome.storage.local.get(['domainPermissions'], (data) => {
    let permissions = data.domainPermissions || {};
    permissions[domain] = "rejected";
    chrome.storage.local.set({ domainPermissions: permissions });
  });

  chrome.notifications.create({
    type: "basic",
    iconUrl: "icons/icon128.png",
    title: "Time Limit Exceeded",
    message: `${domain} has been blocked for today.`,
    priority: 2,
  });
}

// On tab activated
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    const domain = getDomainFromUrl(tab.url);
    if (!domain) return; // skip chrome:// etc.
    if (domain !== activeDomain) {
      stopDomainTracking();
      activeDomain = domain;
      chrome.storage.local.set({activeDomain: domain});
      checkDomainAllowed(domain);
    }
  });
});

// On tab updated
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.active && changeInfo.status === "complete") {
    const domain = getDomainFromUrl(tab.url);
    if (!domain) return; // skip chrome:// etc.
    if (domain !== activeDomain) {
      stopDomainTracking();
      activeDomain = domain;
      chrome.storage.local.set({activeDomain: domain});
      checkDomainAllowed(domain);
    }
  }
});

// Also handle window focus changes
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) return;
  chrome.windows.get(windowId, {populate: true}, (window) => {
    if (!window || !window.tabs) return;
    const activeTab = window.tabs.find(tab => tab.active);
    if (activeTab) {
      const domain = getDomainFromUrl(activeTab.url);
      if (!domain) return;
      if (domain !== activeDomain) {
        stopDomainTracking();
        activeDomain = domain;
        chrome.storage.local.set({activeDomain: domain});
        checkDomainAllowed(domain);
      }
    }
  });
});

// Check domain permission and prompt if unknown
function checkDomainAllowed(domain) {
  if (!domain) return;

  chrome.storage.local.get(["domainPermissions", "domainLimits"], (data) => {
    let permissions = data.domainPermissions || {};
    domainLimits = data.domainLimits || {};

    if (permissions[domain] === "accepted") {
      if (!domainLimits[domain]) {
        // No time limit set, default to unlimited (or set a default)
        domainLimits[domain] = 300; // default 5 minutes if needed
        chrome.storage.local.set({ domainLimits });
      }
      stopDomainTracking();
      startDomainTracking(domain, true);
    } else if (permissions[domain] === "rejected") {
      // Don't block, just don't track
      return;
    } else {
      // Permission unknown => ask user
      promptDomainPermission(domain);
    }
  });
}

// Inject content script to prompt user for domain permission
function promptDomainPermission(domain) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length === 0) return;

    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      files: ["prompt.js"],
    }).then(() => {
      chrome.tabs.sendMessage(tabs[0].id, { command: "promptDomain", domain });
    });
  });
}

// Add unblock functionality
function unblockDomain(domain) {
  chrome.storage.local.get(["domainPermissions"], (data) => {
    let permissions = data.domainPermissions || {};
    permissions[domain] = "accepted"; // Reset to accepted
    chrome.storage.local.set({ domainPermissions: permissions }, () => {
      // Start tracking again
      startDomainTracking(domain);
    });
  });
}
