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
                this.gravityMult = 2;
                break;

            case '3x Gravity':
                this.gravityMult = 3;
                break;

            case '2x Jump':
                this.jumpMult = 2;
                break;

            case '3x Jump':
                this.jumpMult = 3;
                break;

            case '10x Acceleration':
                this.accelerationMult = 1000;
                break;
            case '2x Top speed':
                this.topSpeedMult = 5;
                this.accelerationMult = 10;
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
