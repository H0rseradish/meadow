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

    // needed ythis in order to able to transfer to spatialstrates which works on a different scale - the simplex noise ids very sensitive to frteqiuency so for my smuch smaller geometry of 0.1 instead of 0.75, I needed to multiply by 7.5 in spatialstrates to get the same movement effect:
    vec3 normalizedPos = particle.xyz * 2.0 - 1.0;
    // noise frequency is correct for this r3f version so 1.0 here preserves the value!!
    float frequency = 1.0;
    vec3 pos = normalizedPos * frequency;


    if (uProgress == 1.0) {

        // 'Dead'
        if (particle.a >= 8.0) {
        // is this nasty and hacky? they still exist..
        particle.xyz = vec3(9999.9);

        }
        else {
            // To avoid the repetition of the flow field we need to change the value through time

            // Flow field
            vec3 flowField = vec3(
                // but simplex4d requires a vec4 
                //they have to be offset otherwise they are all diagonal: can control direction by adding on something:
                simplexNoise4d(vec4(pos + 0.0, time)) + 0.2,
                simplexNoise4d(vec4(pos + 1.0, time)) + 0.1,
                simplexNoise4d(vec4(pos + 2.0, time)) - 0.2
            );

            flowField = normalize(flowField);

            // not quite right - it pauses but it is better 
            particle.xyz += (smoothstep(0.0, 0.5, flowField * 0.05));
            // this feels very linear on its own but adding it in again prevents the pausing from the smoothstep
            particle.xyz += flowField * 0.005;


            // for Decay
            particle.a += 0.01;     
        }
    }
    

    gl_FragColor = particle;

    #include <colorspace_fragment>
}