///<reference path="MMU.ts"/>
///<reference path="CPU.ts"/>
///<reference path="GPU.ts"/>

module GameboyEmulator {
    export class Emulator {
        
        private mmu: MMU;
        private cpu: CPU;
        private gpu: GPU;

        constructor () {
            this.mmu = new MMU();
            this.cpu = new CPU(this.mmu);
            this.gpu = new GPU(this.mmu);            
        }

        start() {
            var cancelToken: number;

            var mainLoop = () => {
                for (var i = 0; i < 10000; ++i) {
                    if (this.cpu.IsRunning === false) {
                        clearInterval(cancelToken);
                        return;
                    }
                    this.cpu.step();
                    this.gpu.step(this.cpu.Count);
                }
            }

            this.mmu.reset(() => {
                this.cpu.IsRunning = true;
                cancelToken = setInterval(mainLoop, 4);
            });
            
        }

    }
}