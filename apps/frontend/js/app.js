/**
 * IDN Live Mirror - Main Application Logic
 * Integrates HLS Video Player, Theme Switcher, Stream Selector, & Real-time Comments
 */

(function () {
  'use strict';

  // API Config
  const API_BASE = window.location.port === '3000' 
    ? 'http://127.0.0.1:8000' 
    : '';

  // App State
  let activeStream = null;
  let allStreams = [];
  let hlsInstance = null;
  let chatPollInterval = null;

  // DOM Elements
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
  // 1. Theme Toggle Manager
  // =========================================================================
  function initTheme() {
    const savedTheme = localStorage.getItem('idn_mirror_theme') || 'dark';
    setTheme(savedTheme);

    themeToggleBtn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      setTheme(newTheme);
    });
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('idn_mirror_theme', theme);
    themeIcon.textContent = theme === 'dark' ? '🌙' : '☀️';
  }

  // =========================================================================
  // 2. Stream Loader & HLS Player
  // =========================================================================
  async function fetchLiveStreams() {
    try {
      const resp = await fetch(`${API_BASE}/api/live`);
      if (!resp.ok) throw new Error('Failed to fetch streams');
      const result = await resp.json();
      allStreams = result.data || [];
      renderLiveMembersBar(allStreams);

      // Select first stream if none active
      if (!activeStream && allStreams.length > 0) {
        selectStream(allStreams[0]);
      } else if (allStreams.length === 0) {
        memberName.textContent = "Tidak ada member live saat ini";
        viewerCount.textContent = "0";
      }
    } catch (err) {
      console.warn('Error fetching live streams:', err);
    }
  }

  function renderLiveMembersBar(streams) {
    liveCounterBadge.textContent = `Live: ${streams.length}`;
    if (!streams || streams.length === 0) {
      liveMembersList.innerHTML = '<span class="chat-loading">Belum ada member yang live</span>';
      return;
    }

    liveMembersList.innerHTML = streams.map(stream => {
      const isActive = activeStream && (activeStream.room_id === stream.room_id);
      return `
        <div class="member-card ${isActive ? 'active' : ''}" data-room="${stream.room_id}">
          <div class="card-avatar-wrapper">
            <img class="card-avatar" src="${stream.img || 'https://via.placeholder.com/32'}" alt="${stream.name}">
            <span class="card-status-dot"></span>
          </div>
          <span class="card-name">${stream.name}</span>
        </div>
      `;
    }).join('');

    // Attach click listeners to cards
    document.querySelectorAll('.member-card').forEach(card => {
      card.addEventListener('click', () => {
        const roomId = card.getAttribute('data-room');
        const targetStream = streams.find(s => String(s.room_id) === String(roomId));
        if (targetStream) {
          selectStream(targetStream);
        }
      });
    });
  }

  function selectStream(stream) {
    activeStream = stream;
    memberName.textContent = stream.name || 'Member JKT48';
    memberAvatar.src = stream.img || 'https://via.placeholder.com/48';
    viewerCount.textContent = (stream.viewers || 1200).toLocaleString('id-ID');
    streamTime.textContent = stream.started_at ? `Live sejak ${formatTime(stream.started_at)}` : 'Sedang Live';

    // Highlight active card
    renderLiveMembersBar(allStreams);

    // Play stream URL
    const streamUrls = stream.streaming_url_list || [];
    const mainUrl = streamUrls.length > 0 ? streamUrls[0].url : '';
    if (mainUrl) {
      loadHlsStream(mainUrl);
    }

    // Start Chat Polling
    startChatPolling(stream.room_id);
  }

  function loadHlsStream(url) {
    showSpinner(true);

    if (hlsInstance) {
      hlsInstance.destroy();
      hlsInstance = null;
    }

    if (Hls.isSupported()) {
      hlsInstance = new Hls({
        capLevelToPlayerSize: true,
        autoStartLoad: true
      });

      hlsInstance.loadSource(url);
      hlsInstance.attachMedia(videoPlayer);

      hlsInstance.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        showSpinner(false);
        updateQualityLevels(data.levels);
        videoPlayer.play().catch(() => {
          // Autoplay blocked by browser policy, user interaction required
        });
      });

      hlsInstance.on(Hls.Events.LEVEL_LOADED, () => {
        showSpinner(false);
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
      // Native HLS support (Safari iOS/macOS)
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
  // 3. Chat Panel Manager
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
      const resp = await fetch(`${API_BASE}/api/chat/${roomId}`);
      if (!resp.ok) return;
      const result = await resp.json();
      renderComments(result.data || []);
    } catch (err) {
      console.warn('Error fetching comments:', err);
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

    // Smooth auto scroll to bottom
    chatFeed.scrollTop = chatFeed.scrollHeight;
  }

  // =========================================================================
  // Helper Functions
  // =========================================================================
  function formatTime(isoString) {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '--:--';
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Init App
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    fetchLiveStreams();
    setInterval(fetchLiveStreams, 30000); // Auto refresh live rooms every 30s
  });

})();
