uniform float uTime;
uniform float uProgress;
varying vec2 vUv;

void main()
{
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);


    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;

    // Animate seedheads
    if(uProgress == 1.0) 
    // (using the uniform value (YES THISSSS!!), or would it just be a boolean as a condition??)
    //if use uProgress can be given a value, 0 or 1, and just added in - if its 0 it doesn't happen... this must be why never see Bruno using bool types? wait if it is 
    projectedPosition.x += uTime * 0.5;
    // uTime will needs to be randomised then smoothstepped, positions also ...
    //.... but the movement for each particle will continue in that direction... bso.. will randomised be adequately realistic?  To change the direction not just per particle, BUT ALSO through time I will need to use flow field gpgpu technique?


    // Final position:
    gl_Position = vec4(projectedPosition);

    gl_PointSize = 200.0;

    // size attenuation:
    gl_PointSize *= 1.0 / - viewPosition.z;

    //Varyings
    vUv = uv;
}