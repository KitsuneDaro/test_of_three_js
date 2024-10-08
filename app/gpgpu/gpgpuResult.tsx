import { useEffect } from 'react';
// import { BoidDisplay } from './Boid/BoidDisplay';
import { FishDisplay } from './Fish/FishDisplay';

export function GPGPUResult() {
    let container: HTMLElement;
    const containerId: string = 'gpgpu-result';

    useEffect(() => {
        if (container) {
            return;
        }
        container = document.getElementById(containerId)!
        
        FishDisplay(container);
        //BoidDisplay(container);
    });

    return (
        <div id={containerId}></div>
    );
}