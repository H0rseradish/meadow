#include ../includes/simplexNoise4d.glsl

void main()
{
    vec2 uv = gl_FragCoord.xy / resolution.xy;

    vec4 particle = texture(uSeedParticles, uv);
    // particle.x += 0.001;



    gl_FragColor = particle;

    #include <colorspace_fragment>
}