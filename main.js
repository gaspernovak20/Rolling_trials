import { Camera, Light, Node, Model, Transform } from 'engine/core.js';
import { GLTFLoader } from 'engine/loaders/GLTFLoader.js';
import { ResizeSystem } from 'engine/systems/ResizeSystem.js';
import { UpdateSystem } from 'engine/systems/UpdateSystem.js';
import { UnlitRenderer } from 'engine/renderers/UnlitRenderer.js';
import { TouchController } from 'engine/controllers/TouchController.js';
import { FirstPersonController } from 'engine/controllers/FirstPersonController.js';
import { ThirdPersonController } from 'engine/controllers/ThirdPersonController.js';
import { Physics } from './examples/05-collision/01-aabb-aabb/Physics.js';
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
const keyOverlay = new KeyOverlay(document.body, abilityManager);

const scene = gltfLoader.loadScene(gltfLoader.defaultScene);
if (!scene) {
    throw new Error('A default scene is required to run this example');
}

const physics = new Physics(scene);

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

playerNode.addComponent(new ThirdPersonController(playerNode, camera, canvas, physics, 3, abilityManager));
scene.addChild(playerNode);



scene.traverse(node => {
    if (node.getComponentOfType(Model) && !node.isDynamic) {
        node.isStatic = true;
    }
});



camera.isDynamic = true;

const light = new Node();
scene.addChild(light);
light.addComponent(new Transform({
    translation: [0, 5, 5],
}));
light.addComponent(new Light({
    ambient: [0.3, 0.3, 0.3],
}));




const ignoreNodes = ['Cube.059', 'Cube.060', 'Cube.061', 'Cube.062', 'Cube.063', 'Cube.079', 'Cube.0.80', 'Cube.078', 'Cube.077', 'Cube.076']; //popravljeno igrnorira piramide


// Generate aabb box for all nodes
scene.traverse(node => {
    const model = node.getComponentOfType(Model);
    if(ignoreNodes.includes(node.name)){
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
console.log(playerNode.radius);

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

