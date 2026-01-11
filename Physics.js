import { vec3, mat4, quat } from 'glm'; //quat (pitch/yaw/roll) za rotacijo okoli Y osi
import { getGlobalModelMatrix } from 'engine/core/SceneUtils.js';
import { Transform } from 'engine/core.js';

import { KeyOverlay } from '../../../keys.js'; //zaradi diamant counterja
import { AbilityManager } from '../../../AbilityManager.js'; //zaradi KeyOverlay



const collectSound = new Audio(new URL('../../../sounds/collect.mp3', import.meta.url)); //zvok za pobiranje diamantov
collectSound.volume = 0.8;

const pressButton = new Audio(new URL('../../../sounds/button-press.mp3', import.meta.url)); //ko skocimo na gumb
pressButton.volume = 0.8;

const abilityManager = new AbilityManager();



export class Physics {

    constructor(scene, playerNode) {
        this.scene = scene;
        this.movingPlatforms = ['Platform1', 'Platform2', 'Platform3'];
        this.spinningDiamads = ['Diamond1', 'Diamond2', 'Diamond3', 'Diamond4',
            'Diamond5', 'Diamond6', 'Diamond7', 'Diamond8',
            'Diamond9', 'Diamond10', 'Diamond11', 'Diamond12',
            'Diamond13', 'Diamond14'
        ];
        this.platformData = new Map();
        this.lastPlayerY = null; //zadnji Y zato da se ne teleporiramo na block
        this.platformTime = 0; //zato da se ne teleportirajo ko skocimo na gumb

        this.buttonStartY = null;   // začetna pozicija
        this.buttonMaxDrop = 0.8;   // koliko se lahko pogrezne
        this.buttonPressed = false;  // ali je trenutno spuščen
        this.playerOnButton = false;
        this.playerNode = playerNode


    }

    update(t, dt) {
        this.playerOnButton = false;

        this.updateMovingPlatforms(t, dt); //premikanje platform, diamanti se ne premikajo z njimi
        this.updateRotateDiamands(t, dt);




        this.scene.traverse(node => {
            if (node.isDynamic) {
                this.scene.traverse(other => {
                    if (node !== other && other.isStatic) {

                        this.resolveCollision(node, other);
                    }
                });
            }

            //nastavimo zadnji Y
            if (node.isDynamic) {
                const transform = node.getComponentOfType(Transform);
                if (transform) {
                    this.lastPlayerY = transform.translation[1];
                }
            }
        });

        this.handleButtonRelease();
    }

    updateRotateDiamands(time, dt) {
        const rotationSpeed = 1; // hitrost vrtenja (rad/s)

        this.scene.traverse(node => {
            if (!this.spinningDiamads.includes(node.name)) return;

            const transform = node.getComponentOfType(Transform);
            if (!transform) return;

            // če še nima rotacije, jo inicializiramo
            if (!transform.rotation) {
                transform.rotation = [0, 0, 0, 1];
            }

            // vrti okoli Y osi
            const q = transform.rotation;
            const delta = rotationSpeed * dt;

            // q = q * rotY
            const rotY = [0, Math.sin(delta / 2), 0, Math.cos(delta / 2)];
            quat.multiply(q, q, rotY);
        });
    }



    updateMovingPlatforms(time, dt) {
        if (this.buttonPressed) return;

        this.platformTime += dt; //da se ne teleportira ob pritisku gumba

        const minX = -53;
        const maxX = 92;
        const center = (minX + maxX) / 2;
        const amplitude = (maxX - minX) / 2;

        this.scene.traverse(node => {
            if (!this.movingPlatforms.includes(node.name)) return;

            const transform = node.getComponentOfType(Transform);
            if (!transform) return;

            if (!this.platformData.has(node)) {
                this.platformData.set(node, {
                    phase: Math.asin(
                        Math.max(-1, Math.min(1,
                            (transform.translation[0] - center) / amplitude
                        ))
                    ),
                    prevX: transform.translation[0]
                });
            }

            const data = this.platformData.get(node);
            const speed = 0.35;

            data.prevX = transform.translation[0];

            transform.translation[0] =
                center + Math.sin(this.platformTime * speed + data.phase) * amplitude;
        });
    }



    intervalIntersection(min1, max1, min2, max2) {
        return !(min1 > max2 || min2 > max1);
    }

    aabbIntersection(aabb1, aabb2) {
        return this.intervalIntersection(aabb1.min[0], aabb1.max[0], aabb2.min[0], aabb2.max[0])
            && this.intervalIntersection(aabb1.min[1], aabb1.max[1], aabb2.min[1], aabb2.max[1])
            && this.intervalIntersection(aabb1.min[2], aabb1.max[2], aabb2.min[2], aabb2.max[2]);
    }

    getTransformedAABB(node) {
        // Transform all vertices of the AABB from local to global space.
        const matrix = getGlobalModelMatrix(node);
        const { min, max } = node.aabb;
        const vertices = [
            [min[0], min[1], min[2]],
            [min[0], min[1], max[2]],
            [min[0], max[1], min[2]],
            [min[0], max[1], max[2]],
            [max[0], min[1], min[2]],
            [max[0], min[1], max[2]],
            [max[0], max[1], min[2]],
            [max[0], max[1], max[2]],
        ].map(v => vec3.transformMat4(v, v, matrix));

        // Find new min and max by component.
        const xs = vertices.map(v => v[0]);
        const ys = vertices.map(v => v[1]);
        const zs = vertices.map(v => v[2]);
        const newmin = [Math.min(...xs), Math.min(...ys), Math.min(...zs)];
        const newmax = [Math.max(...xs), Math.max(...ys), Math.max(...zs)];
        return { min: newmin, max: newmax };
    }

    handleButtonRelease() {
        if (this.playerOnButton) return;
        if (!this.buttonPressed) return;

        const button = this.scene.find(n => n.name === "Button.1");
        if (!button) return;

        const transform = button.getComponentOfType(Transform);
        if (!transform) return;

        const step = 0.05;
        transform.translation[1] += step;

        if (transform.translation[1] >= this.buttonStartY) {
            transform.translation[1] = this.buttonStartY;
            this.buttonPressed = false;
        }
    }

    restart() {
        const playerNode = this.playerNode;
        if (!playerNode) return;

        const transform = playerNode.getComponentOfType(Transform);
        if (!transform) return;

        transform.translation = [0, 0, -40];
    }

    resolveCollision(a, b) {
        // Get global space AABBs.
        const aBox = this.getTransformedAABB(a);
        const bBox = this.getTransformedAABB(b);

        // Check if there is collision.
        const isColliding = this.aabbIntersection(aBox, bBox);
        if (!isColliding) {
            return;
        }

        if (b.name === "Goal") {
            console.log("Win!");
        }

        if (b.name === "Cube.068" && a.name === "ball") {
            this.restart()
            console.log("GGs");
        }


        if (b.name === "Button.1") {
            this.playerOnButton = true;

            const transform = b.getComponentOfType(Transform);
            if (!transform) return;

            if (this.buttonStartY === null) {
                this.buttonStartY = transform.translation[1];
            }

            const targetY = this.buttonStartY - this.buttonMaxDrop;
            const step = 0.05;

            // če je že do konca pritisnjen
            if (this.buttonPressed) return;

            transform.translation[1] -= step;

            if (transform.translation[1] <= targetY) {
                transform.translation[1] = targetY;
                this.buttonPressed = true;

                pressButton.currentTime = 0;
                pressButton.play();
            }
        }



        if (this.spinningDiamads.includes(b.name)) {
            console.log("Diamant dotaknjen");

            const index = this.spinningDiamads.indexOf(b.name);
            if (index !== -1) this.spinningDiamads.splice(index, 1);
            const transform = b.getComponentOfType(Transform);
            if (transform) {
                transform.translation[1] = -100; //diamand v bistu potisnemo v tla da ni vec viden (v resni ne)
            }

            collectSound.currentTime = 0;
            collectSound.play();

            if (window.keyOverlay) window.keyOverlay.addDiamond();

        }


        //dodano da se zoga premika s plotformami
        const aTransform = a.getComponentOfType(Transform);
        const bTransform = b.getComponentOfType(Transform);
        if (!aTransform || !bTransform) return;


        if (this.movingPlatforms.includes(b.name)) {
            const data = this.platformData.get(b);

            if (data) {
                const deltaX = bTransform.translation[0] - data.prevX;

                // ali je player NA platformi (od zgoraj)
                const epsilon = 0.05;
                const onTop =
                    Math.abs(aBox.min[1] - bBox.max[1]) < epsilon;

                if (onTop) {
                    aTransform.translation[0] += deltaX;
                }
            }
        }


        // Move node A minimally to avoid collision.
        const diffa = vec3.sub(vec3.create(), bBox.max, aBox.min);
        const diffb = vec3.sub(vec3.create(), aBox.max, bBox.min);

        let minDiff = Infinity;
        let minDirection = [0, 0, 0];
        if (diffa[0] >= 0 && diffa[0] < minDiff) {
            minDiff = diffa[0];
            minDirection = [minDiff, 0, 0];
        }
        if (diffa[1] >= 0 && diffa[1] < minDiff) {
            minDiff = diffa[1];
            minDirection = [0, minDiff, 0];
        }
        if (diffa[2] >= 0 && diffa[2] < minDiff) {
            minDiff = diffa[2];
            minDirection = [0, 0, minDiff];
        }
        if (diffb[0] >= 0 && diffb[0] < minDiff) {
            minDiff = diffb[0];
            minDirection = [-minDiff, 0, 0];
        }
        if (diffb[1] >= 0 && diffb[1] < minDiff) { //popravi ko zadane strop
            minDiff = diffb[1];
            minDirection = [0, -minDiff, 0];

            a.hitCeiling = true;
        }
        if (diffb[2] >= 0 && diffb[2] < minDiff) {
            minDiff = diffb[2];
            minDirection = [0, 0, -minDiff];
        }

        const transform = a.getComponentOfType(Transform);
        if (!transform) {
            return;
        }

        vec3.add(transform.translation, transform.translation, minDirection);
    }

    xzIntersection(x, z, aabb) {
        return this.intervalIntersection(aabb.min[0], aabb.max[0], x, x)
            && this.intervalIntersection(aabb.min[2], aabb.max[2], z, z);
    }

    isPlayerAboveAABB(playerY, aabb) {
        return playerY >= aabb.max[1] - 0.01;
    }


    getGroundHeightAt(x, z) {
        let groundY = -Infinity;

        this.scene.traverse(node => {
            if (!node.isStatic) return;

            if (this.spinningDiamads.includes(node.name)) return; //ignoriramo diamante kot tla

            const nodeBox = this.getTransformedAABB(node);

            // more bitit horizontalno pod zogo
            if (!this.xzIntersection(x, z, nodeBox)) return;

            // samo ce je pod zogo
            if (nodeBox.max[1] <= this.lastPlayerY + 0.05) {
                groundY = Math.max(groundY, nodeBox.max[1]);
            }
        });

        return groundY === -Infinity ? null : groundY;
    }


}
