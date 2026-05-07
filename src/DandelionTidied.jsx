
import { useRef, useMemo, useEffect } from 'react'
import { shaderMaterial } from '@react-three/drei'
import { Color, IcosahedronGeometry, BufferGeometry, BufferAttribute, DoubleSide } from 'three'
import { extend, useFrame } from '@react-three/fiber'
import { GPUComputationRenderer } from 'three/examples/jsm/Addons.js'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

import seedsVertexShader from './shaders/seeds/vertex.glsl'
import seedsFragmentShader from './shaders/seeds/fragment.glsl'
import gpgpuParticlesShader from './shaders/gpgpu/particles.glsl'

// is this ok here? maybe its fine.
// sebastien lempens (see link below) uses memo() and forwardRef...?
const ParticlesMaterial = shaderMaterial(
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
        // sizeAttenuation must be calculated in the shader
    },
    seedsVertexShader,
    seedsFragmentShader 
)
extend({ ParticlesMaterial });


// provide the renderer as prop (should only be one renderer)
export default function DandelionGPGPU( { glRenderer, size, position } ) 
{
    // Setting up useRefs to set stuff on:
    const particlesMaterialRef = useRef(null);
    const gpgpuRef = useRef(null)

    /**
     * Base geometry
     */
    const baseGeometry = useMemo(() => 
    {
        // Make an instance of a geometry from which can obtain the vertices:
        const instance = new IcosahedronGeometry(0.6, 3)
        // Use mergeVertices to get rid of multiples of vertices coordinates at positions:
        const mergedInstance = mergeVertices(instance);
        const count = mergedInstance.attributes.position.count;

        // return the count of the vertices and their positions:
        return{ count, mergedInstance }
    });

    /**
     * GPGPU Computation
     */

    // Setup
    // Defines size of the invisible pingpong texture. Needs to contain all the points (as a 2d square), so will need to round it up to whole number (spare pixels dont matter)
    const gpgpuSize = useMemo(() => 
        Math.ceil(Math.sqrt(baseGeometry.count)), [baseGeometry.count]
    )
    // console.log(gpgpuSize)

    // so now instead of useMemos all are safely inside a useEffect: 
    useEffect(() => {
        // belt and braces:
        if (gpgpuRef.current) return

        const computationRenderer =  new GPUComputationRenderer(gpgpuSize, gpgpuSize, glRenderer)

        // createTexture - a method on the GPUComputationRenderer - makes a DataTexture
        const baseParticlesTexture = computationRenderer.createTexture();
        // each set of FOUR values in here represents 1 particle:
        // console.log(baseParticlesTexture.image.data)

        // fill the texture:
        for (let i = 0; i < baseGeometry.count; i++)
        {
            // fill the 4x4 texture rgba with the 3x3 geometry positions (fill alpha channel with 0s)
            // Brunos's i3 and i4 'strides' - do they make it clearer?:
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

        // Particles 'variable': addVariable requires a name, shader, and base texture - injects the uniform sampler 2dinto the shader automatically:
        const particlesVariable = computationRenderer.addVariable(
            'uSeedParticles', 
            gpgpuParticlesShader, 
            baseParticlesTexture
        );

        // setting up the stuff to ping-pong
        computationRenderer.setVariableDependencies(particlesVariable, [ particlesVariable ])

        // Set uniforms:
        
        // Remember uniforms need objects:
        particlesVariable.material.uniforms.uTime = { value: 0 };
        // console.log(particlesVariable.material.uniforms.uTime)
        particlesVariable.material.uniforms.uProgress = { value: 0 };

        // Init (before computing in the useFrame):
        computationRenderer.init()

        // so we get the WebGLRenderTarget which handles the FBO (Frame Buffer Object)
        console.log(computationRenderer.getCurrentRenderTarget(particlesVariable))
        console.log(computationRenderer.getCurrentRenderTarget(particlesVariable).texture)
        // But.... how do I get it to use it elsewhere?? - via gpgpuRef

        // and set this to use these:
        gpgpuRef.current = { computationRenderer, particlesVariable }
        // console.log(gpgpuRef.current)

        // Make sure it doesnt go again!!!..: (chatgpt)
        return () => {
        // Optional cleanup
        computationRenderer.dispose?.()
        gpgpuRef.current = null
        }
    }, [glRenderer]
    )

    /** 
     * Seeds(particles)
     */

    //TO  MEMOISE TIDILY? Two loops or one for both?

    // how to pick from the particles(seeds) texture:

    const { particlesUvArray, randomsArray }  = useMemo(() => {
        const particlesUvArray = new Float32Array(baseGeometry.count * 2);
        const randomsArray = new Float32Array(baseGeometry.count);

        // fill the arrays - Bruno-style:
        for(let y = 0; y < gpgpuSize; y++)
        {
            for(let x = 0; x < gpgpuSize; x++) 
            {
                const i = (y * gpgpuSize + x);
                const i2 = i * 2;
                // but we need our values to go from 0 to 1 so: add 0.5 because bruno likes it to be centred on each 'cell':
                const uvX = (x + 0.5) / gpgpuSize;
                const uvY = (y + 0.5) / gpgpuSize;
                // console.log(uvX)
                particlesUvArray[i2 + 0] = uvX;
                particlesUvArray[i2 + 1] = uvY;
                //fill with random values:
                randomsArray[i] = Math.random();
            }
        }
        return { particlesUvArray, randomsArray }

    }, [ baseGeometry.count, gpgpuSize ]);
    // console.log(particlesUvArray)

    // Seeds geometry stuff tidied into one useMemo 
    const particles = useMemo(() => {

        const geometry = new BufferGeometry()
        geometry.setDrawRange(0, baseGeometry.count )

        // TODO: Add Positions attribute? not having it caused a big issue in spatialstrates

        geometry.setAttribute('aSeedParticlesUv', new BufferAttribute(particlesUvArray, 2))
        geometry.setAttribute('aRandom', new BufferAttribute(randomsArray, 1))

        // what is this for?
        // const points = baseGeometry.mergedInstance.attributes.position.array;

        return { geometry }
    }, [ baseGeometry.count, particlesUvArray, randomsArray ])
    // console.log(particles.geometry)
    // console.log(particles.points)


    // shatter the dandelion: 
    const seedheadShatter = (event) =>
    {
        console.log('shatter!'); 
        // The ray intersects 100s of things, so:
        // event.stopPropagation();

        // set uProgress as 1:
        gpgpuRef.current.particlesVariable.material.uniforms.uProgress.value = 1;
        // console.log(gpgpuRef.current.particlesVariable.material.uniforms.uProgress.value);
    }


    // In three this was in the tick function so useFrame:
    useFrame((_, delta) => {
        // and checking its there as well as running it
        // but this was bad... 
        gpgpuRef.current?.computationRenderer.compute();

        // note using the ref (the ref is the INSTANCE, it was a mistake to do it on the class):
        particlesMaterialRef.current.uSeedParticlesTexture = gpgpuRef.current?.computationRenderer.getCurrentRenderTarget(gpgpuRef.current?.particlesVariable).texture; 
        // (My original way was on the class (below)
        // console.log(SeedParticlesMaterial.uSeedParticlesTexture)

        // need delta for the particles flowfield: .value because uniforms are objects:
        gpgpuRef.current.particlesVariable.material.uniforms.uTime.value += delta;
    })


    return (
        <group position={ position }>

            <mesh visible={ true } 
            position={ [0, - 0.01, 0 ] }
            >
                <sphereGeometry 
                args={ [ 0.15, 10, 3, Math.PI * 0.00,  Math.PI * 2.00, Math.PI * 0.00, Math.PI * 0.60 ]} 
                />
                <meshBasicMaterial 
                    color={ '#6cf66c' }
                />
            </mesh>

            <mesh visible={ true } position={ [0, - 1.0, 0 ] }
            >
                <cylinderGeometry 
                args={ [ 0.03, 0.04, 2, 8]}
                />
                <meshBasicMaterial 
                    color={ '#248424' }
                />
            </mesh>

            <points geometry={ particles?.geometry }>
                <particlesMaterial ref={ particlesMaterialRef }
                uResolution = { [ size?.width, size?.height ] }
                // this?....doesnt error but?: I DONT NEED IT??? The value is passed in the useEffect above:
                // uSeedParticlesTexture={ gpgpuRef.current?.computation.getCurrentRenderTarget(gpgpuRef.current?.particlesVariable).texture } 
                />
            </points>

            {/* debug meshes */}
            <mesh position={[3, 0, 0]} visible={ true }
            >
                <planeGeometry args={[ 3, 3 ]}/>
                {/* use map to apply the texture... yeeeeessss!!!!!!! Note that without .current? check its undefined */ }
                <meshBasicMaterial map={ gpgpuRef.current?.computationRenderer.getCurrentRenderTarget(gpgpuRef.current?.particlesVariable).texture } />
            </mesh>

            {/* to understand the icosahedron shape/vertices - and for clicking: */}
            <mesh visible={ false } onClick={ seedheadShatter }
            >
                <icosahedronGeometry 
                args={ [ 0.75, 0 ]}
                />
                <meshBasicMaterial 
                    wireframe={ true }
                />
            </mesh>

        </group>
    )
}

//---------------------------------------------------------------------
// used this to give an idea of how to do this in r3f:
// https://github.com/sebastien-lempens/r3f-flow-field-particles/blob/main/src/components/FlowFieldParticles.jsx

// see https://medium.com/@midnightdemise123/creating-chaotic-flow-fields-with-gpgpu-in-react-three-fiber-f9aad608c534 for an example?? - Bruno mentions he wrote his own GPU Computation renderer