uniform float uTime;
uniform sampler2D uPerlinTexture;

varying float vElevation;
varying vec3 vPosition;

#include ../includes/simplexNoise2d.glsl

void main()
{
    // will make these into uniforms passed in...
    float uGrassElevation = 0.9;
    float uGrassFrequency = 50.0;
    float uGrassTipsOffset = 0.07;

    vec4 modelPosition = modelMatrix * vec4(position, 1.0);


    // Elevation
    
    // what about picking from a random texture instead of this function? This only happens once though so...
    uGrassElevation += abs(simplexNoise2d(modelPosition.xz) * 0.65)  ;
    //need to randomise the frequency too?

    // Elevation: dont need the bottom of the sine wave so...
    float elevation = abs(sin(modelPosition.x * uGrassFrequency) * sin(modelPosition.z * uGrassFrequency) * uGrassElevation);

    modelPosition.y += elevation * uGrassElevation;


    //Grasstips offsets:

    // * uTime for this takes it sideways...
    // need to randomise the uTime multiplier!!! 
    // and also maybe a random amount to move by??
    float grassTipsOffset = abs(simplexNoise2d(- modelPosition.xz)) * uGrassTipsOffset * abs(sin(uTime * 0.5));;
    // wait rotate you fool!!!!! around z? then wont need to go up and down (y) as well as sideways here!!!

    // grassTipsOffset = - normalize(grassTipsOffset) * 1.0 - abs(sin(uTime * 0.5));

    modelPosition.x += grassTipsOffset;

    modelPosition.x = mix(modelPosition.z * 0.09, grassTipsOffset, 1.0 - elevation) + modelPosition.x;

    // modelPosition.z = mix(modelPosition.x * 0.05, grassTipsOffset, 1.0 - elevation) + modelPosition.z;

    modelPosition.y *= 0.2 *  - abs(sin(uTime * 0.05)) + max(abs(sin(modelPosition.y)), modelPosition.y - 1.0 );



    //Final position
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;

    gl_Position = projectedPosition;



    // Varyings
    vElevation = elevation;

    vPosition = gl_Position.xyz;
    vPosition.xz += uTime;

}