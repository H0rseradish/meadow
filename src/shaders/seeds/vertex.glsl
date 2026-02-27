uniform float uTime;
uniform float uProgress;
uniform vec2 uResolution;
uniform sampler2D uSeedParticlesTexture;

attribute vec2 aSeedParticlesUv;
attribute float aRandom;

varying vec2 vUv;


void main()
{
    vec4 seedParticle = texture(uSeedParticlesTexture, aSeedParticlesUv);

    seedParticle.xyz += aRandom * 0.9;
    //this is a wrong approach, BUT it revealed the indexing issue!.... there can be 6 particles at each position (vertex)!!!! see Brunos particles morphing lesson to solve

    //use our new seedParticle instead of the standard position
    vec4 modelPosition = modelMatrix * vec4(seedParticle.xyz, 1.0);

    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;


    // Final position:
    gl_Position = vec4(projectedPosition);

    //WHY did I multiply by 0.24 ??? its a mystery and I cant remenmber
    gl_PointSize = 0.5;

    // perspective and size attenuation:
    gl_PointSize *= uResolution.y;
    gl_PointSize *= 1.0 / - viewPosition.z;

    //Varyings
    vUv = uv;
}