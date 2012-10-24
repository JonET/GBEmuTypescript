///<reference path="MMU.ts"/>

module GameboyEmulator {

    // Emulates a Gameboy Z80
    export class CPU {
        private mmu: MMU;
        private _opcodeMap: { (c: CPU): void; }[];
        private _cbMap: { [s: any]: (c: CPU) => void; };

        public A: number = 0;
        public B: number = 0;  
        public C: number = 0;
        public D: number = 0;
        public E: number = 0;
        public H: number = 0;
        public L: number = 0;

        public PC: number = 0;
        public SP: number = 0;

        public Count: number = 0;   // program count in machine cycles

        public FZ: bool = false;    // 0x80 zero
        public FN: bool = false;    // 0x40 negative
        public FH: bool = false;    // 0x20 half-carry
        public FC: bool = false;    // 0x10 carry

        public get F(): number {
            return (Number(this.FZ) << 7) |
                   (Number(this.FN) << 6) |
                   (Number(this.FH) << 6) |
                   (Number(this.FC) << 5);
        }

        public set F(value: number) {
            this.FZ = (value & 0x80) === 0x80;
            this.FN = (value & 0x40) === 0x40;
            this.FH = (value & 0x20) === 0x20;
            this.FC = (value & 0x10) === 0x10;
        }

        public get AF(): number {
            return (this.A << 8) + this.F;
        }        

        public get HL(): number {
            return (this.H << 8) + this.L;
        }

        public set HL(value: number) {
            this.H = value & 0xF0 >> 8;
            this.L = value & 0XF;

        }

        public get BC(): number {
            return (this.B << 8) + this.C;
        }

        public get DE(): number {
            return (this.D << 8) + this.E;
        }

        // pretty prints registers together as hex as a debugging aid
        public get AFh(): String {
            var hexstring = zeroPad(this.A.toString(16).substr(0, 2), 2) +
                            zeroPad(this.F.toString(16).substr(0, 2), 2);
            return hexstring;
        }

        public get BCh(): String {
            var hexstring = zeroPad(this.B.toString(16).substr(0, 2), 2) +
                            zeroPad(this.C.toString(16).substr(0, 2), 2);
            return hexstring;
        }

        public get DEh(): String {
            var hexstring = zeroPad(this.D.toString(16).substr(0, 2), 2) +
                            zeroPad(this.E.toString(16).substr(0, 2), 2);
            return hexstring;
        }

        public get HLh(): String {
            var hexstring = zeroPad(this.H.toString(16).substr(0, 2), 2) +
                            zeroPad(this.L.toString(16).substr(0, 2), 2);
            return hexstring;
        }

        constructor (mmu: MMU) {
            this.mmu = mmu;
            this.createOpcodeMap();
        }


        private createOpcodeMap() {
            this._opcodeMap = [
                    //x0                //x1                //x2                //x3                //x4                //x5                //x6                //x7                   //x8                 //x9                //xA                //xB                //xC                //xD                //xE                //xF
            /*0x*/  this.NOP,           this.LD_BC_d16,     this.notImpl,       this.INC_BC,        this.INC_B,         this.DEC_B,         this.LD_B_d8,       this.RLCA,      /*0x*/ this.notImpl,        this.notImpl,       this.notImpl,       this.DEC_BC,       this.INC_C,         this.DEC_C,         this.LD_C_N,        this.notImpl,
            /*1x*/  this.notImpl,       this.LD_DE_d16,     this.notImpl,       this.INC_DE,        this.INC_D,         this.DEC_D,         this.notImpl,       this.RLA,       /*1x*/ this.notImpl,        this.notImpl,       this.LD_A_DEm,      this.DEC_DE,       this.INC_E,         this.DEC_E,         this.notImpl,       this.notImpl,
            /*2x*/  this.JR_NZ_r8,      this.LD_HL_d16,     this.LD_HLmi_A,     this.INC_HL,        this.INC_H,         this.DEC_H,         this.notImpl,       this.notImpl,   /*2x*/ this.notImpl,        this.notImpl,       this.notImpl,       this.DEC_HL,       this.INC_L,         this.DEC_L,         this.notImpl,       this.notImpl,
            /*3x*/  this.notImpl,       this.LD_SP_d16,     this.LD_HLmd_A,     this.INC_SP,        this.INC_HLm,       this.DEC_HLm,       this.notImpl,       this.notImpl,   /*3x*/ this.notImpl,        this.notImpl,       this.notImpl,       this.DEC_SP,       this.INC_A,         this.DEC_A,         this.LD_A_d8,       this.notImpl,
            /*4x*/  this.LD_B_B,        this.LD_B_C,        this.LD_B_D,        this.LD_B_E,        this.LD_B_H,        this.LD_B_L,        this.LD_B_HLm,      this.LD_B_A,    /*4x*/ this.LD_C_B,         this.LD_C_C,        this.LD_C_D,        this.LD_C_E,        this.LD_C_H,        this.LD_C_L,        this.LD_C_HLm,      this.LD_C_A,
            /*5x*/  this.LD_D_B,        this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,   /*5x*/ this.notImpl,        this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,
            /*6x*/  this.LD_H_B,        this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,   /*6x*/ this.notImpl,        this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,
            /*7x*/  this.LD_HLm_B,      this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,       this.LD_HLm_A,  /*7x*/ this.notImpl,        this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,
            /*8x*/  this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,   /*8x*/ this.notImpl,        this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,
            /*9x*/  this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,   /*9x*/ this.notImpl,        this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,
            /*Ax*/  this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,   /*Ax*/ this.notImpl,        this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,       this.XOR_A,
            /*Bx*/  this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,   /*Bx*/ this.notImpl,        this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,
            /*Cx*/  this.notImpl,       this.POP_BC,        this.notImpl,       this.notImpl,       this.notImpl,       this.PUSH_BC,       this.notImpl,       this.notImpl,   /*Cx*/ this.notImpl,        this.RET,           this.notImpl,       this.EXEC_CB,       this.notImpl,       this.CALL_16a,      this.notImpl,       this.notImpl,
            /*Dx*/  this.notImpl,       this.POP_DE,        this.notImpl,       this.notImpl,       this.notImpl,       this.PUSH_DE,       this.notImpl,       this.notImpl,   /*Dx*/ this.notImpl,        this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,
            /*Ex*/  this.LDH_a8m_A,     this.POP_HL,        this.LD_Cm_A,       this.notImpl,       this.notImpl,       this.PUSH_HL,       this.notImpl,       this.notImpl,   /*Ex*/ this.notImpl,        this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,
            /*Fx*/  this.notImpl,       this.POP_AF,        this.notImpl,       this.notImpl,       this.notImpl,       this.PUSH_AF,       this.notImpl,       this.notImpl,   /*Fx*/ this.notImpl,        this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl,       this.notImpl    ];

            this._cbMap = {
                0x7C: this.BIT_7H,
                0x11: this.CB_RL_C
            };
        }

        run() {

            while (true) {
                // fetch
                var opCode = this.mmu.readByte(this.PC);
                this.PC += 1;

                // decode
                if (this._opcodeMap[opCode] === undefined || this._opcodeMap[opCode] === this.notImpl) {
                    alert("Missing Opcode: " + zeroPad(opCode.toString(16), 2));
                    return;
                }

                var operation = this._opcodeMap[opCode];

                //this.counters.machine += this.count;

                // execute
                operation(this);
            }
        }

        // == MISC/CONTROL INSTRUCTIONS ==

        notImpl(cpu: CPU) {
            // placeholder
        }

        // 0x00 NOP
        NOP(cpu: CPU) {
            cpu.Count += 1;
        }

        // 0x01 STOP 0

        // 0x76 HALT

        // 0xCB: Execute a CB-prefix extended op
        EXEC_CB(cpu: CPU) {
             // fetch
            var opCode = cpu.mmu.readByte(cpu.PC++);

            // decode
            if(cpu._cbMap[opCode] === undefined)
                alert("cb missing: " + opCode.toString(16));
                return;

            var operation = cpu._cbMap[opCode];
            operation(cpu);

            cpu.Count += 1;
        }

        // 0xF3 DI: Disable Interupts

        // 0xFB EI: Enable Interupts


        // == 8 BIT STORE/LOAD INSTRUCTIONS ==

        // 40 LD B,B
        LD_B_B(cpu: CPU) {
            cpu.B = cpu.B;
            cpu.Count += 1;
        }

        // 41 LD B,C
        LD_B_C(cpu: CPU) {
            cpu.B = cpu.C;
            cpu.Count += 1;
        }

        // 42 LD B,D
        LD_B_D(cpu: CPU) {
            cpu.B = cpu.D;
            cpu.Count += 1;
        }

        // 43 LD B,E
        LD_B_E(cpu: CPU) {
            cpu.B = cpu.E;
            cpu.Count += 1;
        }

        // 44 LD B,H
        LD_B_H(cpu: CPU) {
            cpu.B = cpu.H;
            cpu.Count += 1;
        }

        // 45 LD B,L
        LD_B_L(cpu: CPU) {
            cpu.B = cpu.L;
            cpu.Count += 1;
        }

        // 46 LD B,(HL)
        LD_B_HLm(cpu: CPU) {
            cpu.B = cpu.mmu.readByte(cpu.HL);
            cpu.Count += 2;
        }

        // 47 LD B,A
        LD_B_A(cpu: CPU) {
            cpu.B = cpu.A
            cpu.Count += 1;
        }

        // 48 LD C,B
        LD_C_B(cpu: CPU) {
            cpu.C = cpu.B;
            cpu.Count += 1;
        }

        // 49 LD C,C
        LD_C_C(cpu: CPU) {
            cpu.C = cpu.C;
            cpu.Count += 1;
        }

        // 4A LD C,D
        LD_C_D(cpu: CPU) {
            cpu.C = cpu.D;
            cpu.Count += 1;
        }

        // 4B LD C,E
        LD_C_E(cpu: CPU) {
            cpu.C = cpu.E;
            cpu.Count += 1;
        }

        // 4C LD C,H
        LD_C_H(cpu: CPU) {
            cpu.C = cpu.H;
            cpu.Count += 1;
        }

        // 4D LD C,L
        LD_C_L(cpu: CPU) {
            cpu.C = cpu.L;
            cpu.Count += 1;
        }

        // 4E LD C,(HL)   2 counts
        LD_C_HLm(cpu: CPU) {
            cpu.C = cpu.mmu.readByte(cpu.HL);
            cpu.Count += 2;
        }

        // 4F LD C,A
        LD_C_A(cpu: CPU) {
            cpu.C = cpu.A;
            cpu.Count += 1;
        }

        // 50 LD D,B
        LD_D_B(cpu: CPU) {
            cpu.D = cpu.B;
            cpu.Count += 1; 
        }

        // 60 LD H,B
        LD_H_B(cpu: CPU) {
            cpu.H = cpu.B;
            cpu.Count += 1;
        }

        // 70 LD (HL),B
        LD_HLm_B(cpu: CPU) {
            cpu.mmu.writeWord(cpu.HL, cpu.B);
            cpu.Count += 2;
        }

        // Increment Functions 8-bit

        // 0x04 INC B
        INC_B(cpu: CPU) {
            cpu.FH = (((cpu.B & 0xf) + 1) & 0x10) === 0x10;
            cpu.B = (cpu.B + 1) & 0xFF;
            cpu.FZ = (cpu.B === 0);
            cpu.FN = false;

            cpu.Count += 1;
        }


        // 0x14 INC D
        INC_D(cpu: CPU) {
            cpu.FH = (((cpu.D & 0xf) + 1) & 0x10) === 0x10;
            cpu.D = (cpu.D + 1) & 0xFF;
            cpu.FZ = (cpu.D === 0);
            cpu.FN = false;

            cpu.Count += 1;
        }

        // 0x24 INC H
        INC_H(cpu: CPU) {
            cpu.FH = (((cpu.H & 0xf) + 1) & 0x10) === 0x10;
            cpu.H = (cpu.H + 1) & 0xFF;
            cpu.FZ = (cpu.H === 0);
            cpu.FN = false;

            cpu.Count += 1;
        }

        // 0x34 INC (HL)
        INC_HLm(cpu: CPU) {
            var val = cpu.mmu.readByte(cpu.HL);
            cpu.FH = (((val & 0xf) + 1) & 0x10) === 0x10;
            val = (val + 1) & 0xFF;
            cpu.FZ = (val === 0);
            cpu.FN = false;
            cpu.mmu.writeByte(cpu.HL, val);

            cpu.Count += 3;
        }


        // 0x0C INC C
        INC_C(cpu: CPU) {
            cpu.FH = (((cpu.C & 0xf) + 1) & 0x10) === 0x10;
            cpu.C = (cpu.C + 1) & 0xFF;
            cpu.FZ = (cpu.C === 0);
            cpu.FN = false;

            cpu.Count += 1;
        }

        // 0x1C INC E
        INC_E(cpu: CPU) {
            cpu.FH = (((cpu.E & 0xf) + 1) & 0x10) === 0x10;
            cpu.E = (cpu.E + 1) & 0xFF;
            cpu.FZ = (cpu.E === 0);
            cpu.FN = false;

            cpu.Count += 1;
        }

        // 0x2C INC L
        INC_L(cpu: CPU) {
            cpu.FH = (((cpu.L & 0xf) + 1) & 0x10) === 0x10;
            cpu.L = (cpu.L + 1) & 0xFF;
            cpu.FZ = (cpu.L === 0);
            cpu.FN = false;

            cpu.Count += 1;
        }

        // 0xeC INC A
        INC_A(cpu: CPU) {
            cpu.FH = (((cpu.A & 0xf) + 1) & 0x10) === 0x10;
            cpu.A = (cpu.A + 1) & 0xFF;
            cpu.FZ = (cpu.A === 0);
            cpu.FN = false;

            cpu.Count += 1;
        }


        // Decrement Functions 8-bit
        
        // 0x05 DEC B
        DEC_B(cpu: CPU) {
            cpu.FH = (((cpu.B & 0xf0) - 1) & 0x08) === 0x08;
            cpu.B = (cpu.B - 1) & 0xFF;
            cpu.FZ = (cpu.B === 0);
            cpu.FN = true;

            cpu.Count += 1;            
        }

        // 0x15 DEC D
        DEC_D(cpu: CPU) {
            cpu.FH = (((cpu.D & 0xf0) - 1) & 0x08) === 0x08;
            cpu.D = (cpu.D - 1) & 0xFF;
            cpu.FZ = (cpu.D === 0);
            cpu.FN = true;

            cpu.Count += 1;            
        }

        // 0x25 DEC H
        DEC_H(cpu: CPU) {
            cpu.FH = (((cpu.H & 0xf0) - 1) & 0x08) === 0x08;
            cpu.H = (cpu.H - 1) & 0xFF;
            cpu.FZ = (cpu.H === 0);
            cpu.FN = true;

            cpu.Count += 1;            
        }


        // 0x35 DEC (HL)
        DEC_HLm(cpu: CPU) {
            var val = cpu.mmu.readByte(cpu.HL);
            cpu.FH = (((val & 0xf0) - 1) & 0x08) === 0x08;
            val = (val - 1) & 0xFF;
            cpu.FZ = (val === 0);
            cpu.FN = true;
            cpu.mmu.writeByte(cpu.HL, val);

            cpu.Count += 3;
        }

        // 0x0D DEC C
        DEC_C(cpu: CPU) {
            cpu.FH = (((cpu.C & 0xf0) - 1) & 0x08) === 0x08;
            cpu.C = (cpu.C - 1) & 0xFF;
            cpu.FZ = (cpu.C === 0);
            cpu.FN = true;

            cpu.Count += 1;            
        }

        // 0x1D DEC E
        DEC_E(cpu: CPU) {
            cpu.FH = (((cpu.E & 0xf0) - 1) & 0x08) === 0x08;
            cpu.E = (cpu.E - 1) & 0xFF;
            cpu.FZ = (cpu.E === 0);
            cpu.FN = true;

            cpu.Count += 1;            
        }
        // 0x2D DEC L
        DEC_L(cpu: CPU) {
            cpu.FH = (((cpu.L & 0xf0) - 1) & 0x08) === 0x08;
            cpu.L = (cpu.L - 1) & 0xFF;
            cpu.FZ = (cpu.L === 0);
            cpu.FN = true;

            cpu.Count += 1;            
        }

        // 0x3D DEC A
        DEC_A(cpu: CPU) {
            cpu.FH = (((cpu.A & 0xf0) - 1) & 0x08) === 0x08;
            cpu.A= (cpu.A- 1) & 0xFF;
            cpu.FZ = (cpu.A === 0);
            cpu.FN = true;

            cpu.Count += 1;            
        }

        
        // Increment 16-bit functions
        // 0x03 INC BC
        INC_BC(cpu: CPU) {
            cpu.BC += 1;
            cpu.Count += 2;
        }

        // 0x13 INC DE
        INC_DE(cpu: CPU) {
            cpu.DE += 1;
            cpu.Count += 2;
        }

        // 0x23 INC HL
        INC_HL(cpu: CPU) {
            cpu.HL += 1;
            cpu.Count += 2;
        }

        // 0x33 INC SP
        INC_SP(cpu: CPU) {
            cpu.SP -= 1;
            cpu.Count += 2;
        }

        // Decrement 16-bit functions
        // 0x0B DEC_BC
        DEC_BC(cpu: CPU) {
            cpu.BC -= 1;
            cpu.Count += 2;
        }

        // 0x1B DEC DE
        DEC_DE(cpu: CPU) {
            cpu.DE -= 1;
            cpu.Count += 2;
        }

        // 0x2B DEC HL
        DEC_HL(cpu: CPU) {
            cpu.HL -= 1;
            cpu.Count += 2;
        }

        // 0x2B DEC SP
        DEC_SP(cpu: CPU) {
            cpu.SP -= 1;
            cpu.Count += 2;
        }
        
            
        // 0x0E LD C n
        LD_C_N(cpu: CPU) {
            cpu.C = cpu.mmu.readByte(cpu.PC++);
            cpu.Count += 2;
        }

        // 0x3E LD A n
        LD_A_d8(cpu: CPU) {
            cpu.A = cpu.mmu.readByte(cpu.PC++);
            cpu.Count += 2;
        }

        // 0x06 LD B,d8
        LD_B_d8(cpu: CPU) {
            cpu.B = cpu.mmu.readByte(cpu.PC++);
            cpu.Count += 2;
        }

        // 0x20: JR NZ,r8  Relative jump to immediate value if Zero flag not set
        JR_NZ_r8(cpu: CPU) {
            var value = cpu.mmu.readByte(cpu.PC++);

            if (cpu.FZ) {
                cpu.Count += 2;
                return;
            }

            // get the correct negative value
            if (value > 127) {
                value = -((~value + 1) & 0xFF);
            }

            cpu.PC += value;
            cpu.Count += 3;
        }

        // Call functiosn

        // 0xCD CALL a16 Call Address
        CALL_16a(cpu: CPU) {            
            cpu.SP -= 2;
            cpu.mmu.writeWord(cpu.SP, cpu.PC + 2);
            cpu.PC = cpu.mmu.readWord(cpu.PC);       
            cpu.Count += 6;
        }

        // 0xC9 RET
        RET(cpu: CPU) {
            cpu.PC = cpu.mmu.readWord(cpu.SP);
            cpu.SP += 2;
            cpu.Count += 4;
        }

        // Stack Pushers

        // 0xC5
        PUSH_BC(cpu: CPU) {
            cpu.push16(cpu, cpu.B, cpu.C);
        }

        // 0xD5
        PUSH_DE(cpu: CPU) {
            cpu.push16(cpu, cpu.D, cpu.E);
        }

        // 0xE5
        PUSH_HL(cpu: CPU) {
            cpu.push16(cpu, cpu.H, cpu.L);
        }

        // 0xF5
        PUSH_AF(cpu: CPU) {
            cpu.push16(cpu, cpu.A, cpu.F);
        }

        push16(cpu: CPU, a: number, b: number) {
            
            cpu.SP--;
            cpu.mmu.writeByte(cpu.SP, a);
            cpu.SP--;
            cpu.mmu.writeByte(cpu.SP, b);

            cpu.Count += 4;
        }

        // Stack Poppers

        // 0xC1 POP BC
        POP_BC(cpu: CPU) {
            cpu.C = cpu.mmu.readByte(cpu.SP++);
            cpu.B = cpu.mmu.readByte(cpu.SP++);
            cpu.Count += 3;
        }

        // 0xD1 POP BC
        POP_DE(cpu: CPU) {
            cpu.E = cpu.mmu.readByte(cpu.SP++);
            cpu.D = cpu.mmu.readByte(cpu.SP++);
            cpu.Count += 3;
        }

        // 0xE1 POP HL
        POP_HL(cpu: CPU) {
            cpu.L = cpu.mmu.readByte(cpu.SP++);
            cpu.H = cpu.mmu.readByte(cpu.SP++);
            cpu.Count += 3;
        }

        // 0xF1 POP AF
        POP_AF(cpu: CPU) {
            cpu.F = cpu.mmu.readByte(cpu.SP++);
            cpu.A = cpu.mmu.readByte(cpu.SP++);
            cpu.Count += 3;
        }

        // Load 16 bit immediate into register

        // 0x01: LD BC,d16  Load a 16 bit immediate into DE
        LD_BC_d16(cpu: CPU) {
            
            cpu.B = cpu.mmu.readByte(cpu.PC++);
            cpu.C = cpu.mmu.readByte(cpu.PC++);
            cpu.Count += 3;
        }

        // 0x11: LD DE,d16  Load a 16 bit immediate into DE
        LD_DE_d16(cpu: CPU) {
            
            cpu.E = cpu.mmu.readByte(cpu.PC++);
            cpu.D = cpu.mmu.readByte(cpu.PC++);
            cpu.Count += 3;
        }

        // 0x21: LD HL,d16  Load a 16 bit immediate into  HL
        LD_HL_d16(cpu: CPU) {
            
            cpu.L = cpu.mmu.readByte(cpu.PC++);
            cpu.H = cpu.mmu.readByte(cpu.PC++);
            cpu.Count += 3;
        }        

        // 0x31: LD HL,d16  Load a 16 bit immediate into  SP
        LD_SP_d16(cpu: CPU) {
            
            cpu.SP = cpu.mmu.readWord(cpu.PC);
            cpu.PC += 2;
            cpu.Count += 3;
        }

        // 0x1A: LD A,(DE)
        LD_A_DEm(cpu: CPU) {
            
            cpu.A = cpu.mmu.readByte((cpu.E << 8) + cpu.D);
            cpu.Count += 1;
        }

        // 0x77: LD (HL),A : Write to the memory location at HL with the value of A
        LD_HLm_A(cpu: CPU) {
            
            cpu.mmu.writeWord((cpu.H << 8) + cpu.L, cpu.A);

            cpu.Count += 2;
        }

        // 0x33: LDD HL A : Write to the memory location at HL with the value of A, then increment HL
        LD_HLmi_A(cpu: CPU){
            
            cpu.mmu.writeWord(cpu.HL, cpu.A);
            cpu.HL += 1;
            cpu.Count += 2;
        }

        // 0x32: LDD HL A : Write to the memory location at HL with the value of A, then decriment HL
        LD_HLmd_A(cpu: CPU){
            
            cpu.mmu.writeWord(cpu.HL, cpu.A);
            cpu.HL -= 1;
            cpu.Count += 2;
        }
        
        // 0xAF: XOR A. Effectivly set a to 0
        XOR_A(cpu: CPU) {            
            cpu.A ^= cpu.A;
            cpu.FZ = true;
            cpu.Count += 1;           
        }
        
        // 0xC2 LD (C),A
        LD_Cm_A(cpu: CPU) {            
            cpu.mmu.writeByte(0xFF00 + cpu.C, cpu.A);
            cpu.Count += 2;
         }

        // 0xE0 LDH (a8),A
        LDH_a8m_A(cpu: CPU) {            
            var value = cpu.mmu.readByte(cpu.PC++);
            cpu.mmu.writeByte(0xFF00 + cpu.A, value);
            cpu.Count += 3;
        }
        

        // 0xCB7H Test bit 7 of H
        BIT_7H(cpu: CPU) {
            cpu.FZ = ((cpu.H & 0x80) === 0);
            cpu.FH = true;
            cpu.FN = false;
            cpu.Count += 2;
        }

        // == Rotate and Shift Group ==

        //0x07 RLCA Rotate Left
        RLCA(cpu: CPU) {
            var highBit = ((cpu.A & 0x80) === 0x80) ? 1 : 0;
            cpu.FC = (highBit === 1);
            cpu.A = ((cpu.A << 1) | highBit) & 0xFF;
            cpu.FZ = false;
            cpu.FN = false;
            cpu.FH = false;

            cpu.Count += 1;
        }

        //0x17 RLA  Rotate Left through carry
        RLA(cpu: CPU) {
            var highBit = cpu.FC ? 1 : 0;
            cpu.FC = (cpu.A & 0x80) === 0x80;
            cpu.A = ((cpu.C << 1) | highBit) & 0xFF;
            cpu.FZ = false;
            cpu.FN = false;
            cpu.FH = false;

            cpu.Count += 1;
        }
        
        // 0xCB11 RL C  Rotate Left through carry
        CB_RL_C(cpu: CPU) {
            var highBit = cpu.FC ? 1 : 0;               // save the value out of FC
            cpu.FC = (cpu.C & 0x80) === 0x80;           // test to see if C is going to flow into Carry
            cpu.C = ((cpu.C << 1) | highBit) & 0xFF;    // shift left and shove the old value of FC into the low bit. mask to 8 bits.
            cpu.FZ = (cpu.C === 0);
            cpu.FN = false;
            cpu.FH = false;

            cpu.Count += 2;
        }
    }

}