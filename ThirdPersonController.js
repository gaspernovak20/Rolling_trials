import { quat, vec3, mat4, mat3 } from 'glm';

import { Transform } from '../core/Transform.js';
// import { of } from 'core-js/core/array';


// na vrhu datoteke
const jumpSound = new Audio(new URL('../../sounds/jump.wav', import.meta.url)); //zvok ko skoci
jumpSound.volume = 0.8;
const bounceSound = new Audio(new URL('../../sounds/bounce.wav', import.meta.url));
bounceSound.volume = 0.8;

export class ThirdPersonController {

    constructor(playerNode, cameraNode, domElement, physics, playerRadius, {
        pitch = 0,
        yaw = 0,
        velocity = [0, 0, 0],
        acceleration = 100,
        maxSpeed = 50,
        decay = 0.99999,
        pointerSensitivity = 0.002,

        jumpSpeed = 70,
        gravity = -100,
        groundY = 0.5,
        isGrounded = true,

        baseOffset = [0, 25, 30],
        radius = vec3.len(baseOffset),
    } = {}) {
        this.playerNode = playerNode;
        this.cameraNode = cameraNode;
        this.domElement = domElement;
        this.physics = physics;

        this.keys = {};

        this.pitch = pitch;
        this.yaw = yaw;

        this.velocity = velocity;
        this.acceleration = acceleration;
        this.maxSpeed = maxSpeed;
        this.decay = decay;
        this.pointerSensitivity = pointerSensitivity;

        this.jumpSpeed = jumpSpeed;
        this.gravity = gravity;
        this.groundY = groundY;
        this.isGrounded = isGrounded;

        this.baseOffset = baseOffset;
        this.radius = radius;

        this.playerRadius = playerRadius;
        this.distanceTraveled = 0;
        this.initHandlers();
    }

    initHandlers() {
        this.pointermoveHandler = this.pointermoveHandler.bind(this);
        this.keydownHandler = this.keydownHandler.bind(this);
        this.keyupHandler = this.keyupHandler.bind(this);

        const element = this.domElement;
        const doc = element.ownerDocument;

        doc.addEventListener('keydown', this.keydownHandler);
        doc.addEventListener('keyup', this.keyupHandler);

        element.addEventListener('click', e => element.requestPointerLock());
        doc.addEventListener('pointerlockchange', e => {
            if (doc.pointerLockElement === element) {
                doc.addEventListener('pointermove', this.pointermoveHandler);
            } else {
                doc.removeEventListener('pointermove', this.pointermoveHandler);
            }
        });
    }

    update(t, dt) {

        const transformPlayer = this.playerNode.getComponentOfType(Transform);
        if (!transformPlayer) {
            return;
        }
        const playerPosition = transformPlayer.translation;

        const transformCamera = this.cameraNode.getComponentOfType(Transform);
        if (!transformPlayer) {
            return;
        }
        const cameraPosition = transformCamera.translation;

        // Calculate forward and right vectors.
        const cos = Math.cos(this.yaw);
        const sin = Math.sin(this.yaw);

        const forward = [-sin, 0, -cos];
        const right = [cos, 0, -sin];

        // Camera offset
        const offset = [Math.sin(this.yaw) * Math.cos(this.pitch) * this.radius,
        Math.sin(this.pitch) * this.radius,
        Math.cos(this.yaw) * Math.cos(this.pitch) * this.radius]

        // Ground height
        this.groundY = this.physics.getGroundHeightAt(playerPosition[0], playerPosition[2]);


        // Map user input to the acceleration vector.
        const acc = vec3.create();
        if (this.keys['KeyW']) {
            vec3.add(acc, acc, forward);
        }
        if (this.keys['KeyS']) {
            vec3.sub(acc, acc, forward);
        }
        if (this.keys['KeyD']) {
            vec3.add(acc, acc, right);
        }
        if (this.keys['KeyA']) {
            vec3.sub(acc, acc, right);
        }
        if (this.keys['Space']) {
            if (this.isGrounded) {
                this.velocity[1] = this.jumpSpeed;
                this.isGrounded = false;
                jumpSound.currentTime = 0; // resetiraj
                jumpSound.play();
            }
        }

        this.velocity[1] += dt * this.gravity;

        // Update velocity based on acceleration.
        vec3.scaleAndAdd(this.velocity, this.velocity, acc, dt * this.acceleration);

        // If there is no user input, apply decay.
        if (!this.keys['KeyW'] &&
            !this.keys['KeyS'] &&
            !this.keys['KeyD'] &&
            !this.keys['KeyA']) {
            const decay = Math.exp(dt * Math.log(1 - this.decay));
            this.velocity[0] *= decay;
            this.velocity[2] *= decay;
        }

        // Limit speed to prevent accelerating to infinity and beyond.
        let horizontalSpeed = Math.hypot(this.velocity[0], this.velocity[2]);
        if (horizontalSpeed > this.maxSpeed) {
            const scale = this.maxSpeed / horizontalSpeed;
            this.velocity[0] *= scale;
            this.velocity[2] *= scale;
        }

        if (transformPlayer) {
            // Update translation based on velocity.
            vec3.scaleAndAdd(playerPosition,
                transformPlayer.translation, this.velocity, dt);

            const epsilon = 0.05;

            if (this.groundY != null) {
                if (playerPosition[1] - this.playerNode.radius <= this.groundY + epsilon) {
                    playerPosition[1] = this.groundY + this.playerNode.radius;
                    this.isGrounded = true;
                    
                    // zvok pristanka: samo, če prej ni bil grounded
                    if (!this.wasGrounded) {
                        try {
                            bounceSound.currentTime = 0; // reset, da se lahko predvaja večkrat
                            bounceSound.play();
                        } catch (err) {
                            console.warn('Bounce sound could not play:', err);
                        }
                    }

                    this.velocity[1] = 0;
                } else {
                    this.isGrounded = false
                }
            }

            this.wasGrounded = this.isGrounded;

            // Update rotation based on the Euler angles.
            const yawRotation = quat.create();
            quat.rotateY(yawRotation, yawRotation, this.yaw);
            transformPlayer.rotation = yawRotation;
            quat.clone(transformPlayer.rotation, yawRotation);

            // const delta = vec3.sub(vec3.create(), playerPosition, previousPosition);

            // // odstrani šum
            // for (let i = 0; i < 3; i++) {
            //     if (Math.abs(delta[i]) < 1e-3) delta[i] = 0;
            // }

            // const movementDelta = vec3.length(delta);


            // if (!Number.isNaN(movementDelta) && movementDelta > 0.001) {

            //     const forwardDir = vec3.normalize(vec3.create(), forward);
            //     forwardDir[1] = 0;
            //     const upDir = [0, 1, 0];

            //     const exes = vec3.create();
            //     vec3.cross(exes, upDir, forwardDir);
            //     vec3.normalize(exes, exes);

            //     const rad = movementDelta / this.playerNode.radius;
            //     // const rad = 0.1 * (Math.PI / 180);

            //     const ballSpin = quat.create();
            //     quat.setAxisAngle(ballSpin, exes, rad);


            //     quat.multiply(transformPlayer.rotation, ballSpin, prevRotation);
            //     quat.multiply(transformPlayer.rotation, yawRotation, transformPlayer.rotation);
            // } else {
            //     quat.clone(transformPlayer.rotation, prevRotation);
            // }

        }

        if (transformCamera) {
            // camera translation around Player
            vec3.add(cameraPosition, playerPosition, offset);
            // camera look at Player
            this.lookAt(transformCamera, playerPosition);
        }
    }

    lookAt(transformCamera, playerPostion) {
        const up = [0, 1, 0];
        // Generate matrix that makes Camera look at Player
        const viewMatrix = mat4.create();
        mat4.targetTo(viewMatrix, transformCamera.translation, playerPostion, up);

        // Get 3x3 matrix from upper-left corner  
        const rotationMatrix = mat3.create();
        mat3.fromMat4(rotationMatrix, viewMatrix);

        // Create quaternion rotation
        const cameraRotation = quat.create();
        quat.fromMat3(cameraRotation, rotationMatrix);

        transformCamera.rotation = cameraRotation;
    }

    pointermoveHandler(e) {
        const dx = e.movementX;
        const dy = e.movementY;

        this.pitch -= dy * this.pointerSensitivity;
        this.yaw -= dx * this.pointerSensitivity;

        const twopi = Math.PI * 2;
        const halfpi = Math.PI / 2;

        this.pitch = Math.min(Math.max(this.pitch, -halfpi), halfpi);
        this.yaw = ((this.yaw % twopi) + twopi) % twopi;
    }

    keydownHandler(e) {
        this.keys[e.code] = true;
    }

    keyupHandler(e) {
        this.keys[e.code] = false;
    }

    // toRadians(angle) {
    //     return angle * (Math.PI / 180);
    // }

    getDistanceTraveled() {
        return this.distanceTraveled;
    }

    resetDistanceTraveled() {
        this.distanceTraveled = 0;
    }

}
