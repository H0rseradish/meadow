
import { useRef, useMemo, useState } from 'react'
import { Point, Points, PointMaterial, shaderMaterial, OrbitControls, useTexture, Wireframe } from '@react-three/drei'
//using this in the experience but can be wherever...
import { button, useControls } from 'leva'

import { Color, IcosahedronGeometry, Uniform } from 'three'
import { extend, useFrame } from '@react-three/fiber'

import dandelionVertexShader from './shaders/dandelion/vertex.glsl'
import dandelionFragmentShader from './shaders/dandelion/fragment.glsl'


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
export default function Dandelion({ position }) 
{
    // I need a ref to be able to get to it to set stuff on it:
    const dandelionMaterial = useRef();

    useFrame((state, delta) => {
        // console.log(delta);
        dandelionMaterial.current.uTime += delta;
    })

    /** 
     * Seeds
     */
    
    const seeds = {};
    //I nee a geometry to get the vertices from:
    //If I used the r3f icosahedronGeometry would it automatically get disposed of?
    seeds.geometry = useMemo(() => new IcosahedronGeometry(0.5, 3));
    // console.log(geometry);
    // CHECK: Disposal - BECAUSE ITS A THREE GEOMETRY!, and also get rid of unnecessary attributes???

    // but I dont need the below? BECAUSE ITS ALREADY A GEOMETRY!!! Yes I do though because of the positions for the shader - (passing the geometry in the jsx doesnt work)
    seeds.positionsArray = useMemo(() => seeds.geometry.attributes.position.array, [seeds.geometry]);
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
        <group position={ position } >
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

            <Points positions={ seeds.positionsArray } onPointerDown={ seedheadShatter }>
                <dandelionMaterial ref={ dandelionMaterial } />
            </Points>

        </group>
    )
}


