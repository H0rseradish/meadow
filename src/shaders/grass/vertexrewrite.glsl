uniform float uTime;
uniform sampler2D uPerlinTexture;

varying float vElevation;
varying vec3 vPosition;

#include ../includes/simplexNoise2d.glsl

void main() {
    // will maybe make these into uniforms passed in... hence u:
    // a figure to apply the noise to:
    float uGrassElevation = 0.2;
    //ie the numbers of sine waves:
    float uGrassFrequency = 50.0;
    // float uGrassTipsOffset = 0.07;

    // Just doing this on the position will not work, it has to be the modelPosition but if I want the actual location of the grass component in world space to move or be animated then I need to not alter the w, and just swizzle the xyz from the modelPosition to work on:
    vec3 grassBladesModelPosition = (modelMatrix * vec4(position, 0.0)).xyz;

    //add noise to the elevation float:
    uGrassElevation += abs(simplexNoise2d(grassBladesModelPosition.xz) * 0.4);

    // Elevation: dont need the bottom of the sine wave so abs:
    //this also randomises where the tip of the grass blade lies so its not always a regularly triangular tip...:
    float elevation = abs(sin(grassBladesModelPosition.x * uGrassFrequency) * sin(grassBladesModelPosition.z * uGrassFrequency) * uGrassElevation);

    vec3 elevatedPosition = position;
    // this has to be the z not the y because WHY???? THINK!!!! its because it was swizzled but I have confused myself:
    elevatedPosition.z += elevation * uGrassElevation;


    // then apply the grassBlades to the modelMatrix:
    vec4 modelPosition = modelMatrix * vec4(elevatedPosition, 1.0);

    //Final position
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;

    gl_Position = projectedPosition;

    // Varyings
    vElevation = elevation;

    vPosition = gl_Position.xyz;
    vPosition.xz += uTime;


}