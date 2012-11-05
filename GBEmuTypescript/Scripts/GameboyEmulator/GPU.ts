///<reference path="MMU.ts"/>

module GameboyEmulator {
    
    export class GPU {
        private canvas: HTMLCanvasElement;
        private context: CanvasRenderingContext2D;
        private imageData: ImageData;
        private mmu: MMU;
        private lastCpuClock: number = 0;
        private timeUntilNextUpdate: number = 0;
        private modeClock: number = 0;

        private tileSet: number[][][] = [];  // tileSet[tile][y][x];
        private palette: number[] = [ 0xFF, 0xAA, 0x55, 0x00 ];

        constructor (mmu: MMU) {
            var canvas = <HTMLCanvasElement> document.getElementById('screen');
            var context = canvas.getContext('2d');

            this.imageData = context.createImageData(160, 144);

            for (var i = 0; i < 160 * 144 * 4; i += 4) {
                this.imageData.data[i] = 0x99;
                this.imageData.data[i + 1] = 0x99;
                this.imageData.data[i + 2] = 0xFF;
                this.imageData.data[i + 3] = 0xFF;
            }

            context.putImageData(this.imageData, 0, 0);

            this.mmu = mmu;
            this.canvas = canvas;
            this.context = context;

            mmu.videoRamCallback = (address) => this.updateTileSet(address);

            mmu.ioMap.LcdMode = 2;
            this.timeUntilNextUpdate = 40;
            

            for (var tile = 0; tile < 384; tile++) {
                this.tileSet[tile] = [];
                for (var y = 0; y < 8; y++) {
                    this.tileSet[tile][y] = [0, 0, 0, 0, 0, 0, 0, 0];
                }
            }
        }

        updateTileSet(address: number) {
            if (address < 8000 || address > 0x97FF) {
                // We're only interested in addresses containing tile data
                return;
            }

            var tileSet = this.tileSet;

            var baseAddress = (address & 0x1FFE);
            var tile = baseAddress >> 4;
            var y = (baseAddress >> 1) & 7;

            var sx;
	        for(var x = 0; x < 8; x++)
	        {
	            // Find bit index for this pixel
	            sx = 1 << (7-x);

	            // Update tile set
	            this.tileSet[tile][y][x] =
	                (this.mmu.readByte(address) & sx ? 1 : 0) +
	                (this.mmu.readByte(address + 1) & sx ? 2 : 0);
	        }
        }

        renderScan() {
            var ioMap = this.mmu.ioMap;

            if (!ioMap.LcdDisplayEnable) {
                return;
            }

            var tileMapOffset = ioMap.BgTileMapDisplaySelect ? 0x9C00 : 0x9800;

            for (var i = 0; i < 160; ++i) {
                var tileIndex = this.mmu.readByte(tileMapOffset + (((ioMap.YCoordinate + ioMap.ScrollY) >> 3) << 5) + ((i + ioMap.ScrollX) >> 3));
                var tile = this.tileSet[tileIndex];
                var tileX = (i + ioMap.ScrollX) & 7;
                var tileY = (ioMap.YCoordinate + ioMap.ScrollY) & 7;

                var color = this.palette[tile[tileY][tileX]];

                var canvasOffset = (ioMap.YCoordinate * 160 * 4) + (i * 4);
                this.imageData.data[canvasOffset] = color;
                this.imageData.data[canvasOffset + 1] = color;
                this.imageData.data[canvasOffset + 2] = color;
                this.imageData.data[canvasOffset + 3] = color;
                this.imageData.data[canvasOffset + 4] = 0xFF;
            }

            //this.context.putImageData(this.imageData, 0, 0);
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
                        
                        this.renderScan();
                        this.mmu.ioMap.YCoordinate += 1;
                        
                        this.mmu.ioMap.CoincidenceFlag = (this.mmu.ioMap.YCoordinate === this.mmu.ioMap.YCoordinateCompare);
                        if (this.mmu.ioMap.YCoordinate == 143) {
                            this.mmu.ioMap.LcdMode = 1;
                            this.renderScan();
                            this.context.putImageData(this.imageData, 0, 0);
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