export class AbilityManager {
    constructor() {
        this.activeAbility = null;

        this.gravityMult = 1;
        this.jumpMult = 1;
        this.accelerationMult = 1;
        this.topSpeedMult = 1;
    }

    setAbility(name) {
        this.reset();

        console.log('ABILITY APPLIED:', name);

        this.activeAbility = name;

        switch (name) {
            case '2x Gravity':
                this.gravityMult = 1.1;
                break;

            case '3x Gravity':
                this.gravityMult = 1.138;
                break;

            case '2x Jump':
                this.jumpMult = 1.1;
                break;

            case '3x Jump':
                this.jumpMult = 1.2;
                break;
            case '2x Top speed':
                this.topSpeedMult = 80;
                this.accelerationMult = 1000;
                break;
            case 'Normal':
                this.reset()
                break;
        }
    
    }

    reset() {
        this.activeAbility = null;
        this.gravityMult = 1;
        this.jumpMult = 1;
        this.accelerationMult = 1;
        this.topSpeedMult = 1;
    }
}
