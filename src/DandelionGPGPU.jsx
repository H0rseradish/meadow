
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
export default function DandelionGPGPU( { glRenderer } ) 
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
    // console.log(baseGeometry.instance);
    // console.log(baseGeometry.count);

    
    /**
     * GPGPU Computation
     */

    //Setup
    //Hopefully correctly in a useMemo for this?
    const gpgpu = {}
    
    // This defines the size of our texture. It needs to allow for all the points (on a 2d square...), so will need to round it up to a whole number (spare pixels dont matter)
    gpgpu.size = useMemo(() => 
        Math.ceil(Math.sqrt(baseGeometry.count)), [baseGeometry.count]
    )
    // console.log(gpgpu.size)
    // ...So in this case its just a 31x31 texture!
    
    //for control
    const gpgpuRef = useRef()

    // so now instead of useMemos all are safely inside useEffect!!: And it works...
    useEffect(() => {
        // ...and belt and braces!!!:
        if (gpgpuRef.current) return

        // need to provide the renderer (as prop) because there must only be the one per page! 
        // The instance has to be a variable - not set on the gpgpu object - because I cant set it later otherwise, it didnt work. Need to fully understand WHY though.
        const computation =  new GPUComputationRenderer(gpgpu.size, gpgpu.size, glRenderer)
        // createTexture - a method on the GPUComputationRenderer - makes a DataTexture
        const baseParticlesTexture = computation.createTexture()
        // (each set of 4 values represents 1 particle)

        // now need to loop and fill the texture... a whole new world of pain?






        // Particles 'variable': addVariable requires a name, the shader, and the base texture (uParticles will be a sampler2d texture)
        // this also injects the uniform into the shader (see my previous rubbishy effort that made it inject twice...)
        const particlesVariable = computation.addVariable(
            'uParticles', 
            gpgpuParticlesShader, 
            baseParticlesTexture
        ) 

        // setting up the stuff to ping-pong
        computation.setVariableDependencies(particlesVariable, [ particlesVariable ])

        // and init (which I DID actually work out needed to go in a useEffect)
        computation.init()

        // we get the WebGLRenderTarget which handles the FBO (Frame Buffer Object)
        console.log(computation.getCurrentRenderTarget(particlesVariable))
        console.log(computation.getCurrentRenderTarget(particlesVariable).texture)
        //oh yes this looks like an array of reds!!! 1, 0, 0, 0 a la Bruno lesson
        // But.... how do I get it to use it elsewhere?? - via my gpgpuRef !!!!!!!! see jsx

        // and set this to use....(chatgpt...)
        gpgpuRef.current = { computation, particlesVariable }
        console.log(gpgpuRef.current)
        // Make sure it doesnt go again!!!..: (chatgpt)
        return () => {
        // Optional cleanup
        // computation.dispose?.()
        gpgpuRef.current = null
        }
        
    }, [glRenderer])


   
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


    // In three this was in the tick function so useFrame:
    useFrame(() => 
        // and checking its threre as well as running it
        gpgpuRef.current?.computation.compute()
    )

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

            {/* debug mesh */}
            <mesh>
                <planeGeometry args={[ 3, 3 ]} />
                {/* use map to apply the texture... yeeeeessss!!!!!!! Note that without .current? check its undefined */ }
                <meshBasicMaterial map={ gpgpuRef.current?.computation.getCurrentRenderTarget(gpgpuRef.current?.particlesVariable).texture} />
            </mesh>

        </group>
    )
}


//---------------------------------------------------------------------
// Nuclear option of working it out by attempting to write it manually instead of using GPUComputation renderer - 
// see https://medium.com/@midnightdemise123/creating-chaotic-flow-fields-with-gpgpu-in-react-three-fiber-f9aad608c534  for an example. Also Bruno mentions he wrote his own.
