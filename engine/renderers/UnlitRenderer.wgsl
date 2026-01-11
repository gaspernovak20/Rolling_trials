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
    emissive   : vec3<f32>,
    padding    : f32,
}

struct LightData {
    position  : vec4f,
    color     : vec4f,
    ambient   : vec4f,
    direction : vec4f,
    angles    : vec4f, // x = cos(inner), y = cos(outer)
}

struct LightsUniforms {
    count: u32,
    padding1: u32,
    padding2: u32,
    padding3: u32,
    lights: array<LightData, 17>,
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

    var color: vec3f = vec3f(0.15);

    for (var i: u32 = 0u; i < lightsData.count; i++) {
        let light = lightsData.lights[i];

        let lightDir = light.position.xyz - input.position;
        let distance = length(lightDir);
        let L = normalize(lightDir);
        
        let attenuation = 3.0 / (1.0 + 0.002 * distance);

        var spotFactor: f32 = 1.0;

        if (!(light.angles.x == 0.0 && light.angles.y == 0.0)) {
            let spotDir = normalize(light.direction.xyz);
            let cosTheta = dot(-L, spotDir);

            let inner = light.angles.x;
            let outer = light.angles.y;

            spotFactor = clamp(
                (cosTheta - outer) / (inner - outer),
                0.0,
                1.0
            );
            
        }

        // (Lambert)
        let diff = max(dot(N, L), 0.0);
        color += diff * light.color.xyz * attenuation * spotFactor;

        // (Blinn-Phong)
        let H = normalize(L + V);
        let spec = pow(max(dot(N, H), 0.0), 16.0);

        color += spec * light.color.xyz * attenuation * 0.2 * spotFactor;
    }

    let texColor = textureSample(baseTexture, baseSampler, input.texcoords);
    let baseColor = texColor * material.baseFactor;

    // lighting contribution
    let litColor = baseColor.rgb * color;

    // emissive contribution (NEODVISNO od luči)
    let emissiveColor = material.emissive;

    // končni color
    output.color = vec4f(litColor + emissiveColor, baseColor.a);

    return output;
}