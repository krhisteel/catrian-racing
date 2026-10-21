// Interacciones de la portada (antes estaban en línea en index.html; aparte para la política de seguridad CSP).
(function () {
    var root = document.documentElement;

    if ('IntersectionObserver' in window) {
        var revealObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    revealObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15 });
        document.querySelectorAll('.reveal').forEach(function (el) {
            revealObserver.observe(el);
        });

        var sections = document.querySelectorAll('section[id]');
        var navLinks = document.querySelectorAll('.nav a');
        var spy = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    navLinks.forEach(function (link) {
                        link.classList.toggle('active', link.getAttribute('href') === '#' + entry.target.id);
                    });
                }
            });
        }, { rootMargin: '-40% 0px -55% 0px' });
        sections.forEach(function (section) {
            spy.observe(section);
        });

        var statObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                statObserver.unobserve(entry.target);
                var el = entry.target;
                var target = parseInt(el.dataset.count, 10);
                var suffix = el.dataset.suffix || '';
                var duration = 1600;
                var start = null;
                function step(now) {
                    if (start === null) start = now;
                    var progress = Math.min((now - start) / duration, 1);
                    var eased = 1 - Math.pow(1 - progress, 3);
                    el.textContent = Math.round(target * eased).toLocaleString('es-CL') + suffix;
                    if (progress < 1) requestAnimationFrame(step);
                }
                requestAnimationFrame(step);
            });
        }, { threshold: 0.4 });
        document.querySelectorAll('.stat-num').forEach(function (el) {
            statObserver.observe(el);
        });
    } else {
        document.querySelectorAll('.reveal').forEach(function (el) {
            el.classList.add('visible');
        });
    }

    var gallery = document.getElementById('gallery');
    var prev = document.getElementById('gallery-prev');
    var next = document.getElementById('gallery-next');
    if (gallery && prev && next) {
        var autoTimer = null;
        var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        function galleryStep() {
            var item = gallery.querySelector('.gallery-item');
            return item ? item.offsetWidth + 18 : 340;
        }

        function move(direction) {
            var step = galleryStep();
            var maxScroll = gallery.scrollWidth - gallery.clientWidth;
            if (direction > 0) {
                if (gallery.scrollLeft >= maxScroll - 4) {
                    gallery.scrollTo({ left: 0, behavior: 'auto' });
                } else {
                    gallery.scrollBy({ left: Math.min(step, maxScroll - gallery.scrollLeft), behavior: 'smooth' });
                }
            } else if (gallery.scrollLeft <= 4) {
                gallery.scrollTo({ left: maxScroll, behavior: 'auto' });
            } else {
                gallery.scrollBy({ left: -step, behavior: 'smooth' });
            }
        }

        function startAuto() {
            if (!reducedMotion && autoTimer === null) {
                autoTimer = setInterval(function () {
                    move(1);
                }, 3000);
            }
        }

        function stopAuto() {
            if (autoTimer !== null) {
                clearInterval(autoTimer);
                autoTimer = null;
            }
        }

        prev.addEventListener('click', function () {
            stopAuto();
            move(-1);
        });
        next.addEventListener('click', function () {
            stopAuto();
            move(1);
        });
        gallery.addEventListener('mouseenter', stopAuto);
        gallery.addEventListener('mouseleave', startAuto);
        startAuto();
    }

    var form = document.getElementById('quote-form');
    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var nombre = form.nombre.value.trim();
            var servicio = form.servicio.value;
            var mensaje = form.mensaje.value.trim();
            var texto = 'Hola Catrian Racing!';
            if (nombre) texto += ' Soy ' + nombre + '.';
            texto += ' Me interesa: ' + servicio + '.';
            if (mensaje) texto += ' ' + mensaje;
            window.open('https://wa.me/' + (window.catrianWhatsApp ? window.catrianWhatsApp() : '56936621284') + '?text=' + encodeURIComponent(texto), '_blank', 'noopener');
        });
    }

    // Acceso oculto al administrador: mantener presionado el logo 2 s o 5 clics seguidos.
    var logo = document.getElementById('logo');
    if (logo) {
        var pressTimer = null;
        var clicks = 0;
        var clickTimer = null;
        var goAdmin = function () { window.location.href = 'admin.html'; };
        var cancelPress = function () {
            clearTimeout(pressTimer);
            pressTimer = null;
        };
        logo.addEventListener('pointerdown', function () {
            cancelPress();
            pressTimer = setTimeout(goAdmin, 2000);
        });
        ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (type) {
            logo.addEventListener(type, cancelPress);
        });
        logo.addEventListener('contextmenu', function (e) { e.preventDefault(); });
        logo.addEventListener('click', function () {
            clicks += 1;
            clearTimeout(clickTimer);
            clickTimer = setTimeout(function () { clicks = 0; }, 1500);
            if (clicks >= 5) goAdmin();
        });
    }

    var menuBtn = document.getElementById('menu-btn');
    var mainNav = document.getElementById('main-nav');
    if (menuBtn && mainNav) {
        menuBtn.addEventListener('click', function () {
            var open = mainNav.classList.toggle('open');
            menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
        mainNav.addEventListener('click', function (e) {
            if (e.target.closest('a')) {
                mainNav.classList.remove('open');
                menuBtn.setAttribute('aria-expanded', 'false');
            }
        });
    }

    var newsletter = document.getElementById('newsletter-form');
    if (newsletter) {
        newsletter.addEventListener('submit', function (e) {
            e.preventDefault();
            var texto = 'Hola Catrian Racing! Soy ' + newsletter.name.value.trim() + ' y quiero recibir sus ofertas por WhatsApp.';
            window.open('https://wa.me/' + (window.catrianWhatsApp ? window.catrianWhatsApp() : '56936621284') + '?text=' + encodeURIComponent(texto), '_blank', 'noopener');
            newsletter.reset();
        });
    }

    var toTop = document.getElementById('to-top');
    if (toTop) {
        window.addEventListener('scroll', function () {
            toTop.classList.toggle('show', window.scrollY > 400);
        }, { passive: true });
        toTop.addEventListener('click', function () {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
})();
