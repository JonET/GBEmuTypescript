///<reference path="MMU.ts"/>
///<reference path="CPU.ts"/>

module GameboyEmulator {
    export class Emulator {
        
        private _mmu: MMU;
        private _cpu: CPU;

        constructor () {
            this._mmu = new MMU();
            this._cpu = new CPU(this._mmu);
        }

        start() {
            this._cpu.run();
        }

    }
}