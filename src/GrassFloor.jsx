import { useRef, useMemo, useState } from 'react'
import { shaderMaterial, OrbitControls, useTexture, Sky } from '@react-three/drei'
//using this in the experience but can be wherever...
import { button, useControls } from 'leva'
import { Perf } from 'r3f-perf'
import { Color } from 'three'
import { extend, useFrame, useThree } from '@react-three/fiber'

// maybe dont need lights at all? Stylistic thing.
import Lights from './Lights.jsx'

import grassVertexShader from './shaders/grass/vertex.glsl'
import grassFragmentShader from './shaders/grass/fragment.glsl'

import DandelionGPGPU from './DandelionGPGPU.jsx'


// drei helper to help with uniforms: takes 3 parameters: uniforms, vertex shader and fragment shader- it creates a Class we can use in the jsx
const GrassFloorMaterial = shaderMaterial(
    {
        uTime: 0,
        uGrassDepthsColor: new Color('#090e01'),
        uGrassTipsColor: new Color('#8bf68b'),
        // Not here yet, define in jsx - uPerlinTexture: perlinTexture
    },
    grassVertexShader,
    grassFragmentShader
)
//to make the class we use extend:
extend({ GrassFloorMaterial })


export default function GrassFloor()
{
    //note the file path to public...!!!!
    const perlinTexture = useTexture('/perlin.png')
    // console.log(perlinTexture)

    const grassFloorMaterial = useRef()

    //gl is the renderer!
    const { gl, size } = useThree()
    // console.log(gl)
    // console.log(size)
    
    // sky 

    // useFrame has state and delta:
    useFrame((_, delta) => {
        // console.log(delta);
        grassMaterial.current.uTime += delta;  
    })
    
    
    // for a second folder need to instantiate controls again:
    // can destructure immediately, so no need for multiple variables containing controls... cubeControls could have been destructured... :
    const { grassDepthsColor, grassTipsColor } = useControls('grass', {
        grassDepthsColor: '#090e01',
        grassTipsColor: '#72ff72'
        }
    )


    return <>
        {/* Just add this here, need to reposition it though!*/}
        { perfVisible ? <Perf position='top-left' /> : null}
        
        <OrbitControls makeDefault />

        <Sky 
        // distance={450000} sunPosition={[180, 0, -350]} inclination={-5} 
        
        distance={450000}
        turbidity={1}           // lower = clearer air
        rayleigh={0.2}            // higher = more blue scattering
        mieCoefficient={0.008}  // subtle haze
        mieDirectionalG={0.8}
        // sunPosition={[2, 1.5, -2]} // low sun
        sunPosition={[180, 5, -360]} // low sun
        />

        {/* <Lights /> */}
        {/* this needs to be conditional on something - multiple and the position randomised  Remember disposal though (esp of the memoized geometry)- if its not done by r3f???? */}
        {/* <Dandelion position={ [- 4, 1.5, 4 ] } /> */}

        <DandelionGPGPU glRenderer={ gl } size={ size } position={[0, 1.5, 2]}/>

        <DandelionGPGPU glRenderer={ gl } size={ size } position={[5, 2.0, -3]}/>


        <DandelionGPGPU glRenderer={ gl } size={ size } position={[-2.1, 1.6, -0.2]}/>

        <DandelionGPGPU glRenderer={ gl } size={ size } position={[2.1, 1.7, -2.7]}/>
        
        <mesh receiveShadow  rotation-x={ - Math.PI * 0.5 } scale={ 10 }>
            <planeGeometry args={[ 2, 1, 512, 256 ]}/>
            {/* drei helper to make this class: see above code */}
            <grassMaterial 
                ref={ grassMaterial } 
                //pass leva values directly as props!!!!!
                uGrassDepthsColor={ grassDepthsColor }
                uGrassTipsColor={ grassTipsColor }
                //this texture has to be passed here not in GrassMaterial (class?) as not loaded there.
                uPerlinTexture={ perlinTexture }
            />
        </mesh>

         
        {/* floor */}
        <mesh position-y={ - 0.1 } scale={ [10, 0.1, 10]} visible={ false }>
            <boxGeometry />
            <meshBasicMaterial />
        </mesh>

    </>
}
