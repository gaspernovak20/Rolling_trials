struct VertexInput {
    @location(0) position: vec3f,
    @location(1) texcoords: vec2f,
    @location(2) normal: vec3f,
}

struct VertexOutput {
    @builtin(position) clipPosition: vec4f,
    @location(0) position: vec3f,
    @location(1) texcoords: vec2f,
    @location(2) normal: vec3f,
}

struct FragmentInput {
    @location(0) position: vec3f,
    @location(1) texcoords: vec2f,
    @location(2) normal: vec3f,
}

struct FragmentOutput {
    @location(0) color: vec4f,
}

struct CameraUniforms {
    viewMatrix: mat4x4f,
    projectionMatrix: mat4x4f,
    position: vec3f,
}

struct ModelUniforms {
    modelMatrix: mat4x4f,
    normalMatrix: mat4x4f,
}

struct MaterialUniforms {
    baseFactor: vec4f,
}

struct LightData {
    position: vec4f,
    color: vec4f,
    ambient: vec4f,
}

struct LightsUniforms {
    count: u32,
    padding1: u32,
    padding2: u32,
    padding3: u32,
    lights: array<LightData, 3>,
}

@group(0) @binding(0) var<uniform> camera: CameraUniforms;

@group(1) @binding(0) var<uniform> model: ModelUniforms;

@group(2) @binding(0) var<uniform> material: MaterialUniforms;
@group(2) @binding(1) var baseTexture: texture_2d<f32>;
@group(2) @binding(2) var baseSampler: sampler;

@group(3) @binding(0) var<uniform> lightsData: LightsUniforms;

@vertex
fn vertex(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;

    output.clipPosition = camera.projectionMatrix * camera.viewMatrix * model.modelMatrix * vec4(input.position, 1);
    output.position = (model.modelMatrix * vec4(input.position, 1)).xyz;
    output.texcoords = input.texcoords;
    output.normal = (model.normalMatrix * vec4(input.normal, 0.0)).xyz;

    return output;
}

@fragment
fn fragment(input: FragmentInput) -> FragmentOutput {
    var output: FragmentOutput;

    let N = normalize(input.normal);
    let V = normalize(camera.position - input.position);

    var color: vec3f = vec3f(0.0, 0.0, 0.0);

    // Add ambient from first light only (to avoid over-brightening)
    if (lightsData.count > 0u) {
        color = color + lightsData.lights[0].ambient.xyz * 0.3; // Reduced ambient contribution
    }

    // Loop through all active lights for diffuse and specular
    for (var i: u32 = 0u; i < lightsData.count; i++) {
        let light = lightsData.lights[i];

        // Calculate distance and attenuation
        let lightDir = light.position.xyz - input.position;
        let distance = length(lightDir);
        let L = normalize(lightDir);
        
        // Very weak attenuation for distant ceiling lights
        // Increased light intensity with a multiplier
        let attenuation = 1.3 / (1.0 + 0.0005 * distance + 0.00001 * distance * distance);

        // Diffuse (Lambert)
        let diff = max(dot(N, L), 0.0);
        color = color + diff * light.color.xyz * attenuation;

        // Specular (Blinn-Phong) - reduced for less shiny surfaces
        let H = normalize(L + V);
        let spec = pow(max(dot(N, H), 0.0), 16.0);
        color = color + spec * light.color.xyz * attenuation * 0.2;
    }

    // Sample texture
    let texColor = textureSample(baseTexture, baseSampler, input.texcoords);
    let baseColor = texColor * material.baseFactor;

    output.color = vec4f(baseColor.rgb * color, 1.0);

    return output;
}