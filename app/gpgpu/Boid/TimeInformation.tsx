export class TimeInformation{
    nowTime: number = 0;
    lastTime: number = 0;
    delta: number = 0;

    constructor() {
        this.nowTime = performance.now();
        this.lastTime = performance.now();
    }

    update() {
        this.nowTime = performance.now();
        this.delta = (this.nowTime - this.lastTime) / 1000;

        if ( this.delta > 1 ) {
            this.delta = 1;
        } // safety cap on large deltas
        
        this.lastTime = this.nowTime;
    }
}