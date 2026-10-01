/* taucherarzt.online - site behaviour (vanilla, no dependencies) */
(function () {
  'use strict';

  var doc = document;
  window.__siteReady = true;
  var reduceMq = window.matchMedia('(prefers-reduced-motion: reduce)');
  function $(id) { return doc.getElementById(id); }

  /* Footer year */
  var yearEl = $('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Header: solid after ~40px, light parallax on hero rings ---------- */
  var header = $('siteHeader');
  var rings = doc.querySelector('.hero-rings');
  var ticking = false;

  function onFrame() {
    ticking = false;
    var y = window.pageYOffset || 0;
    if (header) header.classList.toggle('is-scrolled', y > 40);
    if (rings && reduceMq.matches) {
      if (rings.style.transform) rings.style.transform = '';
    } else if (rings && !doc.documentElement.classList.contains('motion-paused') && y < window.innerHeight * 1.2) {
      rings.style.transform = 'translate3d(0,' + (y * 0.06).toFixed(1) + 'px,0)';
    }
  }
  function onScroll() {
    if (!ticking) { ticking = true; window.requestAnimationFrame(onFrame); }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onFrame();

  /* ---------- Pause / resume the decorative hero animation ---------- */
  var motionBtn = $('motionToggle');
  if (motionBtn) {
    var root = doc.documentElement;
    var setPaused = function (paused, store) {
      root.classList.toggle('motion-paused', paused);
      motionBtn.setAttribute('aria-pressed', paused ? 'true' : 'false');
      if (store) { try { window.localStorage.setItem('motionPaused', paused ? '1' : '0'); } catch (e) {} }
      try { window.dispatchEvent(new Event('motionchange')); } catch (e) {}
    };
    var saved = null;
    try { saved = window.localStorage.getItem('motionPaused'); } catch (e) {}
    if (saved === '1') setPaused(true, false);
    motionBtn.addEventListener('click', function () {
      setPaused(!root.classList.contains('motion-paused'), true);
    });
  }

  /* ---------- Mobile menu ---------- */
  var toggle = $('menuToggle');
  var nav = $('primaryNav');
  if (toggle && nav) {
    var label = toggle.querySelector('.visually-hidden');
    var desktopMq = window.matchMedia('(min-width: 900px)');
    var inertTargets = [$('main'), doc.querySelector('.site-footer'), doc.querySelector('.mobile-bar')];

    var setBackground = function (inert) {
      inertTargets.forEach(function (el) {
        if (!el) return;
        if (inert) el.setAttribute('inert', ''); else el.removeAttribute('inert');
      });
    };
    var isOpen = function () { return doc.body.classList.contains('nav-open'); };
    var openNav = function () {
      doc.body.classList.add('nav-open');
      toggle.setAttribute('aria-expanded', 'true');
      if (label) label.textContent = 'Menü schließen';
      setBackground(true);
      var first = nav.querySelector('a');
      if (first) first.focus();
    };
    var closeNav = function (returnFocus) {
      doc.body.classList.remove('nav-open');
      toggle.setAttribute('aria-expanded', 'false');
      if (label) label.textContent = 'Menü öffnen';
      setBackground(false);
      if (returnFocus) toggle.focus();
    };

    toggle.addEventListener('click', function () {
      if (isOpen()) closeNav(true); else openNav();
    });
    nav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        if (!isOpen()) return;
        closeNav(false);
        /* The focused link is about to be hidden with the drawer: hand focus to
           the jump target (or back to the toggle) so it is never dropped. */
        var href = a.getAttribute('href') || '';
        var target = href.length > 1 && href.charAt(0) === '#' ? doc.getElementById(href.slice(1)) : null;
        if (target) {
          if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
          target.focus({ preventScroll: true });
        } else {
          toggle.focus();
        }
      });
    });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen()) { closeNav(true); }
    });
    var onMq = function () { if (desktopMq.matches && isOpen()) closeNav(false); };
    if (desktopMq.addEventListener) desktopMq.addEventListener('change', onMq);
    else if (desktopMq.addListener) desktopMq.addListener(onMq);
  }

  /* ---------- Step strip (scroll-snap) with prev / next ---------- */
  var strip = $('stepsStrip');
  var prevBtn = $('stepPrev');
  var nextBtn = $('stepNext');
  if (strip && prevBtn && nextBtn) {
    var cards = strip.querySelectorAll('.step');
    var stepAmount = function () {
      if (cards.length > 1) {
        var d = Math.abs(cards[1].offsetLeft - cards[0].offsetLeft);
        if (d) return d;
      }
      return cards.length ? cards[0].getBoundingClientRect().width + 20 : 260;
    };
    var setDisabled = function (btn, state) {
      btn.setAttribute('aria-disabled', state ? 'true' : 'false');
    };
    var updateButtons = function () {
      var max = strip.scrollWidth - strip.clientWidth;
      var x = Math.abs(strip.scrollLeft);
      setDisabled(prevBtn, max <= 2 || x <= 2);
      setDisabled(nextBtn, max <= 2 || x >= max - 2);
      /* only a keyboard tab stop while there is something to scroll */
      if (max <= 2) strip.removeAttribute('tabindex'); else strip.setAttribute('tabindex', '0');
    };
    var scrollStrip = function (dir) {
      strip.scrollBy({ left: dir * stepAmount(), behavior: reduceMq.matches ? 'auto' : 'smooth' });
    };
    prevBtn.addEventListener('click', function () {
      if (prevBtn.getAttribute('aria-disabled') !== 'true') scrollStrip(-1);
    });
    nextBtn.addEventListener('click', function () {
      if (nextBtn.getAttribute('aria-disabled') !== 'true') scrollStrip(1);
    });
    strip.addEventListener('scroll', updateButtons, { passive: true });
    window.addEventListener('resize', updateButtons);
    updateButtons();
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(updateButtons);
  }

  /* ---------- Reveal on scroll + active nav (aria-current) ---------- */
  var revealEls = doc.querySelectorAll('.reveal');
  var sections = doc.querySelectorAll('#top, #qualifikation, #praxisspektrum, #kontakt');
  var navLinks = doc.querySelectorAll('.nav a[href^="#"]');

  function setActive(id) {
    navLinks.forEach(function (a) {
      if (a.getAttribute('href') === '#' + id) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }

  if ('IntersectionObserver' in window) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        /* Also reveal elements already scrolled past (fast scroll, anchor
           jumps) - they may never report an intersection. */
        var passed = entry.rootBounds && entry.boundingClientRect.bottom < entry.rootBounds.top;
        if (entry.isIntersecting || passed) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -5% 0px' });
    revealEls.forEach(function (el) { revealObserver.observe(el); });

    /* Safety net: an observer only reports threshold crossings, so an element
       jumped over within a single frame (fast fling, anchor jump) can stay
       hidden. Reveal everything whose top is already above the viewport bottom. */
    var pending = Array.prototype.slice.call(revealEls);
    var sweepQueued = false;
    var sweep = function () {
      sweepQueued = false;
      var limit = window.innerHeight;
      pending = pending.filter(function (el) {
        if (el.classList.contains('is-visible')) return false;
        if (el.getBoundingClientRect().top < limit) {
          el.classList.add('is-visible');
          revealObserver.unobserve(el);
          return false;
        }
        return true;
      });
      if (!pending.length) window.removeEventListener('scroll', queueSweep);
    };
    var queueSweep = function () {
      if (!sweepQueued) { sweepQueued = true; window.setTimeout(sweep, 150); }
    };
    window.addEventListener('scroll', queueSweep, { passive: true });

    var navObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { navObserver.observe(s); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  }
})();
