export class Light {
    constructor({
        color = [1, 1, 1],
        ambient = [0, 0, 0],

        // spotlight dodatki
        direction = [0, -1, 0],          // vec3 – kam sveti
        innerAngle = Math.PI / 8,        // radiani
        outerAngle = Math.PI / 5,        // radiani
    } = {}) {
        this.color = color;
        this.ambient = ambient;

        this.direction = direction;
        this.innerAngle = innerAngle;
        this.outerAngle = outerAngle;
    }
}
