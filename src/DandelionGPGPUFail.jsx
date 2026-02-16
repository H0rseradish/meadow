
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
    //Memoizing all of it! can I do it tidily in one useMemo?- nooooo! ONLY when related closely - ie same dependencies, remember useMemo is not meant as an organisational tool!!!!! But lots of useMemos might not be optimal either...?
    const gpgpu = {}
    
    // This defines the size of our texture. It needs to allow for all the points (on a 2d square...), so will need to round it up to a whole number (spare pixels dont matter)
    gpgpu.size = useMemo(() => 
        Math.ceil(Math.sqrt(baseGeometry.count)), [baseGeometry.count]
    )
    // console.log(gpgpu.size)
    // ...So in this case its just a 31x31 texture!
    
    //need to provide the renderer (as prop) because there must only be the one per page!
    gpgpu.computation = useMemo(() => 
        new GPUComputationRenderer(gpgpu.size, gpgpu.size, glRenderer), [gpgpu.size, glRenderer]
    )

    //just checking:
    // console.log(renderer)
    console.log(gpgpu.computation)


    // Base particles setup:
    // createTexture is a method on the GPUComputationRenderer - it makes a DataTexture (see my brain-in-r3f?)
    const baseParticlesTexture = useMemo(() => 
        gpgpu.computation.createTexture(), [ gpgpu.computation ]
    )
    // console.log(baseParticlesTexture.image.data)
    // Yep!- each set of 4 values will represent 1 particle

    //Particles 'variable':
    // - addVariable requires a name, the shader, and the base texture
    //the uParticles texture will be a sampler2d

    const gpuRef = useRef()

    useEffect(() => {
        
    }, [])


    gpgpu.particlesVariable = useMemo(() => 
        gpgpu.computation.addVariable(
            'uParticles', 
            gpgpuParticlesShader, 
            baseParticlesTexture
        ), 
        [gpgpuParticlesShader, baseParticlesTexture]
    )
    //looks ok?
    // console.log(gpgpu.particlesVariable)
    
    useEffect(() => gpgpu.computation.setVariableDependencies(gpgpu.particlesVariable, [ gpgpu.particlesVariable ]), [])
    
    console.log(gpgpu.particlesVariable)
    
    // gpgpu.computation.setVariableDependencies(gpgpu.particlesVariable, [ gpgpu.particlesVariable ])


    useEffect(() => {
        //this works in here though: 
        gpgpu.computation.init()
   
    }, [] )
    
    

    // In three this was in the tick function so useFrame:
    useFrame(() => 
        gpgpu.computation.compute()
    )
    //having this outside of the useFrame results in a typeError because requestAnimationFrame...
   
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

// Leaving these comments in to remind me of my folly - and how I correct it, hopfefully :

// Run it: when I ran the compute in the useFrame:

//so  I got an error: 'uParticles: redefinition,' ie it is getting automatically injected more than once... this has to be something to do with: 

// A: the way r3f and Strict Mode interacts with GPUComputationRenderer, as in the double console.logs ARE NOT IDENTICAL!!! this is a clue I am sure... ok its to do with strict mode????? 
// OR IS IT
// B: my generally crappy r3f code understanding
// so investigate the double logging generally, it might give a clue YES IT JUST MIGHT BE THE ISSUE!!!!!

// I asked chatgpt: could strict mode cause an issue where GPUComputationRender injects a uniform twice into a shader? Answer:
// Short answer: Yes — in development, React Strict Mode can absolutely cause that indirectly.
// Not because Strict Mode “duplicates uniforms”, but because it creates your GPUComputationRenderer twice, which can lead to:
// Two materials being created
// Two shader programs being compiled
// Uniform injection logic running twice
// Or mutation happening twice on the same shader object
// This is especially easy to hit with React Three Fiber and three.js’s GPUComputationRenderer. 
// So Disabled strict mode and YEEEEEEEEEEEESSSSSSSSSSSSSSSSSSSSSS This was it!! 
// SO STRICT MODE HAS DONE ITS JOB to EXPOSE shortcomings in my crappy code so B  is also the case...

//-----------------
// it needs to be (chat says)...

// Idempotent - whuuuttt????? - 'Performing the same operation multiple times produces the same result as performing it once.' The opposite of a horse, then. Or a human even.
// Side-effect safe - ok
// Done in an effect - aha, thought so!!!!!!
// Guarded by a ref - still unclear as to the full usefulness of useRef!!!! 
//-----------  

// so.... 

//  This useMemo was bad because addVariable() is NOT A PURE function... it makes variables, injects the uniform etc etc!!!
// (useMemo does NOT mean it runs once - in strictmode it DELIBERATELY RUNS TWICE

    // gpgpu.particlesVariable = useMemo(() => 
//         gpgpu.computation.addVariable(
//             'uParticles', 
//             gpgpuParticlesShader, 
//             baseParticlesTexture
//         ), 
//         [gpgpuParticlesShader, baseParticlesTexture]
//     )

// ....React wants pure renders. 
// It must be run once, so a useEffect()
// And guarded by a useRef:

//from chat:
// The Proper Pattern for Imperative Systems
// const gpuRef = useRef(null)

// useEffect(() => {
//   const gpu = new GPUComputationRenderer(...)
//   gpu.init()

//   gpuRef.current = gpu

//   return () => {
//     gpu.dispose?.()
//     gpuRef.current = null
//   }
// }, [])
// Now:
// Strict Mode:
// mount A → create gpu A
// cleanup A → dispose gpu A
// mount B → create gpu B
// No shader state leaks across mounts.
// No duplicate uniform.



//---------------------------------------------------------------------
// Nuclear option of working it out by attempting to write it manually instead of using GPUComputation renderer - 
// see https://medium.com/@midnightdemise123/creating-chaotic-flow-fields-with-gpgpu-in-react-three-fiber-f9aad608c534  for an example. Also Bruno mentions he wrote his own.