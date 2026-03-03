uniform float uTime;
uniform float uProgress;

#include ../includes/simplexNoise4d.glsl

void main()
{
    //ok it appears this is getting zero...
    float time = uTime;
    vec2 uv = gl_FragCoord.xy / resolution.xy;

    vec4 particle = texture(uSeedParticles, uv);
    // particle.x += 0.01;

    if (uProgress == 1.0) {

        // 'Dead'
        if (particle.a >= 8.0) {
        // but theses still exist?
        particle.xyz = vec3(0.0);

        }
        else {
            // To avoid the repetition of the flow field we need to change the value through time

            // Flow field
            vec3 flowField = vec3(
                // but simplex4d requires a vec4 
                //they have to be offset otherwise they are all diagonal: can control direction by adding on something:
                simplexNoise4d(vec4(particle.xyz + 0.0, time)) + 0.2,
                simplexNoise4d(vec4(particle.xyz + 1.0, time)) + 0.1,
                simplexNoise4d(vec4(particle.xyz + 2.0, time)) - 0.2
            );

            flowField = normalize(flowField);

            // not quite right - it pauses but it is better 
            particle.xyz += smoothstep(0.0, 0.5, flowField * 0.05);
            // this feels very linear on its own but adding it again prevents the pausing from the smoothstep
            particle.xyz += flowField * 0.02;


            // for Decay
            particle.a += 0.01;     
        }
    }
    

    gl_FragColor = particle;

    #include <colorspace_fragment>
}