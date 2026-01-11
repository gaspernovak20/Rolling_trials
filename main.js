import { Camera, Light, Node, Model, Transform } from 'engine/core.js';
import { GLTFLoader } from 'engine/loaders/GLTFLoader.js';
import { ResizeSystem } from 'engine/systems/ResizeSystem.js';
import { UpdateSystem } from 'engine/systems/UpdateSystem.js';
import { UnlitRenderer } from 'engine/renderers/UnlitRenderer.js';
import { TouchController } from 'engine/controllers/TouchController.js';
import { FirstPersonController } from 'engine/controllers/FirstPersonController.js';
import { ThirdPersonController } from 'engine/controllers/ThirdPersonController.js';
import { Physics } from '/Physics.js';
import {
    calculateAxisAlignedBoundingBox,
    mergeAxisAlignedBoundingBoxes,
} from 'engine/core/MeshUtils.js';
import { Primitive } from './engine/core.js';

import { KeyOverlay } from './keys.js';
import { AbilityManager } from './AbilityManager.js';


const canvas = document.querySelector('canvas');
const renderer = new UnlitRenderer(canvas);
await renderer.initialize();

const gltfLoader = new GLTFLoader();
await gltfLoader.load(new URL('./level4/level4.gltf', import.meta.url));
// await gltfLoader.load(new URL('./models/scene/scene.gltf', import.meta.url));

const abilityManager = new AbilityManager();
window.keyOverlay = new KeyOverlay(document.body, abilityManager);

const scene = gltfLoader.loadScene(gltfLoader.defaultScene);
if (!scene) {
    throw new Error('A default scene is required to run this example');
}

const camera = gltfLoader.loadNode('Camera');

if (camera) {
    camera.addComponent(new FirstPersonController(camera, canvas));
    camera.isDynamic = true;
    camera.aabb = {
        min: [-0.3, -0.3, -0.3],
        max: [0.3, 0.3, 0.3],
    };
} {
    // Ustvari ročno kamero
    const cameraNode = new Node();
    scene.addChild(cameraNode);
    cameraNode.addComponent(new Camera({
        fov: Math.PI / 4, // kot pogleda
        near: 0.1,
        far: 1000,
    }));

    const camera = cameraNode;
}

const playerLoader = new GLTFLoader();
await playerLoader.load(new URL('./models/soccer_ball/scene.gltf', import.meta.url));

const playerNode = playerLoader.loadNode('defaultMaterial');
playerNode.isDynamic = true;

playerNode.addComponent(new Transform({
    translation: [0, 0, 0],
    scale: [2, 2, 2],
}))

const physics = new Physics(scene, playerNode);

playerNode.addComponent(new ThirdPersonController(playerNode, camera, canvas, physics, 3, abilityManager));
scene.addChild(playerNode);

scene.traverse(node => {
    if (node.getComponentOfType(Model) && !node.isDynamic) {
        node.isStatic = true;
    }
});

camera.isDynamic = true;

const diamonds = ['Diamond1', 'Diamond2', 'Diamond3', 'Diamond4',
    'Diamond5', 'Diamond6', 'Diamond7', 'Diamond8',
    'Diamond9', 'Diamond10', 'Diamond11', 'Diamond12',
    'Diamond13', 'Diamond14'
];

diamonds.forEach(diamond => {

    const diamondNode = gltfLoader.loadNode(diamond);

    diamondNode.getComponentOfType(Model).primitives.forEach(p => {
        p.material.emissiveFactor = [0.3, 0.8, 1.2]; // modrikast glow
    });

    diamondNode.addComponent(new Light({
        color: [0.2, 0.2, 2.0],
        ambient: [1.0, 1.0, 1.0],
        direction: [0, 0, 0],
        innerAngle: 0,
        outerAngle: 0,
    }));

});

const light = new Node();
scene.addChild(light);
light.addComponent(new Transform({
    translation: [9.990065574645996, 252.85763549804688, -175.3096466064453],
}));
light.addComponent(new Light({
    ambient: [0.8, 0.8, 0.8],
    color: [0.3, 0.3, 0.3],
    direction: [0, -1, 0],          // NAVZDOL
    innerAngle: Math.PI / 2,        // ~30°
    outerAngle: Math.PI / 2,
}));

const light2 = new Node();
scene.addChild(light2);
light2.addComponent(new Transform({
    translation: [9.901371955871582, 252.85763549804688, -499.8734436035156],
}));
light2.addComponent(new Light({
    ambient: [0.8, 0.8, 0.8],
    color: [0.3, 0.3, 0.3],
    direction: [0, -1, 0],          // NAVZDOL
    innerAngle: Math.PI / 4,        // ~30°
    outerAngle: Math.PI / 4,
}));

const light3 = new Node();
scene.addChild(light3);
light3.addComponent(new Transform({
    translation: [2.3474042415618896, 252.85763549804688, -900.2090454101562],
}));
light3.addComponent(new Light({
    ambient: [0.8, 0.8, 0.8],
    color: [0.3, 0.3, 0.3],
    direction: [0, -1, 0],          // NAVZDOL
    innerAngle: Math.PI / 4,        // ~30°
    outerAngle: Math.PI / 4,
}));

const ignoreNodes = ['Cube.059', 'Cube.060', 'Cube.061', 'Cube.062', 'Cube.063', 'Cube.079', 'Cube.0.80', 'Cube.078', 'Cube.077']; //popravljeno igrnorira piramide


// Generate aabb box for all nodes
scene.traverse(node => {
    const model = node.getComponentOfType(Model);
    if (ignoreNodes.includes(node.name)) {
        node.isStatic = false;
    }

    if (!model) {
        return;
    }

    const boxes = model.primitives.map(primitive => calculateAxisAlignedBoundingBox(primitive.mesh));
    node.aabb = mergeAxisAlignedBoundingBoxes(boxes);
});

const { min, max } = physics.getTransformedAABB(playerNode);
const radius = (max[1] - min[1]) / 2;
playerNode.radius = radius;

function update(time, dt) {
    scene.traverse(node => {
        for (const component of node.components) {
            component.update?.(time, dt);
        }
    });
    physics.update(time, dt);
}

function render() {
    renderer.render(scene, camera);
}

function resize({ displaySize: { width, height } }) {
    camera.getComponentOfType(Camera).aspect = width / height;
}

new ResizeSystem({ canvas, resize }).start();
new UpdateSystem({ update, render }).start();

