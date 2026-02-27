import { useRef, useMemo, useState } from 'react'
import { Point, Points, PointMaterial, shaderMaterial, OrbitControls, useTexture, Wireframe } from '@react-three/drei'
//using this in the experience but can be wherever...
import { button, useControls } from 'leva'
import { Perf } from 'r3f-perf'
import { Color, IcosahedronGeometry, Uniform } from 'three'
import { extend, useFrame, useThree } from '@react-three/fiber'

// maybe dont need lights at all? Stylistic thing.
import Lights from './Lights.jsx'

import grassVertexShader from './shaders/grass/vertex.glsl'
import grassFragmentShader from './shaders/grass/fragment.glsl'


import Dandelion from './Dandelion.jsx'
import DandelionGPGPU from './DandelionGPGPU.jsx'


// drei helper to help with uniforms: takes 3 parameters: uniforms, vertex shader and fragment shader- it creates a Class we can use in the jsx
const GrassMaterial = shaderMaterial(
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
extend({ GrassMaterial })


export default function Experience()
{
    //note the file path to public...!!!!
    const perlinTexture = useTexture('/perlin.png')
    // console.log(perlinTexture)

    const grassMaterial = useRef()

    //gl is the renderer!
    const { gl, size } = useThree()
    // console.log(gl)
    // console.log(size)
    
    // useFrame has state and delta:
    useFrame((_, delta) => {
        // console.log(delta);
        grassMaterial.current.uTime += delta;  
    })
    
    //instantiate leva's controls and pass it an object:
    const { perfVisible } = useControls({
        perfVisible: true,
    })
    //for folders, add a string as a first property:
    const sphereControls = useControls('sphere', {
        position: {
            //NB 2d as joystick doesnt make sense otherwise
            value: { x: 0, y: 1.5},
            min: - 4,
            max: 4,
            // step: 0.001
            joystick: 'invertY'
        },
        scale: {
            value: 0.5,
            min: - 4,
            max: 4,
        },
        visible: true,
        // import button separately and use callback
        clickMe: button(() => { console.log('ok') }),
        choice: { options: [ 'a', 'b', 'c']}

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

        <Lights />
        {/* this needs to be conditional on something - multiple and the position randomised  Remember disposal though (esp of the memoized geometry)- if its not done by r3f???? */}
        <Dandelion position={ [- 4, 1.5, 4 ] } />

        <DandelionGPGPU glRenderer={ gl } size={ size }/>
        
        <mesh receiveShadow  rotation-x={ - Math.PI * 0.5 } scale={ 10 }>
            <planeGeometry args={[ 1, 1, 256, 256 ]}/>
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

        <mesh position-y={ - 0.1 } scale={ [10, 0.1, 10]} visible={ false }>
            <boxGeometry />
            <meshStandardMaterial color="mediumpurple" />
        </mesh>

    </>
}
