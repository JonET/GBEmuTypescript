///<reference path="MMU.ts"/>
///<reference path="CPU.ts"/>
///<reference path="GPU.ts"/>

module GameboyEmulator {
    export class Emulator {
        
        private _mmu: MMU;
        private _cpu: CPU;
        private _gpu: GPU;

        constructor () {
            this._mmu = new MMU();
            this._cpu = new CPU(this._mmu);
            this._gpu = new GPU(this._mmu);
        }

        start() {
            var mainLoop = () => {
                for (var i = 0; i < 10000; ++i) {
                    if (this._cpu.IsRunning === false) {
                        clearInterval(cancelToken);
                        return;
                    }
                    this._cpu.step();
                    this._gpu.step(this._cpu.Count);
                }
            }

            this._cpu.IsRunning = true;
            var cancelToken = setInterval(mainLoop, 4);
            
        }

    }
}