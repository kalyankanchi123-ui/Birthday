let floatingInterval;
let floatingActive   = true;
let countdownFinished = false;
let tapStarted       = false;

window.onbeforeunload = function () { window.scrollTo(0, 0); };
window.onload        = function () { window.scrollTo(0, 0); };

document.addEventListener('DOMContentLoaded', function () {

    /* --- pause everything on load --- */
    var bgMusic       = document.getElementById('bgMusic');
    var cheerSound    = document.getElementById('cheerSound');
    var surpriseVideo = document.getElementById('surpriseVideo');
    var birthdayVideo = document.getElementById('birthdayVideo');

    if (bgMusic)       { bgMusic.pause();       bgMusic.currentTime = 0; }
    if (cheerSound)    { cheerSound.pause();     cheerSound.currentTime = 0; }
    if (surpriseVideo) { surpriseVideo.pause();  surpriseVideo.currentTime = 0; }
    if (birthdayVideo) { birthdayVideo.pause();  birthdayVideo.currentTime = 0; }
    speechSynthesis.cancel();

    /* --- ensure video popup is hidden --- */
    var popup = document.getElementById('videoPopup');
    if (popup) popup.classList.remove('active');

    /* --- resize fireworks canvas --- */
    var canvas = document.getElementById('fireworks');
    if (canvas) {
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    /* --- core setup --- */
    createParticles();
    initializeAnimations();
    setupScrollAnimations();
    setupScrollAndProgress();   // merged scroll handler
    setupMousemoveEffect();
    createStarfield();
    setupGalleryTap();
    setupSectionObserver();
    setupRippleEffect();
    setupPhotoObserver();
    setupVideoEvents();

    /* --- slideshow --- */
    setTimeout(startSlideshow, 500);

    /* --- countdown rings --- */
    var countdownScreen = document.getElementById('countdownScreen');
    if (countdownScreen) {
        for (var i = 0; i < 3; i++) {
            var ring = document.createElement('div');
            ring.className = 'countdown-ring';
            countdownScreen.appendChild(ring);
        }
    }

    /* --- build tap-to-begin splash --- */
    var countdownSound   = document.getElementById('countdownSound');
    if (countdownSound) { countdownSound.loop = false; countdownSound.muted = false; }

    var countdownScreenEl = document.getElementById('countdownScreen');
    if (countdownScreenEl) countdownScreenEl.style.display = 'none';

    var splash = document.createElement('div');
    splash.id = 'tapSplash';
    splash.style.cssText = 'position:fixed;inset:0;z-index:999999;background:linear-gradient(135deg,#1a0533 0%,#0d0221 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;user-select:none;-webkit-user-select:none;';
    splash.innerHTML =
        '<div style="font-size:4rem;margin-bottom:1rem;animation:splashPulse 1.2s ease-in-out infinite;">🎂</div>' +
        '<div style="font-size:1.6rem;font-weight:700;color:#fff;font-family:Poppins,sans-serif;letter-spacing:2px;">Tap to Begin</div>' +
        '<div style="font-size:0.95rem;color:rgba(255,255,255,0.6);margin-top:0.5rem;font-family:Poppins,sans-serif;text-align:center;padding:0 20px;">🎉 A special birthday surprise awaits 🎉</div>';

    var splashStyle = document.createElement('style');
    splashStyle.textContent = '@keyframes splashPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}';
    document.head.appendChild(splashStyle);
    document.body.appendChild(splash);

    function showNumber(num, value) {
        if (!num) return;
        num.innerText = value;
        num.style.animation = 'none';
        setTimeout(function () {
            num.style.animation = 'countdownBounce 0.8s cubic-bezier(0.68,-0.55,0.265,1.55) forwards';
        }, 10);
        createCountdownParticles();
    }

    function startAfterTap() {
        if (tapStarted) return;
        tapStarted = true;
        splash.remove();

        /* ── iOS AUDIO UNLOCK ─────────────────────────────────────────
           iOS Safari requires audio.play() to be called SYNCHRONOUSLY
           inside a user-gesture handler. We silently unlock every audio
           element right now (muted play→pause), so they can be freely
           played from any setTimeout later.
        ────────────────────────────────────────────────────────────── */
        ['bgMusic', 'countdownSound', 'cheerSound', 'lastAudio', 'birthdayWishAudio'].forEach(function (id) {
            var el = document.getElementById(id);
            if (!el) return;
            el.muted = true;
            var p = el.play();
            if (p && p.then) {
                p.then(function () { el.pause(); el.currentTime = 0; el.muted = false; })
                 .catch(function () { el.muted = false; });
            } else {
                el.pause(); el.currentTime = 0; el.muted = false;
            }
        });

        if (countdownScreenEl) {
            countdownScreenEl.style.display     = 'flex';
            countdownScreenEl.style.opacity     = '1';
            countdownScreenEl.style.visibility  = 'visible';
        }

        var num = document.getElementById('countdownNumber');
        showNumber(num, 3);
        setTimeout(function () { showNumber(num, 2); }, 1000);

        setTimeout(function () {
            var cs = document.getElementById('countdownSound');
            if (cs) { cs.currentTime = 0; cs.play().catch(function(){}); }
        }, 1120);

        setTimeout(function () { showNumber(num, 1); }, 2000);

        setTimeout(function () {
            if (countdownScreenEl) {
                countdownScreenEl.style.transition = 'opacity 0.5s ease-out';
                countdownScreenEl.style.opacity    = '0';
                setTimeout(function () {
                    countdownScreenEl.style.display    = 'none';
                    countdownScreenEl.style.visibility = 'hidden';
                }, 500);
            }
        }, 3000);

        setTimeout(function () {
            countdownFinished = true;
            startBirthdayExperience();
        }, 3100);
    }

    splash.addEventListener('click',      startAfterTap, { once: true });
    splash.addEventListener('touchstart', startAfterTap, { once: true, passive: true });

    /* --- unlock audio on first click after countdown --- */
    document.addEventListener('click', function () {
        if (!countdownFinished) return;
        var music = document.getElementById('bgMusic');
        if (music && music.paused) music.play().catch(function(){});
    }, { once: true });

    /* --- click: floating hearts (after splash) --- */
    document.addEventListener('click', function (e) {
        if (!tapStarted) return;
        var heart = document.createElement('div');
        heart.innerHTML = '❤️';
        heart.style.cssText = 'position:fixed;left:' + e.clientX + 'px;top:' + e.clientY + 'px;font-size:24px;pointer-events:none;z-index:9999;';
        document.body.appendChild(heart);
        heart.animate(
            [{ transform: 'translateY(0)', opacity: 1 },
             { transform: 'translateY(-80px)', opacity: 0 }],
            { duration: 1000 }
        ).onfinish = function () { heart.remove(); };
    });

}); /* end DOMContentLoaded */

/* ── SECTION OBSERVER (pause floating memories near gallery) ── */
function setupSectionObserver() {
    var sectionsToPause = [
        document.getElementById('gallery'),
        document.querySelector('.slideshow-section')
    ];
    var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) stopFloatingMemories();
            else startFloatingMemories();
        });
    }, { threshold: 0.35 });
    sectionsToPause.forEach(function (s) { if (s) obs.observe(s); });
}

/* ── GALLERY TAP-TO-REVEAL (mobile) ── */
function setupGalleryTap() {
    document.querySelectorAll('.photo-container').forEach(function (container) {
        container.addEventListener('click', function () {
            var isActive = container.classList.contains('tapped');
            document.querySelectorAll('.photo-container.tapped').forEach(function (c) {
                c.classList.remove('tapped');
            });
            if (!isActive) container.classList.add('tapped');
        });
    });
}

/* ── PARTICLES ── */
function createParticles() {
    var particleEmojis = ['🧿', '💕', '✨', '💫', '😎', '🤞', '🦋'];
    for (var i = 0; i < 10; i++) {
        var particle = document.createElement('div');
        particle.className = 'particle';
        particle.innerHTML = particleEmojis[Math.floor(Math.random() * particleEmojis.length)];
        particle.style.left              = Math.random() * 100 + 'vw';
        particle.style.bottom            = '-50px';
        particle.style.animationDuration = (Math.random() * 4 + 8) + 's';
        particle.style.animationDelay    = Math.random() * 2 + 's';
        document.body.appendChild(particle);
    }
}

/* ── FADE-IN INIT ── */
function initializeAnimations() {
    document.querySelectorAll('.fade-in').forEach(function (el, i) {
        el.style.animationDelay = (i * 0.2) + 's';
    });
}

/* ── SCROLL ANIMATIONS (AOS) ── */
function setupScrollAnimations() {
    var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('aos-animate');
                if (entry.target.classList.contains('message-card')) animateMessageText();
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('[data-aos], .section-title, .message-card').forEach(function (el) {
        observer.observe(el);
        var delay = el.getAttribute('data-delay');
        if (delay) el.style.transitionDelay = delay + 'ms';
    });
}

function animateMessageText() {
    document.querySelectorAll('.message-text').forEach(function (text, i) {
        setTimeout(function () { text.classList.add('fade-in-animate'); }, i * 500);
    });
}

/* ── MERGED SCROLL HANDLER (progress bar + parallax) ── */
function setupScrollAndProgress() {
    window.addEventListener('scroll', function () {
        /* progress bar */
        var scrollTop = document.documentElement.scrollTop;
        var height    = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        var bar = document.getElementById('progressBar');
        if (bar) bar.style.width = ((scrollTop / height) * 100) + '%';

        /* parallax particles */
        document.querySelectorAll('.particle').forEach(function (particle, index) {
            var speed = 0.1 + (index % 3) * 0.05;
            particle.style.transform = 'translateY(' + (scrollTop * speed) + 'px)';
        });
    }, { passive: true });
}

/* ── MOUSEMOVE EFFECT (throttled) ── */
var lastMouseTime = 0;
function setupMousemoveEffect() {
    document.addEventListener('mousemove', function (e) {
        var now = Date.now();
        if (now - lastMouseTime < 16) return;
        lastMouseTime = now;
        var x = e.clientX / window.innerWidth;
        var y = e.clientY / window.innerHeight;
        var floatingHearts = document.querySelector('.floating-hearts');
        if (floatingHearts) {
            floatingHearts.style.transform = 'translate(' + ((x - 0.5) * 20) + 'px,' + ((y - 0.5) * 20) + 'px)';
        }
    }, { passive: true });
}

/* ── RIPPLE EFFECT ── */
function setupRippleEffect() {
    var rippleStyle = document.createElement('style');
    rippleStyle.textContent = '@keyframes ripple{to{transform:scale(2);opacity:0;}}';
    document.head.appendChild(rippleStyle);

    document.querySelectorAll('button').forEach(function (button) {
        button.addEventListener('click', function (e) {
            var rect = this.getBoundingClientRect();
            var size = Math.max(rect.width, rect.height);
            var ripple = document.createElement('span');
            ripple.style.cssText =
                'position:absolute;width:' + size + 'px;height:' + size + 'px;' +
                'left:' + (e.clientX - rect.left - size / 2) + 'px;' +
                'top:' + (e.clientY - rect.top  - size / 2) + 'px;' +
                'background:rgba(255,255,255,0.5);border-radius:50%;' +
                'transform:scale(0);animation:ripple 0.6s ease-out;';
            this.appendChild(ripple);
            setTimeout(function () { ripple.remove(); }, 600);
        });
    });
}

/* ── PHOTO ENTRANCE OBSERVER ── */
function setupPhotoObserver() {
    var photoStyle = document.createElement('style');
    photoStyle.textContent = '@keyframes photoEnter{from{transform:scale(0.8) rotate(-5deg);opacity:0;}to{transform:scale(1) rotate(0deg);opacity:1;}}';
    document.head.appendChild(photoStyle);

    var photoObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                var img = entry.target.querySelector('img');
                if (img) img.style.animation = 'photoEnter 0.8s ease-out forwards';
            }
        });
    }, { threshold: 0.2 });

    document.querySelectorAll('.photo-card').forEach(function (card) {
        photoObserver.observe(card);
    });
}

/* ── VIDEO EVENTS ── */
function setupVideoEvents() {
    /* birthday video ended → resume music */
    var birthdayVideo = document.getElementById('birthdayVideo');
    if (birthdayVideo) {
        birthdayVideo.addEventListener('ended', function () {
            var music = document.getElementById('bgMusic');
            if (music) music.play().catch(function(){});
        });
    }

    /* surprise video ended → resume music */
    var surpriseVideo = document.getElementById('surpriseVideo');
    if (surpriseVideo) {
        surpriseVideo.addEventListener('ended', function () {
            var music = document.getElementById('bgMusic');
            if (music && countdownFinished) music.play().catch(function(){});
        });
    }

    /* click outside popup to close birthday video */
    var popup = document.getElementById('videoPopup');
    if (popup) {
        popup.addEventListener('click', function (e) {
            if (e.target.id === 'videoPopup') closeVideo();
        });
    }

    /* Escape key closes video */
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeVideo();
    });
}

/* ── BACKGROUND STARFIELD ── */
function createStarfield() {
    for (var i = 0; i < 80; i++) {
        var star = document.createElement('div');
        star.className = 'star';
        star.style.left = Math.random() * 100 + 'vw';
        star.style.top  = Math.random() * 100 + 'vh';
        document.body.appendChild(star);
    }
}

/* ═══════════════════════════════════════════
   GLOBALLY EXPOSED FUNCTIONS (used by onclick=)
═══════════════════════════════════════════ */

window.scrollToSection = function (sectionId) {
    var section = document.getElementById(sectionId);
    if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

window.toggleLike = function (button) {
    var heartIcon = button.querySelector('.heart-icon');
    button.classList.toggle('liked');
    if (button.classList.contains('liked')) {
        heartIcon.textContent = '❤️';
        createFloatingHeart(button);
    } else {
        heartIcon.textContent = '🤍';
    }
};

function createFloatingHeart(button) {
    var heart = document.createElement('div');
    heart.innerHTML = '❤️';
    heart.style.cssText = 'position:fixed;font-size:1.5rem;pointer-events:none;z-index:1000;';
    var rect = button.getBoundingClientRect();
    heart.style.left = rect.left + 'px';
    heart.style.top  = rect.top  + 'px';
    document.body.appendChild(heart);
    heart.animate(
        [{ transform: 'translateY(0px) scale(1)', opacity: 1 },
         { transform: 'translateY(-60px) scale(1.5)', opacity: 0 }],
        { duration: 1500, easing: 'ease-out' }
    ).onfinish = function () { heart.remove(); };
}

window.openVideo = function () {
    var popup  = document.getElementById('videoPopup');
    var video  = document.getElementById('birthdayVideo');
    var music  = document.getElementById('bgMusic');
    if (!popup) return;
    popup.classList.add('active');
    if (music && !music.paused) music.pause();
    if (video) { video.currentTime = 0; video.play().catch(function(){}); }
};

window.closeVideo = function () {
    var popup = document.getElementById('videoPopup');
    var video = document.getElementById('birthdayVideo');
    var music = document.getElementById('bgMusic');
    if (!popup) return;
    popup.classList.remove('active');
    if (video) { video.pause(); video.currentTime = 0; }
    if (music) music.play().catch(function(){});
};

window.ultimateCakeCut = function (playSound) {
    if (typeof playSound === 'undefined') playSound = true;
    var knife     = document.getElementById('knife3d');
    var cakeStage = document.getElementById('cakeStage');
    var cheer     = document.getElementById('cheerSound');
    var overlay   = document.getElementById('cakeCutOverlay');
    if (!knife) return;

    knife.style.transition = 'all 0.5s cubic-bezier(0.68,-0.55,0.27,1.55)';
    knife.style.transform  = 'rotate(20deg) translateY(60px) translateX(-20px) scale(1.2)';

    setTimeout(function () {
        if (cakeStage) cakeStage.classList.add('cut');
        if (overlay)   { overlay.style.display = 'block'; overlay.innerHTML = '🎂✨'; }

        document.querySelectorAll('.flame').forEach(function (f) {
            f.style.animation = 'none'; f.style.opacity = '0'; f.style.transform = 'translateX(-50%) scaleY(0)';
        });

        createCakeCuttingParticles();
        explodeConfetti();
        launchBalloons();
        startFireworks();

        if (playSound && cheer && countdownFinished) {
            cheer.currentTime = 0; cheer.play().catch(function(){});
        }

        setTimeout(function () { knife.style.transform = 'rotate(-30deg)'; }, 1500);

        setTimeout(function () {
            if (cakeStage) cakeStage.classList.remove('cut');
            if (overlay)   overlay.style.display = 'none';
            document.querySelectorAll('.flame').forEach(function (f) {
                f.style.animation = ''; f.style.opacity = ''; f.style.transform = '';
            });
        }, 5000);
    }, 500);
};

function createCakeCuttingParticles() {
    var cakeStage = document.querySelector('.cake-stage');
    if (!cakeStage) return;
    var rect    = cakeStage.getBoundingClientRect();
    var centerX = rect.left + rect.width  / 2;
    var centerY = rect.top  + rect.height / 2;
    var emojis  = ['🍰', '✨', '🎉', '🌟'];

    for (var i = 0; i < 20; i++) {
        (function () {
            var particle = document.createElement('div');
            particle.style.cssText = 'position:fixed;left:' + centerX + 'px;top:' + centerY + 'px;font-size:' + (8 + Math.random() * 10) + 'px;pointer-events:none;z-index:9994;';
            particle.innerHTML = emojis[Math.floor(Math.random() * emojis.length)];
            var angle    = Math.random() * Math.PI * 2;
            var velocity = 5 + Math.random() * 10;
            var vx = Math.cos(angle) * velocity;
            var vy = Math.sin(angle) * velocity - 3;
            document.body.appendChild(particle);
            var x = centerX, y = centerY, velY = vy;
            var startTime = Date.now();
            (function animate() {
                x += vx; y += velY; velY += 0.2;
                particle.style.left    = x + 'px';
                particle.style.top     = y + 'px';
                particle.style.opacity = Math.max(0, 1 - (Date.now() - startTime) / 1500);
                if (Date.now() - startTime < 1500) requestAnimationFrame(animate);
                else particle.remove();
            })();
        })();
    }
}

function explodeConfetti() {
    for (var i = 0; i < 40; i++) {
        var confettiEl = document.createElement('div');
        confettiEl.className = 'confetti-piece';
        confettiEl.style.left = (window.innerWidth / 2 + (Math.random() * 200 - 100)) + 'px';
        confettiEl.style.top  = '-20px';
        confettiEl.style.backgroundColor = 'hsl(' + (Math.random() * 360) + ',100%,50%)';
        confettiEl.style.animationDuration = (Math.random() * 2 + 4) + 's';
        document.body.appendChild(confettiEl);
        setTimeout(function (el) { return function () { if (el.parentNode) el.remove(); }; }(confettiEl), 6000);
    }
}

function launchBalloons() {
    var emojis = ['🎈', '💐', '🎁', '🎉', '🎊'];
    for (var i = 0; i < 5; i++) {
        (function () {
            var balloon = document.createElement('div');
            balloon.className = 'balloon';
            balloon.innerHTML = emojis[Math.floor(Math.random() * emojis.length)];
            balloon.style.left            = Math.random() * 100 + 'vw';
            balloon.style.bottom          = '-100px';
            balloon.style.animationDuration = (Math.random() * 4 + 8) + 's';
            document.body.appendChild(balloon);
            setTimeout(function () { if (balloon.parentNode) balloon.remove(); }, 12000);
        })();
    }
}

function startFireworks() {
    for (var i = 0; i < 6; i++) {
        (function (idx) {
            setTimeout(function () {
                launchCornerFirework('left');
                launchCornerFirework('right');
            }, idx * 600);
        })(i);
    }
}

function launchCornerFirework(side) {
    var rocket = document.createElement('div');
    rocket.className = 'firework-launch';
    rocket.style.left   = (side === 'left' ? '5vw' : '90vw');
    rocket.style.bottom = '0px';
    document.body.appendChild(rocket);
    setTimeout(function () {
        rocket.remove();
        var ex = side === 'left' ? window.innerWidth * 0.35 : window.innerWidth * 0.65;
        var ey = window.innerHeight * 0.3;
        explodeFirework(ex, ey);
    }, 700);
}

function launchCinematicFirework() {
    var x = Math.random() * window.innerWidth;
    var rocket = document.createElement('div');
    rocket.className = 'firework-launch';
    rocket.style.left   = x + 'px';
    rocket.style.bottom = '0px';
    document.body.appendChild(rocket);
    setTimeout(function () {
        if (rocket.parentNode) rocket.remove();
        explodeFirework(x, window.innerHeight * 0.3 + Math.random() * 150);
    }, 700);
}

function explodeFirework(cx, cy) {
    var colors = ['#ff4e73', '#ffd166', '#06d6a0', '#4cc9f0', '#ffffff'];
    for (var i = 0; i < 60; i++) {
        (function (idx) {
            var star = document.createElement('div');
            star.className = 'firework-star';
            star.style.left = cx + 'px';
            star.style.top  = cy + 'px';
            var angle    = Math.random() * Math.PI * 2;
            var distance = idx < 20 ? Math.random() * 120 + 50 : idx < 40 ? Math.random() * 180 + 100 : Math.random() * 240 + 140;
            star.style.setProperty('--x', Math.cos(angle) * distance + 'px');
            star.style.setProperty('--y', Math.sin(angle) * distance + 'px');
            star.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            document.body.appendChild(star);
            setTimeout(function () { star.remove(); }, 1600);
        })(i);
    }
}

window.celebrateBirthday = function () {
    if (typeof confetti === 'function') confetti({ particleCount: 200, spread: 120, origin: { y: 0.6 } });
    startFireworks();
};

window.celebrateWithBalloons = function () {
    if (typeof confetti === 'function') confetti({ particleCount: 200, spread: 120, origin: { y: 0.6 } });
    launchBalloons();
    startFireworks();
};

function showBirthdayMessage() {
    var msg = document.createElement('div');
    msg.innerHTML = '🎇 Here\'s to Your Most Magical Year Yet! 🎇';
    msg.style.cssText =
        'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) scale(0.8);' +
        'font-size:' + (window.innerWidth < 480 ? '13px' : window.innerWidth < 768 ? '16px' : '28px') + ';color:white;' +
        'text-shadow:0 0 20px pink,0 0 40px red;z-index:9999;opacity:0;transition:all 0.8s ease;' +
        'padding:' + (window.innerWidth < 768 ? '10px 14px' : '14px 28px') + ';' +
        'white-space:nowrap;max-width:96vw;overflow:hidden;text-overflow:ellipsis;' +
        'text-align:center;line-height:1.3;border-radius:15px;' +
        'background:rgba(0,0,0,0.5);';
    document.body.appendChild(msg);
    setTimeout(function () { msg.style.opacity = '1'; msg.style.transform = 'translate(-50%,-50%) scale(1)'; }, 100);
    setTimeout(function () { msg.style.opacity = '0'; }, 4500);
    setTimeout(function () { msg.remove(); }, 5500);
}

/* ── BIRTHDAY WISH — now plays Birthday Wish.mp3 instead of TTS ── */
window.playBirthdayWish = function () {
    try {
        var wishAudio = document.getElementById('birthdayWishAudio');
        if (!wishAudio) return;
        wishAudio.currentTime = 0;
        wishAudio.play().catch(function (err) {
            console.error('Birthday wish audio error:', err);
        });
    } catch (err) {
        console.error('Birthday wish error:', err);
    }
};

window.startBirthdayFinale = function () {
    var btn = document.querySelector('.finale-btn');
    if (btn) { btn.disabled = true; btn.innerText = '🎆 It\'s happening! 🎆'; }

    var colors = ['#ff4e73','#ffd166','#ff7eb3','#ffffff','#c77dff','#4cc9f0'];
    if (typeof confetti === 'function') {
        confetti({ particleCount: 120, spread: 100, origin: { y: 0.6 }, colors: colors });
        setTimeout(function () { confetti({ particleCount: 80, spread: 120, origin: { x: 0.2, y: 0.5 }, colors: colors }); }, 400);
        setTimeout(function () { confetti({ particleCount: 80, spread: 120, origin: { x: 0.8, y: 0.5 }, colors: colors }); }, 700);
        setTimeout(function () { confetti({ particleCount: 100, spread: 80,  origin: { y: 0.4 },         colors: colors }); }, 1100);
        setTimeout(function () { confetti({ particleCount: 60, spread: 150, origin: { x: 0.1, y: 0.6 }, colors: colors }); }, 1500);
        setTimeout(function () { confetti({ particleCount: 60, spread: 150, origin: { x: 0.9, y: 0.6 }, colors: colors }); }, 1800);
        setTimeout(function () { confetti({ particleCount: 150, spread: 120, origin: { y: 0.5 },         colors: colors }); }, 2400);
    }

    startFireworks();
    setTimeout(launchBalloons, 500);
    setTimeout(function () { window.ultimateCakeCut(false); showBirthdayMessage(); }, 800);
    setTimeout(function () {
        if (btn) { btn.disabled = false; btn.innerText = 'Chudalani vundha'; }
    }, 5000);
};

/* ── SLIDESHOW ── */
var slideIndex       = 0;
var slideshowInterval = null;

function startSlideshow() {
    var slides = document.querySelectorAll('.slide');
    if (slides.length === 0) return;

    function showSlides() {
        slides.forEach(function (s) { s.style.display = 'none'; });
        slides[slideIndex].style.display = 'block';
        slideIndex = (slideIndex + 1) % slides.length;
    }

    showSlides();
    slideshowInterval = setInterval(showSlides, 3000);
}

window.addEventListener('beforeunload', function () {
    if (slideshowInterval) clearInterval(slideshowInterval);
});

/* ── START BIRTHDAY EXPERIENCE ── */
function startBirthdayExperience() {
    var music = document.getElementById('bgMusic');
    if (music) { music.currentTime = 0; music.play().catch(function(){}); }
    window.celebrateBirthday();
    window.playBirthdayWish();
}

/* ── OPEN / CLOSE GIFT BOX ── */
window.openGiftBox = function () {
    stopFloatingMemories();
    var gift    = document.getElementById('giftBox');
    var music   = document.getElementById('bgMusic');
    var wrapper = document.getElementById('surpriseVideoWrapper');
    var video   = document.getElementById('surpriseVideo');
    if (!gift) return;

    gift.classList.add('open');
    if (music) music.pause();

    /* gold burst */
    for (var i = 0; i < 25; i++) {
        (function () {
            var particle = document.createElement('div');
            particle.className = 'gold-particle';
            particle.style.left = '50%'; particle.style.top = '60%';
            var angle = Math.random() * Math.PI * 2;
            var dist  = Math.random() * 200;
            particle.style.setProperty('--x', Math.cos(angle) * dist + 'px');
            particle.style.setProperty('--y', Math.sin(angle) * dist + 'px');
            document.body.appendChild(particle);
            setTimeout(function () { particle.remove(); }, 1500);
        })();
    }

    setTimeout(function () {
        if (wrapper) wrapper.classList.add('show');
        if (video)   { video.currentTime = 0; if (countdownFinished) video.play().catch(function(){}); }
    }, 900);
};

window.closeSurpriseVideo = function () {
    startFloatingMemories();
    var wrapper = document.getElementById('surpriseVideoWrapper');
    var video   = document.getElementById('surpriseVideo');
    var music   = document.getElementById('bgMusic');
    if (video)   { video.pause(); video.currentTime = 0; }
    if (wrapper) wrapper.classList.remove('show');
    if (music)   music.play().catch(function(){});

    // Reveal the "There's More" button
    var moreBtn = document.getElementById('theresMoreWrapper');
    if (moreBtn) {
        moreBtn.classList.add('visible');
        setTimeout(function () {
            moreBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 400);
    }
};

/* ── CLINK GLASSES ── */
window.clinkGlasses = function () {
    var left   = document.getElementById('leftGlass');
    var right  = document.getElementById('rightGlass');
    var effect = document.getElementById('clinkEffect');
    var toast  = document.getElementById('toastMessage');
    var cheer  = document.getElementById('cheerSound');
    if (!left || !right) return;
    if (left.classList.contains('clinking')) return;

    left.classList.add('clinking');
    right.classList.add('clinking');

    if (effect) {
        effect.classList.remove('show');
        void effect.offsetWidth;
        effect.innerHTML = ['✨','🌟','💫','⭐'][Math.floor(Math.random() * 4)];
        effect.classList.add('show');
    }

    if (cheer && countdownFinished) { cheer.currentTime = 0; cheer.play().catch(function(){}); }
    if (toast) toast.classList.add('visible');

    var emojis = ['🥃','🍺','✨','🍻','🌟','🎉'];
    for (var i = 0; i < 10; i++) {
        (function (idx) {
            setTimeout(function () {
                var el = document.createElement('div');
                el.className = 'drink-bubble-float';
                el.innerHTML = emojis[Math.floor(Math.random() * emojis.length)];
                el.style.left = (25 + Math.random() * 50) + 'vw';
                el.style.top  = (35 + Math.random() * 25) + 'vh';
                document.body.appendChild(el);
                setTimeout(function () { el.remove(); }, 2100);
            }, idx * 80);
        })(i);
    }

    if (typeof confetti === 'function') {
        confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 }, colors: ['#ffd166','#ff4e73','#ffffff','#ff7eb3','#ffb347'] });
    }

    setTimeout(function () {
        left.classList.remove('clinking');
        right.classList.remove('clinking');
    }, 600);
};

/* ── CANVAS FIREWORK ── */
function particleFirework() {
    var canvas = document.getElementById('fireworks');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    var fwParticles = [];
    for (var i = 0; i < 120; i++) {
        fwParticles.push({ x: canvas.width/2, y: canvas.height/2, angle: Math.random()*Math.PI*2, speed: Math.random()*6, life: 100 });
    }
    (function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height * 0.6);
        fwParticles.forEach(function (p) {
            p.x += Math.cos(p.angle) * p.speed;
            p.y += Math.sin(p.angle) * p.speed;
            p.life--;
            ctx.fillStyle = 'hsl(' + (Math.random()*360) + ',100%,60%)';
            ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI*2); ctx.fill();
        });
        fwParticles = fwParticles.filter(function (p) { return p.life > 0; });
        if (fwParticles.length > 0) requestAnimationFrame(animate);
    })();
}

window.addEventListener('resize', function () {
    var canvas = document.getElementById('fireworks');
    if (canvas) { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
});

/* ── SECRET LOVE MESSAGE ── */
function secretLoveMessage() {
    var msg = document.createElement('div');
    msg.innerHTML = '❤️ Happiest Birthday Chinni ❤️';
    msg.style.cssText =
        'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);' +
        'font-size:' + (window.innerWidth < 768 ? '22px' : '40px') + ';color:white;' +
        'background:rgba(0,0,0,0.8);padding:' + (window.innerWidth < 768 ? '15px 20px' : '20px 40px') + ';' +
        'border-radius:15px;text-align:center;box-shadow:0 0 30px pink;' +
        'z-index:99999;white-space:nowrap;max-width:90vw;overflow:hidden;text-overflow:ellipsis;';
    document.body.appendChild(msg);
    setTimeout(function () { msg.remove(); }, 4000);
}

/* desktop S+K */
var keys = {};
document.addEventListener('keydown', function (e) {
    keys[e.key.toLowerCase()] = true;
    if (keys['s'] && keys['k']) secretLoveMessage();
});
document.addEventListener('keyup', function (e) { delete keys[e.key.toLowerCase()]; });

/* mobile triple-tap */
var tapCount = 0;
var tapTimer = null;
document.addEventListener('touchend', function () {
    if (!tapStarted) return;
    tapCount++;
    clearTimeout(tapTimer);
    if (tapCount === 3) { secretLoveMessage(); tapCount = 0; return; }
    tapTimer = setTimeout(function () { tapCount = 0; }, 500);
});

/* ── COUNTDOWN PARTICLES ── */
function createCountdownParticles() {
    for (var i = 0; i < 12; i++) {
        (function (idx) {
            var particle = document.createElement('div');
            particle.style.cssText =
                'position:fixed;left:50%;top:50%;width:8px;height:8px;border-radius:50%;' +
                'background:hsl(' + (320 + idx * 5) + ',100%,60%);pointer-events:none;z-index:9999;';
            var angle = (idx / 12) * Math.PI * 2;
            var vel   = 3 + Math.random() * 2;
            var vx = Math.cos(angle) * vel;
            var vy = Math.sin(angle) * vel;
            document.body.appendChild(particle);
            var x = window.innerWidth / 2, y = window.innerHeight / 2, life = 1;
            (function animate() {
                x += vx; y += vy; life -= 0.02;
                particle.style.left    = x + 'px';
                particle.style.top     = y + 'px';
                particle.style.opacity = life;
                if (life > 0) requestAnimationFrame(animate);
                else particle.remove();
            })();
        })(i);
    }
}

/* ── FLOATING MEMORIES ── */
var floatingPhotos = [
    'Floating 1.JPG',
    'Floating 2.jpeg',
    'Floating 3.jpeg',
    'Floating 4.jpeg'
];

function floatingMemories() {
    var photo = document.createElement('img');
    photo.className = 'floating-memory';
    photo.src = floatingPhotos[Math.floor(Math.random() * floatingPhotos.length)];
    photo.style.cssText = 'position:fixed;width:120px;border-radius:10px;left:' + (Math.random()*100) + 'vw;bottom:-150px;opacity:0.8;z-index:9990;';
    document.body.appendChild(photo);
    photo.animate(
        [{ transform: 'translateY(0)', opacity: 0 },
         { transform: 'translateY(-120vh)', opacity: 1 }],
        { duration: 25000 }
    );
    setTimeout(function () { photo.remove(); }, 25000);
}

floatingInterval = setInterval(function () {
    if (countdownFinished && floatingActive) floatingMemories();
}, 20000);

function stopFloatingMemories() {
    floatingActive = false;
    document.querySelectorAll('.floating-memory').forEach(function (p) { p.remove(); });
}

function startFloatingMemories() { floatingActive = true; }

/* ═══════════════════════════════════════════
   ⏱️ AGE COUNTER
═══════════════════════════════════════════ */
(function () {
    var birthDate = new Date('2001-03-13T00:00:00');
    function updateCounter() {
        var now          = new Date();
        var diff         = now - birthDate;
        var totalSeconds = Math.floor(diff / 1000);
        var totalMinutes = Math.floor(totalSeconds / 60);
        var totalHours   = Math.floor(totalMinutes / 60);
        var totalDays    = Math.floor(totalHours   / 24);
        var totalYears   = Math.floor(totalDays    / 365.25);
        var remDays      = Math.floor(totalDays - (totalYears * 365.25));
        var yEl = document.getElementById('counterYears');
        var dEl = document.getElementById('counterDays');
        var hEl = document.getElementById('counterHours');
        var mEl = document.getElementById('counterMinutes');
        var sEl = document.getElementById('counterSeconds');
        if (yEl) yEl.textContent = totalYears.toLocaleString();
        if (dEl) dEl.textContent = remDays.toLocaleString();
        if (hEl) hEl.textContent = String(totalHours   % 24).padStart(2, '0');
        if (mEl) mEl.textContent = String(totalMinutes % 60).padStart(2, '0');
        if (sEl) sEl.textContent = String(totalSeconds % 60).padStart(2, '0');
    }
    updateCounter();
    setInterval(updateCounter, 1000);
})();

/* ═══════════════════════════════════════════
   🌟 STAR WISHES
═══════════════════════════════════════════ */
(function () {
    var wishes = [
        { emoji: '🌸', text: 'You make every room glow brighter just by walking in.' },
        { emoji: '💙', text: 'Being with you is our favourite place in the world. Always.' },
        { emoji: '✨', text: 'You are the most graceful, strong and beautiful person we know.' },
        { emoji: '🌙', text: 'Even the stars get jealous of how brightly you shine.' },
        { emoji: '💫', text: 'Every day with you feels like the best day our life. Here\'s to 25 more chapters!' },
        { emoji: '🌹', text: 'Your smile is the thing we are most grateful for in this world.' },
        { emoji: '🦋', text: 'You\'ve grown into something truly magical. Watching you flourish is our joy.' },
        { emoji: '💎', text: 'Rare, precious, irreplaceable — that\'s you Boss.' }
    ];
    var positions = [
        { left: '12%', top: '20%' }, { left: '35%', top: '12%' },
        { left: '60%', top: '18%' }, { left: '82%', top: '25%' },
        { left: '20%', top: '60%' }, { left: '50%', top: '70%' },
        { left: '75%', top: '58%' }, { left: '88%', top: '75%' }
    ];
    var revealed = 0;
    var sky = document.getElementById('starSky');
    if (!sky) return;

    /* tiny background stars */
    for (var b = 0; b < 60; b++) {
        var bg = document.createElement('div');
        bg.style.cssText =
            'position:absolute;border-radius:50%;background:rgba(255,255,255,' + (Math.random() * 0.6 + 0.2) + ');' +
            'width:' + (Math.random() * 2 + 1) + 'px;height:' + (Math.random() * 2 + 1) + 'px;' +
            'left:' + (Math.random() * 100) + '%;top:' + (Math.random() * 100) + '%;' +
            'animation:starTwinkle ' + (Math.random() * 3 + 2) + 's ease-in-out infinite;' +
            'animation-delay:' + (Math.random() * 3) + 's;pointer-events:none;';
        sky.appendChild(bg);
    }

    var sharedPopup = document.createElement('div');
    sharedPopup.className = 'star-popup';
    sharedPopup.innerHTML = '<span class="popup-emoji"></span><p class="popup-text"></p>';
    sky.appendChild(sharedPopup);

    wishes.forEach(function (wish, i) {
        var dot = document.createElement('div');
        dot.className = 'star-dot';
        dot.style.left = positions[i].left;
        dot.style.top  = positions[i].top;
        dot.style.animationDelay = (i * 0.3) + 's';

        dot.addEventListener('click', function (e) {
            e.stopPropagation();
            if (!dot.classList.contains('revealed')) {
                dot.classList.add('revealed');
                revealed++;
                var countEl = document.getElementById('starCount');
                if (countEl) countEl.textContent = revealed;
            }
            if (sharedPopup.classList.contains('visible') && sharedPopup.dataset.star === String(i)) {
                sharedPopup.classList.remove('visible'); return;
            }
            sharedPopup.querySelector('.popup-emoji').textContent = wish.emoji;
            sharedPopup.querySelector('.popup-text').textContent  = wish.text;
            sharedPopup.dataset.star = i;

            var skyW   = sky.offsetWidth;
            var skyH   = sky.offsetHeight;
            var popupW = 340, popupH = 90, margin = 14;
            var starX  = parseFloat(positions[i].left) / 100 * skyW;
            var starY  = parseFloat(positions[i].top)  / 100 * skyH;
            var left   = starX + 20;
            var top    = starY + 20;
            if (left + popupW + margin > skyW) left = starX - popupW - 20;
            if (top  + popupH + margin > skyH) top  = starY - popupH - 20;
            left = Math.max(margin, Math.min(left, skyW - popupW - margin));
            top  = Math.max(margin, Math.min(top,  skyH - popupH - margin));
            sharedPopup.style.left   = left + 'px';
            sharedPopup.style.top    = top  + 'px';
            sharedPopup.style.right  = 'auto';
            sharedPopup.style.bottom = 'auto';
            sharedPopup.classList.add('visible');
        });

        sky.appendChild(dot);
    });

    sky.addEventListener('click', function () { sharedPopup.classList.remove('visible'); });
})();

/* ═══════════════════════════════════════════
   🪄 SCRATCH CARD
═══════════════════════════════════════════ */
(function () {
    var canvas = document.getElementById('scratchCanvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var isScratching    = false;
    var totalPixels     = canvas.width * canvas.height;
    var scratchedEnough = false;

    function roundRect(c, x, y, w, h, r) {
        c.beginPath();
        c.moveTo(x + r, y); c.lineTo(x + w - r, y);
        c.quadraticCurveTo(x + w, y, x + w, y + r);
        c.lineTo(x + w, y + h - r);
        c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        c.lineTo(x + r, y + h);
        c.quadraticCurveTo(x, y + h, x, y + h - r);
        c.lineTo(x, y + r);
        c.quadraticCurveTo(x, y, x + r, y);
        c.closePath();
    }

    function initScratch() {
        ctx.globalCompositeOperation = 'source-over';
        var grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        grad.addColorStop(0,   '#c8a84b'); grad.addColorStop(0.3, '#f0d060');
        grad.addColorStop(0.5, '#ffeaa0'); grad.addColorStop(0.7, '#f0d060');
        grad.addColorStop(1,   '#c8a84b');
        ctx.fillStyle = grad;
        roundRect(ctx, 0, 0, canvas.width, canvas.height, 20);
        ctx.fill();
        ctx.fillStyle = 'rgba(100,70,0,0.6)';
        ctx.font = 'bold 16px Poppins, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('✨ Scratch Me ✨', canvas.width / 2, canvas.height / 2);
        ctx.font = '13px Poppins, sans-serif';
        ctx.textBaseline = 'middle';
    }

    function getPos(e) {
        var r = canvas.getBoundingClientRect();
        var scaleX = canvas.width  / r.width;
        var scaleY = canvas.height / r.height;
        if (e.touches) return { x: (e.touches[0].clientX - r.left) * scaleX, y: (e.touches[0].clientY - r.top) * scaleY };
        return { x: (e.clientX - r.left) * scaleX, y: (e.clientY - r.top) * scaleY };
    }

    function scratch(e) {
        if (!isScratching) return;
        e.preventDefault();
        var pos = getPos(e);
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath(); ctx.arc(pos.x, pos.y, 22, 0, Math.PI * 2); ctx.fill();
        checkRevealed();
    }

    function checkRevealed() {
        if (scratchedEnough) return;
        var data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        var cleared = 0;
        for (var i = 3; i < data.length; i += 4) { if (data[i] === 0) cleared++; }
        if (cleared / totalPixels > 0.55) {
            scratchedEnough = true;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            var btn = document.getElementById('scratchResetBtn');
            if (btn) btn.style.display = 'inline-block';
        }
    }

    canvas.addEventListener('mousedown',  function (e) { isScratching = true;  scratch(e); });
    canvas.addEventListener('mousemove',  scratch);
    canvas.addEventListener('mouseup',    function ()  { isScratching = false; });
    canvas.addEventListener('mouseleave', function ()  { isScratching = false; });
    canvas.addEventListener('touchstart', function (e) { isScratching = true;  scratch(e); }, { passive: false });
    canvas.addEventListener('touchmove',  scratch, { passive: false });
    canvas.addEventListener('touchend',   function ()  { isScratching = false; });

    initScratch();

    window.resetScratch = function () {
        scratchedEnough = false;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        initScratch();
        var btn = document.getElementById('scratchResetBtn');
        if (btn) btn.style.display = 'none';
    };
})();
/* ═══════════════════════════════════════════
   💌 LOCKED LETTER SECTION
═══════════════════════════════════════════ */
(function () {
    var opened = false;

    window.openLetter = function () {
        if (opened) return;
        opened = true;

        var envelope          = document.getElementById('envelope');
        var butterflyContainer = document.getElementById('butterflyContainer');
        var hint              = document.getElementById('envelopeHint');
        var wrapper           = document.getElementById('envelopeWrapper');

        /* 1 — crack the seal & lift the flap */
        if (envelope) envelope.classList.add('open');
        if (hint)     hint.style.display = 'none';

        /* 2 — release butterflies after flap opens */
        setTimeout(function () {
            if (butterflyContainer) butterflyContainer.classList.add('flying');
        }, 900);

        /* 3 — show full expanded letter overlay after butterflies start */
        setTimeout(function () {
            showExpandedLetter();
        }, 1800);

        /* gentle confetti burst */
        setTimeout(function () {
            if (typeof confetti === 'function') {
                confetti({
                    particleCount: 60,
                    spread: 80,
                    origin: { y: 0.55 },
                    colors: ['#ff9ee8', '#ffd6f5', '#ff7eb3', '#ffeaa0', '#c0385e', '#fff0f5']
                });
            }
        }, 1000);
    };

    function showExpandedLetter() {
        var existing = document.getElementById('letterExpandedOverlay');
        if (existing) {
            existing.classList.add('visible');
            return;
        }

        var overlay = document.createElement('div');
        overlay.id        = 'letterExpandedOverlay';
        overlay.className = 'letter-expanded';

        overlay.innerHTML =
            '<div class="letter-expanded-backdrop" onclick="closeLetter()"></div>' +
            '<div class="letter-expanded-paper">' +
            '  <button class="letter-close" onclick="closeLetter()">✕</button>' +
            '  <div class="letter-deco-top">🌸 ✨ 🌸</div>' +
            '  <h3 class="letter-heading">Dear Sahithi,</h3>' +
            '  <p class="letter-body">I\'ve been trying to find the right words to describe what your friendship means to me, and honestly? No message is ever going to be enough.</p>' +
            '  <p class="letter-body">But in all seriousness, you are one of the greatest people I know. You have this way of making people feel seen, heard, and like everything is going to be okay and you\'ve done that for me more times than I can count. You show up, you listen, you tell me the truth even when I don\'t want to hear it.</p>' +
            '  <p class="letter-body">I don\'t say it enough, but I am so grateful for you. For your friendship, your patience with my chaos, your ability to make me laugh on my worst days, and just... for being YOU.</p>' +
            '  <div class="letter-closing">' +
            '    With all the love in the world,<br>' +
            '    <span class="letter-sign">— Kalyan Kanchi 💙</span>' +
            '  </div>' +
            '  <div class="letter-deco-bottom">💞 Happy 25th 💞</div>' +
            '</div>';

        document.body.appendChild(overlay);

        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                overlay.classList.add('visible');
            });
        });
    }

    window.closeLetter = function () {
        var overlay = document.getElementById('letterExpandedOverlay');
        if (overlay) {
            overlay.classList.remove('visible');
        }
        setTimeout(function () {
            opened = false;
            var envelope = document.getElementById('envelope');
            var hint     = document.getElementById('envelopeHint');
            var bc       = document.getElementById('butterflyContainer');
            if (envelope) envelope.classList.remove('open');
            if (hint)     hint.style.display = '';
            if (bc)       bc.classList.remove('flying');
        }, 600);
    };

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') window.closeLetter();
    });
})();
/* ============================================================
   😂 COMEDY STORY VIEWER
   ============================================================ */
(function () {

    var storyPhotos = [
        'Last 1.jpg',
        'Last 2.jpg',
        'Last 3.jpg',
        'Last 4.jpg',
        'Last 5.jpg',
        'Last 6.jpg',
        'Last 7.jpg',
        'Last 8.jpg',
        'Last 9.jpg',
        'Last 10.jpg',
        'Last 11.jpg',
        'Last 12.jpg',
        'Last 13.jpg',
        'Last 14.jpg',
        'Last 15.jpg',
        'Last 16.jpg',
        'Last 17.jpg',
        'Last 18.jpg',
        'Last 19.jpg',
        'Last 20.jpg',
        'Last 21.jpg',
        'Last 22.jpg',
        'Last 23.jpg',
        'Last 24.jpg',
        'Last 25.jpg',
        'Last 26.jpg'
    ];

    var currentIndex  = 0;
    var fadeTimer     = null;   // tracks pending fade setTimeout
    var isTransitioning = false;

    /* Preload all images up front so navigation is instant */
    function preloadImages() {
        storyPhotos.forEach(function (src) {
            var img = new Image();
            img.src = src;
        });
    }

    function buildDots() {
        var bar = document.getElementById('storyProgress');
        if (!bar) return;
        bar.innerHTML = '';
        storyPhotos.forEach(function (_, i) {
            var dot = document.createElement('div');
            dot.className = 'story-dot' + (i === 0 ? ' active' : '');
            dot.id = 'dot-' + i;
            bar.appendChild(dot);
        });
    }

    function updateDots(index) {
        storyPhotos.forEach(function (_, i) {
            var dot = document.getElementById('dot-' + i);
            if (!dot) return;
            dot.className = 'story-dot' +
                (i === index ? ' active' : i < index ? ' done' : '');
        });
    }

    function showPhoto(index) {
        var img     = document.getElementById('storyPhoto');
        var counter = document.getElementById('storyCounter');
        var prev    = document.getElementById('storyPrev');
        var next    = document.getElementById('storyNext');
        if (!img) return;

        /* Cancel any in-progress fade immediately */
        if (fadeTimer) {
            clearTimeout(fadeTimer);
            fadeTimer = null;
        }

        /* Update index + UI controls right away so rapid taps feel responsive */
        currentIndex = index;
        if (counter) counter.textContent = (index + 1) + ' / ' + storyPhotos.length;
        if (prev)    prev.disabled  = index === 0;
        if (next)    next.disabled  = index === storyPhotos.length - 1;
        updateDots(index);

        /* Snap out, swap src, snap back in */
        img.classList.add('fade-out');
        fadeTimer = setTimeout(function () {
            fadeTimer = null;
            img.src = storyPhotos[index];
            img.classList.remove('fade-out');
        }, 200);
    }

    window.openComedyStory = function () {
        var bgMusic = document.getElementById('bgMusic');
        if (bgMusic) bgMusic.pause();

        /* Preload images while the intro audio plays */
        preloadImages();

        var audio = document.getElementById('lastAudio');
        if (audio) {
            audio.currentTime = 0;
            audio.play().catch(function () {});
        }

        setTimeout(function () {
            buildDots();
            showPhoto(0);
            var overlay = document.getElementById('comedyStoryOverlay');
            if (overlay) overlay.classList.add('open');
            document.body.style.overflow = 'hidden';
        }, 2496);
    };

    window.closeComedyStory = function () {
        /* Cancel any pending fade so it doesn't fire after close */
        if (fadeTimer) { clearTimeout(fadeTimer); fadeTimer = null; }
        var overlay = document.getElementById('comedyStoryOverlay');
        if (overlay) overlay.classList.remove('open');
        document.body.style.overflow = '';

        /* Reveal the secret songs button */
        var dedicateBtn = document.getElementById('dedicateMoreWrapper');
        if (dedicateBtn) {
            dedicateBtn.classList.add('visible');
            setTimeout(function () {
                dedicateBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 400);
        }
    };

    window.storyNav = function (direction) {
        var next = currentIndex + direction;
        if (next < 0 || next >= storyPhotos.length) return;
        showPhoto(next);
    };

    document.addEventListener('keydown', function (e) {
        var overlay = document.getElementById('comedyStoryOverlay');
        if (!overlay || !overlay.classList.contains('open')) return;
        if (e.key === 'ArrowRight') window.storyNav(1);
        if (e.key === 'ArrowLeft')  window.storyNav(-1);
        if (e.key === 'Escape')     window.closeComedyStory();
    });

})();
/* ═══════════════════════════════════════════
   🎵 DEDICATED SONGS SECTION
═══════════════════════════════════════════ */
(function () {
    var totalSlides     = 6;
    var currentSlide    = 0;
    var isPlaying       = false;
    var isTransitioning = false;

    var photos = ['Dedicated 1.jpg','Dedicated 2.jpg','Dedicated 3.jpg','Dedicated 4.jpg','Dedicated 5.jpg','Dedicated 6.jpg'];

    /* Preload all images so navigation is instant */
    photos.forEach(function (src) { var img = new Image(); img.src = src; });

    function getAudio(index) {
        return document.getElementById('dedicateAudio' + (index + 1));
    }

    function stopCurrent() {
        var audio     = getAudio(currentSlide);
        if (audio) { audio.pause(); audio.currentTime = 0; }
        isPlaying = false;
        var frame     = document.getElementById('dedicateFrame');
        var soundwave = document.getElementById('dedicateSoundwave');
        if (frame)     frame.classList.remove('playing');
        if (soundwave) soundwave.classList.remove('active');
    }

    function updateUI() {
        if (isTransitioning) return;
        isTransitioning = true;
        var photo = document.getElementById('dedicatePhoto');
        var prev  = document.getElementById('dedicatePrev');
        var next  = document.getElementById('dedicateNext');
        var dots  = document.querySelectorAll('.dedicate-dot');
        if (prev) prev.disabled = true;
        if (next) next.disabled = true;
        dots.forEach(function (d, i) { d.classList.toggle('active', i === currentSlide); });
        if (photo) {
            photo.classList.add('fade-out');
            setTimeout(function () {
                var newImg = new Image();
                newImg.onload = function () {
                    photo.src = photos[currentSlide];
                    photo.classList.remove('fade-out');
                    isTransitioning = false;
                    if (prev) prev.disabled = currentSlide === 0;
                    if (next) next.disabled = currentSlide === totalSlides - 1;
                };
                newImg.onerror = function () {
                    photo.src = photos[currentSlide];
                    photo.classList.remove('fade-out');
                    isTransitioning = false;
                    if (prev) prev.disabled = currentSlide === 0;
                    if (next) next.disabled = currentSlide === totalSlides - 1;
                };
                newImg.src = photos[currentSlide];
            }, 250);
        } else {
            isTransitioning = false;
        }
    }

    window.openDedicateOverlay = function () {
    var bgMusic = document.getElementById('bgMusic');
    if (bgMusic) bgMusic.pause();
    var audio = document.getElementById('inkaUnnayiAudio');
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(function(){});
        audio.onended = function () {
            var overlay = document.getElementById('dedicateOverlay');
            if (overlay) overlay.classList.add('open');
            document.body.style.overflow = 'hidden';
            currentSlide = 0;
            updateUI();
        };
    } else {
        var overlay = document.getElementById('dedicateOverlay');
        if (overlay) overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
        currentSlide = 0;
        updateUI();
    }
    };

    window.closeDedicateOverlay = function () {
        stopCurrent();
        var overlay = document.getElementById('dedicateOverlay');
        if (overlay) overlay.classList.remove('open');
        document.body.style.overflow = '';
        /* Resume bg music only when leaving the section */
        var bgMusic = document.getElementById('bgMusic');
        if (bgMusic && countdownFinished) bgMusic.play().catch(function(){});
    };

    window.toggleDedicateSong = function () {
        var audio = getAudio(currentSlide);
        var frame = document.getElementById('dedicateFrame');
        var wave  = document.getElementById('dedicateSoundwave');
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
            isPlaying = false;
            if (frame) frame.classList.remove('playing');
            if (wave)  wave.classList.remove('active');
        } else {
            audio.currentTime = 0;
            audio.play().catch(function(){});
            isPlaying = true;
            if (frame) frame.classList.add('playing');
            if (wave)  wave.classList.add('active');
            audio.onended = function () {
                isPlaying = false;
                if (frame) frame.classList.remove('playing');
                if (wave)  wave.classList.remove('active');
            };
        }
    };

    window.dedicateNav = function (dir) {
        var next = currentSlide + dir;
        if (next < 0 || next >= totalSlides) return;
        stopCurrent();
        currentSlide = next;
        updateUI();
    };

    window.dedicateGoTo = function (index) {
        if (index === currentSlide) return;
        stopCurrent();
        currentSlide = index;
        updateUI();
    };

    /* Escape key closes the overlay */
    document.addEventListener('keydown', function (e) {
        var overlay = document.getElementById('dedicateOverlay');
        if (!overlay || !overlay.classList.contains('open')) return;
        if (e.key === 'Escape')      window.closeDedicateOverlay();
        if (e.key === 'ArrowRight')  window.dedicateNav(1);
        if (e.key === 'ArrowLeft')   window.dedicateNav(-1);
    });

})();