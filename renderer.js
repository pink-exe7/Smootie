// renderer.js
// Main renderer logic for Nook Tray widget

(function () {
  let currentVideoInfo = null;
  let isPlaying = true;
  let currentMode = 1; // 1 = clock mode, 2 = nook mode
  let lastGoodThumbnailUrl = null;
  let lastVideoDetectedAt = 0;
  let lastVideoCheckRequestAt = 0;
  const DEFAULT_ALBUM_ART = "album-art.png";
  const VIDEO_INFO_GRACE_MS = 4000;
  const VIDEO_CHECK_COOLDOWN_MS = 500;

  const DEBUG_LOGS = true;
  function debugLog(...args) {
    if (DEBUG_LOGS) console.log(...args);
  }

  // -------- MODE SWITCHING (M key) --------
  let clockModeEl = null;
  let nookModeEl = null;
  let nookContent = null;

  function initializeModeElements() {
    clockModeEl = document.getElementById("mode-clock");
    nookModeEl = document.getElementById("mode-nook");
    nookContent = document.querySelector(".nook-content");
    debugLog("Mode elements found:", { clockModeEl: !!clockModeEl, nookModeEl: !!nookModeEl, nookContent: !!nookContent });
  }

  function applyMode(mode) {
    currentMode = mode;
    debugLog("Applying mode:", mode);
    if (window.SmootieAPI && window.SmootieAPI.setFocusable) {
      window.SmootieAPI.setFocusable(mode === 3);
    }
    const toolsEl = document.getElementById("mode-tools");
    if (mode === 3) {
      if (clockModeEl) clockModeEl.classList.add("mode-hidden");
      if (nookModeEl) nookModeEl.classList.add("mode-hidden");
      if (toolsEl) toolsEl.classList.remove("mode-hidden");
      debugLog("Switched to Mode 3 (Notes + Timer)");
      return;
    }
    if (toolsEl) toolsEl.classList.add("mode-hidden");

    if (clockModeEl && nookModeEl) {
      if (mode === 1) {
        clockModeEl.classList.remove("mode-hidden");
        nookModeEl.classList.add("mode-hidden");
        debugLog("Switched to Mode 1 (Clock)");
      } else {
        clockModeEl.classList.add("mode-hidden");
        nookModeEl.classList.remove("mode-hidden");
        debugLog("Switched to Mode 2 (Nook)");
        debugLog("Current video info cached:", currentVideoInfo ? currentVideoInfo.title : "none");

        // Update video info immediately if we have it cached
        if (currentVideoInfo) {
          debugLog("Updating video info for Mode 2 from cache:", currentVideoInfo.title);
          updateVideoInfoImmediate(currentVideoInfo);
        } else {
          debugLog("No cached video info, requesting fresh check");
        }

        // Always trigger a fresh video detection when entering Mode 2 (with slight delay)
        // Request multiple times to ensure detection
        if (window.SmootieAPI && window.SmootieAPI.requestVideoCheck) {
          setTimeout(() => {
            debugLog("Requesting fresh video check for Mode 2 (1)");
            window.SmootieAPI.requestVideoCheck();
          }, 100);
          setTimeout(() => {
            debugLog("Requesting fresh video check for Mode 2 (2)");
            window.SmootieAPI.requestVideoCheck();
          }, 300);
          setTimeout(() => {
            debugLog("Requesting fresh video check for Mode 2 (3)");
            window.SmootieAPI.requestVideoCheck();
          }, 600);
        }
      }
    } else {
      // Try to initialize elements again
      initializeModeElements();
      // Retry applying mode
      if (clockModeEl && nookModeEl) {
        applyMode(mode);
      } else {
        console.error("Could not find mode elements!");
      }
    }
  }

  // Wait for DOM to be fully loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initializeModeElements();
      applyMode(1);
    });
  } else {
    // DOM already loaded
    initializeModeElements();
    applyMode(1);
  }

  // Tools button: switch to Mode 3
  document.addEventListener("click", (e) => {
    if (e.target.closest && e.target.closest("#tab-tools")) {
      e.stopPropagation();
      applyMode(3);
    }
  }, true);

  // Smootie tab: switch to Mode 2 (from any mode)
  document.addEventListener("click", (e) => {
    if (e.target.closest && e.target.closest("#tab-nook")) {
      e.stopPropagation();
      applyMode(2);
    }
  }, true);

  // Timer back button: switch to Mode 2
  document.addEventListener("click", (e) => {
    if (e.target.closest && e.target.closest("#timer-back")) {
      e.stopPropagation();
      applyMode(2);
    }
  }, true);

  // Right-click to close app
  document.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    if (window.SmootieAPI && window.SmootieAPI.quitApp) {
      window.SmootieAPI.quitApp();
    }
  });

  // DISABLED: Click on black background to switch to Mode 1 (was causing accidental mode switches)
  // document.addEventListener("click", (e) => {
  //   // Only switch to Mode 1 if we're currently in Mode 2 (nook mode)
  //   if (currentMode !== 2) return;
  //   
  //   // Check if the clicked element or its parents are interactive
  //   const target = e.target;
  //   const interactiveSelectors = [
  //     'button', 
  //     '.music-control-btn', 
  //     '.top-icon', 
  //     '.nook-tab',
  //     '.menu-item',
  //     'input',
  //     'select',
  //     'textarea',
  //     'a',
  //     '[role="button"]',
  //     '.clickable',
  //     '.svg-icon',
  //     '.tab-icon',
  //     'svg',
  //     'path',
  //     '.nook-label',
  //     '.tray-label',
  //     '.song-title',
  //     '.album-label',
  //     '.artist-name',
  //     '.clock-time',
  //     '.clock-date'
  //   ];
  //   
  //   // Check if the clicked element or any of its parents match interactive selectors
  //   let isInteractive = false;
  //   let element = target;
  //   while (element && element !== document.body) {
  //     if (interactiveSelectors.some(selector => element.matches?.(selector))) {
  //       isInteractive = true;
  //       break;
  //     }
  //     element = element.parentElement;
  //   }
  //   
  //   // Only switch to Mode 1 if the click was on a non-interactive element
  //   if (!isInteractive) {
  //     // Check if we're clicking on the actual background (black areas)
  //     const computedStyle = window.getComputedStyle(target);
  //     const backgroundColor = computedStyle.backgroundColor;
  //     
  //     // Switch to Mode 1 if clicking on black/dark background
  //     if (backgroundColor && (backgroundColor === 'rgb(0, 0, 0)' || backgroundColor === '#000000' || backgroundColor.includes('rgb(0, 0, 0)'))) {
  //       applyMode(1);
  //     }
  //   }
  // });

  // Multiple switching options
  window.addEventListener("keydown", (e) => {
    debugLog("Key pressed:", e.key);
    if (e.key === "m" || e.key === "M") {
      debugLog("M key detected, switching mode");
      applyMode(currentMode === 3 ? 1 : currentMode + 1);
    } else if (e.key === " " || e.key === "Spacebar") {
      debugLog("Spacebar detected, switching mode");
      e.preventDefault(); // Prevent page scroll
      applyMode(currentMode === 3 ? 1 : currentMode + 1);
    }
  });

  // Click on clock island to switch to Mode 2 (single click)
  document.addEventListener("click", (e) => {
    if (clockModeEl && clockModeEl.contains(e.target)) {
      debugLog("Clock island clicked, switching to Mode 2");
      e.stopPropagation();
      debugLog("Current mode before switch:", currentMode);
      applyMode(2);
      debugLog("Current mode after switch:", currentMode);
    }
  });

  // Click on nook island background to switch back to Mode 1 (single click)
  function setupNookClickHandler() {
    if (!nookContent) {
      nookContent = document.querySelector(".nook-content");
    }

    if (nookContent) {
      nookContent.addEventListener("click", (e) => {
        if (currentMode === 2) {
          // Check if clicking on interactive elements
          const interactiveSelectors = [
            'button',
            '.music-control-btn',
            '#play-btn',
            '#prev-btn',
            '#next-btn',
            '.album-art',
            '.profile-picture',
            '.calendar-events-icon',
            'input',
            'select',
            'textarea',
            'a',
            '[role="button"]',
            '.clickable'
          ];

          let isInteractive = false;
          let element = e.target;
          while (element && element !== nookContent) {
            if (interactiveSelectors.some(selector => element.matches?.(selector))) {
              isInteractive = true;
              console.log("[Nook Click] Click on interactive element detected:", element);
              break;
            }
            element = element.parentElement;
          }

          // Only switch to Mode 1 if clicking on non-interactive background
          if (!isInteractive) {
            debugLog("Nook content background clicked, switching to Mode 1");
            e.stopPropagation();
            applyMode(1);
          }
        }
      });
    }
  }

  // Click on tools tray (Mode 3) background to switch to Mode 1
  function setupToolsClickHandler() {
    const toolsTray = document.getElementById("mode-tools");
    if (!toolsTray) return;

    toolsTray.addEventListener("click", (e) => {
      if (currentMode === 3) {
        // Check if clicking on interactive elements
        const interactiveSelectors = [
          'button',
          '#notes-pad',
          '.notes-pad',
          '.shape-btn',
          '.timer-val',
          '.timer-preset',
          '.timer-play',
          '.timer-reset',
          '#timer-back',
          'input',
          'select',
          'textarea',
          'a',
          '[role="button"]',
          '.clickable'
        ];

        let isInteractive = false;
        let element = e.target;
        while (element && element !== toolsTray) {
          if (interactiveSelectors.some(selector => element.matches?.(selector))) {
            isInteractive = true;
            console.log("[Tools Click] Click on interactive element detected:", element);
            break;
          }
          element = element.parentElement;
        }

        // Only switch to Mode 1 if clicking on non-interactive background
        if (!isInteractive) {
          debugLog("Tools tray background clicked, switching to Mode 1");
          e.stopPropagation();
          applyMode(1);
        }
      }
    });
  }
  
  // Setup nook click handler after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupNookClickHandler, { once: true });
  } else {
    setupNookClickHandler();
  }

  // Setup tools click handler after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupToolsClickHandler, { once: true });
  } else {
    setupToolsClickHandler();
  }

  // -------- CLOCK (Mode 1) --------
  function updateClock() {
    const timeEl = document.getElementById("clock-time");
    const dateEl = document.getElementById("clock-date");

    if (!timeEl || !dateEl) return;

    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");

    // Format: "11:53:55" (hours:minutes:seconds all together)
    timeEl.textContent = `${hours}:${minutes}:${seconds}`;

    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    // Format: "Fri, 12 Jan" (day name, day number, month abbreviation)
    dateEl.textContent = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]}`;
  }

  updateClock();
  setInterval(updateClock, 1000);

  // Initialize calendar
  function updateCalendar() {
    const now = new Date();
    const monthEl = document.getElementById("calendar-month");
    const weekDatesEl = document.getElementById("calendar-week-dates");
    const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    
    if (monthEl) {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      monthEl.textContent = months[now.getMonth()];
    }
    
    if (weekDatesEl) {
      weekDatesEl.innerHTML = "";
      const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startDate = new Date(todayDate);
      startDate.setDate(todayDate.getDate() - 3);

      for (let i = 0; i < 7; i++) {
        const dateItemEl = document.createElement("div");
        const dateObj = new Date(startDate);
        dateObj.setDate(startDate.getDate() + i);

        const isToday = dateObj.toDateString() === todayDate.toDateString();
        dateItemEl.className = "calendar-date-item" + (isToday ? " today" : "");

        const dayLabelEl = document.createElement("div");
        dayLabelEl.className = "calendar-day-label";
        dayLabelEl.textContent = isToday ? dayLabels[dateObj.getDay()] : dayLabels[dateObj.getDay()].charAt(0);

        const dateNumberEl = document.createElement("div");
        dateNumberEl.className = "calendar-date-number";
        dateNumberEl.textContent = String(dateObj.getDate()).padStart(2, "0");

        dateItemEl.appendChild(dayLabelEl);
        dateItemEl.appendChild(dateNumberEl);
        weekDatesEl.appendChild(dateItemEl);
      }
    }
  }
  updateCalendar();
  setInterval(updateCalendar, 60000); // Update every minute

  // Update video/music information with debouncing
  let updateVideoInfoTimeout = null;
  function updateVideoInfo(videoInfo) {
    // Clear pending update to prevent rapid DOM changes
    if (updateVideoInfoTimeout) {
      clearTimeout(updateVideoInfoTimeout);
    }
    
    updateVideoInfoTimeout = setTimeout(() => {
      updateVideoInfoImmediate(videoInfo);
      updateVideoInfoTimeout = null;
    }, 100); // Debounce DOM updates
  }
  
  function shouldShowVideoInfo() {
    if (!currentVideoInfo) return false;
    return (Date.now() - lastVideoDetectedAt) < VIDEO_INFO_GRACE_MS;
  }

  function requestThrottledVideoCheck() {
    if (!window.SmootieAPI?.requestVideoCheck) return;
    const now = Date.now();
    if (now - lastVideoCheckRequestAt < VIDEO_CHECK_COOLDOWN_MS) {
      return;
    }
    lastVideoCheckRequestAt = now;
    window.SmootieAPI.requestVideoCheck();
  }

  function updateVideoInfoImmediate(videoInfo) {
    const incomingVideo = videoInfo && videoInfo.title && videoInfo.title !== "No video playing";
    debugLog('Received video info:', JSON.stringify(videoInfo, null, 2));
    debugLog('Current mode:', currentMode);

    const songTitleEl = document.getElementById("song-title");
    const albumLabelEl = document.getElementById("album-label");
    const artistNameEl = document.getElementById("artist-name");
    const albumArtEl = document.getElementById("album-art-img");

    // If nothing is playing, show fallback art and mark paused
    if (!incomingVideo) {
      currentVideoInfo = null;
      if (songTitleEl) songTitleEl.textContent = "";
      if (albumLabelEl) albumLabelEl.textContent = "";
      if (artistNameEl) artistNameEl.textContent = "";
      if (albumArtEl) {
        albumArtEl.style.display = "block";
        if (albumArtEl.src !== DEFAULT_ALBUM_ART) {
          optimizedThumbnailLoad(albumArtEl, DEFAULT_ALBUM_ART);
        }
      }
      lastGoodThumbnailUrl = null;
      // Reset to paused state when no video
      logicalPlaybackState = 'paused';
      updatePlaybackState('paused');
      return;
    }

    // Store new video info (playback state comes from main process SMTC updates)
    currentVideoInfo = videoInfo;
    lastVideoDetectedAt = Date.now();
    debugLog('Stored video info in currentVideoInfo:', currentVideoInfo.title);

    // When YouTube video is detected, assume it's playing (YouTube auto-plays)
    // This shows the PAUSE button which is correct for auto-playing videos
    // Do this regardless of current mode
    if (videoInfo.source === "youtube") {
      logicalPlaybackState = 'playing';
      updatePlaybackState('playing');
      debugLog('Set playback state to playing for YouTube video (mode:', currentMode, ')');
    }

    // Show video info if we're in Mode 2 OR if video is recently detected
    // In Mode 2, always show cached info (no grace period check)
    // In Mode 1, only show if recently detected (within grace period)
    const shouldShow = currentMode === 2 ? true : shouldShowVideoInfo();

    if (currentVideoInfo && shouldShow) {
      const displayInfo = currentVideoInfo;
      if (!displayInfo) {
        // Nothing stored yet, fall back to default art
        if (albumArtEl) {
          albumArtEl.src = DEFAULT_ALBUM_ART;
          albumArtEl.style.display = "block";
        }
        return;
      }
      debugLog('Showing video info:', displayInfo.title, 'in mode:', currentMode, 'shouldShow:', shouldShow);
      // Show video info when YouTube video is detected
      if (songTitleEl) {
        songTitleEl.textContent = displayInfo.title;
      }
      
      // Update album label and artist
      if (albumLabelEl) {
        albumLabelEl.textContent = displayInfo.source === "youtube" ? "YouTube" : "Local Video";
      }
      
      if (artistNameEl) {
        if (displayInfo.source === "youtube") {
          artistNameEl.textContent = "";
        } else {
          artistNameEl.textContent = displayInfo.source === "local" ? "Local Video" : "--";
        }
      }
      
      // Update album art (YouTube thumbnail) - always show for YouTube
      if (albumArtEl && displayInfo.source === "youtube") {
        let thumbnailUrl = null;

        // Prefer thumbnail URL provided by the main process (most reliable)
        if (displayInfo.thumbnail) {
          thumbnailUrl = displayInfo.thumbnail;
          debugLog('Using thumbnail from main process:', thumbnailUrl);
        }

        // Next best: build thumbnail from a real videoId (even if it was "detected" initially)
        // Try to extract videoId from title if videoId is "detected"
        if (!thumbnailUrl && displayInfo.videoId && displayInfo.videoId !== "detected" && displayInfo.videoId !== "generated") {
          thumbnailUrl = `https://img.youtube.com/vi/${displayInfo.videoId}/mqdefault.jpg`;
          debugLog('Built thumbnail from videoId:', displayInfo.videoId);
        } else if (!thumbnailUrl && displayInfo.videoId === "detected" && displayInfo.title) {
          // If videoId is "detected", try harder to extract from title
          const titlePatterns = [
            /watch\?v=([a-zA-Z0-9_-]{11})/i,
            /youtu\.be\/([a-zA-Z0-9_-]{11})/i,
            /v=([a-zA-Z0-9_-]{11})/i,
            /\b([a-zA-Z0-9_-]{11})\b/
          ];
          
          for (const pattern of titlePatterns) {
            const match = displayInfo.title.match(pattern);
            if (match && match[1] && match[1].length === 11) {
              thumbnailUrl = `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`;
              debugLog('Extracted video ID from title (videoId was "detected"):', match[1]);
              break;
            }
          }
        }

        // Next: try to extract the videoId from the URL (handle undefined)
        if (!thumbnailUrl && displayInfo.url && displayInfo.url !== undefined && displayInfo.url !== "") {
          const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
            /[?&]v=([a-zA-Z0-9_-]{11})/,
            /\/embed\/([a-zA-Z0-9_-]{11})/,
            /youtu\.be\/([a-zA-Z0-9_-]{11})/
          ];

          for (const pattern of patterns) {
            const match = displayInfo.url.match(pattern);
            if (match && match[1] && match[1].length === 11) {
              thumbnailUrl = `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`;
              debugLog('Extracted video ID from url:', match[1]);
              break;
            }
          }
        }

        // If we still don't have a thumbnail URL, try to request it via API if available
        if (!thumbnailUrl && displayInfo.title) {
          debugLog('No thumbnail URL found, requesting video check to trigger API resolution');
          requestThrottledVideoCheck();
        }

        // If we still don't have a thumbnail, keep showing the last good one to avoid flicker
        if (!thumbnailUrl && lastGoodThumbnailUrl) {
          thumbnailUrl = lastGoodThumbnailUrl;
        }
        
        // Always display the album art for YouTube videos
        albumArtEl.style.display = "block";
        
        if (thumbnailUrl) {
          if (albumArtEl.src !== thumbnailUrl) {
            optimizedThumbnailLoad(albumArtEl, thumbnailUrl);
          }
          debugLog('Setting album art src to:', thumbnailUrl);

          if (thumbnailUrl.startsWith("http")) {
            lastGoodThumbnailUrl = thumbnailUrl;
          }
          // Set up error handler to try different thumbnail qualities if one fails
          albumArtEl.onerror = function() {
            const currentSrc = this.src;
            if (currentSrc.includes('/mqdefault.jpg')) {
              // Try higher quality first
              this.src = currentSrc.replace('/mqdefault.jpg', '/maxresdefault.jpg');
              this.onerror = function() {
                this.src = currentSrc.replace('/mqdefault.jpg', '/hqdefault.jpg');
                this.onerror = function() {
                  this.src = currentSrc.replace('/mqdefault.jpg', '/default.jpg');
                  this.onerror = function() {
                    // Final fallback: show placeholder
                    this.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' fill='%23333'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999' font-family='sans-serif' font-size='12'%3EYouTube%3C/text%3E%3C/svg%3E";
                  };
                };
              };
            } else {
              // Already tried all qualities, show placeholder
              this.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' fill='%23333'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999' font-family='sans-serif' font-size='12'%3EYouTube%3C/text%3E%3C/svg%3E";
            }
          };
        } else {
          // No thumbnail URL found - show placeholder but keep trying
          albumArtEl.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' fill='%23333'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999' font-family='sans-serif' font-size='12'%3EYouTube%3C/text%3E%3C/svg%3E";
          albumArtEl.onerror = null; // Clear error handler for placeholder
          debugLog('No thumbnail URL found for YouTube video, showing placeholder');
        }
      }
    } else {
      currentVideoInfo = null;
      debugLog('Hiding all video info');
      // No video playing - hide all video info completely
      if (songTitleEl) {
        songTitleEl.textContent = "";
      }
      if (albumLabelEl) {
        albumLabelEl.textContent = "";
      }
      if (artistNameEl) {
        artistNameEl.textContent = "";
      }
      if (albumArtEl) {
        albumArtEl.src = DEFAULT_ALBUM_ART;
        albumArtEl.style.display = "block";
      }
      lastGoodThumbnailUrl = null;

      // Keep lastGoodThumbnailUrl so the next detection doesn't flicker to placeholder while resolving
    }
  }

  // Optimize thumbnail loading with lazy loading and error handling
  function optimizedThumbnailLoad(imgElement, src) {
    if (!imgElement || !src) return;
    
    // Use requestIdleCallback for non-critical loading
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        imgElement.src = src;
      }, { timeout: 1000 });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => {
        imgElement.src = src;
      }, 100);
    }
  }

  // Update playback state (playing/paused)
  let playBtn = null;
  let prevBtn = null;
  let nextBtn = null;
  let controlsInitialized = false;
  let playToggleInFlight = false;
  let logicalPlaybackState = "playing"; // Default to playing when YouTube is detected

  function updatePlaybackState(state) {
    if (!playBtn) return;

    if (state === 'playing') {
      logicalPlaybackState = 'playing';
      playBtn.classList.remove("is-paused");
      playBtn.setAttribute("aria-label", "Pause");
    } else {
      // Treat any non-playing (paused/null/undefined) as paused so the Play icon shows
      logicalPlaybackState = 'paused';
      playBtn.classList.add("is-paused");
      playBtn.setAttribute("aria-label", "Play");
    }
  }

  function setupMusicControls() {
    // Remove the initialized check to allow re-initialization for debugging
    // if (controlsInitialized) {
    //   debugLog("Music controls already initialized");
    //   return;
    // }

    playBtn = document.getElementById("play-btn");
    prevBtn = document.getElementById("prev-btn");
    nextBtn = document.getElementById("next-btn");

    debugLog("Setting up music controls:", {
      playBtn: !!playBtn,
      prevBtn: !!prevBtn,
      nextBtn: !!nextBtn,
      apiAvailable: !!(window.SmootieAPI && window.SmootieAPI.videoPlayPause)
    });

    // If the elements are not yet present (script loaded before DOM), try again shortly.
    if (!playBtn && !prevBtn && !nextBtn) {
      debugLog("Buttons not found, retrying in 50ms");
      setTimeout(setupMusicControls, 50);
      return;
    }

    if (playBtn) {
      // Default to playing state (show Pause icon) - assume video might be playing
      logicalPlaybackState = 'playing';
      updatePlaybackState(logicalPlaybackState);

      // Remove any existing event listeners by cloning
      const newPlayBtn = playBtn.cloneNode(true);
      playBtn.parentNode.replaceChild(newPlayBtn, playBtn);
      playBtn = newPlayBtn;

      playBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        console.log("[Music Controls] Play button clicked - ACTUAL CLICK DETECTED");
        debugLog("Play button clicked");
        
        if (playToggleInFlight) {
          console.log("[Music Controls] Play toggle already in flight, ignoring");
          debugLog("Play toggle already in flight, ignoring");
          return;
        }
        playToggleInFlight = true;

        // Optimistically flip UI so the user sees immediate feedback
        const nextState = logicalPlaybackState === 'playing' ? 'paused' : 'playing';
        updatePlaybackState(nextState);

        // Send play/pause command to YouTube
        if (window.SmootieAPI && window.SmootieAPI.videoPlayPause) {
          console.log("[Music Controls] Calling videoPlayPause API");
          debugLog("Calling videoPlayPause API");
          window.SmootieAPI.videoPlayPause();
          // Force a quick state refresh so the button reflects the real YouTube state
          if (window.SmootieAPI.requestVideoCheck) {
            setTimeout(() => window.SmootieAPI.requestVideoCheck(), 300);
          }
        } else {
          console.error("[Music Controls] SmootieAPI.videoPlayPause not available");
          console.error("SmootieAPI object:", window.SmootieAPI);
        }

        setTimeout(() => {
          playToggleInFlight = false;
        }, 450);
      });
      
      console.log("[Music Controls] Play button event listener attached successfully");
    } else {
      console.error("[Music Controls] Play button not found in DOM");
    }

    if (prevBtn) {
      // Remove any existing event listeners by cloning
      const newPrevBtn = prevBtn.cloneNode(true);
      prevBtn.parentNode.replaceChild(newPrevBtn, prevBtn);
      prevBtn = newPrevBtn;

      prevBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        console.log("[Music Controls] Previous button clicked - ACTUAL CLICK DETECTED");
        debugLog("Previous button clicked");
        
        // Send previous command to YouTube
        if (window.SmootieAPI && window.SmootieAPI.videoPrevious) {
          console.log("[Music Controls] Calling videoPrevious API");
          debugLog("Calling videoPrevious API");
          window.SmootieAPI.videoPrevious();
        } else {
          console.error("[Music Controls] SmootieAPI.videoPrevious not available");
          console.error("SmootieAPI object:", window.SmootieAPI);
        }
      });
      
      console.log("[Music Controls] Previous button event listener attached successfully");
    } else {
      console.error("[Music Controls] Previous button not found in DOM");
    }

    if (nextBtn) {
      // Remove any existing event listeners by cloning
      const newNextBtn = nextBtn.cloneNode(true);
      nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);
      nextBtn = newNextBtn;

      nextBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        console.log("[Music Controls] Next button clicked - ACTUAL CLICK DETECTED");
        debugLog("Next button clicked");
        
        // Send next command to YouTube
        if (window.SmootieAPI && window.SmootieAPI.videoNext) {
          console.log("[Music Controls] Calling videoNext API");
          debugLog("Calling videoNext API");
          window.SmootieAPI.videoNext();
        } else {
          console.error("[Music Controls] SmootieAPI.videoNext not available");
          console.error("SmootieAPI object:", window.SmootieAPI);
        }
      });
      
      console.log("[Music Controls] Next button event listener attached successfully");
    } else {
      console.error("[Music Controls] Next button not found in DOM");
    }

    controlsInitialized = true;
  }

  // Ensure control listeners are attached after DOM is ready
  // Use a more robust approach with multiple retries
  function initializeControlsWithRetry() {
    console.log("[Music Controls] Initializing controls with retry");
    setupMusicControls();
    
    // Retry a few times to ensure buttons are found
    let retryCount = 0;
    const maxRetries = 10;
    const retryInterval = setInterval(() => {
      retryCount++;
      if (retryCount >= maxRetries) {
        clearInterval(retryInterval);
        console.log("[Music Controls] Max retries reached");
        return;
      }
      
      const playCheck = document.getElementById("play-btn");
      const prevCheck = document.getElementById("prev-btn");
      const nextCheck = document.getElementById("next-btn");
      
      if (playCheck || prevCheck || nextCheck) {
        console.log("[Music Controls] Found buttons on retry", retryCount);
        setupMusicControls();
        clearInterval(retryInterval);
      }
    }, 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeControlsWithRetry, { once: true });
  } else {
    initializeControlsWithRetry();
  }

  // Top bar buttons (will be initialized after DOM is ready)
  let menuBtn = null;
  let menuMenu = null;
  let menuStartupToggle = null;
  let homeTabBtn = null;
  
  function setupTopBarButtons() {
    console.log("[Renderer] setupTopBarButtons called");
    
    // Initialize button references
    menuBtn = document.getElementById("menu-btn");
    menuMenu = document.getElementById("menu-menu");
    menuStartupToggle = document.getElementById("menu-startup-toggle");
    homeTabBtn = document.getElementById("tab-tray");
    
    const screenshotBtn = document.getElementById("screenshot-btn");
    const recordBtn = document.getElementById("record-btn");
    const recordingIndicator = document.getElementById("recording-indicator");
    
    console.log("[Renderer] screenshotBtn:", !!screenshotBtn);
    console.log("[Renderer] recordBtn:", !!recordBtn);
    console.log("[Renderer] recordingIndicator:", !!recordingIndicator);
    
    // MediaRecorder state
    let mediaRecorder = null;
    let recordedChunks = [];
    
    if (screenshotBtn) {
      screenshotBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        console.log("[Renderer] Screenshot button clicked");
        debugLog("Screenshot button clicked");
        if (window.SmootieAPI && window.SmootieAPI.takeScreenshot) {
          const success = await window.SmootieAPI.takeScreenshot();
          if (success) {
            debugLog("Screenshot captured successfully");
          } else {
            console.error("Failed to capture screenshot");
          }
        }
      });
    }

    if (recordBtn) {
      console.log("[Renderer] Adding click listener to record button");
      let recordButtonBusy = false;
      recordBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        console.log("[Renderer] Record button clicked");
        debugLog("Record button clicked");
        
        if (recordButtonBusy) {
          console.log("[Renderer] Record button busy, ignoring click");
          debugLog("Record button busy, ignoring click");
          return;
        }
        
        try {
          console.log("[Renderer] Checking recording state...");
          const isRecording = await window.SmootieAPI.isRecording();
          console.log("[Renderer] Current recording state:", isRecording);
          debugLog("Current recording state:", isRecording);
          
          if (isRecording) {
            // Stop recording
            console.log("[Renderer] Stopping recording...");
            debugLog("Stopping recording...");
            recordButtonBusy = true;
            
            if (mediaRecorder && mediaRecorder.state !== 'inactive') {
              console.log("[Renderer] Calling MediaRecorder.stop()");
              mediaRecorder.stop();
              debugLog("MediaRecorder.stop() called");
            }
            
            const success = await window.SmootieAPI.stopRecording();
            if (success) {
              console.log("[Renderer] Recording stopped successfully");
              debugLog("Recording stopped successfully");
              if (recordingIndicator) recordingIndicator.style.display = "none";
              recordBtn.classList.remove("is-recording");
            } else {
              console.error("[Renderer] Failed to stop recording in main process");
            }
            
            setTimeout(() => {
              recordButtonBusy = false;
            }, 500);
          } else {
            // Start recording
            console.log("[Renderer] Starting recording...");
            debugLog("Starting recording...");
            recordButtonBusy = true;
            
            const success = await window.SmootieAPI.startRecording();
            if (success) {
              console.log("[Renderer] Recording started in main process, getting display media...");
              debugLog("Recording started in main process, getting display media...");
              
              try {
                // Get desktop sources from main process
                console.log("[Renderer] Getting desktop sources from main process...");
                const sources = await window.SmootieAPI.getDesktopSources();
                console.log("[Renderer] Got desktop sources:", sources.length);
                
                if (sources.length === 0) {
                  throw new Error("No desktop sources available");
                }
                
                // Use the first source (primary screen)
                const primarySource = sources[0];
                console.log("[Renderer] Using source:", primarySource.name, "id:", primarySource.id);
                
                // Get the stream using getUserMedia with chromeMediaSource
                console.log("[Renderer] Calling getUserMedia with chromeMediaSource...");
                const stream = await navigator.mediaDevices.getUserMedia({
                  audio: false,
                  video: {
                    mandatory: {
                      chromeMediaSource: 'desktop',
                      chromeMediaSourceId: primarySource.id,
                      minWidth: 1920,
                      maxWidth: 1920,
                      minHeight: 1080,
                      maxHeight: 1080
                    }
                  }
                });
                console.log("[Renderer] Got media stream from getUserMedia");
                debugLog("Got media stream from getUserMedia");
                
                // Determine supported MIME types
                const mimeTypes = [
                  'video/webm;codecs=vp9',
                  'video/webm;codecs=vp8',
                  'video/webm'
                ];
                
                let selectedMimeType = null;
                for (const mimeType of mimeTypes) {
                  if (MediaRecorder.isTypeSupported(mimeType)) {
                    selectedMimeType = mimeType;
                    console.log("[Renderer] Supported MIME type:", mimeType);
                    debugLog("Supported MIME type:", mimeType);
                    break;
                  }
                }
                
                if (!selectedMimeType) {
                  throw new Error("No supported video MIME type found");
                }
                
                // Create MediaRecorder
                const options = { mimeType: selectedMimeType };
                mediaRecorder = new MediaRecorder(stream, options);
                console.log("[Renderer] MediaRecorder created with", selectedMimeType);
                debugLog("MediaRecorder created with", selectedMimeType);
                
                recordedChunks = [];
                
                mediaRecorder.ondataavailable = (event) => {
                  console.log("[Renderer] MediaRecorder data available, chunk size:", event.data.size);
                  debugLog("MediaRecorder data available, chunk size:", event.data.size);
                  if (event.data.size > 0) {
                    recordedChunks.push(event.data);
                  }
                };
                
                mediaRecorder.onstop = async () => {
                  console.log("[Renderer] MediaRecorder stopped, total chunks:", recordedChunks.length);
                  debugLog("MediaRecorder stopped, total chunks:", recordedChunks.length);
                  
                  try {
                    const blob = new Blob(recordedChunks, { type: selectedMimeType });
                    console.log("[Renderer] Blob created, size:", blob.size);
                    debugLog("Blob created, size:", blob.size);
                    
                    // Convert blob to array buffer
                    const arrayBuffer = await blob.arrayBuffer();
                    console.log("[Renderer] ArrayBuffer created, size:", arrayBuffer.byteLength);
                    debugLog("ArrayBuffer created, size:", arrayBuffer.byteLength);
                    
                    // Send to main process for saving
                    const result = await window.SmootieAPI.saveRecording(
                      Array.from(new Uint8Array(arrayBuffer)),
                      selectedMimeType
                    );
                    
                    if (result.success) {
                      console.log("[Renderer] Recording saved successfully to:", result.path);
                      debugLog("Recording saved successfully to:", result.path);
                      alert(`Recording saved to: ${result.path}`);
                    } else {
                      console.error("[Renderer] Failed to save recording:", result.error);
                      alert(`Failed to save recording: ${result.error}`);
                    }
                  } catch (error) {
                    console.error("[Renderer] Error processing recording:", error);
                    alert(`Error processing recording: ${error.message}`);
                  }
                  
                  // Stop all tracks
                  stream.getTracks().forEach(track => track.stop());
                  console.log("[Renderer] Media tracks stopped");
                  debugLog("Media tracks stopped");
                };
                
                mediaRecorder.start(1000); // Collect data every second
                console.log("[Renderer] MediaRecorder started");
                debugLog("MediaRecorder started");
                
                if (recordingIndicator) recordingIndicator.style.display = "block";
                recordBtn.classList.add("is-recording");
                console.log("[Renderer] Recording UI updated");
                debugLog("Recording UI updated");
                
              } catch (mediaError) {
                console.error("[Renderer] Error getting display media:", mediaError);
                debugLog("Error getting display media:", mediaError.message);
                alert(`Failed to start recording: ${mediaError.message}`);
                
                // Roll back the recording state
                await window.SmootieAPI.stopRecording();
              }
              
            } else {
              console.error("[Renderer] Failed to start recording in main process");
              alert("Failed to start recording");
            }
            
            setTimeout(() => {
              recordButtonBusy = false;
            }, 500);
          }
        } catch (error) {
          console.error("[Renderer] Error in record button handler:", error);
          debugLog("Error in record button handler:", error.message);
          recordButtonBusy = false;
        }
      });
    } else {
      console.log("[Renderer] Record button not found in DOM");
    }
  }
  
  // Setup top bar buttons after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setupTopBarButtons();
      setupHomeAndStartup();
    }, { once: true });
  } else {
    setupTopBarButtons();
    setupHomeAndStartup();
  }

  if (menuMenu) {
    menuMenu.addEventListener("click", (e) => {
      e.stopPropagation();
    });
  }

  function updateStartupToggleUI(enabled) {
    if (!menuStartupToggle) return;
    const isEnabled = !!enabled;
    menuStartupToggle.setAttribute("aria-pressed", isEnabled ? "true" : "false");
    menuStartupToggle.textContent = isEnabled ? "Start with Windows (On)" : "Start with Windows (Off)";
  }

  async function initializeStartupToggle() {
    if (!menuStartupToggle || !window.SmootieAPI?.getStartupEnabled) return;
    try {
      const enabled = await window.SmootieAPI.getStartupEnabled();
      updateStartupToggleUI(enabled);
    } catch (error) {
      console.error("Failed to read startup toggle state:", error);
      updateStartupToggleUI(false);
    }
  }

  // Setup home tab and startup toggle after DOM is ready
  function setupHomeAndStartup() {
    homeTabBtn = document.getElementById("tab-tray");
    menuStartupToggle = document.getElementById("menu-startup-toggle");
    
    // Home tab switches to Mode 1
    if (homeTabBtn) {
      homeTabBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        debugLog("Home tab clicked, returning to Mode 1");
        applyMode(1); // Always switch to Mode 1 (clock)
      });
    }
    
    // Initialize startup toggle
    if (menuStartupToggle) {
      initializeStartupToggle();
      menuStartupToggle.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (!window.SmootieAPI?.setStartupEnabled) return;
        const currentState = menuStartupToggle.getAttribute("aria-pressed") === "true";
        const nextState = !currentState;
        updateStartupToggleUI(nextState);
        if (menuMenu) menuMenu.style.display = "none";
        try {
          const result = await window.SmootieAPI.setStartupEnabled(nextState);
          if (typeof result === "boolean") {
            updateStartupToggleUI(result);
          }
        } catch (error) {
          console.error("Failed to toggle startup:", error);
          updateStartupToggleUI(currentState);
        }
      });
    }
  }

  // Close settings menu when clicking outside
  document.addEventListener("click", () => {
    if (menuMenu) {
      menuMenu.style.display = "none";
    }
  });



  // Listen for video info updates from main process
  if (window.SmootieAPI) {
    window.SmootieAPI.onVideoInfoUpdate((videoInfo) => {
      updateVideoInfo(videoInfo);
    });
  }

  // Listen for playback state updates from main process
  if (window.SmootieAPI) {
    window.SmootieAPI.onPlaybackStateUpdate((state) => {
      updatePlaybackState(state);
    });
  }

  // Listen for island show/hide events from main process
  if (window.SmootieAPI) {
    window.SmootieAPI.onIslandShow(() => {
      debugLog("Received island-show event from main process");
      // Island is being shown - preserve current mode
    });

    window.SmootieAPI.onIslandHide(() => {
      debugLog("Received island-hide event from main process");
      // Island is being hidden - preserve current mode for when it shows again
    });
  }

  // Proactively trigger detection on startup so thumbnail is ready even in Mode 1
  if (window.SmootieAPI && window.SmootieAPI.requestVideoCheck) {
    window.SmootieAPI.requestVideoCheck();
    setTimeout(() => window.SmootieAPI.requestVideoCheck(), 250);
  }

  // Preload thumbnails efficiently with debouncing
  let preloadTimeout = null;
  function preloadImage(url) {
    if (!url) return;
    
    // Debounce preload requests to avoid overwhelming the network
    if (preloadTimeout) {
      clearTimeout(preloadTimeout);
    }
    
    preloadTimeout = setTimeout(() => {
      const img = new Image();
      img.decoding = "async";
      img.loading = "eager";
      img.src = url;
      preloadTimeout = null;
    }, 200);
  }

  if (window.SmootieAPI) {
    window.SmootieAPI.onVideoInfoUpdate((videoInfo) => {
      if (videoInfo?.thumbnail) preloadImage(videoInfo.thumbnail);
    });
  }

  // Load random photo from user's computer
  function loadRandomPhoto() {
    const profileImg = document.getElementById("profile-img");
    debugLog("Loading photo from source:", currentPhotoSource);
    if (profileImg && window.SmootieAPI && window.SmootieAPI.getRandomPhoto) {
      window.SmootieAPI.getRandomPhoto(currentPhotoSource).then((photoPath) => {
        debugLog("Photo path received:", photoPath);
        if (photoPath) {
          profileImg.src = `file://${photoPath}`;
          profileImg.style.display = "block";
          debugLog("Image src set to:", profileImg.src);
        } else {
          // No photo found - show placeholder
          profileImg.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='90' height='90' viewBox='0 0 90 90'%3E%3Crect width='90' height='90' fill='%23222'/%3E%3Ccircle cx='45' cy='35' r='18' fill='%23444'/%3E%3Cpath d='M15 90 Q45 60 75 90' fill='%23444'/%3E%3C/svg%3E";
          profileImg.style.display = "block";
          debugLog("No photo found, showing placeholder");
        }
      }).catch((error) => {
        // Error - show placeholder
        profileImg.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='90' height='90' viewBox='0 0 90 90'%3E%3Crect width='90' height='90' fill='%23222'/%3E%3Ccircle cx='45' cy='35' r='18' fill='%23444'/%3E%3Cpath d='M15 90 Q45 60 75 90' fill='%23444'/%3E%3C/svg%3E";
        profileImg.style.display = "block";
        debugLog("Could not load random photo:", error);
      });
    } else {
      debugLog("Missing elements or API");
    }
  }

  // Profile picture click handler - directly open folder selection
  const profilePicture = document.getElementById("profile-picture");
  let currentPhotoSource = localStorage.getItem("photoSource") || "all";

  function choosePhotoFolder() {
    if (window.SmootieAPI && window.SmootieAPI.selectCustomFolder) {
      window.SmootieAPI.selectCustomFolder().then((folderPath) => {
        if (folderPath) {
          currentPhotoSource = folderPath;
          localStorage.setItem("photoSource", folderPath);
          localStorage.setItem(
            "customFolderName",
            folderPath.split('\\').pop() || folderPath.split('/').pop() || 'Custom Folder'
          );
          loadRandomPhoto();
        }
      }).catch((error) => {
        console.error("Error selecting folder:", error);
      });
    } else {
      console.error("Folder selection API not available");
    }
  }

  if (profilePicture) {
    profilePicture.addEventListener("click", (e) => {
      debugLog("Profile picture clicked, opening folder selection...");
      e.stopPropagation();

      choosePhotoFolder();
    });
  } else {
    console.error("Profile picture element not found!");
  }

  // Change photo every 2 minutes
  setInterval(loadRandomPhoto, 120000);

  // Initialize with default state
  updateVideoInfo(null);
  loadRandomPhoto();

  // -------- WINDOW MAXIMIZATION DETECTION --------
  // DISABLED: Island now always stays visible regardless of maximization state
  /*
  let isWindowMaximized = false;

  // Update island visibility based on maximization state with debouncing
  let visibilityTimeout = null;
  function updateIslandVisibility() {
    // Clear any pending visibility update
    if (visibilityTimeout) {
      clearTimeout(visibilityTimeout);
      visibilityTimeout = null;
    }

    // Debounce visibility changes to prevent flickering
    visibilityTimeout = setTimeout(() => {
      const nookTray = document.getElementById("mode-nook");
      const clockMode = document.getElementById("mode-clock");

      if (nookTray && clockMode) {
        if (isWindowMaximized) {
          nookTray.classList.add("mode-hidden");
          clockMode.classList.add("mode-hidden");
          debugLog("Island hidden: window maximized");
        } else {
          nookTray.classList.remove("mode-hidden");
          clockMode.classList.remove("mode-hidden");
          debugLog("Island shown: window not maximized");
        }
      }
      visibilityTimeout = null;
    }, 100); // 100ms debounce
  }

  if (window.SmootieAPI) {
    // Island show/hide events
    if (window.SmootieAPI.onIslandHide) {
      window.SmootieAPI.onIslandHide(() => {
        debugLog("Received island hide event");
        isWindowMaximized = true;
        updateIslandVisibility();
      });
    }

    if (window.SmootieAPI.onIslandShow) {
      window.SmootieAPI.onIslandShow(() => {
        debugLog("Received island show event");
        isWindowMaximized = false;
        updateIslandVisibility();
      });
    }

    // Check initial maximized state on startup
    if (window.SmootieAPI.isWindowMaximized) {
      window.SmootieAPI.isWindowMaximized().then((isMaximized) => {
        debugLog("Initial maximized state check:", isMaximized);
        isWindowMaximized = !!isMaximized;
        updateIslandVisibility();
      }).catch((error) => {
        console.error("Error checking initial maximized state:", error);
        // Default to showing island if we can't determine state
        isWindowMaximized = false;
        updateIslandVisibility();
      });
    }
  }
  */
})();
// ===== Theme toggle: click the Smootie icon to switch black <-> pink =====
(function () {
  function init() {
    var root = document.documentElement;
    var icon = document.querySelector('#tab-nook .tab-icon');
    if (!icon) return;
    try {
      if (localStorage.getItem('smootieTheme') === 'pink') root.classList.add('pink');
    } catch (e) {}
    icon.addEventListener('click', function (e) {
      e.stopPropagation();
      var on = root.classList.toggle('pink');
      try { localStorage.setItem('smootieTheme', on ? 'pink' : 'black'); } catch (err) {}
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

// ===== Theme toggle fix: capture-phase click on the Smootie icon =====
document.addEventListener("click", function (e) {
  if (e.target.closest && e.target.closest("#tab-nook .tab-icon")) {
    var on = document.documentElement.classList.toggle("pink");
    try { localStorage.setItem("smootieTheme", on ? "pink" : "black"); } catch (err) {}
  }
}, true);

// ===== Restore: dots button opens the menu =====
(function () {
  function init() {
    var btn = document.getElementById("menu-btn");
    var menu = document.getElementById("menu-menu");
    if (!btn || !menu) return;
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      menu.style.display = (menu.style.display === "block") ? "none" : "block";
    });
  }
  if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", init); } else { init(); }
})();


/* ===== happyQuotes: daily happy quote instead of "Nothing for today" ===== */
(function () {
  var happyQuotes = [
    "Be kind whenever possible. It is always possible.",
    "Courage, dear heart.",
    "There\u0027s always something to be thankful for.",
    "Choose joy, every day.",
    "There is always something left to love.",
    "If you want to be happy, be.",
    "The best is yet to be.",
    "Find joy in little things.",
    "Happiness starts within.",
    "Make room for gratitude.",
    "Smile more, worry less.",
    "Nothing is worth more than this day.",
    "Let gratitude become a habit.",
    "Today is made for happiness.",
    "Life is really simple, but we insist on making it complicated.",
    "No act of kindness, no matter how small, is ever wasted.",
    "Wherever you go, go with all your heart.",
    "A loving heart is the beginning of all knowledge.",
    "Find joy in what you have.",
    "More light, less fear.",
    "In the middle of difficulty lies opportunity.",
    "Bright days begin with bright thoughts.",
    "Happiness lives in the details.",
    "Be joyful in hope.",
    "Life is full of lovely surprises.",
    "Sweet moments make sweet memories.",
    "Find beauty in the ordinary.",
    "No winter lasts forever; no spring skips its turn.",
    "A cheerful heart is good medicine.",
    "Everything has beauty, but not everyone sees it.",
    "If you carry joy in your heart, you can heal any moment.",
    "The greatest wealth is to live content with little.",
    "I can be changed by what happens to me. But I refuse to be reduced by it.",
    "Life is a succession of lessons which must be lived to be understood.",
    "Joy is the simplest form of gratitude.",
    "Do small things with great love.",
    "Good things are coming.",
    "I am seeking, I am striving, I am in it with all my heart.",
    "It is the heart that makes a man rich.",
    "Every day is a new beginning.",
    "Believe in beautiful beginnings.",
    "The secret of getting ahead is getting started.",
    "Spread love everywhere you go.",
    "Let all that you do be done in love.",
    "The world is but a canvas to our imagination.",
    "It is never too late to be what you might have been.",
    "Hope is a waking dream.",
    "There is no charm equal to tenderness of heart.",
    "Believe you can and you\u0027re halfway there.",
    "There is always light, if only we\u0027re brave enough to see it.",
    "Turn your wounds into wisdom.",
    "Every moment is a fresh beginning.",
    "Be content with what you have.",
    "Give thanks in all circumstances.",
    "Gratitude is not only the greatest of virtues, but the parent of all the others.",
    "Simplicity is the ultimate sophistication.",
    "The quieter you become, the more you can hear.",
    "Nothing is more honorable than a grateful heart.",
    "Rest and be thankful.",
    "Do not let the behavior of others destroy your inner peace.",
    "Nothing can dim the light which shines from within.",
    "Every moment is a gift.",
    "No one can make you feel inferior without your consent.",
    "Act as if what you do makes a difference. It does.",
    "Well done is better than well said.",
    "If you can dream it, you can do it.",
    "Kindness is always beautiful.",
    "It always seems impossible until it\u0027s done.",
    "Go confidently in the direction of your dreams.",
    "Choose kindness, always.",
    "The journey of a thousand miles begins with a single step.",
    "Keep your heart soft.",
    "Be someone\u0027s happy moment.",
    "We are what we repeatedly do.",
    "Beauty is in the eye of the beholder.",
    "Fill your world with love.",
    "Our doubts are traitors.",
    "The best thing in the world is a happy heart.",
    "Walk by faith, not by sight.",
    "Be strong and courageous.",
    "A gentle answer turns away wrath.",
    "Let us not become weary in doing good.",
    "Too much pink? Never.",
    "Keep smiling, sweet soul.",
    "One day at a time.",
    "Yesterday is history, tomorrow is a mystery, today is a gift.",
    "Nothing is impossible to a willing heart.",
    "Happiness is always in style.",
    "Born to bloom and sparkle.",
    "Keep calm and stay bubbly.",
    "Happiness is contagious, spread it!",
    "You deserve beautiful days.",
    "Give yourself more reasons to smile.",
    "Be gentle with your heart.",
    "Your happiness matters.",
    "Grow at your own pace.",
    "You are your own sunshine.",
    "Celebrate your little victories.",
    "Choose yourself, choose joy.",
    "Let yourself bloom.",
    "Your smile is your superpower.",
    "Be proud of your journey.",
    "Find peace in your own light.",
    "You are enough, always.",
    "Give yourself permission to shine.",
    "Make yourself a priority.",
    "Be your favorite reason to smile.",
    "You\u0027re doing beautifully.",
    "Let your happiness be loud.",
    "Let wonder fill your days.",
    "Believe in happy endings.",
    "Chase dreams, catch sunshine.",
    "Magic happens when you smile.",
    "Keep dreaming in color.",
    "Make wishes, find wonders.",
    "The world is full of wonder.",
    "Let your dreams bloom.",
    "A little wonder goes a long way.",
    "Stay dreamy, stay happy.",
    "Have patience, for patience is the key of joy.",
    "Nothing should be out of the reach of hope. Life is a hope.",
    "Happiness is a little everyday miracle.",
    "Try to be a rainbow in someone\u0027s cloud.",
    "Live, and be happy, and make others so.",
    "The test of all happiness is gratitude.",
    "Choose kindness.",
    "Living a life of gratitude.",
    "Everything unfolds in its own time."
  ];
  if (window.extraQuotes && window.extraQuotes.length) { happyQuotes.length = 0; window.extraQuotes.forEach(function (q) { if (happyQuotes.indexOf(q) < 0) happyQuotes.push(q); }); }
  window.happyQuotesAll = happyQuotes;
  function showHappyQuote() {
    var el = document.getElementById('calendar-events-text');
    if (!el) return;
    if (el.textContent.trim() !== 'Nothing for today') return;
    var n = new Date();
    var day = Math.floor(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()) / 86400000);
    el.textContent = happyQuotes[day % happyQuotes.length] + "\u00A0\uD83C\uDF38";
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', showHappyQuote);
  } else {
    showHappyQuote();
  }
})();

/* ===== Quote box: left-align long quotes ===== */
(function () {
  function mark() {
    var el = document.getElementById('calendar-events-text');
    var month = document.getElementById('calendar-month');
    if (!el) return;
    el.style.translate = '';
    el.style.removeProperty('width');
    var r = document.createRange();
    r.selectNodeContents(el);
    var isLong = r.getClientRects().length > 1;
    el.classList.toggle('quote-long', isLong);
    if (isLong && month) {
      var left = month.getBoundingClientRect().left;
      var nums = document.querySelectorAll('.calendar-date-number');
      var last = nums[nums.length - 1];
      if (last) {
        var lr = document.createRange();
        lr.selectNodeContents(last);
        var right = lr.getBoundingClientRect().right + 5;
        el.style.setProperty('width', Math.max(120, right - left + 8) + 'px', 'important');
      }
      var delta = left - 2 - el.getBoundingClientRect().left + (parseFloat(el.style.left) || 0);
      el.style.translate = delta + 'px 0';
    }
  }
  var box = document.getElementById('calendar-events-text');
  if (box) {
    new MutationObserver(mark).observe(box, { childList: true, characterData: true, subtree: true });
  }
  if (window.ResizeObserver) {
    var ro = new ResizeObserver(mark);
    ['calendar-month', 'calendar-week-dates'].forEach(function (id) {
      var n = document.getElementById(id);
      if (n) ro.observe(n);
    });
  }
  mark();
  document.addEventListener('DOMContentLoaded', mark);
  window.addEventListener('load', mark);
  window.addEventListener('resize', mark);
})();

/* ===== Quote positions: edit panel (click the pencil) ===== */
(function () {
  var KEY = 'smootieQuoteAdj';
  var SUF = '\u00A0\uD83C\uDF38';
  var el = document.getElementById('calendar-events-text');
  if (!el) return;
  var adj = {};
  try { adj = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { adj = {}; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(adj)); } catch (e) {} }
  function keyOf() { return el.textContent.replace(SUF, '').trim(); }

  var NODRAG = '-webkit-app-region:no-drag;';
  var panel = null, info = null, idx = 0, original = '', draft = { dx: 0, align: '' };

  function current() { return panel ? draft : (adj[keyOf()] || {}); }
  function apply() {
    var a = current();
    if (a.dx) el.style.setProperty('left', a.dx + 'px', 'important'); else el.style.removeProperty('left');
    if (a.align) el.style.setProperty('text-align', a.align, 'important'); else el.style.removeProperty('text-align');
  }
  new MutationObserver(apply).observe(el, { childList: true, characterData: true, subtree: true });
  apply();

  var enabled = false;
  try { enabled = localStorage.getItem('smootieQuoteEditor') === 'on'; } catch (e) {}
  window.setQuoteEditor = function (on) {
    enabled = !!on;
    try { localStorage.setItem('smootieQuoteEditor', enabled ? 'on' : 'off'); } catch (e) {}
    if (!enabled && panel) close();
    sync();
  };
  var pen = document.createElement('button');
  pen.type = 'button';
  pen.id = 'quote-edit-btn'; pen.className = 'top-icon'; pen.innerHTML = '<svg class="svg-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M17 3a2.8 2.8 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5Z" fill="none" stroke="white" stroke-width="2"/></svg>';
  pen.title = 'Edit quote positions';
  pen.style.display = 'none';
  var bar = document.querySelector('.top-bar-icons'); var shot = document.getElementById('screenshot-btn');
  if (bar) bar.insertBefore(pen, shot || bar.firstChild); else document.body.appendChild(pen);

  function visible() { return el.getBoundingClientRect().width > 0; }
  function sync() { pen.style.display = (enabled && !panel && visible()) ? '' : 'none'; }
  function same(a, b) { return (a.dx || 0) === (b.dx || 0) && (a.align || '') === (b.align || ''); }
  function label() {
    var saved = adj[keyOf()] || {};
    info.textContent = 'Quote ' + (idx + 1) + ' / ' + window.happyQuotesAll.length + '  |  moved ' + (draft.dx || 0) + 'px  |  align ' + (draft.align || 'auto') + '  |  ' + (same(draft, saved) ? 'saved' : 'unsaved');
  }
  function show() {
    el.textContent = window.happyQuotesAll[idx] + SUF;
    var a = adj[keyOf()] || {};
    draft = { dx: a.dx || 0, align: a.align || '' };
    apply();
    label();
  }
  function change(fn) { fn(draft); apply(); label(); }
  function commit() {
    var q = keyOf();
    if (draft.dx || draft.align) adj[q] = { dx: draft.dx || 0, align: draft.align || '' }; else delete adj[q];
    save();
    label();
  }
  function btn(text, fn, bg) {
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = text;
    b.style.cssText = 'margin:2px;padding:3px 8px;border:0;border-radius:6px;background:' + (bg || '#f4b6d2') + ';color:#222;font:12px sans-serif;cursor:pointer;' + NODRAG;
    b.addEventListener('click', function (e) { e.stopPropagation(); fn(); });
    return b;
  }
  function close() {
    if (!panel) return;
    if (panel.parentNode) panel.parentNode.removeChild(panel);
    panel = null;
    el.textContent = original;
    sync();
  }
  function open() {
    var all = window.happyQuotesAll;
    if (!all || !all.length || !visible()) return;
    original = el.textContent;
    idx = Math.max(0, all.indexOf(keyOf()));
    panel = document.createElement('div');
    panel.style.cssText = 'position:fixed;top:4px;left:4px;max-width:300px;padding:6px 22px 6px 6px;background:rgba(255,228,238,0.97);color:#222;border-radius:10px;z-index:99999;' + NODRAG;
    var x = document.createElement('button');
    x.type = 'button';
    x.textContent = '\u2715';
    x.title = 'Close (unsaved changes are discarded)';
    x.style.cssText = 'position:absolute;top:3px;right:4px;width:16px;height:16px;padding:0;border:0;background:transparent;color:#444;font:11px/16px sans-serif;cursor:pointer;' + NODRAG;
    x.addEventListener('click', function (e) { e.stopPropagation(); close(); });
    panel.appendChild(x);
    info = document.createElement('div');
    info.style.cssText = 'font:11px/1.35 sans-serif;margin:0 2px 4px;';
    panel.appendChild(info);
    panel.appendChild(btn('\u25C0', function () { idx = (idx + all.length - 1) % all.length; show(); }));
    panel.appendChild(btn('\u25B6', function () { idx = (idx + 1) % all.length; show(); }));
    panel.appendChild(btn('\u2190', function () { change(function (a) { a.dx = (a.dx || 0) - 1; }); }));
    panel.appendChild(btn('\u2192', function () { change(function (a) { a.dx = (a.dx || 0) + 1; }); }));
    panel.appendChild(btn('Align', function () { change(function (a) { if (!a.align) a.align = 'left'; else if (a.align === 'left') a.align = 'center'; else a.align = ''; }); }));
    panel.appendChild(btn('Reset', function () { draft = { dx: 0, align: '' }; apply(); label(); }));
    panel.appendChild(btn('Save', commit, '#f2336f'));
    panel.addEventListener('click', function (e) { e.stopPropagation(); });
    document.body.appendChild(panel);
    pen.style.display = 'none';
    show();
  }
  pen.addEventListener('click', function (e) { e.stopPropagation(); open(); });
  if (window.ResizeObserver) {
    new ResizeObserver(function () { if (panel && !visible()) close(); else sync(); }).observe(el);
  }
  sync();
})();

/* ===== Quote editor switch (dots menu) ===== */
(function () {
  function init() {
    var b = document.getElementById('menu-quote-editor-toggle');
    var menu = document.getElementById('menu-menu');
    if (!b) return;
    function isOn() { try { return localStorage.getItem('smootieQuoteEditor') === 'on'; } catch (e) { return false; } }
    function label() { b.textContent = 'Quote editor: ' + (isOn() ? 'On' : 'Off'); b.setAttribute('aria-pressed', isOn() ? 'true' : 'false'); }
    label();
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      if (window.setQuoteEditor) window.setQuoteEditor(!isOn());
      label();
      if (menu) menu.style.display = 'none';
    });
  }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();
