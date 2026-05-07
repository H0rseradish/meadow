// WORKING SPATIALSTRATES VARIANT!!!


import React from 'react';
const { useMemo, useEffect, useRef } = React;
import { ErrorBoundary } from 'react-error-boundary';
import { Color, IcosahedronGeometry, BufferGeometry, BufferAttribute, DoubleSide, MeshStandardMaterial, ShaderMaterial } from 'three';
import { extend, useThree, useFrame } from '@react-three/fiber';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { shaderMaterial } from '@react-three/drei';
// note new path to import this:
import { GPUComputationRenderer } from 'three/addons/misc/GPUComputationRenderer.js';
import { useProperty } from '#VarvReact';
import { Movable } from '#Spatialstrates .movable';

import { vertexShader, fragmentShader } from '#DandelionShaders';
import { particlesShader } from '#ParticlesShader';


// const material = new MeshStandardMaterial({ color: 'hsl(0, 95%, 30%)'});
// const geometry = new IcosahedronGeometry(0.1, 0);

// Three ShaderMaterial as an alternative:
// const grassShaderMaterial = new ShaderMaterial( {
//     vertexShader,
//     fragmentShader
// })
// console.log(grassShaderMaterial)

const DandelionSeedMaterial = new shaderMaterial(
    {
        uColor: new Color('#eafdce'),
        // uTime: 0,
        uResolution: { value: null },
        uSeedParticlesTexture:{ value: null },
        // value to pass to shader on click:
        uProgress: 0,
        transparent: true,
        depthWrite: false,
        side: DoubleSide
    },
    vertexShader,
    fragmentShader
);
// make the class with extend:
extend({ DandelionSeedMaterial });


function Dandelion() {

    /**
     * Setup
     */
    const gpgpuRef = useRef();

    /**
     * Base geometry
     */
    const baseGeometry = useMemo(() => 
    {
        // Make an instance of a geometry from which can obtain the vertices:
        const instance = new IcosahedronGeometry(0.1, 3);
        // Use mergeVertices to get rid of multiples of vertices coordinates at positions:
        const mergedInstance = mergeVertices(instance);
        const count = mergedInstance.attributes.position.count;

        //so baseGeometry returns the count of the vertices and their positions:
        return { count, mergedInstance }
    });
    /**
     * GPGPU Computation
     */
    // Tidied into an object:
    const gpgpu = {};
    // First set up what size of ping-pong buffer ('Frame Buffer Object') is needed (- depends on the baseGeometry). FBO will be a square 2D texture. Square makes calculations easier. Round it up - empy pixels dont matter.
    gpgpu.fBOSize = useMemo(() => 
        Math.ceil(Math.sqrt(baseGeometry.count)), [baseGeometry.count]
    );
    console.log(gpgpu.fBOSize)

    // Ok for the next step I am going to need the renderer - there should only be one renderer per page (per canvas)  but I dont know how spatialstrates deals with this.
    // ok this gets the correct window sizes object with width, height, top and left. It also gets a renderer but, but... is it the only renderer??? 
    const { gl, size } = useThree()
    console.log(size)
    // ok  when I add other components to the scene, eg stickynote, the number of triangles logged here increases so I am inferring that there are NOT multiple canvas roots/renderers:
    // console.log(gl.info.render)

    useEffect(()=> {
        // getout:
        if (gpgpuRef.current) return
        // instantiate a GPUComputationRenderer with the height, width and renderer:
        const computationRenderer =  new GPUComputationRenderer(gpgpu.fBOSize, gpgpu.fBOSize, gl);
        // console.log(computationRenderer)

        // create a texture - (using a GPUComputationRenderer method:)
        const baseParticlesTexture = computationRenderer.createTexture();
        // its a DataTexture and just 0s before filling it so black...each set of 4 values will form 1 particle:
        // console.log(baseParticlesTexture.image.data)

        // now fill the FBO (texture image data) with the positions from the baseGeometry:
        for(let i = 0; i < baseGeometry.count; i++) {
            // putting the correct positions from the vec3 positions into the vec4 FBO - Bruno's way:
            const i3 = i * 3;
            const i4 = i * 4;
            // r,g, and b channels:
            baseParticlesTexture.image.data[i4 + 0] = baseGeometry.mergedInstance.attributes.position.array[i3 + 0];
            baseParticlesTexture.image.data[i4 + 1] = baseGeometry.mergedInstance.attributes.position.array[i3 + 1];
            baseParticlesTexture.image.data[i4 + 2] = baseGeometry.mergedInstance.attributes.position.array[i3 + 2];
            // fill alpha with 0s: will need this channel later
            baseParticlesTexture.image.data[i4 + 3] = 0;
        }
        // console.log(baseParticlesTexture.image.data)

        // making the particles 'variable': addVariable requires a name, shader, and a base texture - injects the uniform sampler 2d into the shader automatically:
        const particlesVariable = computationRenderer.addVariable(
            'uSeedParticles', 
            particlesShader, 
            baseParticlesTexture
        );

        // setting up the ping-ponging:
        computationRenderer.setVariableDependencies(particlesVariable, [ particlesVariable ]);

        // Add more uniforms - remember uniforms need objects!!!: 
        // REMEMBER THIS when passing the uTime to the Grass shaders...!!!
        particlesVariable.material.uniforms.uTime = { value: 0 };
        // console.log(particlesVariable.material.uniforms.uTime)
        particlesVariable.material.uniforms.uProgress = { value: 0 };


    }, [ gl ])

    





    //-----------------------
    // this below is the equivalent of the r3f returning jsx, but encapsulated in a Movable and then exported via Main?? 
    // NB Will need to be able to pass position somehow - of each dandelion:
    
    const handle = useMemo(()=> <mesh 
            position={ [0.0, 0.0, 0.0] }
            // geometry={ geometry }
            // material={ grassShaderMaterial }
        >
        {/** */}
            <icosahedronGeometry args={[ 0.1, 3 ]}/>
            <dandelionSeedMaterial />
        
        </mesh>
    )

    return <Movable handle={ handle } upright={ false } >
        </Movable>;
}

export function Main() {
    const [conceptType] = useProperty('concept::name');
    return conceptType === 'Dandelion' ? <ErrorBoundary fallback={null}>
        <Dandelion />
    </ErrorBoundary> : null;
}