export class KeyOverlay {
    constructor(parent = document.body, abilityManager = null) {
        this.keys = ['W', 'A', 'S', 'D', 'E', ' '];
        this.abilityList = [
            '2x Gravity', '2x Jump', '3x Gravity', '3x Jump', '2x Top speed', 'Normal'
        ];

        this.abilityManager = abilityManager;
        this.keyElements = {};
        this.parent = parent;

        this.diamondsCollected = 0;
        this.currentAbility = null;

        this.initOverlay();
        this.initAbilityOverlay();
        this.initDiamondCounter();
        this.addGlobalEventListeners();
        this.addStyles();
    }

    initOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.id = 'keyOverlay';
        this.overlay.style.position = 'fixed';
        this.overlay.style.bottom = '20px';
        this.overlay.style.right = '20px';
        this.overlay.style.display = 'flex';
        this.overlay.style.flexDirection = 'column';
        this.overlay.style.alignItems = 'center';
        this.overlay.style.gap = '10px';
        this.overlay.style.fontFamily = 'sans-serif';
        this.overlay.style.userSelect = 'none';
        this.overlay.style.zIndex = '100';
        this.parent.appendChild(this.overlay);

        const topRow = document.createElement('div');
        topRow.style.display = 'flex';
        topRow.style.gap = '10px';
        topRow.appendChild(this.createKey('W'));
        topRow.appendChild(this.createKey('E'));
        this.overlay.appendChild(topRow);

        const midRow = document.createElement('div');
        midRow.style.display = 'flex';
        midRow.style.gap = '10px';
        ['A', 'S', 'D'].forEach(k => midRow.appendChild(this.createKey(k)));
        this.overlay.appendChild(midRow);

        const keySpace = this.createKey(' ');
        keySpace.textContent = 'SPACE';
        keySpace.style.width = '160px';
        this.overlay.appendChild(keySpace);
    }

    initAbilityOverlay() {
        this.abilityOverlay = document.createElement('div');
        this.abilityOverlay.id = 'abilityOverlay';
        this.abilityOverlay.style.position = 'fixed';
        this.abilityOverlay.style.top = '20px';
        this.abilityOverlay.style.right = '20px';
        this.abilityOverlay.style.fontFamily = 'sans-serif';
        this.abilityOverlay.style.zIndex = '100';
        this.abilityOverlay.style.background = '#333';
        this.abilityOverlay.style.color = '#fff';
        this.abilityOverlay.style.padding = '10px 15px';
        this.abilityOverlay.style.borderRadius = '8px';
        this.abilityOverlay.style.display = 'none'; // sprva skrito
        this.abilityOverlay.style.fontWeight = 'bold';
        this.abilityOverlay.style.transition = 'background 0.3s';
        this.parent.appendChild(this.abilityOverlay);
    }

    initDiamondCounter() {
        this.diamondCounter = document.createElement('div');
        this.diamondCounter.id = 'diamondCounter';
        this.diamondCounter.style.position = 'fixed';
        this.diamondCounter.style.top = '20px';
        this.diamondCounter.style.left = '20px';
        this.diamondCounter.style.fontFamily = 'sans-serif';
        this.diamondCounter.style.fontSize = '24px';
        this.diamondCounter.style.color = '#fff';
        this.diamondCounter.style.zIndex = '100';
        this.diamondCounter.style.background = 'transparent';
        this.diamondCounter.style.padding = '10px 15px';
        this.diamondCounter.style.borderRadius = '8px';
        this.diamondCounter.style.fontWeight = 'bold';
        this.diamondCounter.textContent = '0 / 14 💎';
        this.parent.appendChild(this.diamondCounter);
    }

    createKey(k) {
        const el = document.createElement('div');
        el.className = 'key';
        el.id = k === ' ' ? 'keySpace' : 'key' + k;
        el.textContent = k === ' ' ? 'SPACE' : k;
        this.keyElements[k] = el;
        return el;
    }

    addGlobalEventListeners() {
        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('keyup', (e) => this.onKeyUp(e));

        this.spinSound = new Audio(new URL('../../sounds/spin.mp3', import.meta.url));
        this.spinSound.volume = 0.7;
        this.selectSound = new Audio(new URL('../../sounds/select.mp3', import.meta.url));
        this.selectSound.volume = 0.8;
    }

    onKeyDown(e) {
        const key = e.key.toUpperCase();
        if (this.keyElements[key]) this.keyElements[key].classList.add('active');
        if (key === ' ' && this.keyElements[' ']) this.keyElements[' '].classList.add('active');

        if (key === 'E') this.toggleAbility();
    }

    onKeyUp(e) {
        const key = e.key.toUpperCase();
        if (this.keyElements[key]) this.keyElements[key].classList.remove('active');
        if (key === ' ' && this.keyElements[' ']) this.keyElements[' '].classList.remove('active');
    }

    toggleAbility() {
        clearInterval(this.abilityInterval); 
        clearTimeout(this.abilityTimeout);

        if (this.currentAbility) {
            this.abilityOverlay.style.display = 'none';
            this.currentAbility = null;
            return;
        }

        this.abilityOverlay.style.display = 'block';
        let index = 0;
        const spinCount = 35;

        this.spinSound.currentTime = 0;
        this.spinSound.play();

        this.abilityInterval = setInterval(() => {
            this.abilityOverlay.textContent = this.abilityList[index];
            index = (index + 1) % this.abilityList.length;
        }, 100);

        this.abilityTimeout = setTimeout(() => {
            clearInterval(this.abilityInterval);
            this.abilityInterval = null;

            const finalAbility = this.abilityList[Math.floor(Math.random() * this.abilityList.length)];
            this.currentAbility = finalAbility;
            this.abilityOverlay.textContent = finalAbility;

            this.selectSound.currentTime = 0;
            this.selectSound.play();

            // Flash background
            this.abilityOverlay.style.background = '#FFD700';
            setTimeout(() => this.abilityOverlay.style.background = '#333', 500);

            this.abilityManager?.setAbility(finalAbility);
            this.abilityTimeout = null;
        }, spinCount * 100);
    }


    addDiamond() {
        this.diamondsCollected++;
        this.diamondCounter.textContent = `${this.diamondsCollected} / 14 💎`;
    }

    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .key {
                width: 50px;
                height: 50px;
                background-color: #555;
                color: white;
                display: flex;
                justify-content: center;
                align-items: center;
                border-radius: 8px;
                font-weight: bold;
                transition: background-color 0.1s;
            }
            .key.active {
                background-color: rgba(154, 154, 154, 1);
                color: white;
            }
        `;
        document.head.appendChild(style);
    }
}