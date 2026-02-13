
import { useRef, useMemo, useState, useEffect } from 'react'
import { Point, Points, PointMaterial, shaderMaterial, OrbitControls, useTexture, Wireframe } from '@react-three/drei'
//using this in the experience but can be wherever...
import { button, useControls } from 'leva'

import { Color, IcosahedronGeometry, Uniform } from 'three'
import { extend, useFrame } from '@react-three/fiber'
import { GPUComputationRenderer } from 'three/examples/jsm/Addons.js'

import dandelionVertexShader from './shaders/dandelion/vertex.glsl'
import dandelionFragmentShader from './shaders/dandelion/fragment.glsl'
import gpgpuParticlesShader from './shaders/gpgpu/particles.glsl'
// console.log(gpgpuParticlesShader)

const DandelionMaterial = shaderMaterial(
    {
        uColor: new Color('#eafdce'),
        uTime: 0,
        //Dont use a boolean, use a progress value for this!!!!! see shader comments...
        uProgress: 0,
        transparent: true,
        depthWrite: false,
        // sizeAttenuation needs to be calc in the shader
    },
    dandelionVertexShader,
    dandelionFragmentShader 
)
extend({ DandelionMaterial });

// make a dandelion... 
export default function DandelionGPGPU( { renderer } ) 
{
    // I need a ref to be able to get to it to set stuff on it:
    const dandelionMaterial = useRef();

    useFrame((state, delta) => {
        // console.log(delta);
        dandelionMaterial.current.uTime += delta;
    })

    /**
     * Base geometry
     */

    const baseGeometry = {};
    baseGeometry.instance = useMemo(() => new IcosahedronGeometry(0.5, 3));
    baseGeometry.count = baseGeometry.instance.attributes.position.count;
    // console.log(baseGeometry.count);


    /**
     * GPGPU Computation
     */

    //Setup
    //Memoizing all of it!
    const gpgpu = {}
    
    // This defines the size of our texture. It needs to allow for all the points (on a 2d square...), so will need to round it up to a whole number (spare pixels dont matter)
    gpgpu.size = useMemo(() => 
        Math.ceil(Math.sqrt(baseGeometry.count)), [baseGeometry.count]
    )
    //So in this case its just a 31x31 texture!
    // console.log(gpgpu.size)
    gpgpu.computation = useMemo(() => 
        new GPUComputationRenderer(gpgpu.size, gpgpu.size, renderer), [gpgpu.size, renderer]
    )
    // console.log(renderer)

    // Base particles setup:
    // createTexture is a method on the GPUComputationRenderer - it makes a DataTexture (see my brain-in-r3f?)
    const baseParticlesTexture = useMemo(() => 
        gpgpu.computation.createTexture(), [ gpgpu.computation ]
    )
    // console.log(baseParticlesTexture.image.data)- each set of 4 values will represent 1 particle

    //Particles 'variable' - addVariable requires a name, the shader, and the base texture
    //the uParticles texture will be a sampler2d
    gpgpu.particlesVariable = useMemo(() =>
        gpgpu.computation.addVariable(
            'uParticles', 
            gpgpuParticlesShader, 
            baseParticlesTexture
        ), 
        [ gpgpu.computation, gpgpuParticlesShader, baseParticlesTexture ]
    )
    //set the dependencies on the Computation renderer - it needs the 'variable' and an array containing the dependencies (which in our case is just itself... there could be be more, though) this is effevctively sets up the loop to ping pong
    useEffect(() =>
        gpgpu.computation.setVariableDependencies(gpgpu.particlesVariable, [ gpgpu.particlesVariable ]), 
        [ gpgpu.computation, gpgpu.particlesVariable ]
    )
    // Init: correct to be in a useEffect?
    useEffect(() =>
        gpgpu.computation.init,
        [ gpgpu.computation ] 
    ) 
    // Run it: 
    // In three this was in the tick function so useFrame?
    useFrame(() => 
        gpgpu.computation.compute()
    )
    
    
    /** 
     * Seeds
     */
    
    const seeds = {};
    
    // seeds.geometry = useMemo(() => new IcosahedronGeometry(0.5, 3));
    // console.log(geometry);
    // CHECK: Disposal - BECAUSE ITS A THREE GEOMETRY!, and also get rid of unnecessary attributes???

    // but I dont need the below? BECAUSE ITS ALREADY A GEOMETRY!!! Yes I do though because of the positions for the shader - (passing the geometry in the jsx doesnt work)
    seeds.points = useMemo(() => baseGeometry.instance.attributes.position.array, [baseGeometry.instance]);
    // console.log(positionsArray)

    // shatter the dandelion: 
    const seedheadShatter = (event) =>
    {
        console.log('shatter!'); //OK but.. WHY SO MANY ????? - Because the ray is going through multiple objects..... 
        console.log(event);
        // THIS!!!!!!! (It's really important because the ray intersects 100s of things!!!)
        event.stopPropagation();
        //ok but why is the target bigger than the visible mesh??? What if I made an invisible sphere clickable?? meshBounds from Drei
        
        // because I have the ref can do this - DO NOT NEED useState!!!
        // set the boolean uniform REMEMBER CURRENT!!!!!!!!!!!! It works now.
        // NOO, a Value not a boolean is more useful!
        dandelionMaterial.current.uProgress = 1;
        // console.log(dandelionMaterial.current.uShatter)
    }

    return (
        <group position={[0, 1.5, 0]} >
            <mesh visible={ true } 
            position={ [0, - 0.04, 0 ] }
            >
                <sphereGeometry 
                args={ [ 0.14, 10, 3, Math.PI * 0.00,  Math.PI * 2.00, Math.PI * 0.00, Math.PI * 0.60 ]} 
                />
                <meshBasicMaterial 
                    color={ '#6cf66c' }
                />
            </mesh>
            <mesh visible={ true } position={ [0, - 0.5, 0 ] }
            >
                <cylinderGeometry 
                args={ [ 0.04, 0.04, 1, 8]}
                />
                <meshBasicMaterial 
                    color={ '#248424' }
                />
            </mesh>

            <Points positions={ seeds.points } onPointerDown={ seedheadShatter }>
                <dandelionMaterial ref={ dandelionMaterial } />
            </Points>

        </group>
    )
}


