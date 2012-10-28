module GameboyEmulator{
    export var zeroPad = function (number: string, length: number) {
        while (number.length < length) number = '0' + number;
        return number

    };

    export class MMU {
        public bios: number[] = [
                0x31, 0xFE, 0xFF, 0xAF, 0x21, 0xFF, 0x9F, 0x32, 0xCB, 0x7C, 0x20, 0xFB, 0x21, 0x26, 0xFF, 0x0E,
                0x11, 0x3E, 0x80, 0x32, 0xE2, 0x0C, 0x3E, 0xF3, 0xE2, 0x32, 0x3E, 0x77, 0x77, 0x3E, 0xFC, 0xE0,
                0x47, 0x11, 0x04, 0x01, 0x21, 0x10, 0x80, 0x1A, 0xCD, 0x95, 0x00, 0xCD, 0x96, 0x00, 0x13, 0x7B,
                0xFE, 0x34, 0x20, 0xF3, 0x11, 0xD8, 0x00, 0x06, 0x08, 0x1A, 0x13, 0x22, 0x23, 0x05, 0x20, 0xF9,
                0x3E, 0x19, 0xEA, 0x10, 0x99, 0x21, 0x2F, 0x99, 0x0E, 0x0C, 0x3D, 0x28, 0x08, 0x32, 0x0D, 0x20,
                0xF9, 0x2E, 0x0F, 0x18, 0xF3, 0x67, 0x3E, 0x64, 0x57, 0xE0, 0x42, 0x3E, 0x91, 0xE0, 0x40, 0x04,
                0x1E, 0x02, 0x0E, 0x0C, 0xF0, 0x44, 0xFE, 0x90, 0x20, 0xFA, 0x0D, 0x20, 0xF7, 0x1D, 0x20, 0xF2,
                0x0E, 0x13, 0x24, 0x7C, 0x1E, 0x83, 0xFE, 0x62, 0x28, 0x06, 0x1E, 0xC1, 0xFE, 0x64, 0x20, 0x06,
                0x7B, 0xE2, 0x0C, 0x3E, 0x87, 0xF2, 0xF0, 0x42, 0x90, 0xE0, 0x42, 0x15, 0x20, 0xD2, 0x05, 0x20,
                0x4F, 0x16, 0x20, 0x18, 0xCB, 0x4F, 0x06, 0x04, 0xC5, 0xCB, 0x11, 0x17, 0xC1, 0xCB, 0x11, 0x17,
                0x05, 0x20, 0xF5, 0x22, 0x23, 0x22, 0x23, 0xC9, 0xCE, 0xED, 0x66, 0x66, 0xCC, 0x0D, 0x00, 0x0B,
                0x03, 0x73, 0x00, 0x83, 0x00, 0x0C, 0x00, 0x0D, 0x00, 0x08, 0x11, 0x1F, 0x88, 0x89, 0x00, 0x0E,
                0xDC, 0xCC, 0x6E, 0xE6, 0xDD, 0xDD, 0xD9, 0x99, 0xBB, 0xBB, 0x67, 0x63, 0x6E, 0x0E, 0xEC, 0xCC,
                0xDD, 0xDC, 0x99, 0x9F, 0xBB, 0xB9, 0x33, 0x3E, 0x3c, 0x42, 0xB9, 0xA5, 0xB9, 0xA5, 0x42, 0x4C,
                0x21, 0x04, 0x01, 0x11, 0xA8, 0x00, 0x1A, 0x13, 0xBE, 0x20, 0xFE, 0x23, 0x7D, 0xFE, 0x34, 0x20,
                0xF5, 0x06, 0x19, 0x78, 0x86, 0x23, 0x05, 0x20, 0xFB, 0x86, 0x20, 0xFE, 0x3E, 0x01, 0xE0, 0x50
        ];

        private isInBios: bool;
        public rom: number[] = [];           // 4000-7FFF
        public videoRam: number[] = [];      // 8000-9FFF (will be moved to GPU eventually)
        public extRam: number[] = [];        // A000-BFFF
        public workingRam: number[] = [];    // C000-DFFF (with read-only shadow at E000-FDFF)
        public ioRegisters: number[] = [];         // FF00-FF7F memory mapped IO
        public zRam: number[] = [];          // FF80-FFFF

        constructor () {
            this.reset();
        }

        reset() {
            this.isInBios = true;

            for (var i = 0; i < 0x1FFF; ++i) {
                this.videoRam[i] = 0;
                this.extRam[i] = 0;
                this.workingRam[i] = 0;
            }

            for (var i = 0; i < 0x7F; ++i) {
                this.zRam[i] = 0;
            }
        }

        readByte(address: number) {
            // Is in BIOS
            if (address <= 0xFF && this.isInBios) {
                return this.bios[address];
            }

            // Is in ROM0 or ROM1
            if (address <= 0x7FFF) {
                if (address >= 0x104 && address <= 0x0133) {
                    return this.bios[0x00A8 + (address - 0x104)]; // HACK! Redirecting this into the bios where the original Nintendo Logo lives.
                }
                return 0;   // Rom not implemented yet.
            }

            // Video RAM
            if (address <= 0x9FFF) {
                return this.videoRam[address - 0x8000];
            }

            // External RAM
            if (address <= 0xBFFF) {
                return this.extRam[address - 0xA000];
            }

            // Working RAM
            if (address <= 0xDFFF) {
                return this.workingRam[address - 0xC000];
            }

            // Working RAM shadow
            if (address <= 0xFDFF) {
                return this.workingRam[address - 0xC000];
            }

            // Graphics Object Attributes Memory (OAM)
            if (address <= 0xFE9F) {
                return 0;  // GPU not implemented yet
            }

            // Unusable Memory
            if (address <= 0xFEFF) {
                return 0; // I guess return 0 since it's "unusable"?
            }

            // Hardware IO Registers
            if (address <= 0xFF7F) {
                return this.ioRegisters[address - 0xFF00]; // IO Not yet implemented
            }

            // "Zero page" RAM
            if (address <= 0xFFFE) {
                return this.zRam[address - 0xFF80];
            }

        }

        readWord(address: number) {
            return (this.readByte(address + 1) << 8) | this.readByte(address);
        }

        writeByte(address: number, value: number) {

            // Read only memory. Get that weak shit outahere!
            if (address <= 0x7FFF) {
                return;
            }

            // Video RAM
            if (address <= 0x9FFF) {
                this.videoRam[address - 0x8000] = value;
                return;
            }

            // External RAM
            if (address <= 0xBFFF) {
                this.extRam[address - 0xA000] = value;
                return;
            }

            // Working RAM
            if (address <= 0xDFFF) {
                this.workingRam[address - 0xC000] = value;
                return;
            }

            // Working RAM shadow
            if (address <= 0xFDFF) {
                this.workingRam[address - 0xC000] = value;
                return;
            }

            // Graphics Object Attributes Memory (OAM)
            if (address <= 0xFE9F) {
                return;  // GPU not implemented yet
            }

            // Unusable Memory
            if (address <= 0xFEFF) {
                return;
            }

            // Hardware IO Registers
            if (address <= 0xFF7F) {
                this.ioRegisters[address - 0xFF00] = value; // IO Not yet implemented
                return;
            }

            // "Zero page" RAM
            if (address <= 0xFFFE) {
                this.zRam[address - 0xFF80] = value;
                return;
            }  
        }

        writeWord(address: number, value: number) {
            this.writeByte(address, value & 0xFF);
            this.writeByte(address + 1, value >> 8);
        }
    }
}