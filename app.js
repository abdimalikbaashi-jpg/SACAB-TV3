/**
 * SACAB TV – Main Application Logic
 */
(function () {
  'use strict';

  const { auth, db, storage, SUPER_ADMIN_EMAIL } = window.SACAB;
  let currentUser = null;
  let userProfile = null;
  let allContent = [];
  let currentDetail = null;
  let watchProgress = {};

  // ---------- Helpers ----------
  function $(id) { return document.getElementById(id); }
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = $(id);
    if (el) el.classList.add('active');
  }
  function showPage(name) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const page = $('page-' + name);
    if (page) page.classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => {
      n.classList.toggle('active', n.dataset.page === name);
    });
    if (name === 'home') loadHome();
    if (name === 'mylist') loadMyList();
  }
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2800);
  }
  function showError(id, msg) {
    const el = $(id);
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
  }

  // ---------- Auth State ----------
  auth.onAuthStateChanged(async (user) => {
    currentUser = user;
    if (user) {
      await loadUserProfile(user.uid);
      showScreen('screen-app');
      showPage('home');
      checkAdminAccess();
      loadAds();
      i18n.applyTranslations();
    } else {
      showScreen('screen-login');
      i18n.applyTranslations();
    }
  });

  async function loadUserProfile(uid) {
    try {
      const snap = await db.ref('users/' + uid).once('value');
      userProfile = snap.val() || {};
      if (userProfile.language) i18n.setLanguage(userProfile.language);
      updateProfileUI();
      // Watch progress
      const wp = await db.ref('watchHistory/' + uid).once('value');
      watchProgress = wp.val() || {};
    } catch (e) {
      console.warn('Profile load:', e);
      userProfile = {};
    }
  }

  function updateProfileUI() {
    if (!currentUser) return;
    $('profileName').textContent = userProfile.name || currentUser.displayName || 'User';
    $('profileEmail').textContent = currentUser.email || '';
    if (userProfile.photoURL || currentUser.photoURL) {
      $('profileAvatar').src = userProfile.photoURL || currentUser.photoURL;
    }
  }

  async function checkAdminAccess() {
    if (!currentUser) return;
    try {
      const roleSnap = await db.ref('admins/' + currentUser.uid).once('value');
      const role = roleSnap.val();
      const isSuper = currentUser.email === SUPER_ADMIN_EMAIL;
      const isAdmin = role === 'super' || role === 'editor' || isSuper;
      const btn = $('menuAdmin');
      if (btn) btn.style.display = isAdmin ? 'flex' : 'none';

      // Ensure super admin role exists in DB
      if (isSuper && !role) {
        await db.ref('admins/' + currentUser.uid).set('super');
        await db.ref('users/' + currentUser.uid + '/role').set('super');
      }
    } catch (e) {
      console.warn('Admin check:', e);
    }
  }

  // ---------- Login / Register ----------
  $('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('loginEmail').value.trim();
    const pass = $('loginPassword').value;
    $('loginError').style.display = 'none';
    try {
      await auth.signInWithEmailAndPassword(email, pass);
    } catch (err) {
      showError('loginError', i18n.t('errorLogin'));
    }
  });

  $('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('regName').value.trim();
    const email = $('regEmail').value.trim();
    const phone = $('regPhone').value.trim();
    const pass = $('regPassword').value;
    const confirm = $('regConfirm').value;
    const lang = $('regLang').value;
    $('regError').style.display = 'none';

    if (pass !== confirm) {
      showError('regError', 'Passwords do not match');
      return;
    }
    if (pass.length < 6) {
      showError('regError', 'Password must be at least 6 characters');
      return;
    }
    try {
      const cred = await auth.createUserWithEmailAndPassword(email, pass);
      await cred.user.updateProfile({ displayName: name });
      const profile = {
        name,
        email,
        phone: phone || '',
        language: lang,
        role: 'user',
        createdAt: Date.now(),
        photoURL: ''
      };
      await db.ref('users/' + cred.user.uid).set(profile);
      // Super admin bootstrap
      if (email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
        await db.ref('admins/' + cred.user.uid).set('super');
        await db.ref('users/' + cred.user.uid + '/role').set('super');
      }
      i18n.setLanguage(lang);
    } catch (err) {
      let msg = i18n.t('errorGeneric');
      if (err.code === 'auth/email-already-in-use') msg = 'Email already registered';
      if (err.code === 'auth/weak-password') msg = 'Password too weak';
      showError('regError', msg);
    }
  });

  $('forgotForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('forgotEmail').value.trim();
    $('forgotError').style.display = 'none';
    $('forgotSuccess').style.display = 'none';
    try {
      await auth.sendPasswordResetEmail(email);
      $('forgotSuccess').style.display = 'block';
    } catch (err) {
      showError('forgotError', i18n.t('errorGeneric'));
    }
  });

  // Auth navigation
  $('goRegister').addEventListener('click', (e) => { e.preventDefault(); showScreen('screen-register'); });
  $('goLogin').addEventListener('click', (e) => { e.preventDefault(); showScreen('screen-login'); });
  $('goForgot').addEventListener('click', (e) => { e.preventDefault(); showScreen('screen-forgot'); });
  $('backLogin').addEventListener('click', (e) => { e.preventDefault(); showScreen('screen-login'); });

  // ---------- Bottom Nav ----------
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => showPage(btn.dataset.page));
  });
  $('btnSearch')?.addEventListener('click', () => showPage('search'));
  $('btnProfileTop')?.addEventListener('click', () => showPage('profile'));
  $('menuSettings')?.addEventListener('click', () => showPage('settings'));
  $('settingsBack')?.addEventListener('click', () => showPage('profile'));
  $('menuLogout')?.addEventListener('click', () => auth.signOut());
  $('menuAdmin')?.addEventListener('click', () => {
    window.location.href = 'admin/';
  });
  $('menuFavorites')?.addEventListener('click', () => showPage('mylist'));

  // Language
  $('langSelect')?.addEventListener('change', async (e) => {
    i18n.setLanguage(e.target.value);
    if (currentUser) {
      await db.ref('users/' + currentUser.uid + '/language').set(e.target.value);
    }
  });

  // ---------- Content ----------
  async function loadContent() {
    try {
      const snap = await db.ref('content').once('value');
      const data = snap.val() || {};
      allContent = Object.keys(data).map(id => ({ id, ...data[id] }));
      // Sort by createdAt desc
      allContent.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } catch (e) {
      console.warn('Content load:', e);
      allContent = [];
    }
    return allContent;
  }

  function cardHTML(item, wide) {
    const poster = item.poster || item.thumbnail || item.banner || 'assets/logo.png';
    const cls = wide ? 'content-card wide' : 'content-card';
    return `<div class="${cls}" data-id="${item.id}">
      <img class="poster" src="${poster}" alt="" loading="lazy" onerror="this.src='assets/logo.png'">
      <div class="title">${escapeHtml(item.title || 'Untitled')}</div>
      <div class="meta">${item.year || ''} ${item.type ? '· ' + item.type : ''}</div>
    </div>`;
  }

  function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  async function loadHome() {
    const rows = $('homeRows');
    rows.innerHTML = '<div class="loader"><div class="spinner"></div></div>';
    await loadContent();

    // Hero – featured or first
    const featured = allContent.find(c => c.featured) || allContent[0];
    if (featured) {
      currentDetail = featured;
      const bg = featured.banner || featured.poster || '';
      $('heroBg').style.backgroundImage = bg ? `url(${bg})` : 'none';
      $('heroTitle').textContent = featured.title || 'SACAB TV';
      $('heroDesc').textContent = featured.description || '';
      $('heroWatch').onclick = () => openPlayer(featured);
      $('heroInfo').onclick = () => openDetail(featured);
    }

    const sections = [
      { key: 'trending', title: i18n.t('trending'), filter: c => c.trending },
      { key: 'recent', title: i18n.t('recentlyAdded'), filter: () => true },
      { key: 'anime', title: i18n.t('popularAnime'), filter: c => c.type === 'anime' },
      { key: 'kdrama', title: i18n.t('popularKdrama'), filter: c => c.type === 'kdrama' },
      { key: 'movie', title: i18n.t('movies'), filter: c => c.type === 'movie' },
      { key: 'top', title: i18n.t('topRated'), filter: c => (c.rating || 0) >= 7 }
    ];

    let html = '';
    sections.forEach(sec => {
      let items = allContent.filter(sec.filter);
      if (sec.key === 'recent') items = items.slice(0, 20);
      if (!items.length) return;
      html += `<div class="section">
        <div class="section-header"><h3 class="section-title">${sec.title}</h3></div>
        <div class="row-scroll">${items.map(i => cardHTML(i)).join('')}</div>
      </div>`;
    });

    if (!html) {
      html = `<div class="empty-state"><p>No content yet. Admin can add movies & series.</p></div>`;
    }
    rows.innerHTML = html;

    rows.querySelectorAll('.content-card').forEach(card => {
      card.addEventListener('click', () => {
        const item = allContent.find(c => c.id === card.dataset.id);
        if (item) openDetail(item);
      });
    });
  }

  function openDetail(item) {
    currentDetail = item;
    showPage('detail');
    const banner = item.banner || item.poster || 'assets/logo.png';
    $('detailHero').innerHTML = `<img src="${banner}" alt="">`;
    $('detailTitle').textContent = item.title || '';
    $('detailMeta').innerHTML = [
      item.year,
      item.type,
      item.rating ? '★ ' + item.rating : '',
      item.genre
    ].filter(Boolean).map(x => `<span>${escapeHtml(String(x))}</span>`).join('');
    $('detailDesc').textContent = item.description || '';

    $('detailPlay').onclick = () => openPlayer(item);

    // Favorites
    updateFavButton(item.id);
    $('detailFav').onclick = () => toggleFavorite(item.id);

    // Episodes
    const epContainer = $('detailEpisodes');
    const seasonsEl = $('detailSeasons');
    if (item.episodes && Array.isArray(item.episodes) && item.episodes.length) {
      seasonsEl.innerHTML = `<h3 style="margin:16px 0 10px;font-size:1.1rem;">${i18n.t('episodes')}</h3>`;
      epContainer.innerHTML = item.episodes.map((ep, i) => `
        <div class="episode-item" data-ep="${i}">
          <img class="episode-thumb" src="${ep.thumbnail || item.poster || 'assets/logo.png'}" onerror="this.src='assets/logo.png'">
          <div class="episode-info">
            <h4>${escapeHtml(ep.title || 'Episode ' + (i + 1))}</h4>
            <p>${escapeHtml(ep.description || '')}</p>
          </div>
        </div>
      `).join('');
      epContainer.querySelectorAll('.episode-item').forEach(el => {
        el.addEventListener('click', () => {
          const ep = item.episodes[+el.dataset.ep];
          openPlayer({ ...item, videoUrl: ep.videoUrl || item.videoUrl, title: (item.title + ' – ' + (ep.title || '')) });
        });
      });
    } else {
      seasonsEl.innerHTML = '';
      epContainer.innerHTML = '';
    }
  }

  async function updateFavButton(contentId) {
    if (!currentUser) return;
    const snap = await db.ref('favorites/' + currentUser.uid + '/' + contentId).once('value');
    const isFav = snap.exists();
    $('detailFav').textContent = isFav ? i18n.t('removeFromList') : i18n.t('addToList');
  }

  async function toggleFavorite(contentId) {
    if (!currentUser) return;
    const ref = db.ref('favorites/' + currentUser.uid + '/' + contentId);
    const snap = await ref.once('value');
    if (snap.exists()) {
      await ref.remove();
      toast(i18n.t('removeFromList'));
    } else {
      await ref.set({ addedAt: Date.now(), contentId });
      toast(i18n.t('addToList'));
    }
    updateFavButton(contentId);
  }

  async function loadMyList() {
    const container = $('myListContent');
    if (!currentUser) {
      container.innerHTML = '<div class="empty-state"><p>Login required</p></div>';
      return;
    }
    container.innerHTML = '<div class="loader"><div class="spinner"></div></div>';
    await loadContent();
    const snap = await db.ref('favorites/' + currentUser.uid).once('value');
    const favs = snap.val() || {};
    const ids = Object.keys(favs);
    const items = allContent.filter(c => ids.includes(c.id));
    if (!items.length) {
      container.innerHTML = `<div class="empty-state"><p>${i18n.t('noResults')}</p></div>`;
      return;
    }
    container.innerHTML = items.map(i => cardHTML(i)).join('');
    container.querySelectorAll('.content-card').forEach(card => {
      card.addEventListener('click', () => {
        const item = allContent.find(c => c.id === card.dataset.id);
        if (item) openDetail(item);
      });
    });
  }

  // ---------- Search ----------
  let searchTimeout;
  $('searchInput')?.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => doSearch(e.target.value.trim()), 300);
  });

  async function doSearch(q) {
    const container = $('searchResults');
    if (!q) { container.innerHTML = ''; return; }
    await loadContent();
    const lower = q.toLowerCase();
    const results = allContent.filter(c =>
      (c.title || '').toLowerCase().includes(lower) ||
      (c.genre || '').toLowerCase().includes(lower) ||
      (c.type || '').toLowerCase().includes(lower) ||
      String(c.year || '').includes(lower)
    );
    if (!results.length) {
      container.innerHTML = `<div class="empty-state"><p>${i18n.t('noResults')}</p></div>`;
      return;
    }
    container.innerHTML = results.map(i => cardHTML(i)).join('');
    container.querySelectorAll('.content-card').forEach(card => {
      card.addEventListener('click', () => {
        const item = allContent.find(c => c.id === card.dataset.id);
        if (item) openDetail(item);
      });
    });
  }

  // Categories
  document.querySelectorAll('.cat-card').forEach(btn => {
    btn.addEventListener('click', async () => {
      const type = btn.dataset.type;
      await loadContent();
      const items = allContent.filter(c => c.type === type);
      const container = $('catResults');
      if (!items.length) {
        container.innerHTML = `<div class="empty-state"><p>${i18n.t('noResults')}</p></div>`;
        return;
      }
      container.innerHTML = items.map(i => cardHTML(i)).join('');
      container.querySelectorAll('.content-card').forEach(card => {
        card.addEventListener('click', () => {
          const item = allContent.find(c => c.id === card.dataset.id);
          if (item) openDetail(item);
        });
      });
    });
  });

  // ---------- Video Player ----------
  const video = $('videoEl');
  const overlay = $('playerOverlay');

  function openPlayer(item) {
    const url = item.videoUrl || item.video || '';
    if (!url) {
      toast('No video URL available for this title');
      return;
    }
    $('playerTitle').textContent = item.title || '';
    video.src = url;
    overlay.classList.add('active');
    video.play().catch(() => {});
    // Resume position
    if (currentUser && watchProgress[item.id]) {
      video.currentTime = watchProgress[item.id].position || 0;
    }
    // Save progress periodically
    video.ontimeupdate = () => {
      if (!currentUser || !item.id) return;
      if (Math.floor(video.currentTime) % 10 === 0) {
        db.ref('watchHistory/' + currentUser.uid + '/' + item.id).update({
          position: video.currentTime,
          duration: video.duration || 0,
          updatedAt: Date.now(),
          title: item.title
        });
      }
      updateSeekUI();
    };
  }

  function closePlayer() {
    video.pause();
    video.removeAttribute('src');
    video.load();
    overlay.classList.remove('active');
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }

  $('playerClose')?.addEventListener('click', closePlayer);
  $('btnPlayPause')?.addEventListener('click', () => {
    if (video.paused) video.play(); else video.pause();
  });
  $('btnFullscreen')?.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      overlay.requestFullscreen?.() || overlay.webkitRequestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  });
  $('seekBar')?.addEventListener('input', (e) => {
    if (video.duration) video.currentTime = (e.target.value / 100) * video.duration;
  });

  function updateSeekUI() {
    if (!video.duration) return;
    $('seekBar').value = (video.currentTime / video.duration) * 100;
    $('timeDisplay').textContent = formatTime(video.currentTime) + ' / ' + formatTime(video.duration);
  }
  function formatTime(s) {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return m + ':' + String(sec).padStart(2, '0');
  }

  // ---------- Ads ----------
  async function loadAds() {
    try {
      const snap = await db.ref('ads').once('value');
      const ads = snap.val() || {};
      document.querySelectorAll('.ad-slot').forEach(slot => {
        const placement = slot.dataset.placement;
        const ad = ads[placement];
        if (!ad || !ad.enabled) {
          slot.style.display = 'none';
          return;
        }
        slot.style.display = 'flex';
        if (ad.type === 'image' && ad.imageUrl) {
          slot.innerHTML = `<a href="${ad.linkUrl || '#'}" target="_blank" rel="noopener"><img src="${ad.imageUrl}" alt="Ad"><span class="ad-label">Ad</span></a>`;
        } else if (ad.type === 'html' && ad.htmlCode) {
          slot.innerHTML = ad.htmlCode;
        } else if (ad.type === 'network' && ad.networkCode) {
          // AdSense / Adsterra code injected by admin
          slot.innerHTML = ad.networkCode;
        } else {
          slot.style.display = 'none';
        }
      });
    } catch (e) {
      console.warn('Ads load:', e);
    }
  }

  // Init language select
  if ($('langSelect')) $('langSelect').value = i18n.getLang();
  i18n.applyTranslations();
})();
