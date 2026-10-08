(function () {
  var root = document.documentElement;
  root.classList.add('js');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- language ---------- */
  document.querySelector('.lang').addEventListener('click', function () {
    var next = root.getAttribute('data-lang') === 'fr' ? 'en' : 'fr';
    root.setAttribute('data-lang', next);
    root.lang = next;
    try { localStorage.setItem('lang', next); } catch (e) {}
    restartTyping();
  });

  /* ---------- navbar ---------- */
  var nav = document.getElementById('nav');
  var menuBtn = document.querySelector('.menu-btn');
  menuBtn.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', open);
  });
  document.querySelectorAll('.links a').forEach(function (a) {
    a.addEventListener('click', function () {
      nav.classList.remove('open');
      menuBtn.setAttribute('aria-expanded', 'false');
    });
  });
  function onScroll() { nav.classList.toggle('scrolled', window.scrollY > 10); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- typed roles ---------- */
  var roles = {
    en: ['Embedded Software Engineer', 'C / C++ & Qt Developer', 'Automotive Test & Validation', 'STM32 · ESP32 · Rust'],
    fr: ['Ingénieur Logiciel Embarqué', 'Développeur C / C++ & Qt', 'Test & Validation Automobile', 'STM32 · ESP32 · Rust']
  };
  var typedEl = document.getElementById('typed');
  var timer = null;

  function restartTyping() {
    clearTimeout(timer);
    var list = roles[root.getAttribute('data-lang')] || roles.en;
    if (reduceMotion) { typedEl.textContent = list[0]; return; }
    var i = 0, pos = 0, deleting = false;
    (function tick() {
      var word = list[i];
      pos += deleting ? -1 : 1;
      typedEl.textContent = word.slice(0, pos);
      var delay = deleting ? 35 : 70;
      if (!deleting && pos === word.length) { deleting = true; delay = 1800; }
      else if (deleting && pos === 0) { deleting = false; i = (i + 1) % list.length; delay = 300; }
      timer = setTimeout(tick, delay);
    })();
  }
  restartTyping();

  /* ---------- project filter ---------- */
  var filters = document.querySelectorAll('.pf');
  filters.forEach(function (btn) {
    btn.addEventListener('click', function () {
      filters.forEach(function (b) { b.classList.toggle('active', b === btn); });
      var f = btn.getAttribute('data-f');
      document.querySelectorAll('.pc').forEach(function (card) {
        card.classList.toggle('hide', f !== 'all' && card.getAttribute('data-k') !== f);
      });
    });
  });

  /* ---------- reveal on scroll + active nav ---------- */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });

    var links = {};
    document.querySelectorAll('.links a').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
    var navIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        Object.keys(links).forEach(function (k) { links[k].classList.toggle('active', k === e.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('main section[id]').forEach(function (s) { navIo.observe(s); });
  } else {
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('visible'); });
  }

  document.getElementById('yr').textContent = new Date().getFullYear();

  /* ---------- background: PCB traces with travelling signals ---------- */
  var canvas = document.getElementById('bg');
  var ctx = canvas.getContext('2d');
  var W, H, dpr, traces = [], pulses = [];
  var GRID = 34;

  function build() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    traces = [];
    var count = Math.round((W * H) / 34000);
    for (var n = 0; n < count; n++) {
      var x = Math.round(Math.random() * W / GRID) * GRID;
      var y = Math.round(Math.random() * H / GRID) * GRID;
      var pts = [[x, y]];
      var dir = Math.floor(Math.random() * 4);
      var segs = 2 + Math.floor(Math.random() * 3);
      for (var s = 0; s < segs; s++) {
        var len = GRID * (1 + Math.floor(Math.random() * 4));
        // PCB style: straight runs and 45° bends
        var dx = [1, 0, -1, 0][dir], dy = [0, 1, 0, -1][dir];
        if (s % 2 === 1) { dx = dx || (Math.random() < 0.5 ? 1 : -1); dy = dy || (Math.random() < 0.5 ? 1 : -1); }
        x += dx * len; y += dy * len;
        pts.push([x, y]);
        dir = (dir + (Math.random() < 0.5 ? 1 : 3)) % 4;
      }
      var total = 0;
      for (var p = 1; p < pts.length; p++) total += Math.hypot(pts[p][0] - pts[p - 1][0], pts[p][1] - pts[p - 1][1]);
      traces.push({ pts: pts, len: total });
    }
    pulses = [];
  }

  function pointAt(t, d) {
    for (var p = 1; p < t.pts.length; p++) {
      var a = t.pts[p - 1], b = t.pts[p];
      var seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (d <= seg) return [a[0] + (b[0] - a[0]) * d / seg, a[1] + (b[1] - a[1]) * d / seg];
      d -= seg;
    }
    return t.pts[t.pts.length - 1];
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(240,166,58,0.055)';
    ctx.fillStyle = 'rgba(240,166,58,0.13)';
    traces.forEach(function (t) {
      ctx.beginPath();
      ctx.moveTo(t.pts[0][0], t.pts[0][1]);
      for (var p = 1; p < t.pts.length; p++) ctx.lineTo(t.pts[p][0], t.pts[p][1]);
      ctx.stroke();
      var a = t.pts[0], b = t.pts[t.pts.length - 1];
      ctx.beginPath(); ctx.arc(a[0], a[1], 2.2, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(b[0], b[1], 2.2, 0, 6.283); ctx.fill();
    });

    if (!reduceMotion) {
      if (pulses.length < traces.length / 4 && Math.random() < 0.06) {
        pulses.push({ t: traces[Math.floor(Math.random() * traces.length)], d: 0, v: 0.6 + Math.random() * 0.9 });
      }
      pulses = pulses.filter(function (p) {
        p.d += p.v;
        if (p.d > p.t.len) return false;
        var tail = 26;
        for (var k = 0; k < tail; k += 2) {
          if (p.d - k < 0) break;
          var q = pointAt(p.t, p.d - k);
          ctx.fillStyle = 'rgba(255,196,107,' + (0.5 * (1 - k / tail)) + ')';
          ctx.beginPath(); ctx.arc(q[0], q[1], 1.6, 0, 6.283); ctx.fill();
        }
        return true;
      });
      requestAnimationFrame(draw);
    }
  }

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { build(); if (reduceMotion) draw(); }, 150);
  });
  build();
  draw();
})();
