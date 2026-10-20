(function () {
    var root = document.documentElement;
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    /* ===== INTRO: SEMÁFORO DE LARGADA (una vez por visita) ===== */
    function intro() {
        var seen = false;
        try { seen = sessionStorage.getItem('catrian-intro') === '1'; } catch (e) { seen = true; }
        if (seen || reduced || location.hash) return;
        try { sessionStorage.setItem('catrian-intro', '1'); } catch (e) { /* sin almacenamiento */ }

        var overlay = document.createElement('div');
        overlay.className = 'intro';
        overlay.setAttribute('aria-hidden', 'true');
        var lights = document.createElement('div');
        lights.className = 'intro-lights';
        for (var i = 0; i < 5; i++) lights.appendChild(document.createElement('span'));
        var logo = document.createElement('div');
        logo.className = 'intro-logo';
        logo.appendChild(document.createTextNode('CATRIAN '));
        var b = document.createElement('b');
        b.textContent = 'RACING';
        logo.appendChild(b);
        var skip = document.createElement('div');
        skip.className = 'intro-skip';
        skip.textContent = 'Toca para saltar';
        overlay.appendChild(lights);
        overlay.appendChild(logo);
        overlay.appendChild(skip);
        document.body.appendChild(overlay);

        var timers = [];
        var done = false;
        function finish() {
            if (done) return;
            done = true;
            timers.forEach(clearTimeout);
            lights.querySelectorAll('span').forEach(function (s) { s.classList.remove('on'); });
            overlay.classList.add('out');
            setTimeout(function () { overlay.remove(); }, 950);
        }
        lights.querySelectorAll('span').forEach(function (s, idx) {
            timers.push(setTimeout(function () { s.classList.add('on'); }, 150 + idx * 200));
        });
        // «Lights out and away we go»: se apagan todas y se abre la página.
        timers.push(setTimeout(finish, 150 + 5 * 200 + 350));
        overlay.addEventListener('click', finish);
    }

    /* ===== TÍTULO: PALABRAS ESCALONADAS ===== */
    function splitTitle() {
        var h1 = document.querySelector('.hero h1');
        if (!h1 || reduced) return;
        var index = 0;
        Array.prototype.slice.call(h1.childNodes).forEach(function (node) {
            if (node.nodeType === 3) {
                var frag = document.createDocumentFragment();
                node.textContent.split(/(\s+)/).forEach(function (part) {
                    if (!part) return;
                    if (/^\s+$/.test(part)) {
                        frag.appendChild(document.createTextNode(part));
                    } else {
                        var w = document.createElement('span');
                        w.className = 'word';
                        w.style.setProperty('--w', index++);
                        w.textContent = part;
                        frag.appendChild(w);
                    }
                });
                h1.replaceChild(frag, node);
            } else if (node.nodeType === 1) {
                node.classList.add('word');
                node.style.setProperty('--w', index++);
            }
        });
    }

    /* ===== PORTADA: LUZ QUE SIGUE AL PUNTERO Y BOTONES MAGNÉTICOS ===== */
    function heroPointer() {
        var hero = document.querySelector('.hero');
        if (!hero || reduced || !finePointer) return;
        var frame = null;
        hero.addEventListener('pointermove', function (e) {
            if (frame) return;
            frame = requestAnimationFrame(function () {
                frame = null;
                var r = hero.getBoundingClientRect();
                hero.style.setProperty('--px', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
                hero.style.setProperty('--py', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
            });
        });

        hero.querySelectorAll('.hero-cta .btn').forEach(function (btn) {
            btn.addEventListener('pointermove', function (e) {
                var r = btn.getBoundingClientRect();
                var x = (e.clientX - r.left - r.width / 2) * 0.25;
                var y = (e.clientY - r.top - r.height / 2) * 0.35;
                btn.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
            });
            btn.addEventListener('pointerleave', function () {
                btn.style.transform = '';
            });
        });
    }

    /* ===== CABECERA COMPACTA Y PROGRESO (respaldo sin scroll-timeline) ===== */
    function scrollEffects() {
        var header = document.querySelector('.header');
        var bar = document.querySelector('.scroll-progress');
        var nativeProgress = window.CSS && CSS.supports && CSS.supports('animation-timeline: scroll()');
        var ticking = false;
        function update() {
            ticking = false;
            var y = window.scrollY;
            if (header) header.classList.toggle('scrolled', y > 40);
            if (bar && !nativeProgress) {
                var max = document.documentElement.scrollHeight - window.innerHeight;
                bar.style.setProperty('--progress', max > 0 ? Math.min(y / max, 1) : 0);
            }
        }
        window.addEventListener('scroll', function () {
            if (!ticking) {
                ticking = true;
                requestAnimationFrame(update);
            }
        }, { passive: true });
        update();
    }

    /* ===== TARJETAS CON RELIEVE 3D Y BRILLO METÁLICO ===== */
    function tilt() {
        if (reduced || !finePointer) return;
        var selector = '.card, .service, .stat, .testimonial';
        var active = null;
        var frame = null;
        var last = null;

        function reset(el) {
            el.classList.remove('tilting');
            el.style.removeProperty('--rx');
            el.style.removeProperty('--ry');
        }

        document.addEventListener('pointermove', function (e) {
            var el = e.target.closest ? e.target.closest(selector) : null;
            if (active && active !== el) reset(active);
            active = el;
            if (!el) return;
            el.classList.add('tilt', 'tilting');
            last = e;
            if (frame) return;
            frame = requestAnimationFrame(function () {
                frame = null;
                if (!active) return;
                var r = active.getBoundingClientRect();
                var x = (last.clientX - r.left) / r.width;
                var y = (last.clientY - r.top) / r.height;
                active.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
                active.style.setProperty('--my', (y * 100).toFixed(1) + '%');
                active.style.setProperty('--rx', ((0.5 - y) * 7).toFixed(2) + 'deg');
                active.style.setProperty('--ry', ((x - 0.5) * 9).toFixed(2) + 'deg');
            });
        }, { passive: true });

        document.addEventListener('pointerleave', function () {
            if (active) reset(active);
            active = null;
        });
    }

    /* ===== APARICIÓN ESCALONADA ===== */
    function stagger() {
        document.querySelectorAll('.reveal').forEach(function (el) {
            var siblings = Array.prototype.filter.call(el.parentNode.children, function (c) {
                return c.classList.contains('reveal');
            });
            el.style.setProperty('--i', Math.min(siblings.indexOf(el), 6));
        });
    }

    intro();
    splitTitle();
    heroPointer();
    scrollEffects();
    tilt();
    stagger();
})();
