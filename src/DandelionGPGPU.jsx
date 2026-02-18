
import { useRef, useMemo, useState, useEffect } from 'react'
import { Point, Points, PointMaterial, shaderMaterial, OrbitControls, useTexture, Wireframe } from '@react-three/drei'
//using this in the experience but can be wherever...
import { button, useControls } from 'leva'

import { Color, IcosahedronGeometry, BufferGeometry, BufferAttribute } from 'three'
import { extend, useFrame } from '@react-three/fiber'
import { GPUComputationRenderer } from 'three/examples/jsm/Addons.js'

import seedsVertexShader from './shaders/seeds/vertex.glsl'
import seedsFragmentShader from './shaders/seeds/fragment.glsl'
import gpgpuParticlesShader from './shaders/gpgpu/particles.glsl'
import { StaticElement } from 'three/examples/jsm/transpiler/AST.js'
// console.log(gpgpuParticlesShader)

// this is naive???? maybe its fine.
// sebastien lempens (see link below) uses memo() and forwardRef, and returns jsx... but he is making an actual component so...
const SeedParticlesMaterial = shaderMaterial(
    {
        uColor: new Color('#eafdce'),
        uTime: 0,
        uSeedParticlesTexture:{ value: null },
        //Dont use a boolean, use a progress value for this!!!!! see shader comments...
        uProgress: 0,
        // swap true and false below to get the shapes back...
        transparent: true,
        depthWrite: false,
        // sizeAttenuation needs to be calc in the shader
    },
    seedsVertexShader,
    seedsFragmentShader 
)
extend({ SeedParticlesMaterial });


// make a dandelion... 
export default function DandelionGPGPU( { glRenderer } ) 
{
    // I need a ref to be able to get to it to set stuff on it:
    const seedParticlesMaterialRef = useRef(null);

    useFrame((state, delta) => {
        // console.log(delta);
        // dandelionMaterial.current.uTime += delta;
    })

    /**
     * Base geometry
     */

    const baseGeometry = {};

    baseGeometry.instance = useMemo(() => new IcosahedronGeometry(0.5, 3));

    baseGeometry.count = baseGeometry.instance.attributes.position.count;
    // console.log(baseGeometry.instance);
    // console.log(baseGeometry.count);
    // console.log(baseGeometry.instance.attributes.position.array);

    // https://github.com/sebastien-lempens/r3f-flow-field-particles/blob/main/src/components/FlowFieldParticles.jsx

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

    
    //for control should I put it next to other useRefs for organisation?
    const gpgpuRef = useRef(null)

    // so now instead of useMemos all are safely inside useEffect!!: And it works...
    useEffect(() => {
        // ...and belt and braces!!!:
        if (gpgpuRef.current) return

        // need to provide the renderer (as prop) because there must only be the one per page! 
        // The instance has to be a variable - not set on the gpgpu object - because I cant set it later otherwise, it didnt work. Need to fully understand WHY though.
        const computation =  new GPUComputationRenderer(gpgpu.size, gpgpu.size, glRenderer)
        // createTexture - a method on the GPUComputationRenderer - makes a DataTexture
        const baseParticlesTexture = computation.createTexture()
        // each set of 4 values in here represents 1 particle:
        // console.log(baseParticlesTexture.image.data)
        

        // fill the texture:
        //should this actually be in a useMemo though??? - but I need the baseParticlesTexture.

        // As well as Bruno, referring to 
        // https://github.com/sebastien-lempens/r3f-flow-field-particles/blob/main/src/components/FlowFieldParticles.jsx 
        // to see how he has done this in r3f
        for (let i = 0; i < baseGeometry.count; i++)
        {
            // fill the 4x4 texture rgba with the 3x3 geometry positions, (just give the alpha channel 0s)
            // Brunos's 'strides' - do they make it clearer?:
            const i3 = i * 3
            const i4 = i * 4
            // r channel
            baseParticlesTexture.image.data[i4 + 0] = baseGeometry.instance.attributes.position.array[i3 + 0]
            // g channel
            baseParticlesTexture.image.data[i4 + 1] = baseGeometry.instance.attributes.position.array[i3 + 1]
            // b channel
            baseParticlesTexture.image.data[i4 + 2] = baseGeometry.instance.attributes.position.array[i3 + 2]
            // fill alpha with 0s:
            baseParticlesTexture.image.data[i4 + 3] = 0
        }
        // console.log(baseParticlesTexture.image.data)

        // Particles 'variable': addVariable requires a name, the shader, and the base texture (uParticles will be a sampler2d texture)
        // this also injects the uniform into the shader (see my previous rubbishy effort that made it inject twice...)
        const particlesVariable = computation.addVariable(
            'uSeedParticles', 
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
     * Seeds(particles)
     */

    const seeds = {};

    // how to pick from the particles(seeds) texture:
    const seedsUvArray = useMemo(() => new Float32Array(baseGeometry.count * 2))
    // fill the array - this should be memoised or what?
    for(let y = 0; y < gpgpu.size; y++)
    {
        for(let x = 0; x < gpgpu.size; x++) 
        {
            const i = (y * gpgpu.size + x)
            const i2 = i * 2
            // but we need our values to go from 0 to 1 so: add 0.5 because bruno likes it to be centred on each 'cell':
            const uvX = (x + 0.5) / gpgpu.size
            const uvY = (y + 0.5) / gpgpu.size

            // console.log(uvX)
            seedsUvArray[i2 + 0] = uvX;
            seedsUvArray[i2 + 1] = uvY;
        }
    }
    // console.log(seedsUvArray)

    // This seeds stuff all needs tidying?? into one useMemo? 
    // YES to avoid issues ....(I am fairly certain....?):

    //creating a new EMPTY geometry
    seeds.geometry = useMemo(() => new BufferGeometry());
    // giving it the correct 
    seeds.geometry.setDrawRange(0, baseGeometry.count)
    console.log(seeds.geometry);
    // CHECK: Disposal? - BECAUSE ITS A THREE GEOMETRY???, and also get rid of unnecessary attributes???
    seeds.geometry.setAttribute('aSeedParticlesUv', new BufferAttribute(seedsUvArray, 2))
    console.log(seeds.geometry)

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
        seedParticlesMaterialRef.current.uProgress = 1;
        // console.log(dandelionMaterial.current.uShatter)
    }


    // In three this was in the tick function so useFrame:
    useFrame(() => {
        // and checking its there as well as running it
        gpgpuRef.current?.computation.compute()
        // But can use the Ref!! As above - The CURRENT state
        // Yes this works too!!!!!:
        seedParticlesMaterialRef.current.uSeedParticlesTexture = gpgpuRef.current?.computation.getCurrentRenderTarget(gpgpuRef.current?.particlesVariable).texture 
        ///wooooooooooooo!!!! I think/I hope...??????????????
        // below worked, but should be the ref not the CLASS ITSELF????
        // Because my Ref is THE INSTANCE 
        // (My original way was on the class (below)
        // console.log(SeedParticlesMaterial.uSeedParticlesTexture)
    })

    return (
        <group position={[0, 1.5, 0]} >
            <mesh visible={ false } 
            position={ [0, - 0.04, 0 ] }
            >
                <sphereGeometry 
                args={ [ 0.14, 10, 3, Math.PI * 0.00,  Math.PI * 2.00, Math.PI * 0.00, Math.PI * 0.60 ]} 
                />
                <meshBasicMaterial 
                    color={ '#6cf66c' }
                />
            </mesh>
            <mesh visible={ false } position={ [0, - 0.5, 0 ] }
            >
                <cylinderGeometry 
                args={ [ 0.04, 0.04, 1, 8]}
                />
                <meshBasicMaterial 
                    color={ '#248424' }
                />
            </mesh>
            
            <points geometry={ seeds?.geometry }>
                <seedParticlesMaterial ref={ seedParticlesMaterialRef }
                // this?....doesnt error but?: 
                uSeedParticlesTexture = { gpgpuRef.current?.computation.getCurrentRenderTarget(gpgpuRef.current?.particlesVariable).texture } />
            </points>

            {/* debug mesh */}
            <mesh position={[3, 0, 0]}>
                <planeGeometry args={[ 3, 3 ]} />
                {/* use map to apply the texture... yeeeeessss!!!!!!! Note that without .current? check its undefined */ }
                <meshBasicMaterial map={ gpgpuRef.current?.computation.getCurrentRenderTarget(gpgpuRef.current?.particlesVariable).texture } />
            </mesh>

        </group>
    )
}


//---------------------------------------------------------------------
// Nuclear option of working it out by attempting to write it manually instead of using GPUComputation renderer - 
// see https://medium.com/@midnightdemise123/creating-chaotic-flow-fields-with-gpgpu-in-react-three-fiber-f9aad608c534  for an example. Also Bruno mentions he wrote his own.
