/* SPA Logic for Web3 Giveaway Hub */

function apiUrl(path) {
  const base = (window.ARCIE_API_BASE || '').replace(/\/+$/, '');
  return base ? `${base}${path}` : path;
}

let currentUser = null;
let currentGiveaways = [];
let currentFilter = 'active';
let activeDetailGiveaway = null;

// Helper: Format Markdown (Bold, Italics, Code, Links) for Web Display
function formatMarkdownDescription(text) {
  if (!text) return '';
  let str = escapeHtml(text);

  // Markdown Links: [label](url)
  str = str.replace(/\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g, (match, label, url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #60a5fa; text-decoration: underline; font-weight: 600;">${label} 🔗</a>`;
  });

  // Raw URLs
  str = str.replace(/(^|[^"])((https?:\/\/[^\s<]+))/g, (match, prefix, fullUrl) => {
    if (prefix.includes('href=') || prefix.includes('src=')) return match;
    return `${prefix}<a href="${fullUrl}" target="_blank" rel="noopener noreferrer" style="color: #60a5fa; text-decoration: underline; font-weight: 600;">Click Here 🔗</a>`;
  });

  // Bold & Italics & Code
  str = str.replace(/\*\*([^*]+)\*\*/g, '<b style="color: #fff; font-weight: 700;">$1</b>');
  str = str.replace(/\*([^*]+)\*/g, '<i>$1</i>');
  str = str.replace(/`([^`]+)`/g, '<code style="background: rgba(0,0,0,0.4); padding: 2px 6px; border-radius: 4px; color: #a78bfa;">$1</code>');
  str = str.replace(/\n/g, '<br>');

  return str;
}

function renderSocialButtonsHTML(social_links) {
  if (!social_links || typeof social_links !== 'object') return '';
  const btns = [];
  if (social_links.twitter_link && social_links.twitter_link.startsWith('http')) {
    btns.push(`<a href="${escapeHtml(social_links.twitter_link)}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm" style="padding: 4px 10px; font-size: 0.8rem; border-color: rgba(29,161,242,0.4); color: #38bdf8;">🐦 Twitter / X</a>`);
  }
  if (social_links.discord_link && social_links.discord_link.startsWith('http')) {
    btns.push(`<a href="${escapeHtml(social_links.discord_link)}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm" style="padding: 4px 10px; font-size: 0.8rem; border-color: rgba(88,101,242,0.4); color: #818cf8;">💬 Discord</a>`);
  }
  if (social_links.telegram_link && social_links.telegram_link.startsWith('http')) {
    btns.push(`<a href="${escapeHtml(social_links.telegram_link)}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm" style="padding: 4px 10px; font-size: 0.8rem; border-color: rgba(0,136,204,0.4); color: #38bdf8;">✈️ Telegram</a>`);
  }
  if (social_links.website_link && social_links.website_link.startsWith('http')) {
    btns.push(`<a href="${escapeHtml(social_links.website_link)}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm" style="padding: 4px 10px; font-size: 0.8rem; border-color: rgba(168,85,247,0.4); color: #c084fc;">🌐 Website</a>`);
  }
  if (!btns.length) return '';
  return `<div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px;">${btns.join('')}</div>`;
}

document.addEventListener('DOMContentLoaded', () => {
  initApp();
  setupEventListeners();
});

async function initApp() {
  checkAuth();
  await loadGiveaways();
  await loadGuildChannels();
  await loadGuildRoles();

  // Check URL params for direct shared links: /?giveaway=GIVEAWAY_ID
  const urlParams = new URLSearchParams(window.location.search);
  const sharedGId = urlParams.get('giveaway');
  if (sharedGId) {
    openDetailModal(sharedGId);
  }
}

function setupEventListeners() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentFilter = e.target.dataset.tab;
      renderGiveaways();
    });
  });

  const createBtn = document.getElementById('createGiveawayBtn');
  if (createBtn) {
    createBtn.addEventListener('click', () => {
      loadGuildChannels();
      openModal('createModal');
    });
  }
}

async function loadGuildChannels() {
  try {
    const res = await fetch(apiUrl('/api/guilds/channels'), { credentials: 'include' });
    if (!res.ok) return;
    const channels = await res.json();

    if (Array.isArray(channels) && channels.length > 0) {
      const options = channels.map(c =>
        `<option value="${c.id}">💬 #${escapeHtml(c.name)}  •  ${escapeHtml(c.guild_name || 'Server')}</option>`
      ).join('');

      const gCh = document.getElementById('gChannel');
      if (gCh) gCh.innerHTML = '<option value="auto">⚡ Auto-Detect Main Channel</option>' + options;

      const gWin = document.getElementById('gWinnerChannel');
      if (gWin) gWin.innerHTML = '<option value="">📢 Same as Giveaway Channel (Default)</option>' + options;

      const editGWin = document.getElementById('editGWinnerChannel');
      if (editGWin) editGWin.innerHTML = '<option value="">📢 Same as Giveaway Channel (Default)</option>' + options;

      const editGCh = document.getElementById('editGChannel');
      if (editGCh) editGCh.innerHTML = '<option value="">-- Same as current channel --</option>' + options;
    }
  } catch (err) {
    console.error('Failed to load channels:', err);
  }
}

async function loadGuildRoles() {
  try {
    const res = await fetch(apiUrl('/api/guilds/roles'), { credentials: 'include' });
    if (!res.ok) return;
    const roles = await res.json();

    if (!Array.isArray(roles)) return;

    const uniqueRoles = [];
    const seenIds = new Set();
    roles.forEach(r => {
      if (r && r.id && !seenIds.has(r.id)) {
        seenIds.add(r.id);
        uniqueRoles.push(r);
      }
    });

    const roleOpts = uniqueRoles
      .filter(r => r.id !== '@everyone')
      .map(r => `<option value="${r.id}">🏷️ @${escapeHtml(r.name)}  •  ${escapeHtml(r.guild_name || 'Server')}</option>`)
      .join('');

    const baseOptions = `
      <option value="">🔕 No Ping (Silent Announcement)</option>
      <option value="@everyone">🌐 @everyone (Ping Entire Server)</option>
      <option value="@here">⚡ @here (Ping Online Members Only)</option>
    `;

    const gRole = document.getElementById('gMentionRole');
    if (gRole) gRole.innerHTML = baseOptions + (roleOpts ? `<optgroup label="Server Roles">${roleOpts}</optgroup>` : '');

    const editRole = document.getElementById('editGMentionRole');
    if (editRole) editRole.innerHTML = baseOptions + (roleOpts ? `<optgroup label="Server Roles">${roleOpts}</optgroup>` : '');
  } catch (err) {
    console.error('Failed to load roles:', err);
  }
}

function checkAuth() {
  const authContainer = document.getElementById('authContainer');
  const createBtn = document.getElementById('createGiveawayBtn');
  const saved = localStorage.getItem('bot_admin');

  if (saved) {
    try {
      currentUser = JSON.parse(saved);
      currentUser.is_admin = true;

      authContainer.innerHTML = `
        <div class="user-pill" style="cursor:pointer;" onclick="adminLogout()">
          <span class="user-name">${escapeHtml(currentUser.username || 'Admin')}</span>
          <span class="admin-badge">ADMIN</span>
        </div>
      `;
      createBtn.style.display = 'inline-flex';
    } catch (e) {
      localStorage.removeItem('bot_admin');
      currentUser = null;
    }
  }

  if (!currentUser) {
    createBtn.style.display = 'none';
    authContainer.innerHTML = `
      <button class="btn btn-purple" onclick="openModal('passLoginModal')">
        🔐 Admin Sign In
      </button>
    `;
  }

  const isAdmin = !!(currentUser && currentUser.is_admin);
  document.querySelectorAll('.admin-only-tab').forEach(tab => {
    tab.style.display = isAdmin ? '' : 'none';
  });

  const dlBtn = document.getElementById('downloadBackupBtn');
  const rtBtn = document.getElementById('restoreBackupBtn');
  if (dlBtn) dlBtn.style.display = isAdmin ? 'inline-flex' : 'none';
  if (rtBtn) rtBtn.style.display = isAdmin ? 'inline-flex' : 'none';
}

async function downloadBackup() {
  showToast('⏳ Generating database backup...', 'info');
  try {
    const res = await fetch(apiUrl('/api/admin/backup'), { credentials: 'include' });
    if (!res.ok) throw new Error('Backup API failed');

    const backupData = await res.json();
    const str = JSON.stringify(backupData, null, 2);
    const blob = new Blob([str], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bot_backup_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('✅ Backup downloaded successfully!', 'success');
  } catch (err) {
    console.error('Backup download error:', err);
    showToast('❌ Failed to download backup: ' + err.message, 'error');
  }
}

async function handleRestoreBackup(input) {
  const file = input.files && input.files[0];
  if (!file) return;

  if (!confirm('⚠️ WARNING: Restoring a backup will overwrite existing giveaways, participant entries, and user profiles.\n\nAre you sure you want to proceed?')) {
    input.value = '';
    return;
  }

  showToast('⏳ Restoring database backup...', 'info');
  const reader = new FileReader();
  reader.onload = async function (e) {
    try {
      const data = JSON.parse(e.target.result);
      const res = await fetch(apiUrl('/api/admin/restore'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      if (res.ok) {
        showToast('🎉 Backup restored successfully!', 'success');
        await loadGiveaways();
      } else {
        const errData = await res.json();
        throw new Error(errData.error || 'Restore failed');
      }
    } catch (err) {
      console.error('Restore error:', err);
      showToast('❌ Failed to restore backup: ' + err.message, 'error');
    } finally {
      input.value = '';
    }
  };
  reader.readAsText(file);
}

async function submitPasswordLogin(e) {
  e.preventDefault();
  const username = document.getElementById('passUser').value.trim();
  const password = document.getElementById('passWord').value.trim();

  try {
    const res = await fetch(apiUrl('/api/auth/password-login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      currentUser = data.user || { id: 'admin_' + Date.now(), username: username || 'Admin', is_admin: true };
      localStorage.setItem('bot_admin', JSON.stringify(currentUser));
      showToast('🚀 Signed in as Admin!', 'success');
      closeModal('passLoginModal');
      checkAuth();
      await loadGuildChannels();
      await loadGuildRoles();
      await loadGiveaways();
      return;
    } else {
      showToast(data.error || 'Invalid admin password', 'error');
    }
  } catch (err) {
    console.error('Password login error:', err);
    showToast('Error signing in: ' + (err.message || 'Server network error'), 'error');
  }
}

function adminLogout() {
  if (confirm('Sign out?')) {
    localStorage.removeItem('bot_admin');
    currentUser = null;
    checkAuth();
    showToast('Signed out', 'info');
    renderGiveaways();
  }
}

async function loadGiveaways() {
  try {
    const res = await fetch(apiUrl('/api/giveaways'), { credentials: 'include' });
    if (res.ok) {
      currentGiveaways = await res.json();
    } else {
      currentGiveaways = [];
    }
    updateHeroStats();
    renderGiveaways();
  } catch (err) {
    console.error('Failed to load giveaways:', err);
  }
}

function updateHeroStats() {
  const now = Math.floor(Date.now() / 1000);
  const activeCount = currentGiveaways.filter(g => g.is_active && g.ends_at > now).length;
  let totalSpots = 0;
  let totalEntries = 0;

  currentGiveaways.forEach(g => {
    if (g.spot_tiers) {
      g.spot_tiers.forEach(t => { totalSpots += (t.count || 0); });
    } else {
      totalSpots += (g.guaranteed_spots || 0) + (g.fcfs_spots || 0);
    }
    totalEntries += (g.entries_count || 0);
  });

  document.getElementById('statActive').innerText = activeCount;
  document.getElementById('statTotalSpots').innerText = totalSpots;
  document.getElementById('statEntries').innerText = totalEntries;
}

function renderGiveaways() {
  const grid = document.getElementById('giveawayGrid');
  const now = Math.floor(Date.now() / 1000);
  const isAdmin = currentUser && currentUser.is_admin;

  let filtered = currentGiveaways;

  // Non-admin visitors see ONLY active giveaways
  if (!isAdmin) {
    filtered = currentGiveaways.filter(g => g.is_active && g.ends_at > now);
  } else {
    if (currentFilter === 'active') {
      filtered = currentGiveaways.filter(g => g.is_active && g.ends_at > now);
    } else if (currentFilter === 'ended') {
      filtered = currentGiveaways.filter(g => !g.is_active || g.ends_at <= now);
    }
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🎁</div>
        <p>No active giveaways found right now.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(g => {
    const isEnded = !g.is_active || g.ends_at <= now;
    const timeLeft = getTimeLeftString(g.ends_at);
    
    const reqs = [];
    if (g.tasks?.twitter_follow) reqs.push(`<li>🐦 Follow <b>@${escapeHtml(g.tasks.twitter_follow)}</b></li>`);
    if (g.tasks?.twitter_like) reqs.push(`<li>❤️ Like Tweet</li>`);
    if (g.tasks?.twitter_retweet) reqs.push(`<li>🔄 Retweet Tweet</li>`);
    if (g.tasks?.tiktok_follow) reqs.push(`<li>🎵 Follow TikTok</li>`);
    if (g.tasks?.youtube_follow) reqs.push(`<li>▶️ Subscribe YouTube</li>`);
    if (g.tasks?.roles?.length) reqs.push(`<li>🏅 Roles: ${escapeHtml(g.tasks.roles.join(', '))}</li>`);
    if (g.tasks?.manual_task) reqs.push(`<li>📝 ${escapeHtml(g.tasks.manual_task)}</li>`);

    return `
      <div class="g-card">
        ${g.banner_url ? `<img src="${escapeHtml(g.banner_url)}" class="g-card-banner" alt="banner">` : ''}
        <div class="g-card-body">
          <div class="g-host-info">
            <div class="g-host-icon">👑</div>
            <span>Hosted by <b>${escapeHtml(g.hosted_by || 'Admin')}</b></span>
          </div>

          <h3 class="g-title">${escapeHtml(g.title)}</h3>
          <div class="g-desc">${formatMarkdownDescription(g.description)}</div>

          <div class="g-badge-container">
            ${isAdmin && g.guaranteed_spots ? `<span class="g-badge g-badge-guaranteed">💎 ${g.guaranteed_spots} Guaranteed</span>` : ''}
            ${isAdmin && g.fcfs_spots ? `<span class="g-badge g-badge-fcfs">⚡ ${g.fcfs_spots} FCFS</span>` : ''}
            ${isEnded ? '<span class="g-badge g-badge-ended">🔒 Ended</span>' : `<span class="g-badge g-badge-timer">⏳ ${timeLeft}</span>`}
          </div>

          <div class="g-tasks-summary">
            <div class="g-tasks-title">Requirements</div>
            <ul class="g-task-list">
              ${reqs.slice(0, 4).join('')}
              ${reqs.length > 4 ? `<li style="font-style: italic; font-size: 0.78rem;">+ ${reqs.length - 4} more requirements</li>` : ''}
            </ul>
          </div>
        </div>

        <div class="g-card-footer">
          <span style="font-size: 0.85rem; color: var(--text-muted);">👥 ${g.entries_count || 0} Entered</span>
          <div style="display: flex; gap: 6px; align-items: center;">
            ${isAdmin ? `<button type="button" class="btn btn-danger btn-sm" style="padding: 4px 8px;" onclick="deleteGiveaway('${g.id}')" title="Delete Giveaway">🗑️</button>` : ''}
            <button class="btn btn-primary btn-sm" onclick="openDetailModal('${g.id}')">
              ${isEnded ? 'View Results' : 'View Giveaway'}
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

let spotTierCount = 0;
function addSpotTier(defaultName = '', defaultCount = 1) {
  const container = document.getElementById('spotTiersList');
  if (!container) return;

  spotTierCount++;
  const id = `spot_tier_${spotTierCount}`;
  const div = document.createElement('div');
  div.id = id;
  div.style.display = 'flex';
  div.style.gap = '8px';
  div.style.alignItems = 'center';
  div.style.background = 'rgba(0,0,0,0.2)';
  div.style.padding = '6px 10px';
  div.style.borderRadius = 'var(--radius-sm)';
  div.style.border = '1px solid var(--border-color)';

  div.innerHTML = `
    <input type="text" class="form-input spot-tier-name" value="${escapeHtml(defaultName)}" placeholder="Tier Name (e.g. GTD, FCFS, VIP)" style="flex: 2; padding: 6px 10px; font-size: 0.85rem;">
    <input type="number" class="form-input spot-tier-count" value="${defaultCount}" min="1" placeholder="Spots" style="flex: 1; padding: 6px 10px; font-size: 0.85rem;">
    <button type="button" class="btn btn-danger btn-sm" onclick="document.getElementById('${id}').remove()" style="padding: 4px 8px;">🗑️</button>
  `;

  container.appendChild(div);
}

function getSpotTiersPayload() {
  const tiers = [];
  document.querySelectorAll('#spotTiersList > div').forEach(row => {
    const nameInput = row.querySelector('.spot-tier-name');
    const countInput = row.querySelector('.spot-tier-count');
    if (nameInput && countInput) {
      const name = nameInput.value.trim();
      const count = parseInt(countInput.value) || 0;
      if (name && count > 0) {
        tiers.push({ name, count });
      }
    }
  });
  return tiers;
}

let dynamicTaskCount = 0;
function addDynamicTask(type, defaultVal = '') {
  const container = document.getElementById('dynamicTasksList');
  if (!container) return;

  dynamicTaskCount++;
  const id = `task_item_${dynamicTaskCount}`;
  const div = document.createElement('div');
  div.className = 'task-builder-item';
  div.id = id;
  div.style.display = 'flex';
  div.style.gap = '8px';
  div.style.alignItems = 'center';
  div.style.background = 'rgba(0,0,0,0.2)';
  div.style.padding = '8px 12px';
  div.style.borderRadius = 'var(--radius-sm)';
  div.style.border = '1px solid var(--border-color)';

  let typeBadge = '';
  let placeholder = '';

  if (type === 'twitter_follow') { typeBadge = '🐦 Follow'; placeholder = 'Handle (e.g. @WizardX_0x)'; }
  else if (type === 'twitter_like') { typeBadge = '❤️ Like'; placeholder = 'Tweet Link / URL'; }
  else if (type === 'twitter_retweet') { typeBadge = '🔄 Retweet'; placeholder = 'Tweet Link / URL'; }
  else if (type === 'twitter_comment') { typeBadge = '💬 Comment'; placeholder = 'Tweet Link / URL to Comment'; }
  else if (type === 'tiktok_follow') { typeBadge = '🎵 TikTok'; placeholder = 'TikTok Handle / Link'; }
  else if (type === 'youtube_follow') { typeBadge = '▶️ YouTube'; placeholder = 'Channel Link / Name'; }
  else { typeBadge = '📝 Custom'; placeholder = 'Task instructions...'; }

  div.innerHTML = `
    <span class="g-badge g-badge-fcfs" style="min-width: 90px; text-align: center;">${typeBadge}</span>
    <input type="text" class="form-input dynamic-task-val" data-type="${type}" value="${escapeHtml(defaultVal)}" placeholder="${placeholder}" style="flex: 1; padding: 6px 10px; font-size: 0.85rem;">
    <button type="button" class="btn btn-danger btn-sm" onclick="document.getElementById('${id}').remove()" style="padding: 4px 8px;">🗑️</button>
  `;

  container.appendChild(div);
}

function getDynamicTasksPayload() {
  const tasks = [];
  document.querySelectorAll('.dynamic-task-val').forEach(input => {
    const val = input.value.trim();
    const type = input.dataset.type;
    if (val) {
      tasks.push({ type, value: val });
    }
  });
  return tasks;
}

async function handleBannerFileUpload(inputElement, targetUrlInputId, previewContainerId) {
  const file = inputElement.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('image', file);

  showToast('Uploading image...', 'info');
  try {
    const res = await fetch(apiUrl('/api/upload'), {
      method: 'POST',
      credentials: 'include',
      body: formData
    });
    const data = await res.json();
    if (res.ok && data.url) {
      document.getElementById(targetUrlInputId).value = data.url;
      const previewBox = document.getElementById(previewContainerId);
      if (previewBox) {
        previewBox.style.display = 'block';
        previewBox.querySelector('img').src = data.url;
      }
      showToast('📷 Banner image uploaded!', 'success');
      return;
    }
  } catch (err) {
    console.warn('Upload API error:', err);
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target.result;
    document.getElementById(targetUrlInputId).value = dataUrl;
    const previewBox = document.getElementById(previewContainerId);
    if (previewBox) {
      previewBox.style.display = 'block';
      previewBox.querySelector('img').src = dataUrl;
    }
    showToast('📷 Image loaded!', 'success');
  };
  reader.readAsDataURL(file);
}

async function submitCreateGiveaway() {
  const title = document.getElementById('gTitle').value.trim();
  const description = document.getElementById('gDesc').value.trim();
  const banner_url = document.getElementById('gBanner').value.trim();
  const channelSelect = document.getElementById('gChannel').value;
  const channel_id = channelSelect || 'auto';

  const mention_role = document.getElementById('gMentionRole') ? document.getElementById('gMentionRole').value : '';
  const winnerChannelSelect = document.getElementById('gWinnerChannel') ? document.getElementById('gWinnerChannel').value : '';
  const winnerChannelManual = document.getElementById('gWinnerChannelManual') ? document.getElementById('gWinnerChannelManual').value.trim() : '';
  const winner_channel_id = winnerChannelManual || winnerChannelSelect || '';

  if (!title || !description) {
    showToast('Please fill in Title and Description', 'error');
    return;
  }
  const spot_tiers = getSpotTiersPayload();
  const min_per_user = parseInt(document.getElementById('gMinPerUser').value) || 1;
  const max_per_user = parseInt(document.getElementById('gMaxPerUser').value) || 1;
  const duration_val = parseFloat(document.getElementById('gDurationVal').value) || 15;
  const duration_unit = document.getElementById('gDurationUnit').value;
  const network = document.getElementById('gNetwork').value.trim() || 'Ethereum';

  const dynamic_tasks = getDynamicTasksPayload();
  const require_evm = document.getElementById('reqEvm').checked;
  const require_solana = document.getElementById('reqSolana').checked;

  const twitter_link = document.getElementById('gTwitterLink')?.value.trim() || '';
  const discord_link = document.getElementById('gDiscordLink')?.value.trim() || '';
  const telegram_link = document.getElementById('gTelegramLink')?.value.trim() || '';
  const website_link = document.getElementById('gWebsiteLink')?.value.trim() || '';
  const social_links = { twitter_link, discord_link, telegram_link, website_link };

  const giveawayObj = {
    title,
    description,
    banner_url,
    channel_id,
    winner_channel_id,
    mention_role,
    spot_tiers,
    min_per_user,
    max_per_user,
    duration_val,
    duration_unit,
    network,
    social_links,
    tasks: {
      dynamic_tasks,
      require_evm,
      require_solana
    }
  };

  try {
    const res = await fetch(apiUrl('/api/giveaways'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(giveawayObj)
    });
    if (res.ok) {
      showToast('🚀 Giveaway published & posted to Discord!', 'success');
      closeModal('createModal');
      await loadGiveaways();
    } else {
      showToast('Failed to create giveaway', 'error');
    }
  } catch (err) {
    showToast('Error creating giveaway', 'error');
  }
}

let currentDetailId = null;

async function openDetailModal(giveawayId) {
  currentDetailId = giveawayId;
  const isAdmin = currentUser && currentUser.is_admin;
  
  let g = currentGiveaways.find(x => x.id === giveawayId);
  let entries = [];

  try {
    const res = await fetch(apiUrl(`/api/giveaways/${giveawayId}`), { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      g = data.giveaway || g;
      entries = data.entries || [];
    }
  } catch (e) {
    console.warn('Fetch giveaway detail error:', e);
  }

  if (!g) {
    showToast('Giveaway not found', 'error');
    return;
  }

  document.getElementById('detailTitle').innerText = g.title;
  const content = document.getElementById('detailContent');
  const now = Math.floor(Date.now() / 1000);
  const isEnded = !g.is_active || g.ends_at <= now;

  const reqs = [];
  if (g.tasks?.twitter_follow) reqs.push(`<li>🐦 Follow <b>@${escapeHtml(g.tasks.twitter_follow)}</b></li>`);
  if (g.tasks?.twitter_like) reqs.push(`<li>❤️ Like Tweet</li>`);
  if (g.tasks?.twitter_retweet) reqs.push(`<li>🔄 Retweet Tweet</li>`);
  if (g.tasks?.tiktok_follow) reqs.push(`<li>🎵 Follow TikTok</li>`);
  if (g.tasks?.youtube_follow) reqs.push(`<li>▶️ Subscribe YouTube</li>`);
  if (g.tasks?.roles?.length) reqs.push(`<li>🏅 Required Roles: ${escapeHtml(g.tasks.roles.join(', '))}</li>`);
  if (g.tasks?.manual_task) reqs.push(`<li>📝 ${escapeHtml(g.tasks.manual_task)}</li>`);
  if (g.tasks?.dynamic_tasks) {
    g.tasks.dynamic_tasks.forEach(t => { reqs.push(`<li>📝 ${escapeHtml(t.value)}</li>`); });
  }

  content.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      ${g.banner_url ? `<img src="${escapeHtml(g.banner_url)}" style="width: 100%; height: 220px; object-fit: cover; border-radius: var(--radius-md);" alt="banner">` : ''}
      <div style="font-size: 0.98rem; color: var(--text-main); line-height: 1.6; background: rgba(0,0,0,0.25); padding: 1rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">${formatMarkdownDescription(g.description)} ${renderSocialButtonsHTML(g.social_links)}</div>
      
      <div class="g-badge-container">
        ${isAdmin && g.guaranteed_spots ? `<span class="g-badge g-badge-guaranteed">💎 ${g.guaranteed_spots} Guaranteed</span>` : ''}
        ${isAdmin && g.fcfs_spots ? `<span class="g-badge g-badge-fcfs">⚡ ${g.fcfs_spots} FCFS</span>` : ''}
        <span class="g-badge g-badge-timer">🌐 Network: ${escapeHtml(g.network || 'Ethereum')}</span>
        ${isEnded ? '<span class="g-badge g-badge-ended">Ended</span>' : `<span class="g-badge g-badge-timer">Ends ${getTimeLeftString(g.ends_at)}</span>`}
      </div>

      <div class="g-tasks-summary" style="margin-top: 10px;">
        <div class="g-tasks-title">Giveaway Task Requirements</div>
        <ul class="g-task-list" style="font-size: 0.9rem; gap: 6px;">
          ${reqs.length ? reqs.join('') : '<li>No extra requirements specified.</li>'}
        </ul>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; pt-2;">
        <button class="btn btn-outline btn-sm" onclick="copyShareLink('${g.id}')">🔗 Share Giveaway Link</button>
      </div>
    </div>
  `;

  // Network-aware wallet column header and table
  loadPublicParticipants(giveawayId, g.network || 'Ethereum', entries);

  const adminBox = document.getElementById('adminControlBox');
  if (isAdmin) {
    adminBox.style.display = 'block';
    loadGiveawayParticipants(giveawayId, entries);
    
    document.getElementById('editGiveawayAdminBtn').onclick = () => openEditModal(giveawayId);
    document.getElementById('deleteGiveawayAdminBtn').onclick = () => deleteGiveaway(giveawayId);
    document.getElementById('drawWinnersBtn').onclick = () => drawWinners(giveawayId);
    document.getElementById('redrawWinnersBtn').onclick = () => redrawWinners(giveawayId);
    if (document.getElementById('announceWinnersBtn')) {
      document.getElementById('announceWinnersBtn').onclick = () => sendWinnersAnnouncement(giveawayId);
    }
    document.getElementById('exportAllEntriesBtn').onclick = () => exportAllEntriesCSV(giveawayId);
    document.getElementById('exportWinnersBtn').onclick = () => exportWinnersCSV(giveawayId);
  } else {
    adminBox.style.display = 'none';
  }

  openModal('detailModal');
}

function copyShareLink(giveawayId) {
  const shareUrl = `${window.location.origin}/?giveaway=${giveawayId}`;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(shareUrl).then(() => {
      showToast('📋 Share link copied to clipboard!', 'success');
    }).catch(() => {
      prompt('Copy share link:', shareUrl);
    });
  } else {
    prompt('Copy share link:', shareUrl);
  }
}

function getWalletFieldForNetwork(network) {
  const n = (network || '').toLowerCase().trim();
  if (n === 'solana' || n === 'sol') return { field: 'solana_wallet', label: 'Solana Wallet' };
  return { field: 'evm_wallet', label: 'Wallet Address' };
}

function loadPublicParticipants(giveawayId, network, preloadedEntries) {
  const tbody = document.getElementById('publicParticipantsBody');
  const walletHeader = document.getElementById('publicWalletHeader');
  if (!tbody) return;

  const walletInfo = getWalletFieldForNetwork(network);
  if (walletHeader) walletHeader.innerText = walletInfo.label;

  const entries = preloadedEntries || [];
  if (!entries || entries.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No participants yet.</td></tr>';
    return;
  }

  tbody.innerHTML = entries.map(e => {
    if (!e) return '';
    const wallet = e[walletInfo.field] || 'Not provided';
    return `
      <tr>
        <td><b>${escapeHtml(e.username || e.display_name || 'User')}</b></td>
        <td><code style="font-size: 0.8rem;">${escapeHtml(e.user_id || 'N/A')}</code></td>
        <td><code style="font-size: 0.8rem;">${escapeHtml(wallet)}</code></td>
      </tr>
    `;
  }).join('');
}

function loadGiveawayParticipants(giveawayId, preloadedEntries) {
  const tbody = document.getElementById('participantsTableBody');
  const entries = preloadedEntries || [];

  if (!entries || entries.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No entries recorded yet.</td></tr>';
    return;
  }

  tbody.innerHTML = entries.map(e => {
    if (!e) return '';
    const isWinner = !!e.winner_type;
    const winnerBadge = isWinner 
      ? `<span class="g-badge ${String(e.winner_type).toLowerCase().includes('guarantee') ? 'g-badge-guaranteed' : 'g-badge-fcfs'}" style="font-weight: bold; padding: 3px 8px;">🏆 WINNER (${escapeHtml(String(e.winner_type).toUpperCase())})</span>`
      : '<span style="color: var(--text-muted);">Participant</span>';
    
    const nameStyle = isWinner ? 'color: #ffd700; font-weight: bold;' : 'font-weight: bold;';

    return `
      <tr style="${isWinner ? 'background: rgba(255, 215, 0, 0.08);' : ''}">
        <td>
          <b style="${nameStyle}">${escapeHtml(e.username || e.display_name || 'User')}</b> ${isWinner ? '🏆' : ''}<br>
          <span style="font-size: 0.75rem; color: var(--text-dim);">ID: ${e.user_id || 'N/A'}</span>
        </td>
        <td>${winnerBadge}</td>
        <td><code>${escapeHtml(e.evm_wallet || 'None')}</code></td>
        <td><code>${escapeHtml(e.solana_wallet || 'None')}</code></td>
        <td>
          <span style="font-size: 0.8rem;">
            Twitter: ${escapeHtml(e.twitter || '-')}<br>
            Telegram: ${escapeHtml(e.telegram || '-')}
          </span>
        </td>
        <td>
          <div style="display: flex; gap: 6px; align-items: center;">
            <select onchange="updateVerificationStatus('${giveawayId}', '${e.user_id}', this.value)" class="form-select" style="padding: 4px 8px; font-size: 0.8rem;">
              <option value="verified" ${e.task_status === 'verified' || !e.task_status ? 'selected' : ''}>🟢 Verified</option>
              <option value="pending" ${e.task_status === 'pending' ? 'selected' : ''}>🟡 Pending</option>
              <option value="ineligible" ${e.task_status === 'ineligible' ? 'selected' : ''}>🔴 Ineligible</option>
            </select>
            <button type="button" class="btn btn-danger btn-sm" style="padding: 3px 7px; font-size: 0.8rem;" onclick="deleteParticipantEntry('${giveawayId}', '${e.user_id}')" title="Delete Entry">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function drawWinners(giveawayId) {
  if (!confirm('Are you sure you want to draw/assign winners for this giveaway?')) return;
  try {
    const res = await fetch(apiUrl(`/api/giveaways/${giveawayId}/draw`), { method: 'POST', credentials: 'include' });
    const data = await res.json();
    if (res.ok) {
      showToast(`🎉 Winners selected! Announcement posted to Discord!`, 'success');
      await openDetailModal(giveawayId);
      await loadGiveaways();
    } else {
      showToast(data.error || 'Failed to draw winners', 'error');
    }
  } catch (err) {
    showToast('Error drawing winners', 'error');
  }
}

async function redrawWinners(giveawayId) {
  if (!confirm('Are you sure you want to re-raffle replacement winners for any disqualified spots?')) return;
  try {
    const res = await fetch(apiUrl(`/api/giveaways/${giveawayId}/redraw`), { method: 'POST', credentials: 'include' });
    const data = await res.json();
    if (res.ok) {
      showToast(`🔄 Replacement winners re-raffled & posted to Discord!`, 'success');
      await openDetailModal(giveawayId);
      await loadGiveaways();
    } else {
      showToast(data.error || 'Failed to re-raffle winners', 'error');
    }
  } catch (err) {
    showToast('Error re-raffling winners', 'error');
  }
}

async function deleteParticipantEntry(giveawayId, userId) {
  if (!confirm('Are you sure you want to remove this participant entry?')) return;
  try {
    await fetch(apiUrl(`/api/giveaways/${giveawayId}/entries/${userId}/delete`), { method: 'POST', credentials: 'include' });
    showToast('🗑️ Participant entry removed!', 'success');
    await openDetailModal(giveawayId);
    await loadGiveaways();
  } catch (err) {
    showToast('Error deleting entry', 'error');
  }
}

async function sendWinnersAnnouncement(giveawayId) {
  try {
    const res = await fetch(apiUrl(`/api/giveaways/${giveawayId}/announce`), { method: 'POST', credentials: 'include' });
    const data = await res.json();
    if (res.ok) {
      showToast('📢 Winners Announcement posted directly to Discord!', 'success');
    } else {
      showToast(data.error || 'Failed to post announcement', 'error');
    }
  } catch (err) {
    showToast('Error sending announcement', 'error');
  }
}

async function updateVerificationStatus(giveawayId, userId, status) {
  try {
    const res = await fetch(apiUrl(`/api/giveaways/${giveawayId}/verify-winner`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ user_id: userId, task_status: status })
    });
    if (res.ok) {
      showToast(`Updated status to ${status}`, 'success');
    } else {
      showToast('Status update failed', 'error');
    }
  } catch (err) {
    showToast('Error updating status', 'error');
  }
}

async function exportAllEntriesCSV(giveawayId) {
  try {
    const res = await fetch(apiUrl(`/api/giveaways/${giveawayId}`), { credentials: 'include' });
    const data = await res.json();
    const entries = data.entries || [];

    if (!entries || entries.length === 0) {
      showToast('No entries recorded yet to download.', 'info');
      return;
    }

    let csv = '\uFEFFDiscord Username,Discord ID,Twitter Handle,Telegram Handle,EVM Wallet,Solana Wallet,Task Status,Winner Status\n';
    entries.forEach(e => {
      if (!e) return;
      const winnerStatus = e.winner_type ? `WINNER (${String(e.winner_type).toUpperCase()})` : 'Participant';
      csv += `"${(e.username || e.display_name || 'User').replace(/"/g, '""')}","${e.user_id || ''}","${(e.twitter || '').replace(/"/g, '""')}","${(e.telegram || '').replace(/"/g, '""')}","${e.evm_wallet || ''}","${e.solana_wallet || ''}","${e.task_status || 'verified'}","${winnerStatus}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `giveaway_${giveawayId}_all_entries.csv`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 200);

    showToast('📥 Exported all entries to CSV!', 'success');
  } catch (err) {
    showToast('Failed to export entries', 'error');
  }
}

async function exportWinnersCSV(giveawayId) {
  try {
    const res = await fetch(apiUrl(`/api/giveaways/${giveawayId}`), { credentials: 'include' });
    const data = await res.json();
    const entries = data.entries || [];
    const winners = entries.filter(e => e && e.winner_type);

    if (winners.length === 0) {
      showToast('No winners to export yet.', 'info');
      return;
    }

    let csv = '\uFEFFDiscord Username,Discord ID,Spot Type,EVM Wallet,Solana Wallet,Twitter Handle,Telegram Handle,Task Status\n';
    winners.forEach(w => {
      csv += `"${(w.username || w.display_name || 'User').replace(/"/g, '""')}","${w.user_id || ''}","${String(w.winner_type).toUpperCase()}","${w.evm_wallet || ''}","${w.solana_wallet || ''}","${(w.twitter || '').replace(/"/g, '""')}","${(w.telegram || '').replace(/"/g, '""')}","${w.task_status || 'verified'}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `giveaway_${giveawayId}_winners.csv`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 200);

    showToast('🏆 Exported winners to CSV!', 'success');
  } catch (err) {
    showToast('Failed to export winners', 'error');
  }
}

let selectedGtdWinners = [];
let selectedFcfsWinners = [];
let memberSearchDebounceTimer = null;

function openCustomWinnersModal() {
  selectedGtdWinners = [];
  selectedFcfsWinners = [];
  document.getElementById('memberSearchInput').value = '';
  document.getElementById('memberSearchResults').style.display = 'none';
  document.getElementById('gtdWinnersManual').value = '';
  document.getElementById('fcfsWinnersManual').value = '';
  renderSelectedWinnersTags();
  openModal('customWinnersModal');
}

function onMemberSearchInput(query) {
  clearTimeout(memberSearchDebounceTimer);
  const container = document.getElementById('memberSearchResults');
  if (!query.trim()) {
    container.style.display = 'none';
    return;
  }

  memberSearchDebounceTimer = setTimeout(async () => {
    try {
      const res = await fetch(apiUrl(`/api/members/search?q=${encodeURIComponent(query.trim())}`), { credentials: 'include' });
      if (!res.ok) return;
      const members = await res.json();
      
      if (!members || members.length === 0) {
        container.innerHTML = `<div style="padding: 12px; color: var(--text-muted); font-size: 0.85rem; text-align: center;">No matching members found</div>`;
      } else {
        container.innerHTML = members.map(m => `
          <div class="member-search-item">
            <img src="${escapeHtml(m.avatar)}" alt="${escapeHtml(m.display_name)}">
            <div class="member-search-info">
              <span class="member-search-name">${escapeHtml(m.display_name)} (@${escapeHtml(m.username)})</span>
              <span class="member-search-sub">ID: ${escapeHtml(m.id)} ${m.evm_wallet ? '| EVM: ' + escapeHtml(m.evm_wallet.substring(0,6)) + '...' : ''}</span>
            </div>
            <div class="member-search-actions">
              <button type="button" class="btn btn-primary btn-sm" onclick="addSelectedWinner('gtd', '${escapeHtml(m.id)}', '${escapeHtml(m.display_name)}', '${escapeHtml(m.username)}', '${escapeHtml(m.avatar)}')">+ GTD</button>
              <button type="button" class="btn btn-purple btn-sm" onclick="addSelectedWinner('fcfs', '${escapeHtml(m.id)}', '${escapeHtml(m.display_name)}', '${escapeHtml(m.username)}', '${escapeHtml(m.avatar)}')">+ FCFS</button>
            </div>
          </div>
        `).join('');
      }
      container.style.display = 'block';
    } catch (err) {
      console.error('Member search error:', err);
    }
  }, 200);
}

function addSelectedWinner(type, id, displayName, username, avatar) {
  const item = { id, displayName, username, avatar, mention: `<@${id}>` };
  if (type === 'gtd') {
    if (!selectedGtdWinners.some(w => w.id === id)) selectedGtdWinners.push(item);
  } else {
    if (!selectedFcfsWinners.some(w => w.id === id)) selectedFcfsWinners.push(item);
  }
  document.getElementById('memberSearchResults').style.display = 'none';
  document.getElementById('memberSearchInput').value = '';
  renderSelectedWinnersTags();
}

function removeSelectedWinner(type, id) {
  if (type === 'gtd') {
    selectedGtdWinners = selectedGtdWinners.filter(w => w.id !== id);
  } else {
    selectedFcfsWinners = selectedFcfsWinners.filter(w => w.id !== id);
  }
  renderSelectedWinnersTags();
}

function renderSelectedWinnersTags() {
  const gtdBox = document.getElementById('gtdWinnersTags');
  const fcfsBox = document.getElementById('fcfsWinnersTags');
  
  document.getElementById('gtdSelectedCount').innerText = `${selectedGtdWinners.length} Selected`;
  document.getElementById('fcfsSelectedCount').innerText = `${selectedFcfsWinners.length} Selected`;

  if (selectedGtdWinners.length === 0) {
    gtdBox.innerHTML = `<span class="placeholder-text" style="color: var(--text-muted); font-size: 0.82rem;">Selected GTD winners will appear here...</span>`;
  } else {
    gtdBox.innerHTML = selectedGtdWinners.map(w => `
      <span class="winner-pill-tag">
        <img src="${escapeHtml(w.avatar)}" alt="">
        <span>${escapeHtml(w.displayName)} (@${escapeHtml(w.username)})</span>
        <span class="winner-pill-remove" onclick="removeSelectedWinner('gtd', '${escapeHtml(w.id)}')">&times;</span>
      </span>
    `).join('');
  }

  if (selectedFcfsWinners.length === 0) {
    fcfsBox.innerHTML = `<span class="placeholder-text" style="color: var(--text-muted); font-size: 0.82rem;">Selected FCFS winners will appear here...</span>`;
  } else {
    fcfsBox.innerHTML = selectedFcfsWinners.map(w => `
      <span class="winner-pill-tag">
        <img src="${escapeHtml(w.avatar)}" alt="">
        <span>${escapeHtml(w.displayName)} (@${escapeHtml(w.username)})</span>
        <span class="winner-pill-remove" onclick="removeSelectedWinner('fcfs', '${escapeHtml(w.id)}')">&times;</span>
      </span>
    `).join('');
  }
}

async function submitCustomWinners() {
  if (!currentDetailId) return;

  const manualGtd = document.getElementById('gtdWinnersManual').value.trim();
  const manualFcfs = document.getElementById('fcfsWinnersManual').value.trim();

  const gtdMentions = [...selectedGtdWinners.map(w => w.mention), manualGtd].filter(Boolean).join(', ');
  const fcfsMentions = [...selectedFcfsWinners.map(w => w.mention), manualFcfs].filter(Boolean).join(', ');

  if (!gtdMentions && !fcfsMentions) {
    showToast('Please select or enter at least one winner for GTD or FCFS', 'warning');
    return;
  }

  try {
    const res = await fetch(apiUrl(`/api/giveaways/${currentDetailId}/set-custom-winners`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        guaranteed_winners: gtdMentions,
        fcfs_winners: fcfsMentions
      })
    });

    if (res.ok) {
      showToast('🏆 Custom winners set and announced to Discord!', 'success');
      closeModal('customWinnersModal');
      closeModal('detailModal');
      await loadGiveaways();
    } else {
      const data = await res.json();
      showToast(data.error || 'Failed to set custom winners', 'error');
    }
  } catch (err) {
    showToast('Error setting custom winners', 'error');
  }
}

function openModal(id) {
  document.getElementById(id).classList.add('active');
}
function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

function showToast(msg, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${escapeHtml(msg)}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 4000);
}

function getTimeLeftString(timestamp) {
  const diff = timestamp - Math.floor(Date.now() / 1000);
  if (diff <= 0) return 'Ended';
  const hours = Math.floor(diff / 3600);
  const mins = Math.floor((diff % 3600) / 60);
  if (hours > 24) return `${Math.floor(hours / 24)} days left`;
  return `${hours}h ${mins}m left`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, function (m) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m];
  });
}
