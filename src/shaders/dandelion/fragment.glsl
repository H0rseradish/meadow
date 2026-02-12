uniform vec3 uColor;
// this is the uv for the entire thing - do I need it? No?
varying vec2 vUv;

#define PI 3.14159

void main() 
{
    // Fuzzy Disc:
    // PointCoord gets the point uvs:
    float strength = distance(gl_PointCoord, vec2(0.5));
    strength = smoothstep(0.8, 0.1, strength);
    // strength = 1.0 - strength;

    vec2 pointUv = gl_PointCoord;


    float angle = atan(pointUv.x - 0.5, pointUv.y - 0.5);
    
    angle /= PI * 2.0;
    angle += 0.5;
    //number of seedhead rays:
    angle *= 20.0;
    angle = mod(angle, 1.0);
    

    strength *= angle;
    float alpha = strength - 0.4;

    vec3 color = uColor * strength;

    

    // Final color:
    gl_FragColor = vec4(color, alpha);

    #include <colorspace_fragment>


    // gl_FragColor = vec4(gl_PointCoord,1.0, 1.0);
}