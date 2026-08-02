/**
 * IDN Live Mirror - Main Application Logic
 * Integrates Beranda (Home View), Live Member Grid, Watch Room View, & HLS Stream Player
 */

(function () {
  'use strict';

  // API Backend Candidates (automatic fallback for separate frontend/backend Vercel deployments)
  const API_CANDIDATES = [
    window.location.origin.includes('3000') ? 'http://127.0.0.1:8000' : '',
    'https://idn-mirror-live.vercel.app',
    'http://127.0.0.1:8000'
  ];

  let resolvedApiBase = null;
  let activeStream = null;
  let allStreams = [];
  let hlsInstance = null;
  let chatPollInterval = null;

  // DOM Elements
  const homeView = document.getElementById('homeView');
  const watchView = document.getElementById('watchView');
  const liveGrid = document.getElementById('liveGrid');
  const lastUpdatedTime = document.getElementById('lastUpdatedTime');
  const refreshLiveBtn = document.getElementById('refreshLiveBtn');
  const brandHomeBtn = document.getElementById('brandHomeBtn');
  const backToHomeBtn = document.getElementById('backToHomeBtn');
  const watchingMemberTitle = document.getElementById('watchingMemberTitle');

  const videoPlayer = document.getElementById('videoPlayer');
  const playerSpinner = document.getElementById('playerSpinner');
  const memberAvatar = document.getElementById('memberAvatar');
  const memberName = document.getElementById('memberName');
  const viewerCount = document.getElementById('viewerCount');
  const streamTime = document.getElementById('streamTime');
  const qualitySelect = document.getElementById('qualitySelect');

  const liveCounterBadge = document.getElementById('liveCountText');
  const liveMembersList = document.getElementById('liveMembersList');
  const chatFeed = document.getElementById('chatFeed');
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const themeIcon = document.getElementById('themeIcon');

  // =========================================================================
  // 1. API Resolution & Fetching
  // =========================================================================
  async function getApiBase() {
    if (resolvedApiBase !== null) return resolvedApiBase;

    for (const base of API_CANDIDATES) {
      try {
        const testUrl = `${base}/health`;
        const resp = await fetch(testUrl, { method: 'GET' });
        if (resp.ok) {
          resolvedApiBase = base;
          return resolvedApiBase;
        }
      } catch (e) {
        // Continue to next candidate
      }
    }
    // Fallback to relative URL
    resolvedApiBase = '';
    return resolvedApiBase;
  }

  async function fetchLiveStreams() {
    try {
      const apiBase = await getApiBase();
      const resp = await fetch(`${apiBase}/api/live`);
      if (!resp.ok) throw new Error('API request failed');
      const result = await resp.json();
      
      allStreams = result.data || [];
      renderHomeGrid(allStreams);
      renderLiveMembersBar(allStreams);
      updateHeaderBadge(allStreams.length);

      lastUpdatedTime.textContent = `Diperbarui ${new Date().toLocaleTimeString('id-ID')}`;

      // Check if URL hash specifies a room (e.g. #room=12345)
      checkUrlHashStream();
    } catch (err) {
      console.warn('Gagal mengambil data live stream:', err);
      renderHomeGrid([]);
      updateHeaderBadge(0);
    }
  }

  function updateHeaderBadge(count) {
    liveCounterBadge.textContent = `Live: ${count}`;
  }

  // =========================================================================
  // 2. View Navigation (Beranda <-> Watch Room)
  // =========================================================================
  function showHomeView() {
    homeView.classList.remove('hidden');
    watchView.classList.add('hidden');
    window.location.hash = '';

    // Stop video playback when navigating back to home
    if (hlsInstance) {
      hlsInstance.destroy();
      hlsInstance = null;
    }
    if (videoPlayer) {
      videoPlayer.pause();
      videoPlayer.removeAttribute('src');
    }
    if (chatPollInterval) clearInterval(chatPollInterval);
  }

  function showWatchView(stream) {
    if (!stream) return;
    activeStream = stream;
    
    homeView.classList.add('hidden');
    watchView.classList.remove('hidden');
    window.location.hash = `room=${stream.room_id}`;

    // Update UI details
    watchingMemberTitle.textContent = stream.name || 'Member JKT48';
    memberName.textContent = stream.name || 'Member JKT48';
    memberAvatar.src = stream.img || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
    viewerCount.textContent = (stream.viewers || 1200).toLocaleString('id-ID');
    streamTime.textContent = stream.started_at ? `Live sejak ${formatTime(stream.started_at)}` : 'Sedang Live';

    const directUrl = stream.url || `https://www.idn.app/${stream.username || stream.room_id}/live`;
    const openIdnDirectLink = document.getElementById('openIdnDirectLink');
    if (openIdnDirectLink) openIdnDirectLink.href = directUrl;

    const overlayDirectBtn = document.getElementById('overlayDirectBtn');
    if (overlayDirectBtn) overlayDirectBtn.href = directUrl;

    // Highlight active card in quick bar
    renderLiveMembersBar(allStreams);

    // Decide Player Mode (HLS Video vs IDN Embed Iframe)
    if (stream.url && stream.url.includes('.m3u8')) {
      playHlsMode(stream.url);
    } else {
      playEmbedIframeMode(stream);
    }

    // Poll live comments
    startChatPolling(stream.room_id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function playHlsMode(m3u8Url) {
    const videoPlayer = document.getElementById('videoPlayer');
    const idnEmbedPlayer = document.getElementById('idnEmbedPlayer');
    const playerFallbackOverlay = document.getElementById('playerFallbackOverlay');

    if (idnEmbedPlayer) {
      idnEmbedPlayer.classList.add('hidden');
      idnEmbedPlayer.src = 'about:blank';
    }
    if (playerFallbackOverlay) playerFallbackOverlay.classList.add('hidden');

    if (videoPlayer) {
      videoPlayer.classList.remove('hidden');
      loadHlsStream(m3u8Url);
    }
  }

  function playEmbedIframeMode(stream) {
    const videoPlayer = document.getElementById('videoPlayer');
    const idnEmbedPlayer = document.getElementById('idnEmbedPlayer');
    const playerFallbackOverlay = document.getElementById('playerFallbackOverlay');

    if (videoPlayer) {
      videoPlayer.classList.add('hidden');
      videoPlayer.pause();
    }
    if (playerFallbackOverlay) playerFallbackOverlay.classList.add('hidden');

    if (idnEmbedPlayer) {
      idnEmbedPlayer.classList.remove('hidden');
      showSpinner(true);

      let targetUrl = stream.embed_url || stream.url || '';
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = `https://www.idn.app/${stream.username || stream.room_id}`;
      }

      idnEmbedPlayer.src = targetUrl;
      
      idnEmbedPlayer.onload = () => {
        showSpinner(false);
      };

      setTimeout(() => {
        showSpinner(false);
      }, 2500);
    }
  }

  function showHomeView() {
    homeView.classList.remove('hidden');
    watchView.classList.add('hidden');
    window.location.hash = '';

    const idnEmbedPlayer = document.getElementById('idnEmbedPlayer');
    if (idnEmbedPlayer) {
      idnEmbedPlayer.src = 'about:blank';
    }
    if (chatPollInterval) clearInterval(chatPollInterval);
  }

  // =========================================================================
  // 3. Render Beranda (Home Grid)
  // =========================================================================
  function renderHomeGrid(streams) {
    if (!streams || streams.length === 0) {
      liveGrid.innerHTML = `
        <div class="empty-state-card">
          <div class="empty-icon">📺</div>
          <h3 class="empty-title">Belum Ada Member JKT48 yang Live</h3>
          <p class="empty-desc">Saat ini tidak ada siaran langsung yang aktif di IDN Live. Klik tombol refresh untuk memeriksa ulang status siaran.</p>
          <button class="btn btn-primary" onclick="window.location.reload()">
            🔄 Periksa Ulang Status
          </button>
        </div>
      `;
      return;
    }

    liveGrid.innerHTML = streams.map(stream => {
      const viewers = (stream.viewers || 0).toLocaleString('id-ID');
      const started = stream.started_at ? formatTime(stream.started_at) : 'Baru saja';
      return `
        <div class="grid-live-card" data-room="${stream.room_id}">
          <div class="card-media-wrapper">
            <img class="card-media-img" src="${stream.img || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80'}" alt="${stream.name}">
            <div class="card-live-tag">
              <span class="live-pulse"></span> LIVE
            </div>
            <div class="card-viewers-tag">
              👁️ ${viewers} penonton
            </div>
          </div>
          <div class="card-body">
            <div class="card-member-info">
              <img class="card-member-avatar" src="${stream.img || 'https://via.placeholder.com/42'}" alt="${stream.name}">
              <div>
                <h4 class="card-member-name">${escapeHtml(stream.name)}</h4>
                <span class="card-member-subtitle">Live sejak ${started}</span>
              </div>
            </div>
            <button class="btn btn-primary card-watch-btn">
              ▶ Tonton Live
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Attach click listeners to grid cards
    document.querySelectorAll('.grid-live-card').forEach(card => {
      card.addEventListener('click', () => {
        const roomId = card.getAttribute('data-room');
        const target = streams.find(s => String(s.room_id) === String(roomId));
        if (target) {
          showWatchView(target);
        }
      });
    });
  }

  // =========================================================================
  // 4. Quick Bar & HLS Player Manager
  // =========================================================================
  function renderLiveMembersBar(streams) {
    if (!streams || streams.length === 0) {
      liveMembersList.innerHTML = '<span class="chat-loading">Belum ada member yang live</span>';
      return;
    }

    liveMembersList.innerHTML = streams.map(stream => {
      const isActive = activeStream && (String(activeStream.room_id) === String(stream.room_id));
      return `
        <div class="member-card ${isActive ? 'active' : ''}" data-room="${stream.room_id}">
          <div class="card-avatar-wrapper">
            <img class="card-avatar" src="${stream.img || 'https://via.placeholder.com/32'}" alt="${stream.name}">
            <span class="card-status-dot"></span>
          </div>
          <span class="card-name">${escapeHtml(stream.name)}</span>
        </div>
      `;
    }).join('');

    document.querySelectorAll('#liveMembersList .member-card').forEach(card => {
      card.addEventListener('click', () => {
        const roomId = card.getAttribute('data-room');
        const target = streams.find(s => String(s.room_id) === String(roomId));
        if (target) {
          showWatchView(target);
        }
      });
    });
  }

  function loadHlsStream(url) {
    showSpinner(true);

    if (hlsInstance) {
      hlsInstance.destroy();
      hlsInstance = null;
    }

    if (Hls.isSupported()) {
      hlsInstance = new Hls({ capLevelToPlayerSize: true, autoStartLoad: true });
      hlsInstance.loadSource(url);
      hlsInstance.attachMedia(videoPlayer);

      hlsInstance.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        showSpinner(false);
        updateQualityLevels(data.levels);
        videoPlayer.play().catch(() => {});
      });

      hlsInstance.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hlsInstance.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hlsInstance.recoverMediaError();
              break;
            default:
              showSpinner(false);
              break;
          }
        }
      });
    } else if (videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
      videoPlayer.src = url;
      videoPlayer.addEventListener('loadedmetadata', () => {
        showSpinner(false);
        videoPlayer.play();
      });
    }
  }

  function updateQualityLevels(levels) {
    qualitySelect.innerHTML = '<option value="auto">Auto Quality</option>';
    if (!levels || levels.length === 0) return;

    levels.forEach((level, idx) => {
      const height = level.height || 'SD';
      const opt = document.createElement('option');
      opt.value = idx;
      opt.textContent = `${height}p (${Math.round(level.bitrate / 1000)} kbps)`;
      qualitySelect.appendChild(opt);
    });

    qualitySelect.onchange = () => {
      if (!hlsInstance) return;
      const val = qualitySelect.value;
      hlsInstance.currentLevel = val === 'auto' ? -1 : parseInt(val, 10);
    };
  }

  function showSpinner(visible) {
    if (visible) {
      playerSpinner.classList.remove('hidden');
    } else {
      playerSpinner.classList.add('hidden');
    }
  }

  // =========================================================================
  // 5. Chat Panel Manager
  // =========================================================================
  function startChatPolling(roomId) {
    if (chatPollInterval) clearInterval(chatPollInterval);

    fetchComments(roomId);
    chatPollInterval = setInterval(() => {
      fetchComments(roomId);
    }, 4000);
  }

  async function fetchComments(roomId) {
    try {
      const apiBase = await getApiBase();
      const resp = await fetch(`${apiBase}/api/chat/${roomId}`);
      if (!resp.ok) return;
      const result = await resp.json();
      renderComments(result.data || []);
    } catch (err) {
      console.warn('Error fetching chat comments:', err);
    }
  }

  function renderComments(comments) {
    if (!comments || comments.length === 0) {
      chatFeed.innerHTML = '<div class="chat-loading">Belum ada komentar</div>';
      return;
    }

    chatFeed.innerHTML = comments.map(c => {
      const user = c.user || c.username || 'User';
      const initial = user.charAt(0).toUpperCase();
      const text = c.comment || c.message || '';
      const time = c.timestamp || 'Baru';

      return `
        <div class="chat-item">
          <div class="chat-avatar">${initial}</div>
          <div class="chat-content">
            <div class="chat-user-row">
              <span class="chat-username">${escapeHtml(user)}</span>
              <span class="chat-time">${escapeHtml(time)}</span>
            </div>
            <div class="chat-text">${escapeHtml(text)}</div>
          </div>
        </div>
      `;
    }).join('');

    chatFeed.scrollTop = chatFeed.scrollHeight;
  }

  // =========================================================================
  // 6. Theme & Event Listeners Initialization
  // =========================================================================
  function initTheme() {
    const savedTheme = localStorage.getItem('idn_mirror_theme') || 'dark';
    setTheme(savedTheme);

    themeToggleBtn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      setTheme(currentTheme === 'dark' ? 'light' : 'dark');
    });
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('idn_mirror_theme', theme);
    themeIcon.textContent = theme === 'dark' ? '🌙' : '☀️';
  }

  // =========================================================================
  // Robust IDN Live Link & Username Parser
  // =========================================================================
  function parseStreamLink(rawInput) {
    if (!rawInput) return null;
    let str = rawInput.trim();
    
    let embedUrl = '';
    let directUrl = '';
    let displayName = '';
    let roomId = '';

    if (str.startsWith('http://') || str.startsWith('https://')) {
      directUrl = str;
      try {
        const urlObj = new URL(str);
        // Clean path e.g. "idnlinks/live-room-175ikv"
        const path = urlObj.pathname.replace(/^\/+/, '');
        roomId = path;
        
        if (path.startsWith('embed/')) {
          embedUrl = `https://${urlObj.host}/${path}`;
        } else {
          embedUrl = `https://${urlObj.host}/embed/${path}`;
        }
        
        const pathParts = path.split('/').filter(Boolean);
        const lastPart = pathParts[pathParts.length - 1] || 'IDN Live Stream';
        displayName = lastPart.replace(/[-_]/g, ' ').toUpperCase();
      } catch (e) {
        embedUrl = str;
        directUrl = str;
        displayName = 'IDN Live Stream';
        roomId = str.replace(/[^a-zA-Z0-9_-]/g, '');
      }
    } else {
      // Plain username or slug e.g. "jkt48_freya" or "idnlinks/live-room-175ikv"
      const slug = str.replace(/^\/+/, '');
      roomId = slug;
      embedUrl = `https://www.idn.app/embed/${slug}`;
      directUrl = `https://www.idn.app/${slug}`;
      displayName = slug.startsWith('jkt48_')
        ? slug.replace('jkt48_', 'JKT48 ').replace(/_/g, ' ').toUpperCase()
        : slug;
    }

    return {
      name: displayName,
      username: roomId,
      room_id: encodeURIComponent(roomId),
      embed_url: embedUrl,
      url: directUrl,
      img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      viewers: 1500,
      started_at: new Date().toISOString()
    };
  }

  function playCustomStreamFromInput(rawInput) {
    const stream = parseStreamLink(rawInput);
    if (!stream) return;
    showWatchView(stream);
  }

  // Init App
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    fetchLiveStreams();

    refreshLiveBtn.addEventListener('click', () => {
      fetchLiveStreams();
    });

    brandHomeBtn.addEventListener('click', showHomeView);
    backToHomeBtn.addEventListener('click', showHomeView);

    // Hero Form Submit
    const heroStreamForm = document.getElementById('heroStreamForm');
    const heroLinkInput = document.getElementById('heroLinkInput');
    if (heroStreamForm && heroLinkInput) {
      heroStreamForm.addEventListener('submit', (e) => {
        e.preventDefault();
        playCustomStreamFromInput(heroLinkInput.value);
      });
    }

    // Watch Quick Form Submit
    const watchStreamForm = document.getElementById('watchStreamForm');
    const watchLinkInput = document.getElementById('watchLinkInput');
    if (watchStreamForm && watchLinkInput) {
      watchStreamForm.addEventListener('submit', (e) => {
        e.preventDefault();
        playCustomStreamFromInput(watchLinkInput.value);
        watchLinkInput.value = '';
      });
    }

    // Preset Sample Link Chips
    document.querySelectorAll('.preset-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const sampleUrl = chip.getAttribute('data-sample');
        if (sampleUrl) {
          playCustomStreamFromInput(sampleUrl);
        }
      });
    });

    setInterval(fetchLiveStreams, 30000);
  });

})();
