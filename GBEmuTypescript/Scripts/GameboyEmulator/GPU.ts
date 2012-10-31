///<reference path="MMU.ts"/>

module GameboyEmulator {
    
    export class GPU {
        private canvas: HTMLCanvasElement;
        private context: CanvasRenderingContext2D;
        private mmu: MMU;
        private lastCpuClock: number = 0;
        private timeUntilNextUpdate: number = 0;
        private modeClock: number = 0;

        constructor (mmu: MMU) {
            var canvas = <HTMLCanvasElement> document.getElementById('screen');
            var context = canvas.getContext('2d');

            var imageData = context.createImageData(160, 144);

            for (var i = 0; i < 160 * 144 * 4; i += 4) {
                imageData.data[i] = 0x99;
                imageData.data[i + 1] = 0x99;
                imageData.data[i + 2] = 0xFF;
                imageData.data[i + 3] = 0xFF;
            }

            context.putImageData(imageData, 0, 0);

            this.mmu = mmu;
            this.canvas = canvas;
            this.context = context;

            mmu.ioMap.LcdMode = 2;
            this.timeUntilNextUpdate = 40;
        }


        // sequence:
        // 2: 20 cycles     Reading OAM         |
        // 3: 43 cycles     Reading OAM+VRAM    |-> Done for 144 lines
        // 0: 51 cycles     HBlank              |
        // 1: 1140 cycles   VBlank      |-> Done for 10 additional "lines"
        step(cpuClock: number) {
            var deltaCpuClock = cpuClock - this.lastCpuClock;
            this.modeClock += deltaCpuClock;
            var mode = this.mmu.ioMap.LcdMode;
            var line = this.mmu.ioMap.YCoordinate;

            if (line < 143) {
                if (mode == 2) {
                    // Reading OAM
                    if (this.modeClock >= 19) {
                        this.mmu.ioMap.LcdMode = 3;
                        this.modeClock -= 19;
                    }
                }
                else if (mode == 3) {
                    // Reading OAM+VRAM
                    if (this.modeClock >= 42) {
                        this.mmu.ioMap.LcdMode = 0;
                        this.modeClock -= 42;
                    }
                }
                else if (mode == 0) {
                    // HBlank
                    if (this.modeClock >= 113) {
                        this.mmu.ioMap.YCoordinate += 1;
                        this.mmu.ioMap.CoincidenceFlag = (this.mmu.ioMap.YCoordinate === this.mmu.ioMap.YCoordinateCompare);
                        if (this.mmu.ioMap.YCoordinate == 143) {
                            this.mmu.ioMap.LcdMode = 1;
                        }
                        else {
                            this.mmu.ioMap.LcdMode = 2;
                        }
                        this.modeClock -= 133;
                    }
                }
            }
            else {
                // VBlank
                if (this.modeClock >= 1139) {
                    this.mmu.ioMap.YCoordinate = line + 1;
                    if (this.mmu.ioMap.YCoordinate >= 153) {
                        this.mmu.ioMap.LcdMode = 2;
                        this.mmu.ioMap.YCoordinate = 0;
                        this.mmu.ioMap.CoincidenceFlag = (this.mmu.ioMap.YCoordinate === this.mmu.ioMap.YCoordinateCompare);
                    }

                    this.modeClock -= 1139;
                }
            }
            
            this.lastCpuClock = cpuClock;
        }
    }
}