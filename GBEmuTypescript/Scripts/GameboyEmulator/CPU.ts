///<reference path="MMU.ts"/>

module GameboyEmulator {
    // Emulates a Gameboy Z80

    export class CPU {
        private _mmu: MMU;
        private _opcodeMap: { [s: any]: (c: CPU) => void; };
        private _cbMap: { [s: any]: (c: CPU) => void; };

        public counters = {
            cycles: 0,      // T-Counter -- I'm not sure how useful this is.
            machine: 0      // M-Counter
        };

        public registers = {
            // 8-bit registers
            a: 0,           // accumulator
            f: 0,           // flag
            b: 0,           // general-purpose
            c: 0,           // general-purpose
            d: 0,           // general-purpose
            e: 0,           // general-purpose
            h: 0,           // general-purpose
            l: 0,           // general-purpose 

            // 16-bit registers
            pc: 0,          // program counter
            sp: 0,          // stack pointer

            // time taken for the last instruction to execute
            // (to be added to the counters)
            cycles: 0,
            machine: 0
        };

        // pretty prints registers together as hex as a debugging aid
        public get AF(): String {
            var hexstring = zeroPad(this.registers.a.toString(16).substr(0, 2), 2) +
                            zeroPad(this.registers.f.toString(16).substr(0, 2), 2);
            return hexstring;
        }

        public get BC(): String {
            var hexstring = zeroPad(this.registers.b.toString(16).substr(0, 2), 2) +
                            zeroPad(this.registers.c.toString(16).substr(0, 2), 2);
            return hexstring;
        }

        public get DE(): String {
            var hexstring = zeroPad(this.registers.d.toString(16).substr(0, 2), 2) +
                            zeroPad(this.registers.e.toString(16).substr(0, 2), 2);
            return hexstring;
        }

        public get HL(): String {
            var hexstring = zeroPad(this.registers.h.toString(16).substr(0, 2), 2) +
                            zeroPad(this.registers.l.toString(16).substr(0, 2), 2);
            return hexstring;
        }

        constructor (mmu: MMU) {
            this._mmu = mmu;
            this.createOpcodeMap();
        }

        private createOpcodeMap() {
            this._opcodeMap = {
                0x00: this.nop,
                0x01: this.ldBcNn,
                0x06: this.ldBN,
                0x0C: this.incC,
                0x0E: this.ldCN,
                0x11: this.ldDeNn,
                0x1A: this.ldADEr,
                0x20: this.jrNzN,
                0x21: this.ldHlNn,
                0x31: this.ldSpNn,
                0x32: this.lddHlA,
                0x3E: this.ldAN,
                0x4F: this.ldCA,
                0x77: this.ldHlA,
                0xAF: this.xorA,                
                0xC5: this.pushBC,
                0xCB: this.executeCB,
                0xCD: this.callNn,
                0xD5: this.pushDE,
                0xE0: this.ldhNA,
                0xE2: this.ldCpA,
                0xF5: this.pushAF,                
            };

            this._cbMap = {
                0x7C: this.bit7H,
            };
        }

        run() {

            while (true) {
                // fetch
                var opCode = this._mmu.readByte(this.registers.pc);
                this.registers.pc += 1;

                // decode
                if (this._opcodeMap[opCode] === undefined) {
                    alert("Missing Opcode: " + zeroPad(opCode.toString(16), 2));
                    return;
                }

                var operation = this._opcodeMap[opCode];

                this.counters.cycles += this.registers.cycles;
                this.counters.machine += this.registers.machine;

                // execute
                operation(this);
            }
        }

        // 0x00 NOP
        nop(cpu: CPU) {
            var r = cpu.registers
            r.machine = 1,
            r.cycles = 4
        }


        // 0x0C INC C
        incC(cpu: CPU) {
            var r = cpu.registers;
            
            // check to see if this is going to cause some nibbles to overflow
            if ((r.c & 0xf) === 0xf) {
                r.f |= 0x20;    // set half carry
            }
            else {
                r.f &= ~0x20;   // reset half carry
            }

            r.c++;
            r.c &= 0xFF;

            if (r.c === 0) {
                r.f |= 0x80;    // set Z
            }
            else {
                r.f &= ~0x80;   // reset Z
            }

            r.f &= ~0x40; // reset N

            r.machine = 1,
            r.cycles = 4
        }
            
        // 0x0E LD C n
        ldCN(cpu: CPU) {
            var r = cpu.registers;
            r.c = cpu._mmu.readByte(r.pc++);
            r.machine = 2,
            r.cycles = 8
        }

        // 0x3E LD A n
        ldAN(cpu: CPU) {
            var r = cpu.registers;
            r.a = cpu._mmu.readByte(r.pc++);
            r.machine = 2,
            r.cycles = 8
        }

        // 0x06 LD B,d8
        ldBN(cpu: CPU) {
            var r = cpu.registers;
            r.b = cpu._mmu.readByte(r.pc++);
            r.machine = 2,
            r.cycles = 8
        }

        // 0x4F LD C,A
        ldCA(cpu: CPU) {
            var r = cpu.registers;
            r.a = r.c;
            r.machine = 1,
            r.cycles = 4
        }

        // 0x20: JR NZ,r8  Relative jump to immediate value if Zero flag not set
        jrNzN(cpu: CPU) {
            var r = cpu.registers;
            var value = cpu._mmu.readByte(r.pc++);           

            r.machine = 2;
            r.cycles = 8;

            if ((cpu.registers.f & 0x80) === 0) {

                if (value > 127) // negative
                {
                    // apply ones compliment and mask to 8 bits to get usable negative value
                    value = -((~value + 1) & 0xFF);
                }

                // do the relative jump and add cycles to the clock
                r.pc += value;
                r.machine += 1;
                r.cycles += 4;
            }
            else {
                console.log("done. HL " + cpu.HL);
            }


            // we don't really need to do anything if zero is set            
        }

        // Call Address
        callNn(cpu: CPU) {
            var r = cpu.registers;
            r.sp -= 2;
            cpu._mmu.writeWord(r.sp, r.pc + 2);
            r.pc = cpu._mmu.readWord(r.pc);       
            r.machine = 6;
            r.cycles = 24;
        }

        // Stack Pushers

        // 0xC5
        pushBC(cpu: CPU) {
            cpu.push16(cpu, cpu.registers.b, cpu.registers.c);
        }

        // 0xD5
        pushDE(cpu: CPU) {
            cpu.push16(cpu, cpu.registers.d, cpu.registers.e);
        }

        // 0xE5
        pushHL(cpu: CPU) {
            cpu.push16(cpu, cpu.registers.h, cpu.registers.l);
        }

        // 0xF5
        pushAF(cpu: CPU) {
            cpu.push16(cpu, cpu.registers.a, cpu.registers.f);
        }

        push16(cpu: CPU, a: number, b: number) {
            var r = cpu.registers;
            r.sp--;
            cpu._mmu.writeByte(r.sp, a);
            r.sp--;
            cpu._mmu.writeByte(r.sp, b);

            cpu.counters.machine += 4;
            cpu.counters.cycles += 16;
        }
        

        // Load 16 bit immediate into register

        // 0x01: LD BC,d16  Load a 16 bit immediate into DE
        ldBcNn(cpu: CPU) {
            var r = cpu.registers;
            r.b = cpu._mmu.readByte(r.pc++);
            r.c = cpu._mmu.readByte(r.pc++);
            r.machine = 3;
            r.cycles = 12;
        }

        // 0x11: LD DE,d16  Load a 16 bit immediate into DE
        ldDeNn(cpu: CPU) {
            var r = cpu.registers;
            r.e = cpu._mmu.readByte(r.pc++);
            r.d = cpu._mmu.readByte(r.pc++);
            r.machine = 3;
            r.cycles = 12;
        }

        // 0x21: LD HL,d16  Load a 16 bit immediate into  HL
        ldHlNn(cpu: CPU) {
            var r = cpu.registers;
            r.l = cpu._mmu.readByte(r.pc++);
            r.h = cpu._mmu.readByte(r.pc++);
            r.machine = 3;
            r.cycles = 12;
        }        

        // 0x31: LD HL,d16  Load a 16 bit immediate into  SP
        ldSpNn(cpu: CPU) {
            var r = cpu.registers;
            r.sp = cpu._mmu.readWord(r.pc);
            r.pc += 2;
            r.machine = 3;
            r.cycles = 12;
        }



        // 0x1A: LD A,(DE)
        ldADEr(cpu: CPU) {
            var r = cpu.registers;
            r.a = cpu._mmu.readByte((r.e << 8) + r.d);
            r.machine = 1;
            r.cycles = 4;
        }

        // 0x77: LD HL A : Write to the memory location at HL with the value of A
        ldHlA(cpu: CPU) {
            var r = cpu.registers;
            cpu._mmu.writeWord((r.h << 8) + r.l, r.a);

            r.machine = 2;
            r.cycles = 8;
        }

        // 0x32: LDD HL A : Write to the memory location at HL with the value of A, then decriment HL
        lddHlA(cpu: CPU) {
            var r = cpu.registers;
            cpu._mmu.writeWord((r.h << 8) + r.l, r.a);

            // 16 bit subtraction
            r.l = (r.l - 1) & 0xFF;
            if (r.l == 0xFF) {
                r.h = (r.h - 1) & 0xFF;
            }

            r.machine = 2;
            r.cycles = 8;
        }
        
        // 0xAF: XOR A. Effectivly set a to 0
        xorA(cpu: CPU) {
            var r = cpu.registers;
            r.a ^= r.a;
            r.f = 0x80;
            r.machine = 1;
            r.cycles = 4;            
        }
        
        // 0xC2 LD (C),A
        ldCpA(cpu: CPU) {
            var r = cpu.registers;
            cpu._mmu.writeByte(0xFF00 + r.c, r.a);
            r.machine = 2;
            r.cycles = 8;
         }

        // 0xE0 LDH (a8),A
        ldhNA(cpu: CPU) {
            var r = cpu.registers;
            var value = cpu._mmu.readByte(r.pc++);
            cpu._mmu.writeByte(0xFF00 + r.a, value);
            r.machine = 3,
            r.cycles = 12
        }


        // 0xCB: Execute a CB-prefix extended op
        executeCB(cpu: CPU) {
             // fetch
            var opCode = cpu._mmu.readByte(cpu.registers.pc++);

            // decode
            if(cpu._cbMap[opCode] === undefined)
                return;

            var operation = cpu._cbMap[opCode];
            operation(cpu);
        }

        // 0xCB7H Test bit 7 of H
        bit7H(cpu: CPU) {
            var r = cpu.registers;
            var test = r.h & 0x80;
            if (test === 0) {
                r.f |= 0x80; // set Z
            }
            else {
                r.f &= ~0x80; // reset Z
            }
            r.f |= 0x20;  // set HC
            r.f &= ~0x40; // reset N

            r.machine = 2;
            r.cycles = 8;
        }


    }

}