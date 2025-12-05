(() => {
  const canvas = document.getElementById('animCanvas');
  const ctx = canvas.getContext('2d');

  // Safari/iPad などのラウンド矩形非対応を補う
  if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
      const radius = Array.isArray(r) ? r : [r, r, r, r].map(v => v || 0);
      this.beginPath();
      this.moveTo(x + radius[0], y);
      this.lineTo(x + w - radius[1], y);
      this.quadraticCurveTo(x + w, y, x + w, y + radius[1]);
      this.lineTo(x + w, y + h - radius[2]);
      this.quadraticCurveTo(x + w, y + h, x + w - radius[2], y + h);
      this.lineTo(x + radius[3], y + h);
      this.quadraticCurveTo(x, y + h, x, y + h - radius[3]);
      this.lineTo(x, y + radius[0]);
      this.quadraticCurveTo(x, y, x + radius[0], y);
      this.closePath();
      return this;
    };
  }
  const bgmToggleBtn = document.getElementById('bgmToggle');
  const toastEl = document.getElementById('toast');
  const longPressMenu = document.getElementById('longPressMenu');
  const menuBgmToggle = document.getElementById('menuBgmToggle');
  const settingsBtn = document.getElementById('settingsBtn');
  const navPrev = document.getElementById('navPrev');
  const navNext = document.getElementById('navNext');
  const settingsModal = document.getElementById('settingsModal');
  const settingsClose = document.getElementById('settingsClose');
  const timerContainer = document.querySelector('.timer');
  const timerBtn = document.getElementById('timerBtn');
  const timerDisplay = document.getElementById('timerDisplay');
  const timerModal = document.getElementById('timerModal');
  const timerClose = document.getElementById('timerClose');
  const timerMinutes = document.getElementById('timerMinutes');
  const timerStart = document.getElementById('timerStart');
  const timerStop = document.getElementById('timerStop');
  const timerDone = document.getElementById('timerDone');
  const passcodeSection = document.getElementById('passcodeSection');
  const passcodeInput = document.getElementById('passcodeInput');
  const passcodeSubmit = document.getElementById('passcodeSubmit');
  const settingsContent = document.getElementById('settingsContent');
  const autoSwitchGroup = document.getElementById('autoSwitchGroup');
  const settingsBgm = document.getElementById('settingsBgm');
  const settingsSfx = document.getElementById('settingsSfx');
  const volumeSlider = document.getElementById('volumeSlider');
  const brightnessGroup = document.getElementById('brightnessGroup');
  const bgModeGroup = document.getElementById('bgModeGroup');
  const favoritesOnly = document.getElementById('favoritesOnly');
  const openGridBtn = document.getElementById('openGrid');
  const gridModal = document.getElementById('gridModal');
  const gridClose = document.getElementById('gridClose');
  const gridContainer = document.getElementById('gridContainer');

  const STORAGE_KEYS = {
    settings: 'kss-settings',
    favorites: 'kss-favorites',
    last: 'kss-last-animation',
  };

  const defaultSettings = {
    autoSwitch: 30,
    bgm: false,
    sfx: true,
    volume: 0.7,
    brightness: 'normal',
    bgMode: 'black',
    favoritesOnly: false,
  };

  let settings = loadSettings();
  let favorites = loadFavorites();
  let currentIndex = loadLastIndex();
  let currentDef = null;
  let rafId = null;
  let startTime = 0;
  let autoTimer = null;
  let isMenuOpen = false;
  let pointerStart = null;
  let longPressTimer1 = null;
  let longPressTimer2 = null;
  let passcodeUnlocked = false;
  let tapHandler = null;
  let pointerDownHandler = null;
  let pointerMoveHandler = null;
  let pointerUpHandler = null;
  let currentDraw = null;
  let transition = null;
  let pointerMoved = false;
  let pointerCaptured = false;
  let timerState = {
    running: false,
    endAt: 0,
    duration: 0,
    tick: null,
    finished: false,
  };

  const synth = createSynth();

  const CATEGORY_LABELS = {
    'space': '宇宙',
    'terrace': '棚田',
    'horizon-drive': 'ドライブ',
    'karaoke-wave': 'カラオケ',
    'text': '文字',
    'ocean': '海',
    'vehicles': '乗り物',
    'clouds': '空',
    'numbers': '数字',
    'alphabet': 'アルファベット',
    'photos': '写真',
    'special': 'スペシャル',
  };

  const PHOTO_FILES = [
    'photo01.JPG',
    'photo02.PNG',
    'photo03.PNG',
    'photo04.jpg',
    'photo05.JPG',
    'photo06.JPG',
    'photo07.JPG',
    'photo08.JPG',
    'photo10.JPG',
    'phptp09.JPG',
    'photo11.JPG',
    'photo12.JPG',
    'photo13.JPG',
    'photo14.JPG',
    'photo15.jpg',
    'photo16.JPG',
    'photo17.JPG',
    'photo18.jpg',
    'photo19.JPG',
    'photo20.JPG',
    'photo21.jpg',
    'photo22.JPG',
    'photo23.JPG',
    'photo24.JPG',
    'photo25.JPG',
    'photo26.JPG',
    'photo27.JPG',
    'photo28.JPG',
    'photo29.JPG',
    'photo30.JPG',
    'photo31.JPG',
    'photo32.JPG',
    'photo33.JPG',
    'photo34.jpg',
    'photo35.JPG',
    'photo36.jpg',
    'photo37.JPG',
    'photo38.JPG',
    'photo39.JPG',
    'photo40.JPG',
    'photo41.JPG',
    'photo42.jpg',
    'photo43.JPG',
    'photo44.JPG',
    'photo45.JPG',
    'photo46.JPG',
    'photo47.JPG',
    'photo48.JPG',
  ];

  const photoImages = PHOTO_FILES.map((name) => {
    const img = new Image();
    img.src = `/assets/images/${name}`;
    return img;
  });

  function setTapHandler(fn) {
    tapHandler = fn || null;
  }

  function setInteractionHandlers(handlers) {
    tapHandler = handlers.tap || tapHandler;
    pointerDownHandler = handlers.down || null;
    pointerMoveHandler = handlers.move || null;
    pointerUpHandler = handlers.up || null;
  }

  function resetInteractionHandlers() {
    tapHandler = null;
    pointerDownHandler = null;
    pointerMoveHandler = null;
    pointerUpHandler = null;
  }

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const { clientWidth, clientHeight } = canvas;
    canvas.width = clientWidth * dpr;
    canvas.height = clientHeight * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
  }

  window.addEventListener('resize', resize);
  // 長押しのOS標準メニューを防ぐ
  window.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });
  window.addEventListener('selectstart', (e) => {
    e.preventDefault();
  });
  resize();

  const animations = buildAnimationLibrary();

  function buildAnimationLibrary() {
    const library = [];

    const add = (category, variants) => {
      variants.forEach((variant, i) => {
        library.push({
          id: `${category}-${i + 1}`,
          category,
          variant: i + 1,
          create: variant,
          thumb: null,
        });
      });
    };

    add('space', [
      () => spaceWithGimmicks(() => starfield({ speed: 0.3, streaks: 40 })),
      () => {
        const speedState = {};
        const levels = [0.4, 1, 2, 3]; // ゆっくり / ふつう / 速い / 超速い
        const baseFactory = () => orbitPlanets(speedState);
        return spaceWithGimmicks(baseFactory, {
          onTap(px, py, state) {
            if (!speedState.radii || !speedState.multipliers) return false;
            const w = canvas.clientWidth;
            const h = canvas.clientHeight;
            const cx = w / 2;
            const cy = h / 2;
            const dx = px - cx;
            const dy = py - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);

            let bestIndex = -1;
            let bestDiff = Infinity;
            speedState.radii.forEach((r, i) => {
              const diff = Math.abs(dist - r);
              if (diff < bestDiff) {
                bestDiff = diff;
                bestIndex = i;
              }
            });

            if (bestIndex === -1 || bestDiff > 24) {
              return false;
            }

            const current = speedState.multipliers[bestIndex] ?? 1;
            let idx = levels.indexOf(current);
            if (idx === -1) idx = 1;
            const next = levels[(idx + 1) % levels.length];
            speedState.multipliers[bestIndex] = next;
            state.hueShift = (state.hueShift + 30) % 360;
            return true;
          },
        });
      },
      () => spaceWithGimmicks(() => shootingStars()),
    ]);

    add('terrace', [
      () => terraceWithGimmicks((shared) => flowingTerraces({ hue: 90 }, shared)),   // 黄緑
      () => terraceWithGimmicks((shared) => flowingTerraces({ hue: 140, wobble: 0.8 }, shared)), // 濃い緑
      () => terraceWithGimmicks((shared) => flowingTerraces({ hue: 50, gradient: true }, shared)), // 稲穂の黄色
    ]);

    add('horizon-drive', [
      () => horizonDriveWithSpeed({ lines: 7, tint: '#4da8ff' }),   // 青
      () => horizonDriveWithSpeed({ lines: 10, tint: '#9a63ff' }),  // 紫
      () => horizonDriveWithSpeed({ lines: 6, tint: '#c285ff', fog: true }), // バイオレット
    ]);

    add('karaoke-wave', [
      () => karaokeWithNotes(() => karaokeBars({ tone: 0.6 })),
      () => karaokeWithNotes(() => karaokeBars({ tone: 0.3, wobble: 0.4 })),
      () => karaokeWithNotes(() => karaokeBars({ tone: 0.8, trail: true })),
    ]);

    add('text', [
      () => textDance({ style: 'bounce' }),
      () => textDance({ style: 'wave' }),
      () => textDance({ style: 'spin' }),
    ]);

    add('ocean', [
      () => oceanWithGimmicks(() => oceanDrift({ fish: 10 })),
      () => oceanWithGimmicks(() => oceanDrift({ fish: 16, bubbles: true })),
      () => oceanWithGimmicks(() => oceanDrift({ fish: 8, big: true })),
    ]);

    add('vehicles', [
      () => vehiclesWithGimmicks(() => silhouettes({ speed: 1 })),
      () => vehiclesWithGimmicks(() => silhouettes({ speed: 1.5, dense: true })),
      () => vehiclesWithGimmicks(() => silhouettes({ speed: 0.8, flip: true })),
    ]);

    add('clouds', [
      () => skyShooter({ density: 6, theme: 'morning' }),
      () => skyShooter({ density: 8, theme: 'day' }),
      () => skyShooter({ density: 10, theme: 'night' }),
    ]);

    add('numbers', [
      () => numberStream({ spin: true }),
      () => numberCounter(),
      () => numberBounce(),
    ]);

    add('alphabet', [
      () => alphabetFlow({ spiral: true }),
      () => alphabetCounter(),
      () => alphabetWordMerge(),
    ]);

    add('photos', [
      () => photoFlow({ density: 5, speed: 1 }),
      () => photoFlow({ density: 7, speed: 1.2 }),
      () => photoFlow({ density: 6, speed: 0.9 }),
    ]);

    add('special', [
      () => specialMarket(),
    ]);

    return library;
  }

  function startAnimation(index, opts = {}) {
    if (!animations.length) return;
    currentIndex = (index + animations.length) % animations.length;
    saveLastIndex(currentIndex);
    const previousDraw = currentDraw;
    const previousDef = currentDef;
    const def = animations[currentIndex];
    currentDef = def;
    updateTimerPosition(def.category);
    resetInteractionHandlers();
    currentDraw = def.create();
    const direction = opts.step && opts.step < 0 ? -1 : 1;
    if (previousDraw && previousDef && opts.withSlide !== false) {
      transition = {
        start: performance.now(),
        duration: 500,
        direction,
        fromDraw: previousDraw,
      };
    } else {
      transition = null;
    }
    if (!rafId) {
      startTime = performance.now();
      rafId = requestAnimationFrame(loop);
    }
    restartAutoTimer();
  }

  function nextAnimation(step = 1) {
    const list = filteredList();
    if (!list.length) return;
    const currentId = animations[currentIndex]?.id;
    const idx = Math.max(0, list.findIndex(i => i.id === currentId));
    const next = list[(idx + step + list.length) % list.length];
    const newIndex = animations.findIndex(a => a.id === next.id);
    startAnimation(newIndex, { step });
    triggerSfx('switch');
  }

  function filteredList() {
    if (settings.favoritesOnly && favorites.size) {
      return animations.filter(a => favorites.has(a.id));
    }
    return animations;
  }

  function updateTimerPosition(category) {
    if (!timerContainer) return;
    if (category === 'clouds') {
      timerContainer.style.top = '48px';
    } else {
      timerContainer.style.top = '10px';
    }
  }

  function toggleFavorite() {
    if (!currentDef) return;
    const id = currentDef.id;
    if (favorites.has(id)) {
      favorites.delete(id);
      showToast('お気に入り解除');
    } else {
      favorites.add(id);
      showToast('★ お気に入り追加');
      triggerSfx('sparkle');
    }
    saveFavorites();
  }

  function showToast(text) {
    toastEl.textContent = text;
    toastEl.classList.add('show');
    setTimeout(() => toastEl.classList.remove('show'), 1400);
  }

  function restartAutoTimer() {
    clearInterval(autoTimer);
    if (!settings.autoSwitch) return;
    autoTimer = setInterval(() => nextAnimation(1), settings.autoSwitch * 1000);
  }

  function handlePointerDown(ev) {
    ev.preventDefault();
    pointerStart = { x: ev.clientX, y: ev.clientY, time: Date.now() };
    pointerMoved = false;
    pointerCaptured = false;
    const rect = canvas.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;
    let suppressLongPress = false;
    if (pointerDownHandler) {
      suppressLongPress = pointerDownHandler(x, y) === true;
    }
    if (suppressLongPress) {
      pointerCaptured = true; // dragなどの独自処理中はスワイプ遷移を抑止
    }
    if (!suppressLongPress) {
      longPressTimer1 = setTimeout(() => {
        if (!pointerMoved) toggleFavorite();
      }, 1000);
      longPressTimer2 = setTimeout(() => {
        if (!pointerMoved) openMenu();
      }, 2000);
    }
  }

  function handlePointerUp(ev) {
    ev.preventDefault();
    clearTimeout(longPressTimer1);
    clearTimeout(longPressTimer2);

    const end = { x: ev.clientX, y: ev.clientY, time: Date.now() };
    if (pointerStart && !pointerCaptured) {
      const dx = end.x - pointerStart.x;
      const dy = end.y - pointerStart.y;
      const dt = end.time - pointerStart.time;
      if (dt < 250 && Math.abs(dx) < 20 && Math.abs(dy) < 20) {
        const rect = canvas.getBoundingClientRect();
        const x = end.x - rect.left;
        const y = end.y - rect.top;
        if (tapHandler) {
          tapHandler(x, y);
        }
      }
    }
    if (pointerUpHandler) {
      const rect = canvas.getBoundingClientRect();
      pointerUpHandler(end.x - rect.left, end.y - rect.top);
    }
    pointerStart = null;
    pointerCaptured = false;
  }

  function openMenu() {
    isMenuOpen = true;
    longPressMenu.classList.remove('hidden');
    longPressMenu.setAttribute('aria-hidden', 'false');
  }

  function closeMenu() {
    isMenuOpen = false;
    longPressMenu.classList.add('hidden');
    longPressMenu.setAttribute('aria-hidden', 'true');
  }

  function toggleBgMode(mode) {
    settings.bgMode = mode;
    document.body.setAttribute('data-bg', mode === 'white' ? 'white' : 'black');
    saveSettings();
  }

  function setBrightness(level) {
    settings.brightness = level;
    const attr =
      level === 'dark' ? 'dark' :
      level === 'ultra' ? 'ultra' : 'normal';
    document.body.setAttribute('data-brightness', attr);
    saveSettings();
  }

  canvas.addEventListener('pointerdown', handlePointerDown);
  canvas.addEventListener('pointerup', handlePointerUp);
  canvas.addEventListener('pointerleave', () => {
    clearTimeout(longPressTimer1);
    clearTimeout(longPressTimer2);
    if (pointerUpHandler) {
      pointerUpHandler(-1, -1);
    }
    pointerCaptured = false;
  });
  canvas.addEventListener('pointermove', (ev) => {
    ev.preventDefault();
    if (pointerStart) {
      const dx = ev.clientX - pointerStart.x;
      const dy = ev.clientY - pointerStart.y;
      if (Math.abs(dx) > 18 || Math.abs(dy) > 18) {
        pointerMoved = true;
        clearTimeout(longPressTimer1);
        clearTimeout(longPressTimer2);
      }
    }
    if (!pointerMoveHandler) return;
    const rect = canvas.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;
    pointerMoveHandler(x, y);
  });

  longPressMenu.addEventListener('pointerup', () => {
    closeMenu();
  });

  bgmToggleBtn.addEventListener('click', () => {
    settings.bgm = !settings.bgm;
    updateBgm();
    saveSettings();
  });

  menuBgmToggle.addEventListener('click', () => {
    settings.bgm = !settings.bgm;
    updateBgm();
    saveSettings();
  });

  settingsBtn.addEventListener('click', () => {
    settingsModal.classList.remove('hidden');
    settingsModal.setAttribute('aria-hidden', 'false');
    passcodeInput.value = '';
    passcodeSection.classList.remove('hidden');
    settingsContent.classList.add('hidden');
    passcodeUnlocked = false;
    passcodeInput.focus();
  });

  settingsClose.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
    settingsModal.setAttribute('aria-hidden', 'true');
  });

  passcodeSubmit.addEventListener('click', tryUnlock);
  passcodeInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') tryUnlock();
  });

  function tryUnlock() {
    if (passcodeInput.value === '1234') {
      passcodeUnlocked = true;
      passcodeSection.classList.add('hidden');
      settingsContent.classList.remove('hidden');
    } else {
      showToast('パスコードが違います');
    }
  }

  autoSwitchGroup.addEventListener('click', (e) => {
    if (e.target.dataset?.value) {
      settings.autoSwitch = Number(e.target.dataset.value);
      saveSettings();
      renderSettings();
      restartAutoTimer();
    }
  });

  brightnessGroup.addEventListener('click', (e) => {
    if (e.target.dataset?.value) {
      setBrightness(e.target.dataset.value);
      renderSettings();
    }
  });

  bgModeGroup.addEventListener('click', (e) => {
    if (e.target.dataset?.value) {
      toggleBgMode(e.target.dataset.value);
      renderSettings();
    }
  });

  settingsBgm.addEventListener('change', () => {
    settings.bgm = settingsBgm.checked;
    updateBgm();
    saveSettings();
  });

  settingsSfx.addEventListener('change', () => {
    settings.sfx = settingsSfx.checked;
    saveSettings();
  });

  favoritesOnly.addEventListener('change', () => {
    settings.favoritesOnly = favoritesOnly.checked;
    saveSettings();
  });

  // ---- Timer ----
  const timerDefaults = { minutes: 5 };

  function isTimerDoneVisible() {
    return !timerDone.classList.contains('hidden');
  }

  function openTimerModal() {
    timerModal.classList.remove('hidden');
    timerModal.setAttribute('aria-hidden', 'false');
    const minutes = timerState.duration ? Math.round(timerState.duration / 60000) : '';
    timerMinutes.value = minutes;
    setTimeout(() => timerMinutes.focus(), 50);
  }

  function closeTimerModal() {
    timerModal.classList.add('hidden');
    timerModal.setAttribute('aria-hidden', 'true');
  }

  function hideTimerDone() {
    timerDone.classList.add('hidden');
    timerDone.setAttribute('aria-hidden', 'true');
  }

  function showTimerDone() {
    timerDone.classList.remove('hidden');
    timerDone.setAttribute('aria-hidden', 'false');
  }

  function formatTime(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function resetTimer(clearDuration = false) {
    clearInterval(timerState.tick);
    timerState.tick = null;
    timerState.running = false;
    if (clearDuration) {
      timerState.duration = 0;
      timerState.finished = false;
      timerDisplay.textContent = '--:--';
    } else {
      timerState.finished = true;
      timerDisplay.textContent = '00:00';
    }
    hideTimerDone();
  }

  function updateTimerDisplay() {
    if (!timerState.running) {
      timerDisplay.textContent = timerState.finished ? '00:00' : '--:--';
      return;
    }
    const remaining = timerState.endAt - Date.now();
    timerDisplay.textContent = formatTime(remaining);
    if (remaining <= 0) {
      resetTimer(false);
      showTimerDone();
    }
  }

  function startTimer(minutes) {
    const mins = Math.min(120, Math.max(1, Math.round(minutes || timerDefaults.minutes)));
    const duration = mins * 60 * 1000;
    timerState.duration = duration;
    timerState.endAt = Date.now() + duration;
    timerState.running = true;
    timerState.finished = false;
    clearInterval(timerState.tick);
    timerState.tick = setInterval(updateTimerDisplay, 500);
    hideTimerDone();
    updateTimerDisplay();
    showToast(`タイマー ${mins}分`);
  }

  function startTimerFromInput() {
    let mins = Number(timerMinutes.value);
    if (!Number.isFinite(mins) || mins <= 0) {
      mins = timerDefaults.minutes;
    }
    startTimer(mins);
    closeTimerModal();
  }

  function restartLastTimer() {
    resetTimer(false);
  }

  timerBtn.addEventListener('click', () => {
    hideTimerDone();
    openTimerModal();
  });

  timerClose.addEventListener('click', closeTimerModal);
  timerStart.addEventListener('click', startTimerFromInput);
  timerStop.addEventListener('click', () => resetTimer(true));
  timerMinutes.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') startTimerFromInput();
  });
  timerModal.addEventListener('click', (e) => {
    if (e.target === timerModal) closeTimerModal();
  });
  timerDone.addEventListener('click', restartLastTimer);

  updateTimerDisplay();

  volumeSlider.addEventListener('input', () => {
    settings.volume = Number(volumeSlider.value);
    synth.setVolume(settings.volume);
    saveSettings();
  });

  function openGridModal() {
    gridModal.classList.remove('hidden');
    gridModal.setAttribute('aria-hidden', 'false');
    renderGrid();
  }

  function closeGridModal() {
    gridModal.classList.add('hidden');
    gridModal.setAttribute('aria-hidden', 'true');
  }

  function renderGrid() {
    gridContainer.innerHTML = animations.map((anim, index) => {
      const label = CATEGORY_LABELS[anim.category] || anim.category;
      const num = index + 1;
      const thumbSrc = generateThumbnail(anim);
      const thumbClass = thumbSrc ? 'grid-thumb' : `grid-thumb grid-thumb-${anim.category}`;
      const styleAttr = thumbSrc ? ` style="background-image:url('${thumbSrc}')"` : '';
      return `
        <button class="grid-item" data-index="${index}">
          <span class="grid-item-index">#${num}</span>
          <div class="${thumbClass}"${styleAttr}></div>
          <span class="grid-item-label">${label}</span>
          <span class="grid-item-tag">パターン ${anim.variant}</span>
        </button>
      `;
    }).join('');
  }

  openGridBtn.addEventListener('click', openGridModal);
  gridClose.addEventListener('click', closeGridModal);
  gridModal.addEventListener('click', (e) => {
    if (e.target === gridModal) {
      closeGridModal();
    }
  });

  gridContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.grid-item');
    if (!btn) return;
    const idx = Number(btn.dataset.index);
    if (Number.isFinite(idx)) {
      startAnimation(idx, { withSlide: true });
      closeGridModal();
    }
  });

  if (navPrev) navPrev.addEventListener('click', () => nextAnimation(-1));
  if (navNext) navNext.addEventListener('click', () => nextAnimation(1));

  document.addEventListener('keydown', (e) => {
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (isTimerDoneVisible()) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        restartLastTimer();
      }
      return;
    }
    if (!timerModal.classList.contains('hidden')) {
      if (e.key === 'Enter') {
        e.preventDefault();
        startTimerFromInput();
      }
      return;
    }
    const modalOpen = !settingsModal.classList.contains('hidden') || !gridModal.classList.contains('hidden');
    if (modalOpen) return;

    if (e.key === 'ArrowRight' || e.key === 'Enter') {
      e.preventDefault();
      nextAnimation(1);
    } else if (e.key === 'ArrowLeft' || e.key === ' ') {
      e.preventDefault();
      nextAnimation(-1);
    }
  });

  function generateThumbnail(anim) {
    if (anim.thumb) return anim.thumb;
    const w = 160;
    const h = 90;
    const dpr = window.devicePixelRatio || 1;

    // まず実際のアニメ描画を試す
    try {
      const off = document.createElement('canvas');
      const offCtx = off.getContext('2d');
      off.width = w * dpr;
      off.height = h * dpr;
      offCtx.setTransform(1, 0, 0, 1, 0, 0);
      offCtx.scale(dpr, dpr);
      const fakeCanvas = { clientWidth: w, clientHeight: h };
      const draw = anim.create();
      draw(offCtx, fakeCanvas, 4);
      const url = off.toDataURL('image/png');
      if (url && url.startsWith('data:image')) {
        anim.thumb = url;
        return anim.thumb;
      }
    } catch {
      // fallthrough to placeholder
    }

    // Safari/iPad向けフォールバックのシンプルサムネ
    const fallback = document.createElement('canvas');
    const fc = fallback.getContext('2d');
    fallback.width = w * dpr;
    fallback.height = h * dpr;
    fc.setTransform(1, 0, 0, 1, 0, 0);
    fc.scale(dpr, dpr);

    drawPlaceholderThumb(fc, w, h, anim.category, anim.variant);
    anim.thumb = fallback.toDataURL('image/png');
    return anim.thumb;
  }

  function drawPlaceholderThumb(ctx, w, h, category, variant) {
    const palettes = {
      space: ['#0b1026', '#14305c', '#2f6bc1'],
      terrace: ['#1c3a2f', '#2d6b45', '#5caf6a'],
      'horizon-drive': ['#0f1c2d', '#1d3d6b', '#4da8ff'],
      'karaoke-wave': ['#1a0f2f', '#32285e', '#6a4bc8'],
      text: ['#111', '#333', '#888'],
      ocean: ['#0b2a45', '#0f4f7a', '#23a7e1'],
      vehicles: ['#1a1a1a', '#333333', '#808080'],
      clouds: ['#0a1a3a', '#345c9c', '#9ec8ff'],
      numbers: ['#101010', '#303030', '#b3b3b3'],
      alphabet: ['#101018', '#2d2d48', '#9a9ad4'],
      photos: ['#242424', '#444', '#888'],
      special: ['#2c1b1b', '#5c2a2a', '#f2b441'],
    };
    const palette = palettes[category] || ['#1a1a1a', '#333', '#777'];
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, palette[0]);
    grad.addColorStop(1, palette[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // icon-ish shapes
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.fillStyle = palette[2];
    if (category === 'space') {
      ctx.beginPath();
      ctx.arc(-24, -10, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(18, 6, 20, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 3;
      ctx.stroke();
    } else if (category === 'terrace') {
      ctx.fillRect(-60, 10, 120, 12);
      ctx.fillRect(-48, -4, 96, 12);
      ctx.fillRect(-36, -18, 72, 12);
    } else if (category === 'horizon-drive') {
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-60, 30);
      ctx.lineTo(0, -20);
      ctx.lineTo(60, 30);
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-10, 30);
      ctx.lineTo(0, 0);
      ctx.lineTo(10, 30);
      ctx.stroke();
    } else if (category === 'karaoke-wave') {
      ctx.strokeStyle = palette[2];
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let x = -60; x <= 60; x += 8) {
        const y = Math.sin((x / 60) * Math.PI * 2 + variant) * 14;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    } else if (category === 'text') {
      ctx.fillRect(-50, -25, 100, 10);
      ctx.fillRect(-50, 5, 70, 10);
    } else if (category === 'ocean') {
      ctx.beginPath();
      ctx.moveTo(-60, 10);
      for (let x = -60; x <= 60; x += 10) {
        const y = Math.sin(x / 20 + variant) * 6;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(60, 30);
      ctx.lineTo(-60, 30);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath();
      ctx.arc(20, -4, 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (category === 'vehicles') {
      ctx.fillRect(-50, 10, 100, 14);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillRect(-30, -12, 60, 16);
    } else if (category === 'clouds') {
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath();
      ctx.arc(-20, 0, 18, 0, Math.PI * 2);
      ctx.arc(0, -8, 16, 0, Math.PI * 2);
      ctx.arc(20, 0, 18, 0, Math.PI * 2);
      ctx.fill();
    } else if (category === 'numbers' || category === 'alphabet') {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = '28px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const text = category === 'numbers' ? `${variant * 3 - 2}` : String.fromCharCode(64 + variant);
      ctx.fillText(text, 0, 2);
    } else if (category === 'photos') {
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(-38, -24, 76, 52);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath();
      ctx.arc(-10, -4, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-30, 8, 60, 8);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function loop(now) {
    const t = (now - startTime) / 1000;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (transition && transition.fromDraw && currentDraw) {
      const elapsed = now - transition.start;
      const progress = Math.min(1, elapsed / transition.duration);
      const dir = transition.direction || 1;
      const w = canvas.clientWidth;

      ctx.save();
      ctx.translate(-progress * dir * w, 0);
      transition.fromDraw(ctx, canvas, t);
      ctx.restore();

      ctx.save();
      ctx.translate((1 - progress) * dir * w, 0);
      currentDraw(ctx, canvas, t);
      ctx.restore();

      if (progress >= 1) {
        transition = null;
      }
    } else if (currentDraw) {
      ctx.save();
      currentDraw(ctx, canvas, t);
      ctx.restore();
    }

    rafId = requestAnimationFrame(loop);
  }

  function renderSettings() {
    autoSwitchGroup.innerHTML = [10, 30, 60].map(sec => {
      const active = sec === settings.autoSwitch;
      return `<button class="pill ${active ? 'active' : ''}" data-value="${sec}">${sec}秒</button>`;
    }).join('');

    brightnessGroup.innerHTML = [
      { key: 'normal', label: '通常' },
      { key: 'dark', label: 'ダーク' },
      { key: 'ultra', label: '超ダーク' },
    ].map(item => {
      const active = item.key === settings.brightness;
      return `<button class="pill ${active ? 'active' : ''}" data-value="${item.key}">${item.label}</button>`;
    }).join('');

    bgModeGroup.innerHTML = [
      { key: 'black', label: '黒背景' },
      { key: 'white', label: '白背景' },
    ].map(item => {
      const active = item.key === settings.bgMode;
      return `<button class="pill ${active ? 'active' : ''}" data-value="${item.key}">${item.label}</button>`;
    }).join('');

    settingsBgm.checked = settings.bgm;
    settingsSfx.checked = settings.sfx;
    volumeSlider.value = settings.volume;
    favoritesOnly.checked = settings.favoritesOnly;
    document.body.setAttribute('data-bg', settings.bgMode === 'white' ? 'white' : 'black');
    setBrightness(settings.brightness);
    updateBgmLabel();
  }

  function updateBgmLabel() {
    bgmToggleBtn.textContent = settings.bgm ? 'BGM ON' : 'BGM OFF';
    menuBgmToggle.textContent = settings.bgm ? 'BGM OFF' : 'BGM ON';
  }

  function updateBgm() {
    if (settings.bgm) {
      synth.startBgm();
    } else {
      synth.stopBgm();
    }
    updateBgmLabel();
  }

  function triggerSfx(type) {
    if (!settings.sfx) return;
    if (type === 'sparkle') synth.sparkle();
    if (type === 'switch') synth.switch();
  }

  function saveSettings() {
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
  }

  function loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.settings);
      return raw ? { ...defaultSettings, ...JSON.parse(raw) } : { ...defaultSettings };
    } catch {
      return { ...defaultSettings };
    }
  }

  function saveFavorites() {
    localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify([...favorites]));
  }

  function loadFavorites() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.favorites);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  }

  function saveLastIndex(index) {
    localStorage.setItem(STORAGE_KEYS.last, String(index));
  }

  function loadLastIndex() {
    const raw = localStorage.getItem(STORAGE_KEYS.last);
    const num = Number(raw);
    return Number.isFinite(num) ? num : 0;
  }

  renderSettings();
  synth.setVolume(settings.volume);
  updateBgm();
  startAnimation(currentIndex, { withSlide: false });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  // ---- Animation primitives ----
  function starfield(opts = {}) {
    const stars = [];
    const count = 120;
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random(),
        y: Math.random(),
        z: Math.random(),
        speed: (Math.random() * 0.6 + 0.4) * (opts.speed || 0.3),
      });
    }
    return (ctx, canvas, t) => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.fillStyle = 'rgba(10,10,20,0.8)';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#fff';
      stars.forEach(s => {
        s.y += s.speed * 0.002 * h;
        if (s.y > 1) s.y = 0;
        const size = (1 - s.z) * 2.5;
        ctx.globalAlpha = 0.3 + 0.7 * (1 - s.z);
        ctx.beginPath();
        ctx.arc(s.x * w, s.y * h, size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    };
  }

  function spaceWithGimmicks(makeBase, opts = {}) {
    const baseDraw = makeBase();
    const state = {
      hueShift: 200,
      twinkleSpeed: 1,
      extras: [],
      meteors: [],
      entities: [],
    };

    const createStar = () => ({
      x: Math.random(),
      y: Math.random(),
      r: 1.5 + Math.random() * 2,
      phase: Math.random() * Math.PI * 2,
    });

    state.extras = Array.from({ length: 18 }, createStar);

    const createEntity = (type, side) => ({
      type,
      x: side === 'left' ? -0.1 : 1.1,
      y: type === 'alien' ? 0.7 + Math.random() * 0.2 : 0.2 + Math.random() * 0.3,
      speed: type === 'alien' ? 0.04 : 0.08,
      dir: side === 'left' ? 1 : -1,
      size: type === 'alien' ? 26 : 40,
      dragging: false,
    });

    state.entities.push(createEntity('alien', 'left'));
    state.entities.push(createEntity('ship', 'right'));

    const spawnMeteorBurst = () => {
      const count = 4;
      for (let i = 0; i < count; i++) {
        state.meteors.push({
          x: Math.random() * 0.4 + 0.3,
          y: -0.2,
          vx: 0.4 + Math.random() * 0.3,
          vy: 0.5 + Math.random() * 0.3,
          life: 0,
        });
      }
    };

    const tapSpace = (px, py) => {
      if (opts.onTap && opts.onTap(px, py, state) === true) {
        return true;
      }
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;

      for (const ent of state.entities) {
        const cx = ent.x * w;
        const cy = ent.y * h;
        const half = ent.size;
        if (px >= cx - half && px <= cx + half && py >= cy - half && py <= cy + half) {
          ent.speed = ent.speed > 0.08 ? ent.speed * 0.5 : ent.speed * 2.0;
          return true;
        }
      }

      const choice = Math.floor(Math.random() * 4);
      if (choice === 0) {
        state.hueShift = (state.hueShift + 40 + Math.random() * 60) % 360;
      } else if (choice === 1) {
        state.twinkleSpeed = state.twinkleSpeed < 1.5 ? 2.5 : 0.8;
      } else if (choice === 2) {
        spawnMeteorBurst();
      } else {
        state.extras.push(createStar());
      }
      return true;
    };

    let dragTarget = null;

    const hitEntity = (px, py) => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      for (const ent of state.entities) {
        const cx = ent.x * w;
        const cy = ent.y * h;
        const half = ent.size;
        if (px >= cx - half && px <= cx + half && py >= cy - half && py <= cy + half) {
          return ent;
        }
      }
      return null;
    };

    setInteractionHandlers({
      tap: tapSpace,
      down(x, y) {
        const target = hitEntity(x, y);
        if (target) {
          dragTarget = target;
          dragTarget.dragging = true;
          return true;
        }
        return false;
      },
      move(x, y) {
        if (!dragTarget) return;
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        dragTarget.x = Math.min(1.1, Math.max(-0.1, x / w));
        dragTarget.y = Math.min(1.1, Math.max(-0.1, y / h));
      },
      up() {
        if (dragTarget) {
          dragTarget.dragging = false;
          dragTarget = null;
        }
      },
    });

    return (ctx, canvas, t) => {
      baseDraw(ctx, canvas, t);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;

      state.extras.forEach((s) => {
        const phase = state.twinkleSpeed * t + s.phase;
        const alpha = 0.3 + 0.7 * (Math.sin(phase) * 0.5 + 0.5);
        const hue = state.hueShift;
        ctx.fillStyle = `hsla(${hue},80%,70%,${alpha})`;
        ctx.beginPath();
        ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
        ctx.fill();
      });

      for (let i = state.meteors.length - 1; i >= 0; i--) {
        const m = state.meteors[i];
        m.x += m.vx * 0.01;
        m.y += m.vy * 0.01;
        m.life += 0.02;
        if (m.x > 1.3 || m.y > 1.3 || m.life > 1.2) {
          state.meteors.splice(i, 1);
          continue;
        }
        const px = m.x * w;
        const py = m.y * h;
        const len = 90;
        const grad = ctx.createLinearGradient(px, py, px - len, py - len * 0.5);
        grad.addColorStop(0, `hsla(${state.hueShift},90%,80%,0.9)`);
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px - len, py - len * 0.5);
        ctx.stroke();
      }

      state.entities.forEach((ent) => {
        if (!ent.dragging) {
          ent.x += ent.speed * 0.01 * ent.dir;
        }
        if (ent.dir > 0 && ent.x > 1.3) ent.x = -0.3;
        if (ent.dir < 0 && ent.x < -0.3) ent.x = 1.3;
        const cx = ent.x * w;
        const cy = ent.y * h;
        ctx.save();
        ctx.translate(cx, cy);
        if (ent.type === 'alien') {
          ctx.fillStyle = '#7fffd4';
          ctx.beginPath();
          ctx.ellipse(0, -8, 10, 12, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(-4, -10, 2, 0, Math.PI * 2);
          ctx.arc(4, -10, 2, 0, Math.PI * 2);
          ctx.fillStyle = '#001018';
          ctx.fill();
          ctx.fillStyle = '#7fffd4';
          ctx.beginPath();
          ctx.ellipse(0, 4, 14, 10, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(0,0,0,0.3)';
          ctx.beginPath();
          ctx.moveTo(-10, 10);
          ctx.lineTo(-6, 18);
          ctx.moveTo(10, 10);
          ctx.lineTo(14, 18);
          ctx.stroke();
        } else {
          ctx.fillStyle = '#f5f5f5';
          ctx.beginPath();
          ctx.moveTo(-20, 0);
          ctx.lineTo(16, -10);
          ctx.lineTo(16, 10);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = `hsl(${state.hueShift},80%,70%)`;
          ctx.beginPath();
          ctx.ellipse(-4, 0, 10, 6, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(0,0,0,0.35)';
          ctx.beginPath();
          ctx.moveTo(-20, 0);
          ctx.lineTo(16, -10);
          ctx.lineTo(16, 10);
          ctx.closePath();
          ctx.stroke();
        }
        ctx.restore();
      });
    };
  }

  function orbitPlanets(speedState) {
    const planets = [
      { r: 60, size: 9, speed: 0.4, hue: 200 },
      { r: 110, size: 14, speed: 0.25, hue: 120 },
      { r: 170, size: 20, speed: 0.18, hue: 40 },
    ];
    if (speedState) {
      speedState.multipliers = speedState.multipliers || planets.map(() => 1);
      speedState.radii = planets.map(p => p.r);
      speedState.angles = speedState.angles || planets.map(() => 0);
    }
    return (ctx, canvas, t) => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const cx = w / 2;
      const cy = h / 2;
      ctx.fillStyle = 'rgba(5,5,20,0.9)';
      ctx.fillRect(0, 0, w, h);
      planets.forEach((p, i) => {
        const mul = speedState ? (speedState.multipliers[i] ?? 1) : 1;
        const ang = t * p.speed * mul + i;
        if (speedState) speedState.angles[i] = ang;
        const x = cx + Math.cos(ang) * p.r;
        const y = cy + Math.sin(ang) * p.r;
        ctx.strokeStyle = `rgba(255,255,255,0.1)`;
        ctx.beginPath();
        ctx.arc(cx, cy, p.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = `hsl(${p.hue},70%,60%)`;
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(cx, cy, 12, 0, Math.PI * 2);
      ctx.fill();
    };
  }

  function shootingStars() {
    const stars = Array.from({ length: 12 }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: Math.random() * 0.3 + 0.7,
      life: Math.random(),
    }));
    return (ctx, canvas, t) => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.fillStyle = 'rgba(0,0,10,0.8)';
      ctx.fillRect(0, 0, w, h);
      stars.forEach(s => {
        s.x += s.vx * 0.002;
        s.y += s.vx * 0.0009;
        s.life += 0.01;
        if (s.x > 1.2 || s.y > 1.2) {
          s.x = -0.1;
          s.y = Math.random() * 0.4;
          s.vx = Math.random() * 0.3 + 0.7;
          s.life = 0;
        }
        const px = s.x * w;
        const py = s.y * h;
        const len = 80 * (1 - s.life);
        const grad = ctx.createLinearGradient(px, py, px - len, py - len * 0.6);
        grad.addColorStop(0, 'rgba(255,255,255,0.9)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px - len, py - len * 0.6);
        ctx.stroke();
      });
    };
  }

  function flowingTerraces(opts, shared) {
    const lines = 12;
    const wobbleBase = opts.wobble || 0.5;
    if (shared) {
      shared.pulses = shared.pulses || [];
    }
    return (ctx, canvas, t) => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (opts.gradient) {
        const bg = ctx.createLinearGradient(0, 0, 0, h);
        bg.addColorStop(0, `hsl(${opts.hue},40%,10%)`);
        bg.addColorStop(1, `hsl(${opts.hue + 20},40%,6%)`);
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);
      } else {
        ctx.fillStyle = `hsl(${opts.hue},40%,8%)`;
        ctx.fillRect(0, 0, w, h);
      }
      const now = performance.now() / 1000;
      const pulses = shared ? shared.pulses : null;
      if (pulses) {
        for (let i = pulses.length - 1; i >= 0; i--) {
          const age = now - pulses[i].t0;
          if (age > 2.2) pulses.splice(i, 1);
        }
      }
      for (let i = 0; i < lines; i++) {
        const baseY = (h / lines) * i;
        let extra = 0;
        if (pulses && pulses.length) {
          const lineCenter = baseY + 20;
          pulses.forEach(p => {
            const dy = lineCenter - p.y * h;
            const dist = Math.abs(dy);
            const norm = Math.max(0, 1 - dist / (h * 0.7));
            if (!norm) return;
            const age = now - p.t0;
            const timeDecay = Math.max(0, 1 - age / 2.0);
            if (!timeDecay) return;
            const phase = age * 9 - dist * 0.06;
            extra += Math.sin(phase) * 28 * norm * timeDecay;
          });
        }
        const y = baseY + (Math.sin(t * 0.6 + i) * wobbleBase * 20) + extra;
        const thickness = 40;
        const grad = ctx.createLinearGradient(0, y, w, y + thickness);
        grad.addColorStop(0, `hsla(${opts.hue},80%,45%,0.2)`);
        grad.addColorStop(1, `hsla(${opts.hue + 20},90%,65%,0.8)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.quadraticCurveTo(w * 0.3, y + 30, w * 0.6, y + 10);
        ctx.quadraticCurveTo(w * 0.9, y - 10, w, y + 20);
        ctx.lineTo(w, y + thickness);
        ctx.lineTo(0, y + thickness);
        ctx.closePath();
        ctx.fill();
      }
    };
  }

  function horizonDrive(opts) {
    return (ctx, canvas, t) => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.fillStyle = 'rgba(10,10,20,1)';
      ctx.fillRect(0, 0, w, h);
      const horizon = h * 0.35;
      const roadWidth = w * 0.6;
      ctx.fillStyle = opts.tint || '#33bbee';
      for (let i = 0; i < opts.lines; i++) {
        const speedMul = opts.speedState ? opts.speedState.mult : 1;
        const y = horizon + (i * (h - horizon) / opts.lines + (t * 60 * speedMul) % (h / opts.lines));
        const scale = (y - horizon) / (h - horizon);
        const width = roadWidth * (1 + scale * 2);
        ctx.globalAlpha = 0.7 - scale * 0.4;
        ctx.fillRect((w - width) / 2, y, width, 6);
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = opts.fog ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)';
      ctx.fillRect(0, 0, w, h);
    };
  }

  function horizonDriveWithSpeed(opts) {
    const speedState = { mult: 1 };
    const speeds = [0.6, 1, 1.6];
    setInteractionHandlers({
      tap() {
        const idx = speeds.indexOf(speedState.mult);
        speedState.mult = speeds[(idx + 1) % speeds.length];
        return true;
      },
    });
    return horizonDrive({ ...opts, speedState });
  }

  function terraceWithGimmicks(makeBase) {
    const shared = { pulses: [], drag: null };
    const baseDraw = makeBase(shared);
    const dragState = { active: false, x0: 0, y0: 0, x1: 0, y1: 0, t0: 0 };

    setInteractionHandlers({
      tap(x, y) {
        const now = performance.now() / 1000;
        const rect = canvas.getBoundingClientRect();
        shared.pulses.push({
          x: x / rect.width,
          y: y / rect.height,
          t0: now,
        });
        return true;
      },
      down(x, y) {
        dragState.active = true;
        dragState.x0 = x;
        dragState.y0 = y;
        dragState.x1 = x;
        dragState.y1 = y;
        dragState.t0 = performance.now() / 1000;
        shared.drag = { ...dragState };
        return true;
      },
      move(x, y) {
        if (!dragState.active) return;
        dragState.x1 = x;
        dragState.y1 = y;
      },
      up() {
        if (!dragState.active) return;
        dragState.active = false;
        shared.drag = { ...dragState, returning: true, returnStart: performance.now() / 1000 };
      },
    });

    return (ctx, canvas, t) => {
      baseDraw(ctx, canvas, t);
      const line = shared.drag;
      if (line) {
        const now = performance.now() / 1000;
        let x0 = line.x0;
        let y0 = line.y0;
        let x1 = line.x1;
        let y1 = line.y1;
        let fade = 1;

        if (line.returning) {
          const dur = 0.4;
          const k = Math.min(1, (now - line.returnStart) / dur);
          const ease = 1 - Math.pow(1 - k, 2);
          x1 = x0 + (x1 - x0) * (1 - ease);
          y1 = y0 + (y1 - y0) * (1 - ease);
          fade = 1 - k;
          if (k >= 1) {
            shared.drag = null;
            return;
          }
        }

        ctx.save();
        ctx.strokeStyle = `rgba(180,240,180,${0.3 + 0.5 * fade})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
        ctx.restore();
      }
    };
  }

  function karaokeBars(opts) {
    const bars = Array.from({ length: 32 }, (_, i) => ({
      phase: Math.random() * Math.PI * 2,
      speed: 0.02 + Math.random() * 0.01,
    }));
    return (ctx, canvas, t) => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.fillStyle = 'rgba(0,0,0,0.9)';
      ctx.fillRect(0, 0, w, h);
      const barWidth = w / bars.length;
      bars.forEach((b, i) => {
        b.phase += b.speed;
        const amp = Math.sin(t * (opts.wobble || 0.6) + b.phase) * 0.5 + 0.5;
        const height = (amp * 0.8 + 0.2) * h * (opts.tone || 0.5);
        const x = i * barWidth;
        const y = (h - height) / 2;
        const grad = ctx.createLinearGradient(x, y, x, y + height);
        grad.addColorStop(0, 'rgba(50,200,255,0.9)');
        grad.addColorStop(1, 'rgba(255,255,255,0.5)');
        ctx.fillStyle = grad;
        ctx.fillRect(x + 2, y, barWidth - 4, height);
      });
      if (opts.trail) {
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(0, 0, w, h);
      }
    };
  }

  function karaokeWithNotes(makeBase) {
    const baseDraw = makeBase();
    const notes = [];
    const speeds = [0.08, 0.12, 0.2, 0.35, 0.55];
    const colors = ['#7cf7ff', '#ffd37a', '#ff9eb5', '#9fe6ff', '#bda5ff', '#8cf5c3'];
    let speedIndex = 2;

    const randomColor = () => colors[Math.floor(Math.random() * colors.length)];
    const randomGlyph = () => (Math.random() < 0.5 ? '🎵' : '🎶');

    setInteractionHandlers({
      tap(px, py) {
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        let hit = false;
        for (let i = notes.length - 1; i >= 0; i--) {
          const n = notes[i];
          const cx = n.x * w;
          const cy = n.y * h;
          const dx = px - cx;
          const dy = py - cy;
          const r = n.size * 0.7;
          if (dx * dx + dy * dy <= r * r) {
            speedIndex = (speedIndex + 1) % speeds.length;
            n.vx = speeds[speedIndex];
            n.color = randomColor();
            n.glyph = randomGlyph();
            n.flash = performance.now() / 1000;
            synth.note(440 + Math.random() * 320);
            hit = true;
            break;
          }
        }
        if (!hit) {
          notes.push({
            x: -0.1,
            y: 0.2 + Math.random() * 0.6,
            vx: speeds[speedIndex],
            size: 26 + Math.random() * 10,
            color: randomColor(),
            flash: 0,
            glyph: randomGlyph(),
          });
          synth.note(520 + Math.random() * 280);
        }
        return true;
      },
    });

    return (ctx, canvas, t) => {
      baseDraw(ctx, canvas, t);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const now = performance.now() / 1000;

      notes.forEach((n) => {
        n.x += n.vx * 0.016;
      });
      for (let i = notes.length - 1; i >= 0; i--) {
        if (notes[i].x > 1.2) notes.splice(i, 1);
      }

      notes.forEach((n, i) => {
        const x = n.x * w;
        const y = n.y * h + Math.sin(t * 3 + i) * 6;
        const flash = n.flash ? Math.max(0, 0.35 - (now - n.flash)) / 0.35 : 0;
        ctx.save();
        ctx.translate(x, y);
        if (flash) {
          ctx.shadowColor = n.color;
          ctx.shadowBlur = 18 * flash;
        }
        ctx.fillStyle = n.color;
        ctx.font = `${n.size * 1.4}px 'Apple Color Emoji', 'Segoe UI Emoji', system-ui`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(n.glyph || '🎵', 0, 0);
        ctx.restore();
      });
    };
  }
  function textDance(opts) {
    const phrases = [
      'そうすけ', 'おうすけ', 'やったね！', 'すごい！', 'がんばった！', 'こんにちは',
      'えらい！', 'つづけてみよう', 'できたね！', 'ありがとう',
      'HELLO', 'GOOD DAY', 'NICE!', 'GREAT!', 'KEEP GOING', 'STAR', 'SMILE', "LET'S GO!", 'PLAY!', 'WONDERFUL',
    ];
    const randomColor = () => {
      const paletteDark = ['#ff9eb5', '#ffd37a', '#9fe6ff', '#bda5ff', '#8cf5c3'];
      const paletteLight = ['#e6426b', '#ff8a00', '#1f7ae0', '#6b4cd9', '#1fa779'];
      const useDark = settings.bgMode === 'white';
      const list = useDark ? paletteLight : paletteDark;
      return list[Math.floor(Math.random() * list.length)];
    };

    const items = Array.from({ length: 12 }, () => ({
      text: phrases[Math.floor(Math.random() * phrases.length)],
      x: Math.random(),
      y: Math.random(),
      speed: Math.random() * 0.3 + 0.2,
      scale: Math.random() * 0.8 + 0.6,
      color: randomColor(),
      effectType: null,
      effectStart: 0,
      effectDuration: 0,
      effectData: null,
    }));

    setTapHandler((px, py) => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const now = performance.now() / 1000;
      let hit = false;
      items.forEach((item, idx) => {
        const cx = item.x * w;
        const cy = item.y * h;
        const dx = px - cx;
        const dy = py - cy;
        const r = 70;
        if (dx * dx + dy * dy <= r * r) {
          item.color = randomColor();
          const choice = Math.floor(Math.random() * 6) + 1;
          item.effectType = choice;
          item.effectStart = now;
          item.effectDuration =
            choice === 1 ? 1.6 :
            choice === 2 ? 1.2 :
            choice === 3 ? 2.0 :
            choice === 4 ? 1.5 :
            choice === 5 ? 1.2 :
            1.3;
          if (choice === 1) {
            item.effectData = {
              angle: Math.random() * Math.PI * 2,
              distance: 120 + Math.random() * 180,
            };
          } else {
            item.effectData = null;
          }
          hit = true;
        }
      });
      return hit;
    });
    return (ctx, canvas, t) => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.fillStyle = settings.bgMode === 'white' ? '#fdfdfd' : '#050505';
      ctx.fillRect(0, 0, w, h);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const now = performance.now() / 1000;
      items.forEach((item, idx) => {
        const anim = opts.style === 'bounce'
          ? Math.sin(t * 2 + idx) * 20
          : opts.style === 'wave'
            ? Math.sin(t + idx) * 40
            : Math.sin(t * 2 + idx) * 10;
        let angle = opts.style === 'spin' ? t + idx : 0;
        let extraX = 0;
        let extraY = 0;
        let scaleMul = 1;
        let alpha = 0.6 + 0.4 * Math.sin(t + idx);

        if (item.effectType && item.effectDuration > 0) {
          const age = now - item.effectStart;
          const k = age / item.effectDuration;
          if (k >= 1) {
            item.effectType = null;
          } else {
            switch (item.effectType) {
              case 1: { // ランダム方向に進む
                const d = item.effectData?.distance || 180;
                const eased = k; // 0→1 で進み続ける
                const dist = d * eased;
                const ang = item.effectData?.angle || (idx * 0.7);
                extraX += Math.cos(ang) * dist;
                extraY += Math.sin(ang) * dist;
                break;
              }
              case 2: { // 高速回転
                angle += (1 - k) * 10;
                break;
              }
              case 3: { // 低速回転
                angle += (1 - k) * 4;
                break;
              }
              case 4: { // 拡大表示
                scaleMul *= 1 + 1.8 * (1 - k);
                break;
              }
              case 5: { // 消える
                const fade = k < 0.2 ? k / 0.2 : (k > 0.8 ? (1 - k) / 0.2 : 0);
                alpha *= fade;
                break;
              }
              case 6: { // 画面全体に大きく映る
                extraX += (w / 2 - item.x * w);
                extraY += (h / 2 - (item.y * h + anim));
                scaleMul *= 3 * (1 - 0.3 * k);
                break;
              }
            }
          }
        }
        ctx.save();
        ctx.fillStyle = item.color || (settings.bgMode === 'white' ? '#0a0a0a' : '#f5f5f5');
        ctx.translate(item.x * w + extraX, item.y * h + anim + extraY);
        ctx.rotate(angle * 0.2);
        const baseSize = 28 + (idx % 3) * 6;
        ctx.font = `${baseSize * scaleMul}px 'Helvetica Neue', 'Noto Sans JP', sans-serif`;
        ctx.globalAlpha = alpha;
        ctx.fillText(item.text, 0, 0);
        ctx.restore();
      });
      ctx.globalAlpha = 1;
    };
  }

  function oceanDrift(opts) {
    const fish = Array.from({ length: opts.fish }, () => ({
      x: Math.random(),
      y: Math.random(),
      speed: Math.random() * 0.5 + 0.2,
      size: (opts.big ? Math.random() * 14 + 10 : Math.random() * 10 + 6),
    }));
    const bubbles = Array.from({ length: opts.bubbles ? 20 : 0 }, () => ({
      x: Math.random(),
      y: Math.random(),
      speed: Math.random() * 0.2 + 0.05,
      r: Math.random() * 4 + 1,
    }));
    return (ctx, canvas, t) => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.fillStyle = 'rgba(0,30,60,1)';
      ctx.fillRect(0, 0, w, h);
      fish.forEach(f => {
        f.x += f.speed * 0.001;
        if (f.x > 1.1) {
          f.x = -0.1;
          f.y = Math.random();
        }
        ctx.fillStyle = 'rgba(150,220,255,0.8)';
        ctx.beginPath();
        ctx.ellipse(f.x * w, f.y * h, f.size, f.size * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
      });
      bubbles.forEach(b => {
        b.y -= b.speed * 0.001;
        if (b.y < -0.1) {
          b.y = 1.1;
          b.x = Math.random();
        }
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        ctx.arc(b.x * w, b.y * h, b.r, 0, Math.PI * 2);
        ctx.stroke();
      });
    };
  }

  function oceanWithGimmicks(makeBase) {
    const baseDraw = makeBase();
    const state = {
      drops: Array.from({ length: 6 }, () => ({
        x: Math.random(),
        y: Math.random() * 0.7 + 0.1,
      })),
      bubbleBursts: [],
      entities: [],
    };

    const fishSpeeds = [0.03, 0.07, 0.13];
    const entityColors = ['#fffd82', '#ffc857', '#5bc0eb', '#9cffd9', '#ff9b9b'];

    const hitEntity = (px, py, canvas) => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      for (let i = state.entities.length - 1; i >= 0; i--) {
        const ent = state.entities[i];
        const cx = ent.x * w;
        const cy = ent.y * h;
        const r = ent.size;
        const dx = px - cx;
        const dy = py - cy;
        if (dx * dx + dy * dy <= r * r) return ent;
      }
      return null;
    };

    const cycleEntity = (ent) => {
      const idx = fishSpeeds.findIndex(s => Math.abs(s - ent.speed) < 1e-3);
      const next = fishSpeeds[(idx + 1 + fishSpeeds.length) % fishSpeeds.length];
      ent.speed = next;
      ent.color = entityColors[Math.floor(Math.random() * entityColors.length)];
      const dirs = [
        0, Math.PI / 2, Math.PI, -Math.PI / 2,
        Math.PI / 4, -Math.PI / 4, (3 * Math.PI) / 4, -(3 * Math.PI) / 4,
      ];
      const angle = dirs[Math.floor(Math.random() * dirs.length)];
      ent.angle = angle;
      ent.vx = Math.cos(angle) * ent.speed;
      ent.vy = Math.sin(angle) * ent.speed;
    };

    const makeEntity = (type, y) => {
      const ent = {
        type,
        x: Math.random() < 0.5 ? -0.2 : 1.2,
        y,
        speed: fishSpeeds[Math.floor(Math.random() * fishSpeeds.length)],
        color: entityColors[Math.floor(Math.random() * entityColors.length)],
        size: type === 'sub' ? 46 : type === 'coral' ? 34 : 24,
        dragging: false,
        angle: 0,
        vx: 0,
        vy: 0,
      };
      cycleEntity(ent);
      return ent;
    };

    state.entities.push(makeEntity('sub', 0.35));
    state.entities.push(makeEntity('coral', 0.9));
    state.entities.push(makeEntity('swimmer', 0.18));

    const randomFishY = () => 0.2 + Math.random() * 0.6;

    const spawnFishFromEdge = () => {
      state.entities.push(makeEntity('fish', randomFishY()));
    };

    const tapHandlerOcean = (px, py) => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;

      const ent = hitEntity(px, py, canvas);
      if (ent) {
        cycleEntity(ent);
        return true;
      }

      for (const drop of state.drops) {
        const dx = px - drop.x * w;
        const dy = py - drop.y * h;
        if (dx * dx + dy * dy <= 26 * 26) {
          state.bubbleBursts.push({ x: drop.x, y: drop.y, t0: performance.now() / 1000 });
          drop.x = Math.random();
          drop.y = Math.random() * 0.7 + 0.1;
          return true;
        }
      }

      spawnFishFromEdge();
      return true;
    };

    let dragTarget = null;

    setInteractionHandlers({
      tap: tapHandlerOcean,
      down(x, y) {
        const ent = hitEntity(x, y, canvas);
        if (ent) {
          dragTarget = ent;
          ent.dragging = true;
          return true;
        }
        return false;
      },
      move(x, y) {
        if (!dragTarget) return;
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        dragTarget.x = Math.min(1.2, Math.max(-0.2, x / w));
        dragTarget.y = Math.min(1.0, Math.max(0.05, y / h));
      },
      up() {
        if (dragTarget) {
          dragTarget.dragging = false;
          dragTarget = null;
        }
      },
    });

    return (ctx, canvas, t) => {
      baseDraw(ctx, canvas, t);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;

      state.drops.forEach(d => {
        ctx.fillStyle = 'rgba(200,240,255,0.4)';
        ctx.beginPath();
        ctx.arc(d.x * w, d.y * h, 10, 0, Math.PI * 2);
        ctx.fill();
      });

      const now = performance.now() / 1000;
      for (let i = state.bubbleBursts.length - 1; i >= 0; i--) {
        const b = state.bubbleBursts[i];
        const age = now - b.t0;
        if (age > 1.1) {
          state.bubbleBursts.splice(i, 1);
          continue;
        }
        const baseY = b.y * h;
        const baseX = b.x * w;
        const k = age / 1.1;
        for (let j = 0; j < 5; j++) {
          const angle = (j / 5) * Math.PI * 2;
          const dist = 10 + 40 * k;
          const x = baseX + Math.cos(angle) * dist;
          const y = baseY - age * 60 + Math.sin(angle) * 12;
          ctx.strokeStyle = `rgba(255,255,255,${1 - k})`;
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      state.entities.forEach(ent => {
        if (!ent.dragging) {
          ent.x += (ent.vx || 0) * 0.016;
          ent.y += (ent.vy || 0) * 0.016;
        }

        if (ent.x > 1.4) ent.x = -0.4;
        if (ent.x < -0.4) ent.x = 1.4;
        if (ent.y > 1.3) ent.y = -0.3;
        if (ent.y < -0.3) ent.y = 1.3;

        const cx = ent.x * w;
        const cy = ent.y * h;
        ctx.save();
        ctx.translate(cx, cy);
        if (ent.type === 'sub' || ent.type === 'swimmer' || ent.type === 'fish') {
          let rot = ent.angle || 0;
          if (ent.type === 'fish') rot += Math.PI;
          ctx.rotate(rot);
        }

        if (ent.type === 'sub') {
          ctx.fillStyle = ent.color;
          ctx.beginPath();
          ctx.roundRect(-36, -16, 72, 32, 16);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.8)';
          ctx.beginPath();
          ctx.roundRect(-10, -10, 26, 20, 8);
          ctx.fill();
          ctx.fillStyle = '#003049';
          ctx.beginPath();
          ctx.arc(30, 0, 6, 0, Math.PI * 2);
          ctx.fill();
        } else if (ent.type === 'coral') {
          ctx.fillStyle = ent.color;
          ctx.beginPath();
          ctx.moveTo(-8, 0);
          ctx.quadraticCurveTo(-12, -28, -4, -40);
          ctx.quadraticCurveTo(4, -20, 2, 0);
          ctx.moveTo(4, 0);
          ctx.quadraticCurveTo(8, -24, 16, -34);
          ctx.quadraticCurveTo(18, -16, 10, 0);
          ctx.fill();
        } else if (ent.type === 'swimmer') {
          ctx.fillStyle = '#ffe0bd';
          ctx.beginPath();
          ctx.arc(0, -8, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = ent.color;
          ctx.beginPath();
          ctx.ellipse(0, 4, 14, 6, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = ent.color;
          ctx.beginPath();
          ctx.ellipse(0, 0, 20, 10, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(10, 0);
          ctx.lineTo(20, -8);
          ctx.lineTo(20, 8);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      });
    };
  }

  function silhouettes(opts) {
    const shapes = Array.from({ length: opts.dense ? 8 : 5 }, (_, i) => ({
      x: Math.random(),
      y: 0.2 + i * 0.1,
      speed: (opts.speed || 1) * (0.0005 + Math.random() * 0.0006),
      dir: opts.flip ? -1 : 1,
    }));
    return (ctx, canvas, t) => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.fillStyle = 'rgba(10,10,15,1)';
      ctx.fillRect(0, 0, w, h);
      shapes.forEach((s, i) => {
        const size = 80 + i * 12;
        ctx.fillStyle = `rgba(255,255,255,${0.14 + i * 0.04})`;
        ctx.fillRect(-0.2 * w, h * s.y, w * 1.4, 2);
      });
    };
  }

  function vehiclesWithGimmicks(makeBase) {
    const baseDraw = makeBase();
    const state = {
      vehicles: [],
    };

    const typeDefs = {
      plane: { baseSpeed: [0.18, 0.24], y: 0.18 },
      train: { baseSpeed: [0.12, 0.16], y: 0.35 },
      bike: { baseSpeed: [0.04, 0.08], y: 0.55 },
      car: { baseSpeed: [0.10, 0.14], y: 0.7 },
      ship: { baseSpeed: [0.02, 0.05], y: 0.82 },
    };

    const colors = ['#ffffff', '#ffcc00', '#7cf7ff', '#ff9fbf', '#9dff9d'];

    const randomBetween = (min, max) => min + Math.random() * (max - min);

    const makeVehicle = (type, canvas) => {
      const def = typeDefs[type];
      const laneY = def.y + (Math.random() - 0.5) * 0.04;
      const speed = randomBetween(def.baseSpeed[0], def.baseSpeed[1]);
      const dir = Math.random() < 0.5 ? 1 : -1;
      const sizeMul = randomBetween(0.8, 1.4);
      return {
        type,
        x: dir > 0 ? -0.15 : 1.15,
        y: laneY,
        speed,
        dir,
        sizeMul,
        color: colors[Math.floor(Math.random() * colors.length)],
        lightsOn: false,
        dragging: false,
      };
    };

    const hitVehicle = (px, py, canvas) => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      for (let i = state.vehicles.length - 1; i >= 0; i--) {
        const v = state.vehicles[i];
        const baseLen = v.type === 'plane' ? 120 : v.type === 'train' ? 160 : v.type === 'ship' ? 140 : 80;
        const baseH = v.type === 'bike' ? 24 : 32;
        const len = baseLen * v.sizeMul;
        const vh = baseH * v.sizeMul;
        const cx = v.x * w;
        const cy = v.y * h;
        if (px >= cx - len / 2 && px <= cx + len / 2 && py >= cy - vh / 2 && py <= cy + vh / 2) {
          return v;
        }
      }
      return null;
    };

    const randomType = () => {
      const keys = Object.keys(typeDefs);
      return keys[Math.floor(Math.random() * keys.length)];
    };

    const retuneVehicle = (v) => {
      const def = typeDefs[v.type];
      const [min, max] = def.baseSpeed;
      v.speed = randomBetween(min, max);
      if (Math.random() < 0.5) v.dir *= -1;
      v.color = colors[Math.floor(Math.random() * colors.length)];
      v.lightsOn = !v.lightsOn;
    };

    let dragTarget = null;

    setInteractionHandlers({
      tap(px, py) {
        const v = hitVehicle(px, py, canvas);
        if (v) {
          retuneVehicle(v);
          return true;
        }
        state.vehicles.push(makeVehicle(randomType(), canvas));
        return true;
      },
      down(x, y) {
        const v = hitVehicle(x, y, canvas);
        if (!v) return false;
        dragTarget = v;
        v.dragging = true;
        return true;
      },
      move(x, y) {
        if (!dragTarget) return;
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        dragTarget.x = Math.min(1.2, Math.max(-0.2, x / w));
        dragTarget.y = Math.min(0.95, Math.max(0.05, y / h));
      },
      up() {
        if (dragTarget) {
          dragTarget.dragging = false;
          dragTarget = null;
        }
      },
    });

    return (ctx, canvas, t) => {
      baseDraw(ctx, canvas, t);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;

      if (!state.vehicles.length) {
        state.vehicles.push(makeVehicle('train', canvas));
      }

      state.vehicles.forEach((v) => {
        if (!v.dragging) {
          v.x += v.speed * v.dir * 0.016;
        }
        if (v.dir > 0 && v.x > 1.2) v.x = -0.2;
        if (v.dir < 0 && v.x < -0.2) v.x = 1.2;

        const cx = v.x * w;
        const cy = v.y * h;

        ctx.save();
        ctx.translate(cx, cy);
        if (v.dir < 0) ctx.scale(-1, 1);
        ctx.fillStyle = v.color;

        const lenMul = v.sizeMul;
        if (v.type === 'plane') {
          const bodyL = 110 * lenMul;
          ctx.beginPath();
          ctx.moveTo(-bodyL / 2, -10);
          ctx.lineTo(bodyL / 2, 0);
          ctx.lineTo(-bodyL / 2, 10);
          ctx.closePath();
          ctx.fill();
        } else if (v.type === 'train') {
          const carL = 60 * lenMul;
          const cars = 3;
          for (let i = 0; i < cars; i++) {
            ctx.beginPath();
            ctx.roundRect(-carL * 1.5 + i * carL, -16, carL - 4, 32, 6);
            ctx.fill();
          }
        } else if (v.type === 'ship') {
          ctx.beginPath();
          ctx.moveTo(-70 * lenMul, 12);
          ctx.lineTo(70 * lenMul, 12);
          ctx.lineTo(50 * lenMul, -8);
          ctx.lineTo(-50 * lenMul, -8);
          ctx.closePath();
          ctx.fill();
        } else if (v.type === 'bike') {
          ctx.strokeStyle = v.color;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(-18 * lenMul, 8, 8 * lenMul, 0, Math.PI * 2);
          ctx.arc(18 * lenMul, 8, 8 * lenMul, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(-10 * lenMul, 0);
          ctx.lineTo(6 * lenMul, -10);
          ctx.lineTo(14 * lenMul, 2);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.roundRect(-40 * lenMul, -14, 80 * lenMul, 28, 10);
          ctx.fill();
        }

        if (v.lightsOn) {
          ctx.fillStyle = 'rgba(255,255,200,0.9)';
          if (v.type === 'plane' || v.type === 'car') {
            ctx.beginPath();
            ctx.arc(40 * lenMul, 0, 4 * lenMul, 0, Math.PI * 2);
            ctx.fill();
          } else if (v.type === 'train') {
            ctx.fillRect(-50 * lenMul, -6, 12 * lenMul, 12);
          } else if (v.type === 'ship') {
            ctx.fillRect(-16 * lenMul, -4, 10 * lenMul, 8);
          } else if (v.type === 'bike') {
            ctx.beginPath();
            ctx.arc(22 * lenMul, 0, 3 * lenMul, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        ctx.restore();
      });
    };
  }

  function cloudGlide(opts) {
    const clouds = Array.from({ length: 8 }, () => ({
      x: Math.random(),
      y: Math.random() * 0.5,
      speed: Math.random() * 0.0003 + 0.0004,
      size: Math.random() * 80 + 40,
    }));
    const birds = opts.birds ? Array.from({ length: 6 }, () => ({
      x: Math.random(),
      y: Math.random() * 0.5 + 0.1,
      speed: Math.random() * 0.0008 + 0.0006,
    })) : [];
    const balloons = opts.balloons ? Array.from({ length: 3 }, () => ({
      x: Math.random(),
      y: 0.8 + Math.random() * 0.1,
      speed: Math.random() * 0.0005 + 0.0003,
      color: `hsl(${Math.random() * 360},70%,60%)`,
    })) : [];
    return (ctx, canvas, t) => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#0a1a2f');
      grad.addColorStop(1, '#0f2f4f');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      clouds.forEach(c => {
        c.x += c.speed;
        if (c.x > 1.2) c.x = -0.2;
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.beginPath();
        ctx.ellipse(c.x * w, c.y * h, c.size, c.size * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
      });
      birds.forEach(b => {
        b.x += b.speed;
        if (b.x > 1.2) b.x = -0.2;
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath();
        ctx.moveTo(b.x * w, b.y * h);
        ctx.quadraticCurveTo(b.x * w + 6, b.y * h - 6, b.x * w + 12, b.y * h);
        ctx.stroke();
      });
      balloons.forEach(bl => {
        bl.y -= bl.speed;
        if (bl.y < 0.1) bl.y = 1.0;
        ctx.fillStyle = bl.color;
        ctx.beginPath();
        ctx.ellipse(bl.x * w, bl.y * h, 18, 24, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath();
        ctx.moveTo(bl.x * w, bl.y * h + 24);
        ctx.lineTo(bl.x * w, bl.y * h + 42);
        ctx.stroke();
      });
    };
  }

  function skyShooter(opts = {}) {
    const density = opts.density || 8;
    const theme = opts.theme || 'day';
    let gradTop;
    let gradBottom;
    let fighterColor;
    let missileColor;
    let blockColor;
    let balloonColor;
    let ufoColor;

    if (theme === 'morning') {
      gradTop = '#ffb347';
      gradBottom = '#ffe7c2';
      fighterColor = '#ffffff';
      missileColor = 'rgba(255,255,255,0.95)';
      blockColor = 'rgba(255,255,255,0.95)';
      balloonColor = 'rgba(255,210,160,0.95)';
      ufoColor = 'rgba(220,255,255,0.95)';
    } else if (theme === 'night') {
      gradTop = '#020318';
      gradBottom = '#041c3a';
      fighterColor = '#b6e3ff';
      missileColor = 'rgba(255,255,200,0.98)';
      blockColor = 'rgba(250,250,255,0.95)';
      balloonColor = 'rgba(255,190,120,0.95)';
      ufoColor = 'rgba(190,240,255,0.98)';
    } else {
      gradTop = '#0a1a3a';
      gradBottom = '#3383d7';
      fighterColor = '#e0f2ff';
      missileColor = 'rgba(255,255,255,0.9)';
      blockColor = 'rgba(255,255,255,0.9)';
      balloonColor = 'rgba(255,200,150,0.9)';
      ufoColor = 'rgba(200,255,255,0.9)';
    }
    const fighter = { x: 0.5, y: 0.9 };
    const missiles = [];
    const obstacles = [];
    const items = [];
    const itemBursts = [];
    const spawnMargin = 0.08;
    const state = {
      score: 0,
      powerUntil: 0,
      lives: 3,
      gameOver: false,
      startTime: performance.now() / 1000,
    };

    const playMissile = () => {
      if (!settings.sfx) return;
      synth.note(900);
    };

    const playBoom = () => {
      if (!settings.sfx) return;
      synth.note(320);
      setTimeout(() => synth.note(180), 70);
    };

    const spawnObstacle = () => {
      const kindIndex = Math.floor(Math.random() * 3);
      const kind = kindIndex === 0 ? 'block' : kindIndex === 1 ? 'balloon' : 'ufo';
      const size = 26 + Math.random() * 18;
      const speed = 0.14 + Math.random() * 0.12;
      obstacles.push({
        kind,
        x: spawnMargin + Math.random() * (1 - spawnMargin * 2),
        y: -0.2,
        vy: speed,
        size,
      });
    };

    const spawnItem = () => {
      items.push({
        x: spawnMargin + Math.random() * (1 - spawnMargin * 2),
        y: -0.1,
        vy: 0.18,
        size: 18,
      });
    };

    let dragging = false;

    setInteractionHandlers({
      tap() {
        const nowTap = performance.now() / 1000;
        if (state.gameOver) {
          state.score = 0;
          state.lives = 3;
          state.powerUntil = 0;
          state.gameOver = false;
          state.startTime = nowTap;
          missiles.length = 0;
          obstacles.length = 0;
          items.length = 0;
          itemBursts.length = 0;
          fighter.x = 0.5;
          return true;
        }
        const poweredTap = nowTap < state.powerUntil;
        const xs = poweredTap ? [fighter.x - 0.12, fighter.x, fighter.x + 0.12] : [fighter.x];
        xs.forEach((x) => {
          const clamped = Math.min(0.95, Math.max(0.05, x));
          missiles.push({
            x: clamped,
            y: fighter.y,
            vy: 0.6,
          });
        });
        playMissile();
        return true;
      },
      down(x) {
        dragging = true;
        fighter.x = Math.min(0.95, Math.max(0.05, x / canvas.clientWidth));
        return true;
      },
      move(x) {
        if (!dragging) return;
        fighter.x = Math.min(0.95, Math.max(0.05, x / canvas.clientWidth));
      },
      up() {
        dragging = false;
      },
    });

    return (ctx, canvas, t) => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const nowSec = performance.now() / 1000;
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, gradTop);
      grad.addColorStop(1, gradBottom);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      if (!state.gameOver) {
        const elapsed = nowSec - state.startTime;
        const maxCount = Math.min(density + 4, 1 + Math.floor(elapsed / 5));
        const spawnProb = 0.006 + Math.min(0.03, (elapsed / 30) * 0.02);
        if (Math.random() < spawnProb && obstacles.length < maxCount) {
          spawnObstacle();
        }

        if (Math.random() < 0.002 && items.length < 2) {
          spawnItem();
        }
      }

      if (!state.gameOver) {
        missiles.forEach((m) => {
          m.y -= m.vy * 0.016;
        });
        for (let i = missiles.length - 1; i >= 0; i--) {
          if (missiles[i].y < -0.1) missiles.splice(i, 1);
        }

        obstacles.forEach((o) => {
          o.y += o.vy * 0.016;
        });
        for (let i = obstacles.length - 1; i >= 0; i--) {
          if (obstacles[i].y > 1.1) {
            obstacles.splice(i, 1);
            if (state.lives > 0) state.lives -= 1;
            if (state.lives <= 0) state.gameOver = true;
          }
        }
      }

      for (let i = obstacles.length - 1; i >= 0; i--) {
        const o = obstacles[i];
        const ox = o.x * w;
        const oy = o.y * h;
        const baseR = o.size;
        const r = baseR;
        for (let j = missiles.length - 1; j >= 0; j--) {
          const m = missiles[j];
          const mx = m.x * w;
          const my = m.y * h;
          const dx = mx - ox;
          const dy = my - oy;
          if (dx * dx + dy * dy <= (r * r)) {
            obstacles.splice(i, 1);
            missiles.splice(j, 1);
            state.score += 100;
            playBoom();
            break;
          }
        }
      }

      if (!state.gameOver) {
        items.forEach((it) => {
          it.y += it.vy * 0.016;
        });
        for (let i = items.length - 1; i >= 0; i--) {
          const it = items[i];
          if (it.y > 1.2) {
            items.splice(i, 1);
            continue;
          }
          const ix = it.x * w;
          const iy = it.y * h;
          const fx = fighter.x * w;
          const fy = fighter.y * h;
          const dx = ix - fx;
          const dy = iy - fy;
          const rr = (it.size + 28) * (it.size + 28);
          let consumed = false;
          if (dx * dx + dy * dy <= rr) {
            consumed = true;
          } else {
            for (let j = missiles.length - 1; j >= 0; j--) {
              const m = missiles[j];
              const mx = m.x * w;
              const my = m.y * h;
              const ddx = mx - ix;
              const ddy = my - iy;
              const hitR = (it.size + 10) * (it.size + 10);
              if (ddx * ddx + ddy * ddy <= hitR) {
                missiles.splice(j, 1);
                consumed = true;
                break;
              }
            }
          }
          if (consumed) {
            items.splice(i, 1);
            state.powerUntil = Math.max(state.powerUntil, nowSec) + 10;
            itemBursts.push({ x: it.x, y: it.y, t0: nowSec });
          }
        }
      }

      obstacles.forEach((o) => {
        const ox = o.x * w;
        const oy = o.y * h;
        ctx.save();
        ctx.translate(ox, oy);
        if (o.kind === 'block') {
          ctx.fillStyle = blockColor;
          ctx.beginPath();
          ctx.roundRect(-o.size / 2, -o.size / 3, o.size, (o.size * 2) / 3, 10);
          ctx.fill();
        } else if (o.kind === 'balloon') {
          ctx.fillStyle = balloonColor;
          ctx.beginPath();
          ctx.ellipse(0, 0, o.size / 2, (o.size * 0.7) / 2, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = ufoColor;
          ctx.beginPath();
          ctx.ellipse(0, 0, o.size / 2, o.size / 4, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      missiles.forEach((m) => {
        const mx = m.x * w;
        const my = m.y * h;
        ctx.strokeStyle = missileColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(mx, my);
        ctx.lineTo(mx, my - 16);
        ctx.stroke();
      });

      const multiActive = nowSec < state.powerUntil;
      const fighterXs = multiActive ? [fighter.x - 0.12, fighter.x, fighter.x + 0.12] : [fighter.x];
      fighterXs.forEach((fxNorm) => {
        const fx = Math.min(0.95, Math.max(0.05, fxNorm)) * w;
        const fy = fighter.y * h;
        ctx.save();
        ctx.translate(fx, fy);
        ctx.fillStyle = fighterColor;
        ctx.beginPath();
        ctx.moveTo(0, -18);
        ctx.lineTo(18, 18);
        ctx.lineTo(-18, 18);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      });

      items.forEach((it) => {
        const ix = it.x * w;
        const iy = it.y * h;
        ctx.save();
        ctx.translate(ix, iy);
        const wBox = 56;
        const hBox = 22;
        ctx.fillStyle = 'rgba(220,40,40,0.95)';
        ctx.beginPath();
        ctx.roundRect(-wBox / 2, -hBox / 2, wBox, hBox, 8);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('アイテム', 0, 1);
        ctx.restore();
      });

      for (let i = itemBursts.length - 1; i >= 0; i--) {
        const b = itemBursts[i];
        const age = nowSec - b.t0;
        if (age > 0.6) {
          itemBursts.splice(i, 1);
          continue;
        }
        const progress = age / 0.6;
        const radius = 20 + 40 * progress;
        const alpha = 1 - progress;
        const bx = b.x * w;
        const by = b.y * h;
        ctx.save();
        ctx.strokeStyle = `rgba(255,255,200,${alpha})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(bx, by, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = '18px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      const powered = nowSec < state.powerUntil;
      const scoreText = `SCORE ${state.score}`;
      const hearts = '❤️'.repeat(Math.max(0, state.lives));
      ctx.fillText(scoreText, 12, 10);
      ctx.fillText(hearts, 12 + ctx.measureText(scoreText).width + 16, 10);
      if (powered) {
        ctx.fillStyle = 'rgba(255,255,180,0.9)';
        ctx.font = '12px system-ui, -apple-system, sans-serif';
        ctx.fillText('POWER UP', 12, 32);
      }

      if (state.gameOver) {
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#ffffff';
        ctx.font = '32px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('GAME OVER', w / 2, h / 2);
        ctx.restore();
      }
    };
  }

  function numberStream(opts) {
    const digits = '0123456789';
    const palette = ['#7cf7a3', '#ffd37a', '#ff9eb5', '#9fe6ff', '#bda5ff'];
    const randomColor = () => palette[Math.floor(Math.random() * palette.length)];
    const items = Array.from({ length: 40 }, () => {
      const speed = Math.random() * 0.002 + 0.001;
      const angle = Math.random() * Math.PI * 2;
      return {
        x: Math.random(),
        y: Math.random(),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        speed,
        char: digits[Math.floor(Math.random() * digits.length)],
        color: randomColor(),
      };
    });

    setInteractionHandlers({
      tap(px, py) {
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        let hit = false;
        items.forEach((it) => {
          const cx = it.x * w;
          const cy = it.y * h;
          const dx = px - cx;
          const dy = py - cy;
          const r = 20;
          if (dx * dx + dy * dy <= r * r) {
            it.color = randomColor();
            const speed = 0.0015 + Math.random() * 0.004;
            const angle = Math.random() * Math.PI * 2;
            it.vx = Math.cos(angle) * speed;
            it.vy = Math.sin(angle) * speed;
            it.speed = speed;
            hit = true;
          }
        });
        return hit;
      },
    });

    return (ctx, canvas, t) => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.fillStyle = 'rgba(0,0,0,0.92)';
      ctx.fillRect(0, 0, w, h);
      ctx.font = '28px monospace';
      items.forEach((it, i) => {
        it.x += it.vx;
        it.y += it.vy;
        if (it.x < 0) {
          it.x = 0;
          it.vx = Math.abs(it.vx);
        } else if (it.x > 1) {
          it.x = 1;
          it.vx = -Math.abs(it.vx);
        }
        if (it.y < 0) {
          it.y = 0;
          it.vy = Math.abs(it.vy);
        } else if (it.y > 1) {
          it.y = 1;
          it.vy = -Math.abs(it.vy);
        }
        const offset = opts.spin ? Math.sin(t + i) * 10 : opts.wave ? Math.sin(t * 2 + i) * 6 : 0;
        ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(t + i));
        ctx.fillStyle = it.color;
        ctx.fillText(it.char, it.x * w + offset, it.y * h);
      });
      ctx.globalAlpha = 1;
    };
  }

  function alphabetFlow(opts) {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const palette = ['#ff9eb5', '#ffd37a', '#9fe6ff', '#bda5ff', '#8cf5c3'];
    const randomColor = () => palette[Math.floor(Math.random() * palette.length)];
    const items = Array.from({ length: 26 }, (_, i) => {
      const speed = Math.random() * 0.002 + 0.0006;
      const angle = Math.random() * Math.PI * 2;
      return {
        char: letters[i],
        x: Math.random(),
        y: Math.random(),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        speed,
        color: randomColor(),
      };
    });

    setInteractionHandlers({
      tap(px, py) {
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        let hit = false;
        items.forEach((it) => {
          const cx = it.x * w;
          const cy = it.y * h;
          const dx = px - cx;
          const dy = py - cy;
          const r = 24;
          if (dx * dx + dy * dy <= r * r) {
            it.color = randomColor();
            const speed = 0.0012 + Math.random() * 0.003;
            const angle = Math.random() * Math.PI * 2;
            it.vx = Math.cos(angle) * speed;
            it.vy = Math.sin(angle) * speed;
            it.speed = speed;
            hit = true;
          }
        });
        return hit;
      },
    });

    return (ctx, canvas, t) => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.fillStyle = settings.bgMode === 'white' ? '#fff' : '#0a0a0a';
      ctx.fillRect(0, 0, w, h);
      ctx.font = '34px "Futura", "Helvetica Neue", sans-serif';
      items.forEach((it, i) => {
        it.x += it.vx;
        it.y += it.vy;
        if (it.x < 0) {
          it.x = 0;
          it.vx = Math.abs(it.vx);
        } else if (it.x > 1) {
          it.x = 1;
          it.vx = -Math.abs(it.vx);
        }
        if (it.y < 0) {
          it.y = 0;
          it.vy = Math.abs(it.vy);
        } else if (it.y > 1) {
          it.y = 1;
          it.vy = -Math.abs(it.vy);
        }
        const ox = opts.spiral ? Math.sin(t + i) * 40 : opts.slide ? Math.sin(t * 0.8 + i) * 60 : Math.sin(t + i) * 20;
        const oy = opts.float ? Math.sin(t * 1.2 + i) * 12 : 0;
        ctx.save();
        ctx.globalAlpha = 0.5 + 0.5 * Math.abs(Math.sin(t * 0.7 + i));
        ctx.fillStyle = it.color || (settings.bgMode === 'white' ? '#0a0a0a' : '#f5f5f5');
        ctx.translate(it.x * w + ox, it.y * h + oy);
        ctx.fillText(it.char, 0, 0);
        ctx.restore();
      });
    };
  }

  function alphabetWordMerge() {
    const words = ['CAT', 'DOG', 'SUN', 'MOON', 'STAR', 'CAR', 'BUS', 'SKY', 'SEA', 'RUN', 'FLY'];
    const palette = ['#ff9eb5', '#ffd37a', '#9fe6ff', '#bda5ff', '#8cf5c3'];
    const randomColor = () => palette[Math.floor(Math.random() * palette.length)];

    const letters = [];
    const makeLetter = (ch) => {
      const speed = 0.001 + Math.random() * 0.003;
      const dirs = [
        [1, 0], [-1, 0], [0, 1], [0, -1],
        [1, 1], [-1, 1], [1, -1], [-1, -1],
      ];
      const [dx, dy] = dirs[Math.floor(Math.random() * dirs.length)];
      const norm = Math.hypot(dx, dy) || 1;
      return {
        text: ch,
        x: 0.2 + Math.random() * 0.6,
        y: 0.2 + Math.random() * 0.6,
        vx: (dx / norm) * speed,
        vy: (dy / norm) * speed,
        color: randomColor(),
      };
    };

    const seedPool = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let i = 0; i < 10; i++) {
      letters.push(makeLetter(seedPool[Math.floor(Math.random() * seedPool.length)]));
    }

    const maxCount = 20;
    let lastTapDirChange = 0;

    const isPrefixOfAny = (str) => words.some((w) => w.startsWith(str));
    const isFullWord = (str) => words.includes(str);

    setInteractionHandlers({
      tap(px, py) {
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        let hit = false;
        letters.forEach((it) => {
          const cx = it.x * w;
          const cy = it.y * h;
          const dx = px - cx;
          const dy = py - cy;
          const r = 38;
          if (dx * dx + dy * dy <= r * r) {
            const speed = 0.001 + Math.random() * 0.0035;
            const angle = Math.random() * Math.PI * 2;
            it.vx = Math.cos(angle) * speed;
            it.vy = Math.sin(angle) * speed;
            it.color = randomColor();
            hit = true;
          }
        });
        if (!hit && letters.length < maxCount) {
          // spawn new random letter
          letters.push(makeLetter(seedPool[Math.floor(Math.random() * seedPool.length)]));
        }
        lastTapDirChange = performance.now();
        return true;
      },
    });

    return (ctx, canvas, t) => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.fillStyle = settings.bgMode === 'white' ? '#fff' : '#0a0a0a';
      ctx.fillRect(0, 0, w, h);
      ctx.font = '120px "Futura", "Helvetica Neue", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      letters.forEach((it) => {
        it.x += it.vx;
        it.y += it.vy;
        if (it.x < 0.05) {
          it.x = 0.05;
          it.vx = Math.abs(it.vx);
        } else if (it.x > 0.95) {
          it.x = 0.95;
          it.vx = -Math.abs(it.vx);
        }
        if (it.y < 0.05) {
          it.y = 0.05;
          it.vy = Math.abs(it.vy);
        } else if (it.y > 0.95) {
          it.y = 0.95;
          it.vy = -Math.abs(it.vy);
        }
      });

      const radiusPx = 70;
      for (let i = 0; i < letters.length; i++) {
        for (let j = i + 1; j < letters.length; j++) {
          const a = letters[i];
          const b = letters[j];
          const ax = a.x * w;
          const ay = a.y * h;
          const bx = b.x * w;
          const by = b.y * h;
          const dx = ax - bx;
          const dy = ay - by;
          if (dx * dx + dy * dy <= radiusPx * radiusPx) {
            const combo1 = a.text + b.text;
            const combo2 = b.text + a.text;
            let chosen = null;
            if (isPrefixOfAny(combo1)) {
              chosen = combo1;
            } else if (isPrefixOfAny(combo2)) {
              chosen = combo2;
            }
            if (chosen) {
              const merged = {
                text: chosen,
                x: (a.x + b.x) / 2,
                y: (a.y + b.y) / 2,
                vx: (a.vx + b.vx) / 2,
                vy: (a.vy + b.vy) / 2,
                color: randomColor(),
              };
              const isComplete = isFullWord(chosen);
              if (isComplete) {
                merged.color = '#ffd54f';
                merged.vx = 0;
                merged.vy = 0;
              }
              letters.splice(j, 1);
              letters[i] = merged;
              j--;
            } else {
              // bounce away if not combinable
              const tmpVx = a.vx;
              a.vx = -a.vx;
              a.vy = -a.vy;
              b.vx = -b.vx;
              b.vy = -b.vy;
            }
          }
        }
      }

      letters.forEach((it, i) => {
        const wobble = Math.sin(t * 1.2 + i) * 8;
        ctx.globalAlpha = 0.6 + 0.4 * Math.abs(Math.sin(t * 0.7 + i));
        ctx.fillStyle = it.color || (settings.bgMode === 'white' ? '#0a0a0a' : '#f5f5f5');
        ctx.fillText(it.text, it.x * w, it.y * h + wobble);
      });
      ctx.globalAlpha = 1;
    };
  }
  function numberCounter() {
    const digits = '0123456789';
    const palette = ['#7cf7a3', '#ffd37a', '#ff9eb5', '#9fe6ff', '#bda5ff'];
    const randomColor = () => palette[Math.floor(Math.random() * palette.length)];
    const items = Array.from({ length: 6 }, () => ({
      value: Math.floor(Math.random() * 10),
      x: Math.random(),
      y: 0.25 + Math.random() * 0.5,
      color: randomColor(),
    }));
    let lastSpawn = performance.now() / 1000;
    const spawnInterval = 5;

    setInteractionHandlers({
      tap(px, py) {
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        let hit = false;
        for (let i = items.length - 1; i >= 0; i--) {
          const it = items[i];
          const cx = it.x * w;
          const cy = it.y * h;
          const dx = px - cx;
          const dy = py - cy;
          const r = 60;
          if (dx * dx + dy * dy <= r * r) {
            if (it.value >= 9) {
              items.splice(i, 1);
            } else {
              it.value += 1;
              it.color = randomColor();
            }
            hit = true;
            break;
          }
        }
        return hit;
      },
    });

    return (ctx, canvas, t) => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const nowSec = performance.now() / 1000;
      if (nowSec - lastSpawn >= spawnInterval && items.length < 18) {
        items.push({
          value: Math.floor(Math.random() * 10),
          x: Math.random(),
          y: 0.25 + Math.random() * 0.5,
          color: randomColor(),
        });
        lastSpawn = nowSec;
      }
      ctx.fillStyle = 'rgba(0,0,0,0.92)';
      ctx.fillRect(0, 0, w, h);
      ctx.font = '112px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      items.forEach((it, i) => {
        const bob = Math.sin(t * 1.2 + i) * 10;
        ctx.globalAlpha = 0.6 + 0.4 * Math.abs(Math.sin(t + i));
        ctx.fillStyle = it.color;
        ctx.fillText(digits[it.value], it.x * w, it.y * h + bob);
      });
      ctx.globalAlpha = 1;
    };
  }

  function numberBounce() {
    const digits = '0123456789';
    const palette = ['#7cf7a3', '#ffd37a', '#ff9eb5', '#9fe6ff', '#bda5ff'];
    const randomColor = () => palette[Math.floor(Math.random() * palette.length)];

    const items = [];
    const makeItem = (value) => {
      const speed = 0.0015 + Math.random() * 0.003;
      const dirs = [
        [1, 0], [-1, 0], [0, 1], [0, -1],
        [1, 1], [-1, 1], [1, -1], [-1, -1],
      ];
      const [dx, dy] = dirs[Math.floor(Math.random() * dirs.length)];
      const norm = Math.hypot(dx, dy) || 1;
      const vx = (dx / norm) * speed;
      const vy = (dy / norm) * speed;
      return {
        value,
        x: 0.2 + Math.random() * 0.6,
        y: 0.2 + Math.random() * 0.6,
        vx,
        vy,
        color: randomColor(),
      };
    };

    items.push(makeItem(1 + Math.floor(Math.random() * 9)));
    items.push(makeItem(1 + Math.floor(Math.random() * 9)));

    const maxCount = 16;

    setInteractionHandlers({
      tap() {
        if (items.length >= maxCount) return false;
        const v = 1 + Math.floor(Math.random() * 9);
        items.push(makeItem(v));
        return true;
      },
    });

    return (ctx, canvas, t) => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.fillStyle = 'rgba(0,0,0,0.92)';
      ctx.fillRect(0, 0, w, h);
      ctx.font = '72px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      items.forEach((it) => {
        it.x += it.vx;
        it.y += it.vy;
        if (it.x < 0.05) {
          it.x = 0.05;
          it.vx = Math.abs(it.vx);
        } else if (it.x > 0.95) {
          it.x = 0.95;
          it.vx = -Math.abs(it.vx);
        }
        if (it.y < 0.15) {
          it.y = 0.15;
          it.vy = Math.abs(it.vy);
        } else if (it.y > 0.85) {
          it.y = 0.85;
          it.vy = -Math.abs(it.vy);
        }
      });

      const radiusPx = 60;
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          const a = items[i];
          const b = items[j];
          const ax = a.x * w;
          const ay = a.y * h;
          const bx = b.x * w;
          const by = b.y * h;
          const dx = ax - bx;
          const dy = ay - by;
          if (dx * dx + dy * dy <= radiusPx * radiusPx) {
            a.value = a.value + b.value;
            a.color = randomColor();
            items.splice(j, 1);
            j--;
          }
        }
      }

      items.forEach((it, i) => {
        const bob = Math.sin(t * 1.5 + i) * 6;
        ctx.globalAlpha = 0.6 + 0.4 * Math.abs(Math.sin(t + i));
        ctx.fillStyle = it.color;
        ctx.fillText(String(it.value), it.x * w, it.y * h + bob);
      });
      ctx.globalAlpha = 1;
    };
  }

  function alphabetCounter() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const palette = ['#ff9eb5', '#ffd37a', '#9fe6ff', '#bda5ff', '#8cf5c3'];
    const randomColor = () => palette[Math.floor(Math.random() * palette.length)];
    const items = Array.from({ length: 6 }, (_, i) => ({
      index: (i * 3) % letters.length,
      x: 0.15 + i * 0.14,
      y: 0.5,
      color: randomColor(),
    }));
    let lastSpawn = performance.now() / 1000;
    const spawnInterval = 5;

    setInteractionHandlers({
      tap(px, py) {
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        let hit = false;
        for (let i = items.length - 1; i >= 0; i--) {
          const it = items[i];
          const cx = it.x * w;
          const cy = it.y * h;
          const dx = px - cx;
          const dy = py - cy;
          const r = 72;
          if (dx * dx + dy * dy <= r * r) {
            if (it.index >= letters.length - 1) {
              items.splice(i, 1);
            } else {
              it.index += 1;
              it.color = randomColor();
            }
            hit = true;
            break;
          }
        }
        return hit;
      },
    });

    return (ctx, canvas, t) => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const nowSec = performance.now() / 1000;
      if (nowSec - lastSpawn >= spawnInterval && items.length < 26) {
        items.push({
          index: 0,
          x: 0.1 + Math.random() * 0.8,
          y: 0.3 + Math.random() * 0.4,
          color: randomColor(),
        });
        lastSpawn = nowSec;
      }
      ctx.fillStyle = settings.bgMode === 'white' ? '#fff' : '#0a0a0a';
      ctx.fillRect(0, 0, w, h);
      ctx.font = '136px "Futura", "Helvetica Neue", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      items.forEach((it, i) => {
        const wobble = Math.sin(t * 1.5 + i) * 8;
        ctx.globalAlpha = 0.6 + 0.4 * Math.abs(Math.sin(t * 0.7 + i));
        ctx.fillStyle = it.color || (settings.bgMode === 'white' ? '#0a0a0a' : '#f5f5f5');
        ctx.fillText(letters[it.index], it.x * w, it.y * h + wobble);
      });
      ctx.globalAlpha = 1;
    };
  }

  function photoFlow(opts) {
    const imgs = photoImages.filter((img) => img && img.src);
    const count = Math.min(opts.density || 6, imgs.length || 6);
    const sprites = [];
    const hearts = [];
    const maxSprites = 20;

    function randomSprite(i, atX, atY) {
      const img = imgs.length ? imgs[(i + Math.floor(Math.random() * imgs.length)) % imgs.length] : null;
      const modeIndex = i % 4;
      const baseScale = 0.35 + Math.random() * 0.4;
      return {
        img,
        mode: modeIndex, // 0: left->right, 1: top->bottom, 2: pop, 3: spin
        t0: performance.now() / 1000,
        x: atX != null ? atX : Math.random(),
        y: atY != null ? atY : Math.random(),
        vx: (Math.random() * 0.15 + 0.05) * (opts.speed || 1),
        vy: (Math.random() * 0.15 + 0.05) * (opts.speed || 1),
        scale: baseScale,
        life: 6 + Math.random() * 4,
      };
    }

    for (let i = 0; i < count; i++) {
      sprites.push(randomSprite(i));
    }

    setTapHandler((x, y) => {
      const now = performance.now() / 1000;
      let hit = false;
      sprites.forEach((s) => {
        if (!s.img || !s.img.complete) return;
        const w = s.img.naturalWidth || 800;
        const h = s.img.naturalHeight || 600;
        const canvasW = canvas.clientWidth;
        const canvasH = canvas.clientHeight;
        const longer = Math.max(w, h) || 1;
        const scaleFactor = s.scale * 0.6;
        const targetW = (w / longer) * canvasW * 0.35 * scaleFactor;
        const targetH = (h / longer) * canvasH * 0.35 * scaleFactor;
        const cx = s.x * canvasW;
        const cy = s.y * canvasH;
        const left = cx - targetW / 2;
        const top = cy - targetH / 2;
        if (x >= left && x <= left + targetW && y >= top && y <= top + targetH) {
          for (let i = 0; i < 10; i++) {
            const jitterX = (Math.random() - 0.5) * 40;
            const jitterY = (Math.random() - 0.5) * 40;
            hearts.push({ x: cx + jitterX, y: cy + jitterY, t0: now + i * 0.02 });
          }
          hit = true;
        }
      });
      if (!hit && sprites.length < maxSprites) {
        const rect = canvas.getBoundingClientRect();
        const nx = x / rect.width;
        const ny = y / rect.height;
        sprites.push(randomSprite(sprites.length, nx, ny));
        return true;
      }
      return hit;
    });

    return (ctx, canvas, t) => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.fillStyle = settings.bgMode === 'white' ? '#fdfdfd' : '#02040a';
      ctx.fillRect(0, 0, w, h);

      const now = performance.now() / 1000;

      sprites.forEach((s, idx) => {
        if (!s.img || !s.img.complete) return;
        const age = now - s.t0;
        if (age > s.life) {
          sprites[idx] = randomSprite(idx);
        }
        let x = s.x;
        let y = s.y;
        let angle = 0;
        let scale = s.scale;

        if (s.mode === 0) {
          x += s.vx * 0.02;
          if (x > 1.2) x = -0.2;
          y += Math.sin(t * 0.7 + idx) * 0.0008;
        } else if (s.mode === 1) {
          y -= s.vy * 0.02;
          if (y < -0.2) y = 1.2;
          x += Math.sin(t * 0.9 + idx) * 0.0008;
        } else if (s.mode === 2) {
          const k = Math.min(1, age / 0.7);
          scale *= 0.6 + k * 0.8;
        } else if (s.mode === 3) {
          angle = t * 0.7 + idx;
          x += Math.cos(t * 0.4 + idx) * 0.005;
          y += Math.sin(t * 0.5 + idx) * 0.005;
        }

        s.x = x;
        s.y = y;

        const img = s.img;
        const iw = img.naturalWidth || 800;
        const ih = img.naturalHeight || 600;
        const longer = Math.max(iw, ih) || 1;
        const targetW = (iw / longer) * w * 0.35 * scale;
        const targetH = (ih / longer) * h * 0.35 * scale;
        const cx = x * w;
        const cy = y * h;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle * 0.25);
        ctx.globalAlpha = 0.7 + 0.3 * Math.sin(t * 0.8 + idx);
        ctx.drawImage(img, -targetW / 2, -targetH / 2, targetW, targetH);
        ctx.restore();
      });

      for (let i = hearts.length - 1; i >= 0; i--) {
        const heart = hearts[i];
        const elapsed = now - heart.t0;
        const duration = 1.2;
        if (elapsed > duration) {
          hearts.splice(i, 1);
          continue;
        }
        const progress = elapsed / duration;
        const y = heart.y - progress * 60;
        const alpha = 1 - progress;
        ctx.save();
        ctx.translate(heart.x, y);
        ctx.scale(1 + progress * 0.3, 1 + progress * 0.3);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#ff73a6';
        ctx.beginPath();
        const size = 18;
        const s = size / 2;
        ctx.moveTo(0, -s / 2);
        ctx.bezierCurveTo(-s, -s * 1.5, -s * 2, -s * 0.1, 0, s);
        ctx.bezierCurveTo(s * 2, -s * 0.1, s, -s * 1.5, 0, -s / 2);
        ctx.fill();
        ctx.restore();
      }
    };
  }

  // ---- Audio helpers ----
  function createSynth() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = AudioCtx ? new AudioCtx() : null;
    let volume = settings.volume;
    let bgmPlaying = false;
    let bgmToken = 0;

    const ramp = (param, value, time) => {
      if (!ctx) return;
      param.cancelScheduledValues(ctx.currentTime);
      param.linearRampToValueAtTime(value, ctx.currentTime + time);
    };

    const playTone = (freq, duration = 0.2, gainValue = 0.2) => {
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.value = gainValue * volume;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      ramp(gain.gain, 0.0001, duration);
      osc.stop(ctx.currentTime + duration);
    };

    const playMusicBoxNote = (freq, when, length = 0.9) => {
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, when);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(5000, when);

      const baseGain = 0.18 * volume;
      gain.gain.setValueAtTime(0, when);
      gain.gain.linearRampToValueAtTime(baseGain, when + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + length);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(when);
      osc.stop(when + Math.min(1.0, length + 0.1));
    };

    const startBgm = () => {
      if (!ctx || bgmPlaying) return;
      bgmPlaying = true;
      bgmToken += 1;
      const token = bgmToken;

      const startTime = ctx.currentTime + 0.1;
      const bpm = 92;
      const beat = 60 / bpm;
      const base = 587.33; // D5 (少し明るめ)
      const pattern = [
        0, 2, 4, 7,
        4, 2, 0, 2,
        4, 7, 9, 7,
        4, 2, 4, 2,
      ];

      const loop = (cycleStart) => {
        if (!bgmPlaying || token !== bgmToken) return;
        const stepDur = beat / 2;
        for (let i = 0; i < pattern.length; i++) {
          const semitone = pattern[i];
          const t = cycleStart + i * stepDur;
          const freq = base * Math.pow(2, semitone / 12);
          playMusicBoxNote(freq, t, 0.65);
          if (i % 4 === 0) {
            const highFreq = freq * 2;
            playMusicBoxNote(highFreq, t + stepDur * 0.5, 0.4);
          }
        }
        const nextCycle = cycleStart + pattern.length * stepDur;
        const delayMs = Math.max(0, (nextCycle - ctx.currentTime - 0.05) * 1000);
        setTimeout(() => loop(nextCycle), delayMs);
      };

      ctx.resume().then(() => {
        loop(startTime);
      });
    };

    const stopBgm = () => {
      if (!ctx || !bgmPlaying) return;
      bgmPlaying = false;
      bgmToken += 1;
    };

    return {
      startBgm,
      stopBgm,
      setVolume(v) {
        volume = v;
      },
      note(freq = 440) {
        playTone(freq, 0.12, 0.25);
      },
      sparkle() {
        playTone(880, 0.15, 0.25);
        setTimeout(() => playTone(1320, 0.12, 0.2), 80);
      },
      switch() {
        playTone(420, 0.08, 0.12);
      },
    };
  }

  // ---- Special: スーパーで遊ぶ ----
  function specialMarket() {
    const shelfColors = ['#f7b733', '#ff6f61', '#7bd389', '#f2d16b', '#8cd3ff', '#ff9ad5'];
    const fruits = Array.from({ length: 3 }, (_, row) => {
      const items = [];
      for (let i = 0; i < 14; i++) {
        items.push({
          x: Math.random(),
          size: 10 + Math.random() * 14,
          color: shelfColors[Math.floor(Math.random() * shelfColors.length)],
          shade: row,
          kind: Math.random(),
        });
      }
      return items;
    });

    const hairStyles = [
      { color: '#4a4a4a', height: 0.08, width: 0.16 },
      { color: '#2e86ff', height: 0.09, width: 0.18 },
      { color: '#ffb347', height: 0.1, width: 0.2 },
      { color: '#8b3fff', height: 0.07, width: 0.16 },
      { color: '#2fd38a', height: 0.09, width: 0.18 },
      { color: '#f76d6d', height: 0.08, width: 0.18 },
      { color: '#2d9c5d', height: 0.085, width: 0.2 },
    ];
    const skinTones = ['#f8d6b4', '#e9b07c', '#c88c5a', '#9c6a3d', '#6f4b2a'];
    const bodyColors = ['#8fd3f4', '#ff9ad5', '#7bd389', '#f2d16b', '#c4b5ff', '#ffa37f', '#ffd166'];
    const shoeColors = ['#444', '#2f4b8f', '#c93f3f', '#2d8a5f', '#ff8c42', '#1c1c1c'];

    const state = {
      chars: [],
      nextId: 1,
      dragTarget: null,
    };

    const button = { x: 16, y: 62, w: 120, h: 42 };

    const spawnChar = () => {
      const w = canvas.clientWidth || 1;
      const sizeN = Math.max(0.08, Math.min(0.14, (70 + Math.random() * 20) / Math.max(w, 320)));
      const ground = 0.74;
      const x = -sizeN;
      const y = ground - sizeN * 1.25;
      const target = 0.18 + Math.random() * 0.64;
      const hairIndex = Math.floor(Math.random() * hairStyles.length);
      state.chars.push({
        id: state.nextId++,
        x,
        y,
        sizeN,
        target,
        walking: true,
        walkPhase: Math.random() * Math.PI * 2,
        hair: hairIndex,
        skin: skinTones[Math.floor(Math.random() * skinTones.length)],
        body: bodyColors[Math.floor(Math.random() * bodyColors.length)],
        shoes: shoeColors[Math.floor(Math.random() * shoeColors.length)],
      });
    };

    const hitButton = (px, py) => {
      return px >= button.x && px <= button.x + button.w && py >= button.y && py <= button.y + button.h;
    };

    const hitChar = (px, py) => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      for (let i = state.chars.length - 1; i >= 0; i--) {
        const c = state.chars[i];
        const size = c.sizeN * w;
        const cx = c.x * w + size * 0.5;
        const cy = c.y * h + size * 0.35;
        const dx = px - cx;
        const dy = py - cy;
        if (dx * dx + dy * dy <= (size * 0.4) * (size * 0.4)) {
          return c;
        }
      }
      return null;
    };

    const changeHair = (char) => {
      char.hair = (char.hair + 1) % hairStyles.length;
      triggerSfx('sparkle');
    };

    setInteractionHandlers({
      tap(px, py) {
        if (hitButton(px, py)) {
          spawnChar();
          return true;
        }
        const c = hitChar(px, py);
        if (c) {
          changeHair(c);
          return true;
        }
        return false;
      },
      down(px, py) {
        const c = hitChar(px, py);
        if (c) {
          state.dragTarget = c;
          return true;
        }
        return false;
      },
      move(px, py) {
        if (!state.dragTarget) return;
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        state.dragTarget.x = Math.min(0.95, Math.max(-0.05, px / w - state.dragTarget.sizeN * 0.5));
        state.dragTarget.y = Math.min(0.82, Math.max(0.1, py / h - state.dragTarget.sizeN * 0.6));
        state.dragTarget.walking = false;
      },
      up() {
        state.dragTarget = null;
      },
    });

    const drawBackground = (ctx, w, h, t) => {
      const skyH = h * 0.38;
      const floorY = h * 0.78;
      const grad = ctx.createLinearGradient(0, 0, 0, skyH);
      grad.addColorStop(0, '#f6e9ff');
      grad.addColorStop(1, '#d3f3ff');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, skyH);

      ctx.fillStyle = '#f2e8d8';
      ctx.fillRect(0, skyH, w, floorY - skyH);

      ctx.fillStyle = '#e5d9c5';
      for (let i = 0; i < 6; i++) {
        const y = floorY + i * 8;
        ctx.fillRect(0, y, w, 4);
      }

      ctx.fillStyle = '#d7e6f8';
      ctx.fillRect(0, 0, w, 22);
      ctx.fillStyle = '#c3d8f5';
      ctx.fillRect(0, 22, w, 10);

      const shelfTop = skyH + 10;
      const shelfH = 70;
      for (let r = 0; r < fruits.length; r++) {
        const y = shelfTop + r * (shelfH + 12);
        ctx.fillStyle = '#f5f2f0';
        ctx.fillRect(12, y, w - 24, shelfH);
        ctx.strokeStyle = 'rgba(0,0,0,0.06)';
        ctx.strokeRect(12, y, w - 24, shelfH);

        const items = fruits[r];
        items.forEach((f, idx) => {
          const px = 24 + f.x * (w - 48);
          const py = y + 12 + (idx % 2) * 26;
          const radius = f.size;
          ctx.save();
          ctx.translate(px, py);
          ctx.rotate(Math.sin(t * 2 + idx) * 0.08);
          ctx.fillStyle = f.color;
          if (f.kind > 0.6) {
            ctx.beginPath();
            ctx.ellipse(0, 0, radius * 0.7, radius * 0.45, 0, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.beginPath();
            ctx.arc(0, 0, radius * 0.55, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        });
      }

      ctx.fillStyle = '#f6f0e7';
      ctx.fillRect(0, floorY, w, h - floorY);
    };

    const drawButton = (ctx, t) => {
      ctx.save();
      ctx.translate(button.x, button.y);
      ctx.fillStyle = 'rgba(255, 204, 120, 0.9)';
      ctx.strokeStyle = 'rgba(0,0,0,0.08)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(0, 0, button.w, button.h, 12);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#7a3a0f';
      ctx.font = '16px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('人を出す 👣', button.w / 2, button.h / 2 + Math.sin(t * 3) * 1.2);
      ctx.restore();
    };

    const drawChar = (ctx, c, w, h, t) => {
      const size = c.sizeN * w;
      const baseX = c.x * w;
      const baseY = c.y * h;
      const wobble = Math.sin(t * 6 + c.id) * (c.walking ? 2 : 0.8);
      ctx.save();
      ctx.translate(baseX, baseY);

      // shadow
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.beginPath();
      ctx.ellipse(size * 0.4, size * 1.05, size * 0.28, size * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();

      // feet
      ctx.fillStyle = c.shoes || '#444';
      const footOffset = c.walking ? Math.sin(t * 10 + c.id) * 4 : 0;
      ctx.beginPath();
      ctx.roundRect(size * 0.12 + footOffset, size * 0.95, size * 0.2, size * 0.1, 6);
      ctx.roundRect(size * 0.42 - footOffset, size * 0.95, size * 0.2, size * 0.1, 6);
      ctx.fill();

      // body
      ctx.fillStyle = c.body || '#8fd3f4';
      ctx.beginPath();
      ctx.roundRect(size * 0.08, size * 0.4, size * 0.64, size * 0.46, 14);
      ctx.fill();

      // face
      ctx.save();
      ctx.translate(size * 0.4, size * 0.32 + wobble * 0.2);
      ctx.fillStyle = c.skin || '#ffd1a8';
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.24, 0, Math.PI * 2);
      ctx.fill();

      // hair
      const hair = hairStyles[c.hair];
      ctx.fillStyle = hair.color;
      const hw = size * hair.width;
      const hh = size * hair.height;
      ctx.beginPath();
      ctx.roundRect(-hw / 2, -hh - size * 0.12, hw, hh, 10);
      ctx.fill();

      // eyes
      ctx.fillStyle = '#3c2b1a';
      ctx.beginPath();
      ctx.arc(-size * 0.08, -size * 0.02, size * 0.04, 0, Math.PI * 2);
      ctx.arc(size * 0.08, -size * 0.02, size * 0.04, 0, Math.PI * 2);
      ctx.fill();

      // mouth
      ctx.strokeStyle = '#3c2b1a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, size * 0.05, size * 0.08, 0, Math.PI);
      ctx.stroke();
      ctx.restore();

      ctx.restore();
    };

    return (ctx, canvas, t) => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      drawBackground(ctx, w, h, t);

      state.chars.forEach((c) => {
        if (c.walking) {
          c.x += 0.004;
          if (c.x >= c.target) {
            c.walking = false;
          }
        }
      });

      drawButton(ctx, t);
      state.chars.forEach((c) => drawChar(ctx, c, w, h, t));
    };
  }
})();
