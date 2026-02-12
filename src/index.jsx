import './style.css'
import ReactDOM from 'react-dom/client'
import { Canvas } from '@react-three/fiber'
import Experience from './Experience.jsx'
import { Suspense, StrictMode } from 'react'
import { Leva } from 'leva'


const root = ReactDOM.createRoot(document.querySelector('#root'))

root.render(
    <StrictMode>
        {/* By adding Leva here we get access to its attributes like collapsed docs at https://github.com/pmndrs/leva/blob/main/docs/configuration.md */}
        <Leva collapsed />
        <Canvas
            shadows
            camera={ {
                fov: 45,
                near: 0.1,
                far: 200,
                position: [0, 2.5, 7 ]
            } }
        >
            <Suspense>
                <Experience />
            </Suspense>
            
        </Canvas>
    </StrictMode>
)