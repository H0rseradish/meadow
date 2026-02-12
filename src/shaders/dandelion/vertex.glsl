varying vec2 vUv;

void main()
{
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);


    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;

    // Final position:
    gl_Position = vec4(projectedPosition);

    gl_PointSize = 200.0;

    // size attenuation:
    gl_PointSize *= 1.0 / - viewPosition.z;

    //Varyings
    vUv = uv;
}