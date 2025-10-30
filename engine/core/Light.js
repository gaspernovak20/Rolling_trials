export class Light {

    constructor({
        color = [1, 1, 1],
        ambient = [0, 0, 0],
    } = {}) {
        this.color = color;
        this.ambient = ambient;
    }
}