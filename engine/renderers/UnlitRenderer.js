import { mat4, vec3 } from 'glm';

import * as WebGPU from '../WebGPU.js';

import { Camera, Light, Model } from '../core.js';

import {
    getLocalModelMatrix,
    getGlobalViewMatrix,
    getProjectionMatrix,
    getGlobalModelMatrix,
} from '../core/SceneUtils.js';

import { BaseRenderer } from './BaseRenderer.js';

const vertexBufferLayout = {
    arrayStride: 36,
    attributes: [
        {
            name: 'position',
            shaderLocation: 0,
            offset: 0,
            format: 'float32x3',
        },
        {
            name: 'texcoords',
            shaderLocation: 1,
            offset: 12,
            format: 'float32x2',
        },
        {
            name: 'normal',
            shaderLocation: 2,
            offset: 20,
            format: 'float32x3'
        }
    ],
};

export class UnlitRenderer extends BaseRenderer {

    constructor(canvas) {
        super(canvas);
        this.maxLights = 17; // Maximum number of lights supported
        this.lightsBufferCache = null; // Cache for lights buffer instead of using gpuObjects
    }

    async initialize() {
        await super.initialize();

        const code = await fetch(new URL('UnlitRenderer.wgsl', import.meta.url))
            .then(response => response.text());
        const module = this.device.createShaderModule({ code });

        this.pipeline = await this.device.createRenderPipelineAsync({
            layout: 'auto',
            vertex: {
                module,
                buffers: [vertexBufferLayout],
            },
            fragment: {
                module,
                targets: [{ format: this.format }],
            },
            depthStencil: {
                format: 'depth24plus',
                depthWriteEnabled: true,
                depthCompare: 'less',
            },
        });

        this.recreateDepthTexture();
    }

    recreateDepthTexture() {
        this.depthTexture?.destroy();
        this.depthTexture = this.device.createTexture({
            format: 'depth24plus',
            size: [this.canvas.width, this.canvas.height],
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
        });
    }

    prepareNode(node) {
        if (this.gpuObjects.has(node)) {
            return this.gpuObjects.get(node);
        }

        const modelUniformBuffer = this.device.createBuffer({
            size: 128,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        const modelBindGroup = this.device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(1),
            entries: [
                { binding: 0, resource: { buffer: modelUniformBuffer } },
            ],
        });

        const gpuObjects = { modelUniformBuffer, modelBindGroup };
        this.gpuObjects.set(node, gpuObjects);
        return gpuObjects;
    }

    prepareCamera(camera) {
        if (this.gpuObjects.has(camera)) {
            return this.gpuObjects.get(camera);
        }

        const cameraUniformBuffer = this.device.createBuffer({
            size: 144, // 128 for matrices + 16 for position (vec3 + padding)
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        const cameraBindGroup = this.device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: cameraUniformBuffer } },
            ],
        });

        const gpuObjects = { cameraUniformBuffer, cameraBindGroup };
        this.gpuObjects.set(camera, gpuObjects);
        return gpuObjects;
    }

    prepareTexture(texture) {
        if (this.gpuObjects.has(texture)) {
            return this.gpuObjects.get(texture);
        }

        const { gpuTexture } = this.prepareImage(texture.image);
        const { gpuSampler } = this.prepareSampler(texture.sampler);

        const gpuObjects = { gpuTexture, gpuSampler };
        this.gpuObjects.set(texture, gpuObjects);
        return gpuObjects;
    }

    prepareMaterial(material) {
        if (!material) {
            material = this.getDefaultMaterial();
        }

        if (this.gpuObjects.has(material)) {
            return this.gpuObjects.get(material);
        }

        let textureView, sampler;

        if (material.baseTexture) {
            const tex = this.prepareTexture(material.baseTexture);
            textureView = tex.gpuTexture.createView();
            sampler = tex.gpuSampler;
        } else {
            const dummy = this.createDummyTexture();
            textureView = dummy.texture.createView();
            sampler = dummy.sampler;
        }

        const materialUniformBuffer = this.device.createBuffer({
            size: 32,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        const baseFactor = material.baseFactor ?? [1, 1, 1, 1];
        const emissive = material.emissiveFactor ?? [0, 0, 0];

        this.device.queue.writeBuffer(
            materialUniformBuffer,
            0,
            new Float32Array(baseFactor)
        );

        this.device.queue.writeBuffer(
            materialUniformBuffer,
            16,
            new Float32Array([...emissive, 0])
        );

        const materialBindGroup = this.device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(2),
            entries: [
                { binding: 0, resource: { buffer: materialUniformBuffer } },
                { binding: 1, resource: textureView },
                { binding: 2, resource: sampler },
            ],
        });

        const gpuObjects = { materialUniformBuffer, materialBindGroup };
        this.gpuObjects.set(material, gpuObjects);
        return gpuObjects;
    }

    createDummyTexture() {
        const texture = this.device.createTexture({
            size: [1, 1, 1],
            format: "rgba8unorm",
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
        });

        const whitePixel = new Uint8Array([255, 255, 255, 255]);
        this.device.queue.writeTexture(
            { texture },
            whitePixel,
            { bytesPerRow: 4 },
            { width: 1, height: 1, depthOrArrayLayers: 1 }
        );

        const sampler = this.device.createSampler({});
        return { texture, sampler };
    }

    prepareLights() {
        if (this.lightsBufferCache) {
            return this.lightsBufferCache;
        }

        const floatsPerLight = 20;
        const headerFloats = 4;

        const totalFloats = headerFloats + this.maxLights * floatsPerLight;
        const totalBytes = totalFloats * 4;

        // obvezno poravnaj na 16 B
        const alignedSize = Math.ceil(totalBytes / 16) * 16;

        // 16 bytes header + 3 lights * 80 bytes (5 * vec4f)
        const lightsUniformBuffer = this.device.createBuffer({
            size: alignedSize,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        const lightsBindGroup = this.device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(3),
            entries: [
                { binding: 0, resource: { buffer: lightsUniformBuffer } },
            ],
        });

        const gpuObjects = { lightsUniformBuffer, lightsBindGroup };
        this.lightsBufferCache = gpuObjects;
        return gpuObjects;
    }

    render(scene, camera) {
        if (this.depthTexture.width !== this.canvas.width || this.depthTexture.height !== this.canvas.height) {
            this.recreateDepthTexture();
        }

        const encoder = this.device.createCommandEncoder();
        this.renderPass = encoder.beginRenderPass({
            colorAttachments: [
                {
                    view: this.context.getCurrentTexture().createView(),
                    clearValue: [1, 1, 1, 1],
                    loadOp: 'clear',
                    storeOp: 'store',
                },
            ],
            depthStencilAttachment: {
                view: this.depthTexture.createView(),
                depthClearValue: 1,
                depthLoadOp: 'clear',
                depthStoreOp: 'discard',
            },
        });
        this.renderPass.setPipeline(this.pipeline);

        const cameraComponent = camera.getComponentOfType(Camera);
        const viewMatrix = getGlobalViewMatrix(camera);
        const projectionMatrix = getProjectionMatrix(camera);
        const cameraPosition = mat4.getTranslation(vec3.create(), getGlobalModelMatrix(camera));
        const { cameraUniformBuffer, cameraBindGroup } = this.prepareCamera(cameraComponent);
        this.device.queue.writeBuffer(cameraUniformBuffer, 0, viewMatrix);
        this.device.queue.writeBuffer(cameraUniformBuffer, 64, projectionMatrix);
        this.device.queue.writeBuffer(cameraUniformBuffer, 128, cameraPosition);
        this.renderPass.setBindGroup(0, cameraBindGroup);

        // Gather all lights in the scene
        const lightNodes = [];
        scene.traverse(node => {
            if (node.getComponentOfType(Light)) {
                lightNodes.push(node);
            }
        });

        // Prepare lights buffer
        const { lightsUniformBuffer, lightsBindGroup } = this.prepareLights();

        const numLights = Math.min(lightNodes.length, this.maxLights);

        // Create buffer: 4 u32s (16 bytes) + 3 lights * 3 vec4f (144 bytes) = 160 bytes total
        const lightsData = new Float32Array(4 + this.maxLights * 20);

        const countView = new Uint32Array(lightsData.buffer, 0, 1);
        countView[0] = numLights;

        for (let i = 0; i < numLights; i++) {
            const lightNode = lightNodes[i];
            const lightComponent = lightNode.getComponentOfType(Light);
            const lightPosition = mat4.getTranslation(vec3.create(), getGlobalModelMatrix(lightNode));

            const baseIndex = 4 + (i * 20);

            // position
            lightsData[baseIndex + 0] = lightPosition[0];
            lightsData[baseIndex + 1] = lightPosition[1];
            lightsData[baseIndex + 2] = lightPosition[2];
            lightsData[baseIndex + 3] = 0;

            // color
            lightsData[baseIndex + 4] = lightComponent.color[0];
            lightsData[baseIndex + 5] = lightComponent.color[1];
            lightsData[baseIndex + 6] = lightComponent.color[2];
            lightsData[baseIndex + 7] = 0;

            // ambient
            lightsData[baseIndex + 8] = lightComponent.ambient[0];
            lightsData[baseIndex + 9] = lightComponent.ambient[1];
            lightsData[baseIndex + 10] = lightComponent.ambient[2];
            lightsData[baseIndex + 11] = 0;


            // direction
            lightsData[baseIndex + 12] = lightComponent.direction[0];
            lightsData[baseIndex + 13] = lightComponent.direction[1];
            lightsData[baseIndex + 14] = lightComponent.direction[2];
            lightsData[baseIndex + 15] = 0;

            // angles (cosines)
            lightsData[baseIndex + 16] = Math.cos(lightComponent.innerAngle);
            lightsData[baseIndex + 17] = Math.cos(lightComponent.outerAngle);
            lightsData[baseIndex + 18] = 0;
            lightsData[baseIndex + 19] = 0;
        }


        this.device.queue.writeBuffer(lightsUniformBuffer, 0, lightsData);
        this.renderPass.setBindGroup(3, lightsBindGroup);

        this.renderNode(scene);

        this.renderPass.end();
        this.device.queue.submit([encoder.finish()]);
    }

    renderNode(node, modelMatrix = mat4.create()) {
        const localMatrix = getLocalModelMatrix(node);
        modelMatrix = mat4.multiply(mat4.create(), modelMatrix, localMatrix);
        const normalMatrix = mat4.normalFromMat4(mat4.create(), modelMatrix);

        const { modelUniformBuffer, modelBindGroup } = this.prepareNode(node);
        this.device.queue.writeBuffer(modelUniformBuffer, 0, modelMatrix);
        this.device.queue.writeBuffer(modelUniformBuffer, 64, normalMatrix);
        this.renderPass.setBindGroup(1, modelBindGroup);

        for (const model of node.getComponentsOfType(Model)) {
            this.renderModel(model);
        }

        for (const child of node.children) {
            this.renderNode(child, modelMatrix);
        }
    }

    renderModel(model) {
        for (const primitive of model.primitives) {
            this.renderPrimitive(primitive);
        }
    }

    renderPrimitive(primitive) {
        const material = primitive.material ?? this.getDefaultMaterial();
        const { materialUniformBuffer, materialBindGroup } = this.prepareMaterial(material);
        this.renderPass.setBindGroup(2, materialBindGroup);

        const { vertexBuffer, indexBuffer } = this.prepareMesh(primitive.mesh, vertexBufferLayout);
        this.renderPass.setVertexBuffer(0, vertexBuffer);
        this.renderPass.setIndexBuffer(indexBuffer, 'uint32');

        this.renderPass.drawIndexed(primitive.mesh.indices.length);
    }

    getDefaultMaterial() {
        if (!this._defaultMaterial) {
            this._defaultMaterial = {
                baseFactor: [1, 1, 1, 1],
                baseTexture: null,
            };
        }
        return this._defaultMaterial;
    }
}