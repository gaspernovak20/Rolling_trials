export class KeyOverlay {
    constructor(parent = document.body, abilityManager = null) {
        this.parent = parent;
        this.abilityManager = abilityManager;

        this.keys = ['W', 'A', 'S', 'D', 'E', ' '];
        this.abilities = [
            '2x Gravity', '2x Jump', '3x Gravity',
            '3x Jump', '2x Top speed', 'Normal'
        ];

        this.keyEls = {};
        this.diamonds = 0;
        this.currentAbility = null;

        this.createKeyOverlay();
        this.createAbilityOverlay();
        this.createDiamondCounter();
        this.loadSounds();
        this.addEvents();
        this.addStyles();
    }

    el(tag, styles = {}, text = '') {
        const e = document.createElement(tag);
        Object.assign(e.style, styles);
        if (text) e.textContent = text;
        return e;
    }

    createKeyOverlay() {
        this.overlay = this.el('div', {
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
            fontFamily: 'sans-serif',
            userSelect: 'none',
            zIndex: 100
        });

        const row = keys =>
            this.el('div', { display: 'flex', gap: '10px' },
                keys.forEach(k => this.overlayRow.appendChild(this.createKey(k)))
            );

        const top = this.el('div', { display: 'flex', gap: '10px' });
        ['W', 'E'].forEach(k => top.appendChild(this.createKey(k)));

        const mid = this.el('div', { display: 'flex', gap: '10px' });
        ['A', 'S', 'D'].forEach(k => mid.appendChild(this.createKey(k)));

        const space = this.createKey(' ');
        space.textContent = 'SPACE';
        space.style.width = '160px';

        this.overlay.append(top, mid, space);
        this.parent.appendChild(this.overlay);
    }

    createAbilityOverlay() {
        this.abilityOverlay = this.el('div', {
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: '#333',
            color: '#fff',
            padding: '10px 15px',
            borderRadius: '8px',
            fontFamily: 'sans-serif',
            fontWeight: 'bold',
            display: 'none',
            zIndex: 100
        });

        this.parent.appendChild(this.abilityOverlay);
    }

    createDiamondCounter() {
        this.counter = this.el('div', {
            position: 'fixed',
            top: '20px',
            left: '20px',
            color: '#fff',
            fontSize: '24px',
            fontWeight: 'bold',
            fontFamily: 'sans-serif',
            zIndex: 100
        }, '0 / 14 💎');

        this.parent.appendChild(this.counter);
    }

    createKey(key) {
        const el = document.createElement('div');
        el.className = 'key';
        el.textContent = key === ' ' ? 'SPACE' : key;
        this.keyEls[key] = el;
        return el;
    }

    addEvents() {
        window.addEventListener('keydown', e => this.setKey(e, true));
        window.addEventListener('keyup', e => this.setKey(e, false));
    }

    setKey(e, active) {
        const key = e.key.toUpperCase();
        const el = this.keyEls[key] || (key === ' ' && this.keyEls[' ']);
        if (el) el.classList.toggle('active', active);
        if (active && key === 'E') this.toggleAbility();
    }

    toggleAbility() {
        clearInterval(this.spinInterval);
        clearTimeout(this.spinTimeout);

        if (this.currentAbility) {
            this.abilityOverlay.style.display = 'none';
            this.currentAbility = null;
            return;
        }

        this.abilityOverlay.style.display = 'block';
        let i = 0;

        this.spinSound.play();

        this.spinInterval = setInterval(() => {
            this.abilityOverlay.textContent = this.abilities[i++ % this.abilities.length];
        }, 100);

        this.spinTimeout = setTimeout(() => {
            clearInterval(this.spinInterval);

            const ability = this.abilities[Math.floor(Math.random() * this.abilities.length)];
            this.currentAbility = ability;
            this.abilityOverlay.textContent = ability;

            this.selectSound.play();
            this.flashAbility();

            this.abilityManager?.setAbility(ability);
        }, 3500);
    }

    flashAbility() {
        this.abilityOverlay.style.background = '#FFD700';
        setTimeout(() => this.abilityOverlay.style.background = '#333', 500);
    }

    addDiamond() {
        this.counter.textContent = `${++this.diamonds} / 14 💎`;
    }

    loadSounds() {
        this.spinSound = new Audio(new URL('../../sounds/spin.mp3', import.meta.url));
        this.selectSound = new Audio(new URL('../../sounds/select.mp3', import.meta.url));
        this.spinSound.volume = 0.7;
        this.selectSound.volume = 0.8;
    }

    addStyles() {
        document.head.appendChild(this.el('style', {}, `
            .key {
                width: 50px;
                height: 50px;
                background: #555;
                color: white;
                display: flex;
                justify-content: center;
                align-items: center;
                border-radius: 8px;
                font-weight: bold;
                transition: background 0.1s;
            }
            .key.active {
                background: #9a9a9a;
            }
        `));
    }
}