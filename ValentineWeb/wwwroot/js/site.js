(function () {
  'use strict';

  var HEART_COUNT = 52;
  var REDUCED_MOTION = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (REDUCED_MOTION) HEART_COUNT = 26;
  else if (typeof navigator !== 'undefined' && navigator.hardwareConcurrency <= 4) HEART_COUNT = Math.min(HEART_COUNT, 56);

  function rand(min, max) { return Math.random() * (max - min) + min; }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  var scrollProgress = 0;
  var deckScattered = false;
  var heartCountActual = HEART_COUNT;
  var photosBaseUrl = 'images/photos';

  function setRibbon() {
    var fill = document.getElementById('ribbonFill');
    if (!fill) return;
    fill.style.width = Math.round(scrollProgress * 100) + '%';
  }

  function setRail() {
    var railWrap = document.getElementById('heartRail');
    var rail = document.getElementById('railHearts');
    var percentEl = document.getElementById('railPercent');
    if (!railWrap || !rail || !percentEl) return;
    var p = clamp(scrollProgress, 0, 1);
    percentEl.textContent = Math.round(p * 100) + '%';
    var hearts = 13;
    var active = Math.round(p * (hearts - 1));
    if (rail.children.length !== hearts) {
      rail.innerHTML = '';
      var railHeartSvg = '<svg class="icon rail-heart-icon" aria-hidden="true"><use href="#icon-heart"/></svg>';
      for (var i = 0; i < hearts; i++) {
        var div = document.createElement('div');
        div.className = 'rail-heart';
        div.setAttribute('aria-hidden', 'true');
        div.innerHTML = railHeartSvg;
        rail.appendChild(div);
      }
    }
    var wrapH = railWrap.clientHeight || 520;
    var wrapW = railWrap.clientWidth || 48;
    var scaleY = wrapH / 520;
    var scaleX = wrapW / 48;
    var heartSize = rail.children[0] ? rail.children[0].getBoundingClientRect().width : 20;
    if (!heartSize || isNaN(heartSize)) heartSize = 20;

    for (var j = 0; j < rail.children.length; j++) {
      var child = rail.children[j];
      var t = (hearts <= 1) ? 0 : j / (hearts - 1);
      var xCenterBase = 24 + Math.sin(t * Math.PI * 5) * 10;
      var yCenterBase = 10 + t * 500;
      var x = xCenterBase * scaleX;
      var y = yCenterBase * scaleY;
      child.style.left = (x - heartSize / 2) + 'px';
      child.style.top = (y - heartSize / 2) + 'px';
      child.classList.toggle('dim', j > active);
    }
  }

  function onScroll() {
    var doc = document.documentElement;
    var scrollTop = window.scrollY || doc.scrollTop;
    var scrollHeight = doc.scrollHeight - window.innerHeight;
    scrollProgress = scrollHeight <= 0 ? 0 : scrollTop / scrollHeight;
    scrollProgress = clamp(scrollProgress, 0, 1);
    setRibbon();
    setRail();
    var statProgress = document.getElementById('statProgress');
    if (statProgress) statProgress.textContent = Math.round(scrollProgress * 100) + '%';
    revealOnScroll();
  }

  function initReveal() {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -45% 0px' }
    );
    document.querySelectorAll('.reveal').forEach(function (el) {
      el.classList.remove('visible');
      var delay = el.getAttribute('data-reveal-delay');
      if (delay) el.style.transitionDelay = delay + 's';
      observer.observe(el);
    });
  }
  function revealOnScroll() {
    var vh = window.innerHeight;
    document.querySelectorAll('.reveal:not(.visible)').forEach(function (el) {
      var rect = el.getBoundingClientRect();
      if (rect.top < vh * 0.55) el.classList.add('visible');
    });
  }

  function openEnvelope() {
    var overlay = document.getElementById('envelopeOverlay');
    var seal = document.getElementById('envelopeSeal');
    if (!overlay || !seal) return;
    seal.classList.add('seal-pressed');
    overlay.classList.add('open');
    setTimeout(function () {
      overlay.classList.add('hidden');
      var main = document.getElementById('mainContent');
      if (main) main.hidden = false;
      document.getElementById('ribbonWrap').style.visibility = 'visible';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      onScroll();
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          initReveal();
          setTimeout(function () { revealOnScroll(); }, 50);
        });
      });
    }, 560);
  }

  function addHeartsToContainer(container, count) {
    if (!container) return;
    container.innerHTML = '';
    var svgHeart = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="0.5"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>';
    for (var i = 0; i < count; i++) {
      var size = rand(12, 32);
      var x0 = rand(0, 100);
      var y0 = rand(0, 100);
      var duration = rand(24, 42);
      var delay = rand(0, 8);
      var opacity = rand(0.18, 0.34);
      if (Math.random() < 0.2) opacity += 0.14;
      var hue = rand(332, 350);
      var dx = rand(-120, 120);
      var dy = rand(-120, 120);
      var spin = rand(-18, 18);
      var div = document.createElement('div');
      div.className = 'heart-float';
      div.setAttribute('aria-hidden', 'true');
      div.style.left = x0 + '%';
      div.style.top = y0 + '%';
      div.style.width = size + 'px';
      div.style.height = size + 'px';
      div.style.color = 'hsla(' + hue + ', 95%, 68%, ' + Math.min(0.92, opacity + 0.2) + ')';
      div.style.animationDuration = duration + 's';
      div.style.animationDelay = delay + 's';
      div.style.setProperty('--dx', dx + 'px');
      div.style.setProperty('--dy', dy + 'px');
      div.style.setProperty('--spin', spin + 'deg');
      div.style.setProperty('--op', opacity);
      div.innerHTML = svgHeart;
      container.appendChild(div);
    }
  }

  function initHearts() {
    addHeartsToContainer(document.getElementById('heartsLayer'), heartCountActual);
    var intro = document.getElementById('introHearts');
    if (intro) addHeartsToContainer(intro, Math.max(22, Math.round(heartCountActual * 0.85)));
  }

  function runConfettiSpark(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    var sparkSvg = '<svg class="icon spark-bit-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"/></svg>';
    for (var i = 0; i < 16; i++) {
      var span = document.createElement('span');
      span.className = 'spark-bit';
      span.innerHTML = sparkSvg;
      span.style.setProperty('--sx', rand(-160, 160) + 'px');
      span.style.setProperty('--sy', rand(-60, 160) + 'px');
      span.style.setProperty('--sr', rand(-70, 70) + 'deg');
      span.style.animationDelay = rand(0, 0.25) + 's';
      span.style.animationDuration = (0.85 * rand(0.6, 1.3)) + 's';
      container.appendChild(span);
    }
    setTimeout(function () { container.innerHTML = ''; }, 1100);
  }

  function showSecret(sparkContainerId) {
    var backdrop = document.getElementById('modalBackdrop');
    var modal = document.getElementById('modalSecret');
    if (sparkContainerId) runConfettiSpark(sparkContainerId);
    backdrop.hidden = false;
    modal.hidden = false;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        backdrop.classList.add('show');
        modal.classList.add('show');
      });
    });
  }

  function closeSecret() {
    var backdrop = document.getElementById('modalBackdrop');
    var modal = document.getElementById('modalSecret');
    backdrop.classList.remove('show');
    modal.classList.remove('show');
    setTimeout(function () {
      modal.hidden = true;
      if (!document.getElementById('modalPhoto').classList.contains('show')) backdrop.hidden = true;
    }, 280);
  }

  function showPhoto(title, subtitle, imgSrc) {
    document.getElementById('modalPhotoTitle').textContent = title;
    document.getElementById('modalPhotoSub').textContent = subtitle;
    var img = document.getElementById('modalPhotoImg');
    img.src = imgSrc || '';
    img.alt = title;
    var backdrop = document.getElementById('modalBackdrop');
    var modal = document.getElementById('modalPhoto');
    backdrop.hidden = false;
    modal.hidden = false;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        backdrop.classList.add('show');
        modal.classList.add('show');
      });
    });
  }

  function closePhoto() {
    var backdrop = document.getElementById('modalBackdrop');
    var modal = document.getElementById('modalPhoto');
    backdrop.classList.remove('show');
    modal.classList.remove('show');
    setTimeout(function () {
      modal.hidden = true;
      if (!document.getElementById('modalSecret').classList.contains('show')) backdrop.hidden = true;
    }, 280);
  }

  function kissBurst() {
    var container = document.getElementById('kissBurst');
    if (!container) return;
    container.innerHTML = '';
    var svgHeart = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>';
    for (var i = 0; i < 12; i++) {
      var span = document.createElement('span');
      span.className = 'burst-heart';
      span.style.setProperty('--bx', rand(-150, 150) + 'px');
      span.style.setProperty('--by', rand(-120, 120) + 'px');
      span.style.setProperty('--bs', rand(0.85, 1.25));
      span.style.setProperty('--br', rand(-90, 90) + 'deg');
      span.innerHTML = svgHeart;
      container.appendChild(span);
    }
    setTimeout(function () { container.innerHTML = ''; }, 950);
  }

  document.getElementById('ribbonWrap').style.visibility = 'hidden';
  document.getElementById('envelopeSeal').addEventListener('click', function () { openEnvelope(); });
  document.getElementById('btnSecret').addEventListener('click', function () { showSecret('confettiSpark'); });
  document.getElementById('btnSecret2').addEventListener('click', function () { showSecret('confettiSpark2'); });
  document.getElementById('btnSecret3').addEventListener('click', function () { showSecret('confettiSpark3'); });
  document.getElementById('btnScroll').addEventListener('click', function () { window.scrollTo({ top: window.innerHeight, behavior: 'smooth' }); });
  document.getElementById('btnTop').addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
  document.getElementById('btnKiss').addEventListener('click', kissBurst);
  document.getElementById('closeSecret').addEventListener('click', closeSecret);
  document.getElementById('closePhoto').addEventListener('click', closePhoto);
  document.getElementById('modalBackdrop').addEventListener('click', function () { closeSecret(); closePhoto(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeSecret(); closePhoto(); } });

  function applyPhotosConfig(baseUrl) {
    photosBaseUrl = baseUrl || photosBaseUrl;
    document.querySelectorAll('.deck-card').forEach(function (card) {
      var file = card.getAttribute('data-file');
      if (!file) return;
      var url = photosBaseUrl + '/' + file;
      card.setAttribute('data-img', url);
      var imgEl = card.querySelector('.deck-card-img');
      if (imgEl) imgEl.style.backgroundImage = "url('" + url + "')";
    });
  }

  fetch('/api/config').then(function (r) { return r.json(); }).then(function (cfg) {
    if (cfg && cfg.photosBaseUrl) applyPhotosConfig(cfg.photosBaseUrl);
  }).catch(function () { applyPhotosConfig(); });

  var deckArea = document.getElementById('deckArea');
  deckArea.addEventListener('click', function (e) {
    if (!deckScattered) {
      deckScattered = true;
      deckArea.classList.add('scattered');
      return;
    }
    var card = e.target.closest('.deck-card');
    if (card && deckScattered) {
      var title = card.getAttribute('data-title') || 'Фото';
      var sub = card.getAttribute('data-subtitle') || '';
      var img = card.getAttribute('data-img') || '';
      showPhoto(title, sub, img);
    }
  });
  deckArea.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { deckArea.click(); } });

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { onScroll(); });
  onScroll();
  initHearts();

  document.getElementById('statHearts').textContent = heartCountActual;
})();
