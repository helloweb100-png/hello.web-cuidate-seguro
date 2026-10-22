/* ==========================================================================
   CUÍDATE SEGURO · app.js
   Dependencias locales (carpeta /vendor): GSAP + ScrollTrigger + Lenis.
   Sin listeners de scroll: todo se maneja con ScrollTrigger / IntersectionObserver.
   Si GSAP no carga o el usuario prefiere menos movimiento, la página cae a un
   modo estático completamente funcional (clase .is-reduced).
   ========================================================================== */
(() => {
    'use strict';

    /* ------------------------------------------------------------------
       CONFIGURACIÓN: reemplaza el número (código de país + 10 dígitos)
       Ejemplo México: '5215512345678'. También reemplaza '5200000000000'
       en los href de index.html (búsqueda y reemplazo global).
       ------------------------------------------------------------------ */
    const CONFIG = {
        whatsapp: '5200000000000',
    };

    const $ = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
    const html = document.documentElement;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const hasGSAP = Boolean(window.gsap && window.ScrollTrigger);
    const waUrl = (text) => `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(text)}`;

    let lenis = null;

    /* ==================================================================
       1. COMPONENTES SIN DEPENDENCIA DE ANIMACIÓN
       ================================================================== */

    /** Enlaces de WhatsApp: el texto se define en data-wa. */
    function initWhatsApp() {
        $$('[data-wa]').forEach((a) => {
            a.href = waUrl(a.dataset.wa);
        });
        // Tooltip del botón flotante: aparece unos segundos y se oculta.
        const float = $('.wa-float');
        if (float) {
            setTimeout(() => float.classList.add('is-tip'), 6000);
            setTimeout(() => float.classList.remove('is-tip'), 11000);
        }
    }

    /** Marquee: duplica el contenido para un loop continuo y sin saltos. */
    function initMarquee() {
        const track = $('[data-marquee]');
        if (!track || html.classList.contains('is-reduced')) return;
        const clone = track.cloneNode(true);
        $$('li', clone).forEach((li) => li.setAttribute('aria-hidden', 'true'));
        track.append(...Array.from(clone.children));
    }

    /** Menú móvil. */
    function initMenu() {
        const burger = $('#nav-burger');
        const menu = $('#menu');
        if (!burger || !menu) return;

        const setOpen = (open) => {
            burger.setAttribute('aria-expanded', String(open));
            burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
            menu.classList.toggle('is-open', open);
            menu.setAttribute('aria-hidden', String(!open));
            if (lenis) open ? lenis.stop() : lenis.start();
            html.style.overflow = open ? 'hidden' : '';
        };

        burger.addEventListener('click', () => setOpen(burger.getAttribute('aria-expanded') !== 'true'));
        $$('a', menu).forEach((a) => a.addEventListener('click', () => setOpen(false)));
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && menu.classList.contains('is-open')) {
                setOpen(false);
                burger.focus();
            }
        });
        window.matchMedia('(min-width: 1024px)').addEventListener('change', (e) => e.matches && setOpen(false));
    }

    /** Tabs del seguro de auto (patrón ARIA con teclado). */
    function initTabs() {
        const list = $('.tablist');
        if (!list) return;
        const tabs = $$('[role="tab"]', list);

        const select = (tab, focus = false) => {
            tabs.forEach((t) => {
                const on = t === tab;
                t.setAttribute('aria-selected', String(on));
                t.tabIndex = on ? 0 : -1;
                const panel = document.getElementById(t.getAttribute('aria-controls'));
                if (!panel) return;
                if (on) {
                    panel.hidden = false;
                    if (hasGSAP && !reduceMotion) {
                        gsap.fromTo(panel, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: .6, ease: 'expo.out' });
                    }
                } else {
                    panel.hidden = true;
                }
            });
            if (focus) tab.focus();
            if (window.ScrollTrigger) ScrollTrigger.refresh();
        };

        tabs.forEach((tab, i) => {
            tab.addEventListener('click', () => select(tab));
            tab.addEventListener('keydown', (e) => {
                const dir = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
                if (dir) {
                    e.preventDefault();
                    select(tabs[(i + dir + tabs.length) % tabs.length], true);
                } else if (e.key === 'Home') {
                    e.preventDefault();
                    select(tabs[0], true);
                } else if (e.key === 'End') {
                    e.preventDefault();
                    select(tabs[tabs.length - 1], true);
                }
            });
        });
    }

    /** Acordeón de preguntas frecuentes. */
    function initAccordion() {
        $$('.acc-item').forEach((item) => {
            const btn = $('.acc-btn', item);
            btn.addEventListener('click', () => {
                const open = btn.getAttribute('aria-expanded') === 'true';
                btn.setAttribute('aria-expanded', String(!open));
                item.classList.toggle('is-open', !open);
                if (window.ScrollTrigger) setTimeout(() => ScrollTrigger.refresh(), 620);
            });
        });
    }

    /** "Conoce más...": ventana con la información de cada tarjeta de seguro (<template class="bcard-info">). */
    function initMore() {
        const dlg = $('#more');
        if (!dlg || typeof dlg.showModal !== 'function') return;
        const ico = $('#more-ico');
        const title = $('#more-title');
        const body = $('#more-body');
        const cta = $('#more-cta');

        // Bloquea el scroll de la página mientras la ventana está abierta (sin que se mueva el contenido por la barra de scroll).
        const lock = (on) => {
            if (lenis) on ? lenis.stop() : lenis.start();
            html.style.overflow = on ? 'hidden' : '';
            html.style.scrollbarGutter = on ? 'stable' : '';
        };

        const open = (btn) => {
            const card = btn.closest('.bcard');
            const info = card && $('.bcard-info', card);
            if (!info || dlg.open) return;
            title.textContent = $('h3', card).textContent;
            ico.className = $('.bcard-ico', card).className.replace('bcard-ico', '').trim();
            body.replaceChildren(info.content.cloneNode(true));
            body.scrollTop = 0;
            const wa = $('[data-wa]', card);
            if (wa) cta.href = waUrl(wa.dataset.wa);
            lock(true);
            dlg.showModal();
        };

        const close = () => {
            if (!dlg.open || dlg.classList.contains('is-closing')) return;
            dlg.classList.add('is-closing');
            const onEnd = (e) => { if (e.target === dlg) done(); };
            const done = () => {
                clearTimeout(fallback);
                dlg.removeEventListener('animationend', onEnd);
                dlg.classList.remove('is-closing');
                dlg.close();
            };
            const fallback = setTimeout(done, 400);
            dlg.addEventListener('animationend', onEnd);
        };

        $$('.bcard-more').forEach((btn) => btn.addEventListener('click', () => open(btn)));
        $('#more-close').addEventListener('click', close);
        dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); });
        dlg.addEventListener('close', () => lock(false)); // también cubre la tecla Esc
    }

    /** Formulario: valida y redirige a WhatsApp con el mensaje armado. */
    function initForm() {
        const form = $('#wa-form');
        if (!form) return;
        const name = $('#f-name', form);
        const interest = $('#f-interest', form);
        const phone = $('#f-phone', form);
        const msg = $('#f-msg', form);
        const note = $('#form-note');

        const setError = (input, text) => {
            const field = input.closest('.field');
            const err = $('.field-err', field);
            field.classList.toggle('has-error', Boolean(text));
            err.textContent = text || '';
            input.setAttribute('aria-invalid', text ? 'true' : 'false');
        };

        [name, interest].forEach((el) => el.addEventListener('input', () => setError(el, '')));
        interest.addEventListener('change', () => setError(interest, ''));

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            let firstInvalid = null;

            if (name.value.trim().length < 2) {
                setError(name, 'Escribe tu nombre para poder atenderte.');
                firstInvalid = name;
            }
            if (!interest.value) {
                setError(interest, 'Elige qué te gustaría proteger.');
                firstInvalid = firstInvalid || interest;
            }
            if (firstInvalid) {
                firstInvalid.focus();
                return;
            }

            const parts = [`Hola, soy ${name.value.trim()}.`, `Me interesa: ${interest.value}.`];
            if (msg.value.trim()) parts.push(msg.value.trim());
            if (phone.value.trim()) parts.push(`Mi teléfono: ${phone.value.trim()}`);

            form.classList.add('is-sent');
            note.textContent = 'Abriendo WhatsApp con tu mensaje listo...';
            window.open(waUrl(parts.join('\n')), '_blank', 'noopener');
            setTimeout(() => {
                form.classList.remove('is-sent');
                note.textContent = 'Se abrirá WhatsApp con tu mensaje listo para enviar.';
            }, 6000);
        });
    }

    /** Spotlight que sigue al cursor sobre las tarjetas. */
    function initSpotlight() {
        if (!finePointer) return;
        document.addEventListener('pointermove', (e) => {
            const card = e.target.closest && e.target.closest('.spot');
            if (!card) return;
            const r = card.getBoundingClientRect();
            card.style.setProperty('--mx', `${e.clientX - r.left}px`);
            card.style.setProperty('--my', `${e.clientY - r.top}px`);
        }, { passive: true });
    }

    /* ==================================================================
       2. MODO ESTÁTICO (sin GSAP o movimiento reducido)
       ================================================================== */
    function staticMode() {
        html.classList.add('is-reduced');
        html.classList.remove('is-loading');
        const loader = $('#loader');
        if (loader) loader.remove();
        $$('[data-count]').forEach((el) => { el.textContent = el.dataset.count; });
        initMarquee();
    }

    /* ==================================================================
       3. UTILIDADES DE ANIMACIÓN
       ================================================================== */

    /** Envuelve cada palabra en una máscara para el reveal tipográfico. */
    function splitWords(el) {
        const frag = document.createDocumentFragment();
        Array.from(el.childNodes).forEach((node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                node.textContent.split(/(\s+)/).forEach((part) => {
                    if (!part) return;
                    if (/^\s+$/.test(part)) {
                        frag.appendChild(document.createTextNode(' '));
                        return;
                    }
                    const w = document.createElement('span');
                    w.className = 'sw';
                    const i = document.createElement('span');
                    i.className = 'sw-i';
                    i.textContent = part;
                    w.appendChild(i);
                    frag.appendChild(w);
                });
            } else {
                const w = document.createElement('span');
                w.className = 'sw';
                const i = document.createElement('span');
                i.className = 'sw-i';
                i.appendChild(node.cloneNode(true));
                w.appendChild(i);
                frag.appendChild(w);
            }
        });
        el.textContent = '';
        el.appendChild(frag);
        return $$('.sw-i', el);
    }

    /** GSAP deja translate/rotate/scale en "none" inline; al terminar un reveal los liberamos para que vuelvan a funcionar los :hover de CSS. */
    function release(els) {
        const list = Array.isArray(els) ? els : [els];
        gsap.set(list, { clearProps: 'transform,opacity,visibility' });
        list.forEach((e) => {
            e.style.removeProperty('translate');
            e.style.removeProperty('rotate');
            e.style.removeProperty('scale');
        });
    }

    function countUp(el, duration = 1.8) {
        const target = Number(el.dataset.count);
        const state = { v: 0 };
        gsap.to(state, {
            v: target, duration, ease: 'power3.out',
            onUpdate: () => { el.textContent = Math.round(state.v); },
            onComplete: () => { el.textContent = target; },
        });
    }

    /* ==================================================================
       4. LOADER
       ================================================================== */
    function runLoader(heroTl, onDone) {
        const loader = $('#loader');
        const pctEl = $('#loader-pct');
        const bar = $('.loader-bar i');
        const state = { p: 0 };
        let pageLoaded = document.readyState === 'complete';
        const started = performance.now();
        window.addEventListener('load', () => { pageLoaded = true; });

        gsap.set('.loader-brand, .loader-msg, .loader-meter', { autoAlpha: 0, y: 14 });
        gsap.to('.loader-brand, .loader-meter, .loader-msg', { autoAlpha: 1, y: 0, duration: .9, stagger: .12, ease: 'expo.out', delay: .15 });

        const render = () => {
            const p = state.p;
            pctEl.textContent = Math.round(p);
            gsap.set(bar, { scaleX: p / 100 });
            gsap.set('.lm-draw', { strokeDashoffset: 1 - Math.min(1, p / 68) });
            gsap.set('.lm-fill', { opacity: Math.max(0, Math.min(1, (p - 58) / 34)) });
        };

        // Fase 1: avanza hasta 88% (mínimo ~2.1s para que la animación se aprecie).
        const phase1 = gsap.to(state, { p: 88, duration: 2.1, ease: 'power2.inOut', onUpdate: render });

        const finish = () => {
            gsap.to(state, {
                p: 100, duration: .6, ease: 'power2.out', onUpdate: render,
                onComplete: () => {
                    gsap.timeline({ onComplete: () => { loader.remove(); onDone(); } })
                        .to('.lm-draw', { opacity: 0, duration: .3 }, 0)
                        .to('.loader-mark', { scale: 1.12, duration: .5, ease: 'power2.out' }, 0)
                        .to('.loader-core', { autoAlpha: 0, y: -24, duration: .5, ease: 'power2.in' }, .35)
                        .to('.loader-curtain--top', { yPercent: -101, duration: 1.1, ease: 'expo.inOut' }, .7)
                        .to('.loader-curtain--bottom', { yPercent: 101, duration: 1.1, ease: 'expo.inOut' }, .7)
                        .add(() => { html.classList.remove('is-loading'); if (lenis) lenis.start(); heroTl.play(); }, 1.0);
                },
            });
        };

        phase1.eventCallback('onComplete', () => {
            const wait = () => {
                if (pageLoaded || performance.now() - started > 6000) finish();
                else setTimeout(wait, 80);
            };
            wait();
        });
    }

    /* ==================================================================
       5. HERO
       ================================================================== */
    /** Construye la entrada del hero en pausa: deja todo oculto tras el loader y se reproduce al abrir el telón. */
    function buildHeroIntro() {
        const tl = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } });
        tl.from('.nav-pill', { y: -90, autoAlpha: 0, duration: 1.2 }, 0)
            .from('.hero-title .w-i', { yPercent: 118, rotate: 5, duration: 1.4, stagger: .08 }, 0.05)
            .from('.hero .h-in', { y: 30, autoAlpha: 0, duration: 1.1, stagger: .12 }, 0.2)
            .from('.hv-ring', { scale: .5, autoAlpha: 0, duration: 1.8, stagger: .18 }, 0.1)
            .from('.hv-core', { scale: .3, autoAlpha: 0, rotate: -14, duration: 1.7 }, 0.15)
            .from('.hv-chip-face', { scale: 0, autoAlpha: 0, duration: .9, stagger: .1, ease: 'back.out(1.8)' }, 0.8)
            .from('.hv-float', { y: 44, autoAlpha: 0, duration: 1.1 }, 1.2);
        return tl;
    }

    /** Interacción del hero: el escudo reacciona al cursor (tilt 3D + parallax). */
    function initHeroPointer() {
        const hero = $('.hero');
        const tilt = $('.hv-tilt');
        if (!hero || !tilt || !finePointer) return;

        gsap.set(tilt, { transformPerspective: 900 });
        const rx = gsap.quickTo(tilt, 'rotationX', { duration: .9, ease: 'power3' });
        const ry = gsap.quickTo(tilt, 'rotationY', { duration: .9, ease: 'power3' });
        const gx = gsap.quickTo('.hv-glow', 'x', { duration: 1.2, ease: 'power3' });
        const gy = gsap.quickTo('.hv-glow', 'y', { duration: 1.2, ease: 'power3' });
        const fx = gsap.quickTo('.hv-float', 'x', { duration: 1.1, ease: 'power3' });
        const fy = gsap.quickTo('.hv-float', 'y', { duration: 1.1, ease: 'power3' });

        hero.addEventListener('pointermove', (e) => {
            const r = hero.getBoundingClientRect();
            const nx = (e.clientX - r.left) / r.width * 2 - 1;
            const ny = (e.clientY - r.top) / r.height * 2 - 1;
            ry(nx * 18);
            rx(-ny * 14);
            gx(nx * 26);
            gy(ny * 20);
            fx(nx * -22);
            fy(ny * -16);
        }, { passive: true });
        hero.addEventListener('pointerleave', () => { rx(0); ry(0); gx(0); gy(0); fx(0); fy(0); });
    }

    /** Red de partículas conectadas (canvas). Se pausa fuera de pantalla. */
    function initParticles() {
        const canvas = $('#hero-canvas');
        const hero = $('.hero');
        if (!canvas || !hero) return;
        const ctx = canvas.getContext('2d');
        let w = 0, h = 0, dpr = 1, particles = [], raf = 0, running = false;
        const mouse = { x: -9999, y: -9999 };
        const LINK = 132;

        const resize = () => {
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            w = hero.clientWidth;
            h = hero.clientHeight;
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            const count = Math.round(Math.min(95, Math.max(34, (w * h) / 15500)));
            particles = Array.from({ length: count }, () => ({
                x: Math.random() * w, y: Math.random() * h,
                vx: (Math.random() - .5) * .34, vy: (Math.random() - .5) * .34,
                r: Math.random() * 1.5 + .6,
            }));
            if (reduceMotion) draw();
        };

        const draw = () => {
            ctx.clearRect(0, 0, w, h);
            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];
                if (!reduceMotion) {
                    p.x += p.vx; p.y += p.vy;
                    if (p.x < -10) p.x = w + 10; else if (p.x > w + 10) p.x = -10;
                    if (p.y < -10) p.y = h + 10; else if (p.y > h + 10) p.y = -10;
                    const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
                    if (d2 < 19600) {
                        const d = Math.sqrt(d2) || 1, f = (140 - d) / 140;
                        p.x += (dx / d) * f * 1.1;
                        p.y += (dy / d) * f * 1.1;
                    }
                }
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(150, 208, 255, .85)';
                ctx.fill();
                for (let j = i + 1; j < particles.length; j++) {
                    const q = particles[j];
                    const dx = p.x - q.x, dy = p.y - q.y, d2 = dx * dx + dy * dy;
                    if (d2 < LINK * LINK) {
                        ctx.strokeStyle = `rgba(58, 163, 255, ${(1 - Math.sqrt(d2) / LINK) * .42})`;
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(q.x, q.y);
                        ctx.stroke();
                    }
                }
            }
        };

        const loop = () => { draw(); raf = requestAnimationFrame(loop); };
        const start = () => { if (!running && !reduceMotion) { running = true; raf = requestAnimationFrame(loop); } };
        const stop = () => { running = false; cancelAnimationFrame(raf); };

        resize();
        let resizeTimer;
        window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 160); });
        hero.addEventListener('pointermove', (e) => {
            const r = hero.getBoundingClientRect();
            mouse.x = e.clientX - r.left;
            mouse.y = e.clientY - r.top;
        }, { passive: true });
        hero.addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; });

        new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop()), { threshold: 0 }).observe(hero);
        document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
    }

    /* ==================================================================
       6. SCROLL: Lenis + ScrollTrigger
       ================================================================== */
    function initSmoothScroll() {
        lenis = new Lenis({
            duration: 1.25,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smoothWheel: true,
            wheelMultiplier: .92,
        });
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add((time) => lenis.raf(time * 1000));
        gsap.ticker.lagSmoothing(0);

        // Anclas internas con scroll suave
        $$('a[href^="#"]').forEach((a) => {
            const id = a.getAttribute('href');
            if (id.length < 2) return;
            a.addEventListener('click', (e) => {
                const target = $(id);
                if (!target) return;
                e.preventDefault();
                lenis.scrollTo(target, { offset: id === '#inicio' ? 0 : -8, duration: 1.7 });
            });
        });
    }

    /** Pines principales (se crean primero para que los demás triggers calculen bien).
     *  Solo en pantallas ≥768px: en celular ambas secciones se muestran normales, sin pin. */
    function initPins() {
        const mm = gsap.matchMedia();

        /* ---- Imagen que se abre a pantalla completa ---- */
        mm.add('(min-width: 768px)', () => {
            const from = { '--iy': 18, '--ix': 32, '--rd': 28 };
            const nums = $$('.expand [data-count]');
            let counted = false;

            gsap.set('.expand-reveal > *', { y: 36 });

            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: '.expand', start: 'top top', end: '+=230%',
                    pin: true, scrub: .7, anticipatePin: 1, invalidateOnRefresh: true, refreshPriority: 2,
                },
            });
            tl.fromTo('.expand-media', from, { '--iy': 0, '--ix': 0, '--rd': 0, ease: 'none', duration: 1 }, 0)
                .fromTo('.expand-media img', { scale: 1.4 }, { scale: 1, ease: 'none', duration: 1 }, 0)
                .to('.expand-shade', { opacity: 1, ease: 'none', duration: 1 }, 0)
                .to('.et--a', { x: () => -window.innerWidth * .75, autoAlpha: 0, ease: 'power1.in', duration: .62 }, 0.05)
                .to('.et--b', { x: () => window.innerWidth * .75, autoAlpha: 0, ease: 'power1.in', duration: .62 }, 0.05)
                .to('.expand-reveal', { opacity: 1, ease: 'none', duration: .16 }, 0.72)
                .to('.expand-reveal > *', { y: 0, ease: 'power2.out', duration: .26, stagger: .08 }, 0.72)
                .add(() => {
                    if (counted) return;
                    counted = true;
                    nums.forEach((n) => countUp(n, 1.6));
                }, 0.82);
            nums.forEach((n) => { n.textContent = '0'; });
            return () => { nums.forEach((n) => { n.textContent = n.dataset.count; }); };
        });

        /* ---- Scroll horizontal de momentos ---- */
        mm.add('(min-width: 768px)', () => {
            const track = $('#moments-track');
            const section = $('.moments');
            if (!track || !section) return;
            const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);
            const pan = gsap.to(track, {
                x: () => -distance(), ease: 'none',
                scrollTrigger: {
                    trigger: section, start: 'top top', end: () => `+=${distance()}`,
                    pin: true, scrub: .8, anticipatePin: 1, invalidateOnRefresh: true, refreshPriority: 1,
                },
            });
            gsap.to('.moments-meter i', {
                scaleX: 1, ease: 'none',
                scrollTrigger: { trigger: section, start: 'top top', end: () => `+=${distance()}`, scrub: true, invalidateOnRefresh: true },
            });
            // Parallax interno de cada foto, atado al desplazamiento horizontal
            $$('.moment > img').forEach((img) => {
                gsap.fromTo(img, { xPercent: -5 }, {
                    xPercent: 5, ease: 'none',
                    scrollTrigger: { trigger: img.parentElement, containerAnimation: pan, start: 'left right', end: 'right left', scrub: true },
                });
            });
        });
    }

    /** Reveals de entrada, tipografía por palabra y bento escalonado. */
    function initReveals() {
        // Titulares por palabra
        $$('[data-split]').forEach((h) => {
            const words = splitWords(h);
            gsap.set(words, { yPercent: 112 });
            ScrollTrigger.create({
                trigger: h, start: 'top 88%', once: true,
                onEnter: () => gsap.to(words, { yPercent: 0, duration: 1.15, ease: 'expo.out', stagger: .045 }),
            });
        });

        // Elementos genéricos
        const presets = {
            up: { y: 46 }, zoom: { scale: .9, y: 36 }, left: { x: -50 }, right: { x: 50 },
        };
        $$('[data-reveal]').forEach((el) => {
            if (el.classList.contains('bcard')) return;
            const from = presets[el.dataset.reveal] || presets.up;
            gsap.set(el, { ...from, autoAlpha: 0 });
            ScrollTrigger.create({
                trigger: el, start: 'top 90%', once: true,
                onEnter: () => gsap.to(el, { x: 0, y: 0, scale: 1, autoAlpha: 1, duration: 1.2, ease: 'expo.out', onComplete: () => release(el) }),
            });
        });

        // Bento: entrada en cascada por lotes
        const cards = $$('.bcard');
        gsap.set(cards, { y: 64, scale: .95, autoAlpha: 0 });
        ScrollTrigger.batch(cards, {
            start: 'top 92%', once: true,
            onEnter: (batch) => gsap.to(batch, { y: 0, scale: 1, autoAlpha: 1, duration: 1.1, ease: 'expo.out', stagger: .09, onComplete: () => release(batch) }),
        });
    }

    function initSectionEffects() {
        /* Barra de progreso global */
        gsap.to('.scroll-progress i', {
            scaleX: 1, ease: 'none',
            scrollTrigger: { start: 0, end: 'max', scrub: .25 },
        });

        /* Nav: estado al hacer scroll + enlace activo */
        ScrollTrigger.create({ start: 60, end: 'max', toggleClass: { targets: '#nav', className: 'is-scrolled' } });
        $$('.nav-links a').forEach((link) => {
            const target = $(link.getAttribute('href'));
            if (!target) return;
            ScrollTrigger.create({
                trigger: target, start: 'top 55%', end: 'bottom 55%',
                toggleClass: { targets: link, className: 'is-active' },
            });
        });

        /* Hero: parallax suave al salir */
        gsap.to('.hero-grid', {
            yPercent: -9, ease: 'none',
            scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
        });
        gsap.to('.hero-canvas', {
            opacity: .2, ease: 'none',
            scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
        });

        /* Auto: aro de descuento */
        const ring = $('.ar-fill');
        if (ring) {
            const num = $('.auto-ring [data-count]');
            if (num) num.textContent = '0';
            ScrollTrigger.create({
                trigger: '.auto-visual', start: 'top 75%', once: true,
                onEnter: () => {
                    gsap.to(ring, { strokeDashoffset: 50, duration: 2.2, ease: 'power3.out' });
                    if (num) countUp(num, 2.2);
                },
            });
            gsap.fromTo('.auto-photo img', { yPercent: -5 }, {
                yPercent: 5, ease: 'none',
                scrollTrigger: { trigger: '.auto-visual', start: 'top bottom', end: 'bottom top', scrub: true },
            });
        }

        /* Proceso: línea que se llena y pasos que se activan */
        const wrap = $('#timeline');
        if (wrap) {
            gsap.to('.tl-line i', {
                scaleY: 1, ease: 'none',
                scrollTrigger: { trigger: wrap, start: 'top 62%', end: 'bottom 70%', scrub: .5 },
            });
            $$('.tl-step', wrap).forEach((step) => {
                ScrollTrigger.create({
                    trigger: step, start: 'top 62%',
                    toggleClass: { targets: step, className: 'is-on' },
                });
            });
        }

        /* Trámites: parallax del fondo + avión recorriendo la ruta */
        gsap.to('.trips-bg img', {
            yPercent: 8, ease: 'none',
            scrollTrigger: { trigger: '.trips', start: 'top bottom', end: 'bottom top', scrub: true },
        });
        initFlight();

        /* Hub de aseguradoras: entrada con rotación */
        gsap.from('.hub-ring', {
            scale: .6, autoAlpha: 0, duration: 1.6, ease: 'expo.out', stagger: .2,
            scrollTrigger: { trigger: '.hub-stage', start: 'top 80%', once: true },
        });

        /* CTA final: luz que sigue el scroll */
        gsap.fromTo('.finale-mark-wrap', { rotate: -12 }, {
            rotate: 12, ease: 'none',
            scrollTrigger: { trigger: '.finale', start: 'top bottom', end: 'bottom top', scrub: true },
        });

        /* Footer: wordmark gigante emerge */
        gsap.from('.footer-giant', {
            yPercent: 40, autoAlpha: 0, ease: 'none',
            scrollTrigger: { trigger: '.footer', start: 'top 85%', end: 'bottom bottom', scrub: true },
        });
    }

    /** Avión que recorre la ruta del trámite de viaje (solo corre en pantalla). */
    function initFlight() {
        const path = $('#flight-path');
        const plane = $('#flight-plane');
        const box = $('.flight');
        if (!path || !plane || !box) return;

        const VB = { w: 1000, h: 150 };
        const len = path.getTotalLength();
        const state = { t: 0 };
        const place = () => {
            const sx = box.clientWidth / VB.w;
            const sy = box.clientHeight / VB.h;
            const p = path.getPointAtLength(state.t * len);
            const q = path.getPointAtLength(Math.min(len, state.t * len + 3));
            const angle = Math.atan2((q.y - p.y) * sy, (q.x - p.x) * sx) * 180 / Math.PI;
            plane.style.transform = `translate(${p.x * sx}px, ${p.y * sy}px) translate(-50%, -50%) rotate(${angle + 45}deg)`;
        };
        const tween = gsap.to(state, { t: 1, duration: 9, ease: 'none', repeat: -1, onUpdate: place });
        place();
        ScrollTrigger.create({
            trigger: box, start: 'top bottom', end: 'bottom top',
            onToggle: (self) => tween.paused(!self.isActive),
        });
    }

    /** Botones magnéticos (solo punteros finos). */
    function initMagnetic() {
        if (!finePointer) return;
        $$('.btn-magnetic').forEach((btn) => {
            const qx = gsap.quickTo(btn, 'x', { duration: .6, ease: 'power3' });
            const qy = gsap.quickTo(btn, 'y', { duration: .6, ease: 'power3' });
            btn.addEventListener('pointermove', (e) => {
                const r = btn.getBoundingClientRect();
                qx((e.clientX - (r.left + r.width / 2)) * .22);
                qy((e.clientY - (r.top + r.height / 2)) * .3);
            });
            btn.addEventListener('pointerleave', () => { qx(0); qy(0); });
        });
    }

    /* ==================================================================
       7. ARRANQUE
       ================================================================== */
    function boot() {
        initWhatsApp();
        initMenu();
        initTabs();
        initAccordion();
        initMore();
        initForm();
        initSpotlight();

        if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
        window.scrollTo(0, 0);

        if (!hasGSAP || reduceMotion) {
            staticMode();
            initParticles();
            return;
        }

        try {
            gsap.registerPlugin(ScrollTrigger);
            ScrollTrigger.config({ ignoreMobileResize: true });
            if (window.Lenis) {
                initSmoothScroll();
                lenis.stop();
            }
            initMarquee();

            // El hero queda oculto (estado inicial de la timeline) hasta que se abre el telón del loader.
            gsap.set('.hv-chip-face', { xPercent: -50, yPercent: -50 });
            const heroTl = buildHeroIntro();
            initParticles();
            initHeroPointer();
            initPins();
            initReveals();
            initSectionEffects();
            initMagnetic();

            window.addEventListener('load', () => ScrollTrigger.refresh());
            if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());

            runLoader(heroTl, () => ScrollTrigger.refresh());

            // Red de seguridad: pase lo que pase, el loader nunca bloquea la página más de 9 s.
            setTimeout(() => {
                const stuck = $('#loader');
                if (!stuck) return;
                stuck.remove();
                html.classList.remove('is-loading');
                if (lenis) lenis.start();
            }, 9000);
        } catch (err) {
            // Si una animación falla, la página sigue siendo totalmente usable en modo estático.
            console.error('[Cuídate Seguro] Animaciones desactivadas:', err);
            if (window.ScrollTrigger) ScrollTrigger.getAll().forEach((t) => t.kill());
            if (lenis) { lenis.destroy(); lenis = null; }
            staticMode();
        }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
