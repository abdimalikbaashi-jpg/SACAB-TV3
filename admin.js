/**
 * SACAB TV – Admin Dashboard
 * Super Admin: abdimalikbaashi@gmail.com
 */
(function () {
  'use strict';

  const { auth, db, SUPER_ADMIN_EMAIL } = window.SACAB;
  let currentUser = null;
  let userRole = null; // 'super' | 'editor'

  function $(id) { return document.getElementById(id); }

  function showError(id, msg) {
    const el = $(id);
    if (el) { el.textContent = msg; el.style.display = 'block'; }
  }

  // Auth
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      $('adminLogin').style.display = 'flex';
      $('adminApp').style.display = 'none';
      return;
    }
    currentUser = user;
    // Check role
    const snap = await db.ref('admins/' + user.uid).once('value');
    userRole = snap.val();
    const isSuperEmail = user.email && user.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

    if (!userRole && isSuperEmail) {
      await db.ref('admins/' + user.uid).set('super');
      userRole = 'super';
    }

    if (!userRole && !isSuperEmail) {
      showError('adminLoginError', 'Access denied. You are not an administrator.');
      await auth.signOut();
      return;
    }

    $('adminLogin').style.display = 'none';
    $('adminApp').style.display = 'flex';
    $('adminRoleBadge').textContent = userRole === 'super' ? 'Super Admin' : 'Editor';
    loadOverview();
    loadContentList();
    loadAdsForm();
  });

  $('adminLoginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('adminLoginError').style.display = 'none';
    try {
      await auth.signInWithEmailAndPassword($('adminEmail').value.trim(), $('adminPassword').value);
    } catch (err) {
      showError('adminLoginError', 'Invalid credentials or not an admin.');
    }
  });

  $('adminLogout').addEventListener('click', () => auth.signOut());

  // Navigation
  document.querySelectorAll('.side-item').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.side-item').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.admin-sec').forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      const sec = btn.dataset.sec;
      $('sec-' + sec)?.classList.add('active');
      const titles = { overview: 'Overview', content: 'Content', users: 'Users', ads: 'Advertisements', settings: 'App Settings', editors: 'Editors' };
      $('secTitle').textContent = titles[sec] || sec;
      if (sec === 'users') loadUsers();
      if (sec === 'editors') loadEditors();
      if (sec === 'content') loadContentList();
      if (sec === 'ads') loadAdsForm();
    });
  });

  // Overview
  async function loadOverview() {
    try {
      const usersSnap = await db.ref('users').once('value');
      const contentSnap = await db.ref('content').once('value');
      const users = usersSnap.val() || {};
      const content = contentSnap.val() || {};
      const items = Object.values(content);
      $('statUsers').textContent = Object.keys(users).length;
      $('statContent').textContent = items.length;
      $('statMovies').textContent = items.filter(c => c.type === 'movie').length;
      $('statSeries').textContent = items.filter(c => ['anime', 'kdrama', 'series'].includes(c.type)).length;
    } catch (e) {
      console.warn(e);
    }
  }

  // Content CRUD
  async function loadContentList() {
    const list = $('contentList');
    list.innerHTML = '<p style="color:#6b6b6b;">Loading...</p>';
    try {
      const snap = await db.ref('content').once('value');
      const data = snap.val() || {};
      const items = Object.keys(data).map(id => ({ id, ...data[id] }));
      items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      if (!items.length) {
        list.innerHTML = '<p style="color:#6b6b6b;">No content yet. Click “Add Content”.</p>';
        return;
      }
      list.innerHTML = items.map(item => `
        <div class="data-row">
          <img src="${item.poster || '../assets/logo.png'}" onerror="this.src='../assets/logo.png'">
          <div class="info">
            <h4>${esc(item.title)}</h4>
            <p>${item.type || ''} · ${item.year || ''} ${item.featured ? '· Featured' : ''} ${item.trending ? '· Trending' : ''}</p>
          </div>
          <div class="actions">
            <button class="btn-sm edit" data-id="${item.id}">Edit</button>
            <button class="btn-sm del" data-id="${item.id}">Delete</button>
          </div>
        </div>
      `).join('');

      list.querySelectorAll('.edit').forEach(btn => {
        btn.addEventListener('click', () => openContentModal(btn.dataset.id, data[btn.dataset.id]));
      });
      list.querySelectorAll('.del').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('Delete this content?')) return;
          await db.ref('content/' + btn.dataset.id).remove();
          loadContentList();
          loadOverview();
        });
      });
    } catch (e) {
      list.innerHTML = '<p style="color:#ff8a8a;">Error loading content. Check Firebase rules.</p>';
    }
  }

  function esc(s) {
    const d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  }

  $('btnAddContent').addEventListener('click', () => openContentModal(null, null));
  $('contentModalClose').addEventListener('click', () => { $('contentModal').style.display = 'none'; });

  function openContentModal(id, data) {
    $('contentModal').style.display = 'flex';
    $('contentModalTitle').textContent = id ? 'Edit Content' : 'Add Content';
    $('contentId').value = id || '';
    $('cTitle').value = data?.title || '';
    $('cType').value = data?.type || 'movie';
    $('cDesc').value = data?.description || '';
    $('cYear').value = data?.year || '';
    $('cRating').value = data?.rating || '';
    $('cGenre').value = data?.genre || '';
    $('cPoster').value = data?.poster || '';
    $('cBanner').value = data?.banner || '';
    $('cVideo').value = data?.videoUrl || '';
    $('cFeatured').checked = !!data?.featured;
    $('cTrending').checked = !!data?.trending;
    $('cEpisodes').value = data?.episodes ? JSON.stringify(data.episodes, null, 2) : '';
  }

  $('contentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = $('contentId').value || db.ref('content').push().key;
    let episodes = [];
    try {
      const raw = $('cEpisodes').value.trim();
      if (raw) episodes = JSON.parse(raw);
    } catch (err) {
      alert('Episodes JSON is invalid');
      return;
    }
    const payload = {
      title: $('cTitle').value.trim(),
      type: $('cType').value,
      description: $('cDesc').value.trim(),
      year: parseInt($('cYear').value) || null,
      rating: parseFloat($('cRating').value) || null,
      genre: $('cGenre').value.trim(),
      poster: $('cPoster').value.trim(),
      banner: $('cBanner').value.trim(),
      videoUrl: $('cVideo').value.trim(),
      featured: $('cFeatured').checked,
      trending: $('cTrending').checked,
      episodes,
      updatedAt: Date.now(),
      createdAt: $('contentId').value ? undefined : Date.now()
    };
    // Don't overwrite createdAt on edit
    if ($('contentId').value) {
      delete payload.createdAt;
      await db.ref('content/' + id).update(payload);
    } else {
      payload.createdAt = Date.now();
      await db.ref('content/' + id).set(payload);
    }
    $('contentModal').style.display = 'none';
    loadContentList();
    loadOverview();
  });

  // Users
  async function loadUsers() {
    const list = $('usersList');
    list.innerHTML = 'Loading...';
    try {
      const snap = await db.ref('users').once('value');
      const users = snap.val() || {};
      const rows = Object.keys(users).map(uid => {
        const u = users[uid];
        return `<div class="data-row">
          <div class="info">
            <h4>${esc(u.name || 'User')}</h4>
            <p>${esc(u.email || '')} · ${u.role || 'user'} · UID: ${uid.slice(0, 8)}…</p>
          </div>
        </div>`;
      });
      list.innerHTML = rows.length ? rows.join('') : '<p style="color:#6b6b6b;">No users</p>';
    } catch (e) {
      list.innerHTML = '<p style="color:#ff8a8a;">Cannot load users (permissions)</p>';
    }
  }

  // ========== ADS MANAGEMENT ==========
  async function loadAdsForm() {
    try {
      const snap = await db.ref('ads').once('value');
      const ads = snap.val() || {};
      const network = ads._network || {};

      $('adNetwork').value = network.provider || 'none';
      $('adPublisherId').value = network.publisherId || '';
      $('adNetworkScript').value = network.script || '';

      const placements = ['home_top', 'home_mid', 'detail', 'player'];
      placements.forEach(p => {
        const ad = ads[p] || {};
        const en = $('ad_' + p + '_enabled');
        const type = $('ad_' + p + '_type');
        const img = $('ad_' + p + '_image');
        const link = $('ad_' + p + '_link');
        const code = $('ad_' + p + '_code');
        if (en) en.checked = !!ad.enabled;
        if (type) type.value = ad.type || 'image';
        if (img) img.value = ad.imageUrl || '';
        if (link) link.value = ad.linkUrl || '';
        if (code) code.value = ad.htmlCode || ad.networkCode || '';
      });
    } catch (e) {
      console.warn('Ads load', e);
    }
  }

  $('saveNetworkBtn')?.addEventListener('click', async () => {
    await db.ref('ads/_network').set({
      provider: $('adNetwork').value,
      publisherId: $('adPublisherId').value.trim(),
      script: $('adNetworkScript').value.trim(),
      updatedAt: Date.now()
    });
    alert('Network settings saved');
  });

  $('savePlacementsBtn')?.addEventListener('click', async () => {
    const placements = ['home_top', 'home_mid', 'detail', 'player'];
    const updates = {};
    placements.forEach(p => {
      const type = ($('ad_' + p + '_type')?.value) || 'image';
      const code = ($('ad_' + p + '_code')?.value || '').trim();
      updates[p] = {
        enabled: !!($('ad_' + p + '_enabled')?.checked),
        type,
        imageUrl: ($('ad_' + p + '_image')?.value || '').trim(),
        linkUrl: ($('ad_' + p + '_link')?.value || '').trim(),
        htmlCode: type === 'html' ? code : '',
        networkCode: type === 'network' ? code : (p === 'player' ? code : ''),
        updatedAt: Date.now()
      };
    });
    await db.ref('ads').update(updates);
    alert('Ad placements saved. They will appear in the app.');
  });

  // Settings
  $('saveSettingsBtn')?.addEventListener('click', async () => {
    await db.ref('appSettings').update({
      appName: $('setAppName').value.trim(),
      announcement: $('setAnnouncement').value.trim(),
      updatedAt: Date.now()
    });
    alert('Settings saved');
  });

  // Editors (super only)
  async function loadEditors() {
    const list = $('editorsList');
    try {
      const snap = await db.ref('admins').once('value');
      const admins = snap.val() || {};
      const rows = Object.keys(admins).filter(uid => admins[uid] === 'editor').map(uid =>
        `<div class="data-row"><div class="info"><h4>Editor</h4><p>UID: ${uid}</p></div>
         <button class="btn-sm del" data-uid="${uid}">Revoke</button></div>`
      );
      list.innerHTML = rows.length ? rows.join('') : '<p style="color:#6b6b6b;">No editors assigned</p>';
      list.querySelectorAll('.del').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (userRole !== 'super') { alert('Only Super Admin can revoke'); return; }
          await db.ref('admins/' + btn.dataset.uid).remove();
          loadEditors();
        });
      });
    } catch (e) {
      list.innerHTML = '<p style="color:#ff8a8a;">Error</p>';
    }
  }

  $('addEditorBtn')?.addEventListener('click', async () => {
    if (userRole !== 'super') {
      alert('Only Super Admin can assign editors');
      return;
    }
    const uid = $('editorUid').value.trim();
    if (!uid) return;
    await db.ref('admins/' + uid).set('editor');
    await db.ref('users/' + uid + '/role').set('editor');
    $('editorUid').value = '';
    loadEditors();
    alert('Editor role granted');
  });
})();
