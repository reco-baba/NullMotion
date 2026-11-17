// Null Motion opening splash. An empty timeline draws in, a playhead sweeps it and each
// letter of "null." lands as the playhead passes it, the track fills orange, then the
// wordmark flies into the header logo and the page shows through. The letter entrance is
// picked at random each time, so the intro never plays quite the same way twice.
// Plays once per tab session; `?splash` forces it. Skipped for prefers-reduced-motion.
(() => {
  const splash = document.getElementById('splash');
  if (!splash) return;
  const KEY = 'null-splash-seen';
  const force = new URLSearchParams(location.search).has('splash');
  let seen = false;
  try { seen = sessionStorage.getItem(KEY) === '1'; } catch { /* storage blocked */ }
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;
  const finish = () => { removeEventListener('keydown', fly); root.classList.remove('splashing'); splash.remove(); };
  if (!window.gsap || (!force && (seen || reduce))) { finish(); return; }
  try { sessionStorage.setItem(KEY, '1'); } catch { /* storage blocked */ }
  root.classList.add('splashing');

  const $ = (selector) => splash.querySelector(selector);
  const word = $('.splash-word'), track = $('.splash-track'), fill = $('.splash-fill');
  const head = $('.splash-head'), meta = $('.splash-meta'), clock = $('.splash-clock');
  const glow = $('.splash-glow'), skip = $('.splash-skip');
  const letters = [...'null'].map((c) => Object.assign(document.createElement('span'), { className: 'ch', textContent: c }));
  const dot = Object.assign(document.createElement('span'), { className: 'ch dot', textContent: '.' });
  word.append(...letters, dot);

  // Three entrances; one is chosen per visit.
  const entrances = [
    { name: 'rise', from: { yPercent: 70, opacity: 0, filter: 'blur(10px)' }, ease: 'back.out(2)' },
    { name: 'flip', from: { rotationX: -100, opacity: 0, transformOrigin: '50% 100%' }, ease: 'back.out(1.6)' },
    { name: 'stretch', from: { scaleY: 0, scaleX: 1.5, opacity: 0, transformOrigin: '50% 100%' }, ease: 'elastic.out(1, .45)' },
  ];
  const entrance = entrances[Math.floor(Math.random() * entrances.length)];
  splash.dataset.entrance = entrance.name;

  const SWEEP_AT = 0.45, SWEEP = 1.1, LENGTH = 2.0;
  const rig = $('.splash-rig').getBoundingClientRect();
  // When does the (linear) playhead cross the middle of an element?
  const crossAt = (el) => {
    const r = el.getBoundingClientRect();
    return SWEEP_AT + SWEEP * Math.min(1, Math.max(0, (r.left + r.width / 2 - rig.left) / rig.width));
  };
  const time = { t: 0 };
  const showTime = () => { clock.textContent = `0:0${time.t.toFixed(1)}`; };

  // Start once the page's own setup (demo.mjs) has run, so the first frames aren't janky.
  const tl = gsap.timeline({ paused: true, onComplete: finish });
  const start = () => requestAnimationFrame(() => requestAnimationFrame(() => tl.play()));
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', start, { once: true });
  else start();
  tl.set(dot, { y: -rig.width * 0.55, scaleY: 1.3 })
    .to(track, { scaleX: 1, duration: 0.45, ease: 'power3.out' }, 0)
    .to(meta, { opacity: 1, duration: 0.3 }, 0.15)
    .to(skip, { opacity: 1, duration: 0.4 }, 0.6)
    .to(head, { opacity: 1, duration: 0.15 }, SWEEP_AT - 0.1)
    .fromTo(head, { x: 0 }, { x: rig.width, duration: SWEEP, ease: 'none' }, SWEEP_AT)
    .to(time, { t: LENGTH, duration: SWEEP + 0.35, ease: 'none', onUpdate: showTime }, SWEEP_AT);
  letters.forEach((ch) => tl.fromTo(ch, entrance.from, { yPercent: 0, rotationX: 0, scaleX: 1, scaleY: 1, opacity: 1, filter: 'blur(0px)', duration: 0.55, ease: entrance.ease }, crossAt(ch) - 0.04));
  const land = crossAt(dot) + 0.05;
  tl.to(dot, { opacity: 1, duration: 0.1 }, land - 0.3)
    .to(dot, { y: 0, scaleY: 1, duration: 0.5, ease: 'bounce.out' }, land - 0.3)
    .to(fill, { scaleX: 1, duration: 0.35, ease: 'power2.out' }, land + 0.1)
    .to(head, { opacity: 0, duration: 0.2 }, land + 0.1)
    .fromTo(glow, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1.15, duration: 0.5, ease: 'power2.out' }, land + 0.1)
    .to(glow, { opacity: 0, duration: 0.6 }, land + 0.6)
    .addLabel('exit', land + 0.75)
    .to([track, meta, skip], { opacity: 0, duration: 0.25 }, 'exit')
    .add(() => fly(), 'exit');

  // Exit: the wordmark shrinks onto the header's "null." while the backdrop fades away.
  let flying = false;
  function fly() {
    if (flying) return;
    flying = true;
    tl.kill();
    // A skip can land mid-sweep: snap the wordmark to its finished state first.
    gsap.set([...letters, dot], { clearProps: 'transform,filter' });
    gsap.set([...letters, dot], { opacity: 1 });
    const logo = document.querySelector('.bar .logo');
    const from = word.getBoundingClientRect();
    const to = logo ? logo.getBoundingClientRect() : null;
    const out = gsap.timeline({ onComplete: finish });
    out.to(splash, { backgroundColor: 'rgba(11, 11, 12, 0)', duration: 0.6, ease: 'power2.inOut' }, 0)
      .to([track, meta, skip, head, glow], { opacity: 0, duration: 0.25 }, 0);
    if (to && to.width) {
      out.to(word, { x: to.left - from.left, y: to.top + to.height / 2 - (from.top + from.height / 2), scale: to.width / from.width, duration: 0.7, ease: 'power3.inOut' }, 0)
        .add(() => root.classList.remove('splashing'), 0.62)
        .to(word, { opacity: 0, duration: 0.08 }, 0.62);
    } else {
      out.to(word, { opacity: 0, scale: 0.9, duration: 0.4 }, 0);
    }
  }

  splash.addEventListener('click', fly);
  addEventListener('keydown', fly);
})();
