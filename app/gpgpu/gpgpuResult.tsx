import { useEffect } from 'react';
import { BoidDisplay } from './Boid/BoidDisplay';


export function GPGPUResult() {
    let container: HTMLElement;
    const containerId: string = 'gpgpu-result';

    useEffect(() => {
        if (container) {
            return;
        }
        container = document.getElementById(containerId)!
        
        BoidDisplay(container);
    });

    return (
        <div id={containerId}></div>
    );
}