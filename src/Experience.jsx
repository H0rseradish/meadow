import { useRef, useMemo } from 'react'
import { Point, Points, PointMaterial, shaderMaterial, OrbitControls, useTexture } from '@react-three/drei'
//using this in the experience but can be wherever...
import { button, useControls } from 'leva'
import { Perf } from 'r3f-perf'
import { Color, IcosahedronGeometry } from 'three'
import { extend, useFrame } from '@react-three/fiber'

// maybe dont need lights at all? Stylistic thing.
import Lights from './Lights.jsx'

import grassVertexShader from './shaders/grass/vertex.glsl'
import grassFragmentShader from './shaders/grass/fragment.glsl'
import dandelionVertexShader from './shaders/dandelion/vertex.glsl'
import dandelionFragmentShader from './shaders/dandelion/fragment.glsl'


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

const DandelionMaterial = shaderMaterial(
    {
        uColor: new Color('#eafdce'),
        uTime: 0,
        transparent: true,
        depthWrite: false,
        // sizeAttenuation needs to be calc in the shader
    },
    dandelionVertexShader,
    dandelionFragmentShader 
)
extend({ DandelionMaterial })

// make a dandelion... 
function Dandelion() {
    //I nee a geometry to get the vertices from:
    const geometry = useMemo(() => new IcosahedronGeometry(0.5, 3));
    // console.log(geometry);
    const positionsArray = useMemo(() => geometry.attributes.position.array, [geometry])
    // console.log(positionsArray)
    // shatter the dandelion: 

    function shatter() 
    {
        console.log('shatter!')
    }

    return (
        <group position={[0, 1.5, 0]} onPointerDown={ shatter }>
            <mesh visible={ true } 
            position={ [0, - 0.04, 0 ] }
            >
                <sphereGeometry 
                args={ [ 0.14, 10, 3, Math.PI * 0.00,  Math.PI * 2.00, Math.PI * 0.00, Math.PI * 0.60 ]}
                />
                <meshBasicMaterial 
                    color={ '#248424' }
                    // opacity={ 0.5 }
                    // transparent={ true }
                />
            </mesh>
            <mesh visible={ true } position={ [0, - 0.5, 0 ] }
>
                <cylinderGeometry 
                args={ [ 0.04, 0.04, 1, 8]}
                />
                <meshBasicMaterial 
                    color={ '#248424' }
                    // opacity={ 0.5 }
                    // transparent={ true }
                />
            </mesh>

            <Points positions={ positionsArray } >
                <dandelionMaterial />
            </Points>

        </group>
    )
}



export default function Experience()
{
    //note the file path to public...!!!!
    const perlinTexture = useTexture('/perlin.png')
    // console.log(perlinTexture)

    const grassMaterial = useRef()
    const dandelionMaterial = useRef()

    useFrame((state, delta) => {
        // console.log(delta);
        grassMaterial.current.uTime += delta
        
    })
    
    //instantiate leva's controls and pass it an object:
    const { perfVisible } = useControls({
        perfVisible: true
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

        <Dandelion />
        
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
