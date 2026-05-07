uniform vec3 uGrassDepthsColor;
uniform vec3 uGrassTipsColor;

varying float vElevation;

void main()
{
    
    vec3 color = mix(uGrassDepthsColor, uGrassTipsColor, vElevation * 0.8);

    // Final color
    gl_FragColor = vec4(color, 1.0);

    //manage color & tonemapping, in case I use tonemapping...
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}