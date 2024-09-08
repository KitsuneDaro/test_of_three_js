import { useEffect } from 'react';
import { FishDisplay } from '../gpgpu/Fish/FishDisplay';

export function GPGPUResult() {
    let container: HTMLElement;
    const containerId: string = 'gpgpu-result';

    useEffect(() => {
        if (container) {
            return;
        }
        container = document.getElementById(containerId)!
        
        FishDisplay(container);
    });

    return (
        <div id={containerId}></div>
    );
}