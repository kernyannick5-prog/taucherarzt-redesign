/* Hide a " · " separator when the line breaks right after it, so no line
   ever ends with a dangling dot. The dot stays in the text (copy, screen
   readers); only its glyph is made invisible, which never changes layout. */
(function () {
  'use strict';
  var seps = document.querySelectorAll('.dsep');
  if (!seps.length || !document.createRange) return;

  function update() {
    for (var i = 0; i < seps.length; i++) {
      var sep = seps[i];
      var dot = sep.querySelector('.dot');
      var next = sep.nextElementSibling;
      if (!dot || !next) continue;
      var a = dot.getBoundingClientRect();
      var b = next.getClientRects()[0];
      sep.classList.toggle('is-break', !!b && b.top > a.top + a.height / 2);
    }
  }

  var timer = 0;
  function schedule() { window.clearTimeout(timer); timer = window.setTimeout(update, 120); }
  /* first measurement after the initial render, never during it */
  window.requestAnimationFrame(function () { window.setTimeout(update, 0); });
  window.addEventListener('resize', schedule);
  window.addEventListener('load', update);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(update);
})();
