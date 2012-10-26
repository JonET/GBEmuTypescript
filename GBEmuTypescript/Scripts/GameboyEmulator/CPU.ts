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
        
        public set AF(value: number) {
            this.A = value & 0xF0 >> 8;
            this.F = value & 0XF;
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
        
        public set BC(value: number) {
            this.B = value & 0xF0 >> 8;
            this.C = value & 0XF;
        }

        public get DE(): number {
            return (this.D << 8) + this.E;
        }

        public set DE(value: number) {
            this.D = value & 0xF0 >> 8;
            this.E = value & 0XF;
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
            /*0x*/  this.NOP,           this.LD_BC_d16,     this.LD_BCm_A,      this.INC_BC,        this.INC_B,         this.DEC_B,         this.LD_B_d8,       this.RLCA,      /*0x*/ this.LD_a16m_SP,     this.ADD_HL_BC,     this.notImpl,       this.DEC_BC,        this.INC_C,         this.DEC_C,         this.LD_C_d8,       this.RRCA,
            /*1x*/  this.notImpl,       this.LD_DE_d16,     this.LD_DEm_A,      this.INC_DE,        this.INC_D,         this.DEC_D,         this.LD_D_d8,       this.RLA,       /*1x*/ this.JR_r8,          this.ADD_HL_DE,     this.LD_A_DEm,      this.DEC_DE,        this.INC_E,         this.DEC_E,         this.LD_E_d8,       this.RRA,
            /*2x*/  this.JR_NZ_r8,      this.LD_HL_d16,     this.LD_HLmi_A,     this.INC_HL,        this.INC_H,         this.DEC_H,         this.LD_H_d8,       this.notImpl,   /*2x*/ this.JR_Z_r8,        this.ADD_HL_HL,     this.notImpl,       this.DEC_HL,        this.INC_L,         this.DEC_L,         this.LD_L_d8,       this.CPL,
            /*3x*/  this.JR_NC_r8,      this.LD_SP_d16,     this.LD_HLmd_A,     this.INC_SP,        this.INC_HLm,       this.DEC_HLm,       this.LD_HLm_d8,     this.notImpl,   /*3x*/ this.JR_C_r8,        this.ADD_HL_SP,     this.notImpl,       this.DEC_SP,        this.INC_A,         this.DEC_A,         this.LD_A_d8,       this.CCF,
            /*4x*/  this.LD_B_B,        this.LD_B_C,        this.LD_B_D,        this.LD_B_E,        this.LD_B_H,        this.LD_B_L,        this.LD_B_HLm,      this.LD_B_A,    /*4x*/ this.LD_C_B,         this.LD_C_C,        this.LD_C_D,        this.LD_C_E,        this.LD_C_H,        this.LD_C_L,        this.LD_C_HLm,      this.LD_C_A,
            /*5x*/  this.LD_D_B,        this.LD_D_C,        this.LD_D_D,        this.LD_D_E,        this.LD_D_H,        this.LD_D_L,        this.LD_D_HLm,      this.LD_D_A,    /*5x*/ this.LD_E_B,         this.LD_E_C,        this.LD_E_D,        this.LD_E_E,        this.LD_E_H,        this.LD_E_L,        this.LD_E_HLm,      this.LD_E_A,
            /*6x*/  this.LD_H_B,        this.LD_H_C,        this.LD_H_D,        this.LD_H_E,        this.LD_H_H,        this.LD_H_L,        this.LD_H_HLm,      this.LD_H_A,    /*6x*/ this.LD_L_B,         this.LD_L_C,        this.LD_L_D,        this.LD_L_E,        this.LD_L_H,        this.LD_L_L,        this.LD_L_HLm,      this.LD_L_A,
            /*7x*/  this.LD_HLm_B,      this.LD_HLm_C,      this.LD_HLm_D,      this.LD_HLm_E,      this.LD_HLm_H,      this.LD_HLm_L,      this.notImpl,       this.LD_HLm_A,  /*7x*/ this.LD_A_B,         this.LD_A_C,        this.LD_A_D,        this.LD_A_E,        this.LD_A_H,        this.LD_A_L,        this.LD_A_HLm,      this.LD_A_A,
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
            cpu.mmu.writeByte(cpu.HL, cpu.B);
            cpu.Count += 2;
        }

        // 41 LD B,C
        LD_B_C(cpu: CPU) {
            cpu.B = cpu.C;
            cpu.Count += 1;
        }

        // 51 LD D,C
        LD_D_C(cpu: CPU) {
            cpu.D = cpu.C;
            cpu.Count += 1;
        }
        // 61 LD H,C
        LD_H_C(cpu: CPU) {
            cpu.H = cpu.C;
            cpu.Count += 1;
        }
        // 71 LD (HL),C
        LD_HLm_C(cpu: CPU) {
            cpu.mmu.writeByte(cpu.HL, cpu.C);
            cpu.Count += 2;
        }

        // 42 LD B,D
        LD_B_D(cpu: CPU) {
            cpu.B = cpu.D;
            cpu.Count += 1;
        }

        // 52 LD D,D
        LD_D_D(cpu: CPU) {
            cpu.D = cpu.D;
            cpu.Count += 1;
        }

        // 62 LD H,D
        LD_H_D(cpu: CPU) {
            cpu.H = cpu.D;
            cpu.Count += 1;
        }

        // 72 LD (HL),D
        LD_HLm_D(cpu: CPU) {
            cpu.mmu.writeByte(cpu.HL, cpu.D);
            cpu.Count += 2;
        }

        // 43 LD B,E
        LD_B_E(cpu: CPU) {
            cpu.B = cpu.E;
            cpu.Count += 1;
        }

        // 53 LD D,E
        LD_D_E(cpu: CPU) {
            cpu.D = cpu.E;
            cpu.Count += 1;
        }

        // 63 LD H,E
        LD_H_E(cpu: CPU) {
            cpu.H = cpu.E;
            cpu.Count += 1;
        }

        // 73 LD (HL),E
        LD_HLm_E(cpu: CPU) {
            cpu.mmu.writeByte(cpu.HL, cpu.E);
            cpu.Count += 2;
        }

        // 53 LD B,H
        LD_B_H(cpu: CPU) {
            cpu.B = cpu.H;
            cpu.Count += 1;
        }

        // 63 LD D,H
        LD_D_H(cpu: CPU) {
            cpu.D = cpu.H;
            cpu.Count += 1;
        }

        // 73 LD H,H
        LD_H_H(cpu: CPU) {
            cpu.H = cpu.H;
            cpu.Count += 1;
        }

        // 44 LD (HL),H
        LD_HLm_H(cpu: CPU) {
            cpu.mmu.writeByte(cpu.HL, cpu.H);
            cpu.Count += 2;
        }

        // 45 LD B,L
        LD_B_L(cpu: CPU) {
            cpu.B = cpu.L;
            cpu.Count += 1;
        }

        // 55 LD D,L
        LD_D_L(cpu: CPU) {
            cpu.D = cpu.L;
            cpu.Count += 1;
        }

        // 65 LD H,L
        LD_H_L(cpu: CPU) {
            cpu.H = cpu.L;
            cpu.Count += 1;
        }

        // 75 LD (HL),L
        LD_HLm_L(cpu: CPU) {
            cpu.mmu.writeByte(cpu.HL, cpu.L);
            cpu.Count += 2;
        }

        // 46 LD B,(HL)
        LD_B_HLm(cpu: CPU) {
            cpu.B = cpu.mmu.readByte(cpu.HL);
            cpu.Count += 2;
        }

        // 56 LD D,(HL)
        LD_D_HLm(cpu: CPU) {
            cpu.D = cpu.mmu.readByte(cpu.HL);
            cpu.Count += 2;
        }

        // 66 LD H,(HL)
        LD_H_HLm(cpu: CPU) {
            cpu.H = cpu.mmu.readByte(cpu.HL);
            cpu.Count += 2;
        }

        // 47 LD B,A
        LD_B_A(cpu: CPU) {
            cpu.B = cpu.A
            cpu.Count += 1;
        }

        // 57 LD D,A
        LD_D_A(cpu: CPU) {
            cpu.D = cpu.A
            cpu.Count += 1;
        }

        // 67 LD H,A
        LD_H_A(cpu: CPU) {
            cpu.H = cpu.A
            cpu.Count += 1;
        }

        // 77 LD (HL),A
        LD_HLm_A(cpu: CPU) {
            cpu.mmu.writeByte(cpu.HL, cpu.A);
            cpu.Count += 2;
        }

        // 48 LD C,B
        LD_C_B(cpu: CPU) {
            cpu.C = cpu.B;
            cpu.Count += 1;
        }

        // 58 LD E,B
        LD_E_B(cpu: CPU) {
            cpu.E = cpu.B;
            cpu.Count += 1;
        }

        // 68 LD L,B
        LD_L_B(cpu: CPU) {
            cpu.L = cpu.B;
            cpu.Count += 1;
        }

        // 78 LD A,B
        LD_A_B(cpu: CPU) {
            cpu.A = cpu.B;
            cpu.Count += 1;
        }

        // 49 LD C,C
        LD_C_C(cpu: CPU) {
            cpu.C = cpu.C;
            cpu.Count += 1;
        }

        // 59 LD E,C
        LD_E_C(cpu: CPU) {
            cpu.E = cpu.C;
            cpu.Count += 1;
        }

        // 69 LD L,C
        LD_L_C(cpu: CPU) {
            cpu.L = cpu.C;
            cpu.Count += 1;
        }

        // 79 LD A,C
        LD_A_C(cpu: CPU) {
            cpu.A = cpu.C;
            cpu.Count += 1;
        }

        // 4A LD C,D
        LD_C_D(cpu: CPU) {
            cpu.C = cpu.D;
            cpu.Count += 1;
        }

        // 5A LD E,D
        LD_E_D(cpu: CPU) {
            cpu.E = cpu.D;
            cpu.Count += 1;
        }

        // 6A LD L,D
        LD_L_D(cpu: CPU) {
            cpu.L = cpu.D;
            cpu.Count += 1;
        }

        // 7A LD A,D
        LD_A_D(cpu: CPU) {
            cpu.A = cpu.D;
            cpu.Count += 1;
        }

        // 4B LD C,E
        LD_C_E(cpu: CPU) {
            cpu.C = cpu.E;
            cpu.Count += 1;
        }

        // 5B LD E,E
        LD_E_E(cpu: CPU) {
            cpu.E = cpu.E;
            cpu.Count += 1;
        }

        // 6B LD L,E
        LD_L_E(cpu: CPU) {
            cpu.L = cpu.E;
            cpu.Count += 1;
        }

        // 7B LD A,E
        LD_A_E(cpu: CPU) {
            cpu.A = cpu.E;
            cpu.Count += 1;
        }

        // 4C LD C,H
        LD_C_H(cpu: CPU) {
            cpu.C = cpu.H;
            cpu.Count += 1;
        }

        // 5C LD E,H
        LD_E_H(cpu: CPU) {
            cpu.E = cpu.H;
            cpu.Count += 1;
        }

        // 6C LD L,H
        LD_L_H(cpu: CPU) {
            cpu.L = cpu.H;
            cpu.Count += 1;
        }

        // 7C LD A,H
        LD_A_H(cpu: CPU) {
            cpu.A = cpu.H;
            cpu.Count += 1;
        }

        // 4D LD C,L
        LD_C_L(cpu: CPU) {
            cpu.C = cpu.L;
            cpu.Count += 1;
        }

        // 5D LD E,L
        LD_E_L(cpu: CPU) {
            cpu.E = cpu.L;
            cpu.Count += 1;
        }

        // 6D LD L,L
        LD_L_L(cpu: CPU) {
            cpu.L = cpu.L;
            cpu.Count += 1;
        }

        // 7D LD A,L
        LD_A_L(cpu: CPU) {
            cpu.A = cpu.L;
            cpu.Count += 1;
        }

        // 4E LD C,(HL)   2 counts
        LD_C_HLm(cpu: CPU) {
            cpu.C = cpu.mmu.readByte(cpu.HL);
            cpu.Count += 2;
        }

        // 5E LD E,(HL)   2 counts
        LD_E_HLm(cpu: CPU) {
            cpu.E = cpu.mmu.readByte(cpu.HL);
            cpu.Count += 2;
        }

        // 6E LD E,(HL)   2 counts
        LD_L_HLm(cpu: CPU) {
            cpu.L = cpu.mmu.readByte(cpu.HL);
            cpu.Count += 2;
        }

        // 7E LD E,(HL)   2 counts
        LD_A_HLm(cpu: CPU) {
            cpu.A = cpu.mmu.readByte(cpu.HL);
            cpu.Count += 2;
        }

        // 4F LD C,A
        LD_C_A(cpu: CPU) {
            cpu.C = cpu.A;
            cpu.Count += 1;
        }

        // 5F LD E,A
        LD_E_A(cpu: CPU) {
            cpu.E = cpu.A;
            cpu.Count += 1;
        }

        // 6F LD L,A
        LD_L_A(cpu: CPU) {
            cpu.L = cpu.A;
            cpu.Count += 1;
        }

        // 7F LD A,A
        LD_A_A(cpu: CPU) {
            cpu.A = cpu.A;
            cpu.Count += 1;
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


        // MISC 16-bit functions
        // 0x2F CPL (not A)
        CPL(cpu: CPU) {
            cpu.A ^= 0xff;
            cpu.FN = true;
            cpu.FH = true;
            cpu.Count += 1;
        }

        // 0x3F CCF (invert carry flag)
        CCF(cpu: CPU) {
            cpu.FN = false;
            cpu.FH = false;
            cpu.FC = !cpu.FC;
            cpu.Count += 1;
        }


        // ADD 16-bit functions

        //0x09 ADD HL,BC
        ADD_HL_BC(cpu: CPU) {
            cpu.FH = ((cpu.HL & 0xfff) + (cpu.BC & 0xfff)) > 0xfff; // I'm really not sure about this one.
            var val = cpu.HL + cpu.BC;
            cpu.FC = val > 0xffff;            
            cpu.FN = false;
            cpu.HL = val;
            cpu.Count +=2            
        }

        //0x19 ADD HL,DE
        ADD_HL_DE(cpu: CPU) {
            cpu.FH = ((cpu.HL & 0xfff) + (cpu.DE & 0xfff)) > 0xfff; // I'm really not sure about this one.
            var val = cpu.HL + cpu.BC;
            cpu.FC = val > 0xffff;            
            cpu.FN = false;
            cpu.HL = val;
            cpu.Count +=2            
        }

        //0x29 ADD HL,HL
        ADD_HL_HL(cpu: CPU) {
            cpu.FH = ((cpu.HL & 0xfff) + (cpu.HL & 0xfff)) > 0xfff; // I'm really not sure about this one.
            var val = cpu.HL + cpu.HL;
            cpu.FC = val > 0xffff;            
            cpu.FN = false;
            cpu.HL = val;
            cpu.Count +=2            
        }

        //0x39 ADD HL,SP
        ADD_HL_SP(cpu: CPU) {
            cpu.FH = ((cpu.HL & 0xfff) + (cpu.SP & 0xfff)) > 0xfff; // I'm really not sure about this one.
            var val = cpu.HL + cpu.HL;
            cpu.FC = val > 0xffff;            
            cpu.FN = false;
            cpu.HL = val;
            cpu.Count +=2            
        }
        
            
        // 0x0E LD C d8
        LD_C_d8(cpu: CPU) {
            cpu.C = cpu.mmu.readByte(cpu.PC++);
            cpu.Count += 2;
        }

        // 0x1E LD E d8
        LD_E_d8(cpu: CPU) {
            cpu.E = cpu.mmu.readByte(cpu.PC++);
            cpu.Count += 2;
        }

        // 0x1E LD L d8
        LD_L_d8(cpu: CPU) {
            cpu.E = cpu.mmu.readByte(cpu.PC++);
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

        // 0x16 LD D,d8
        LD_D_d8(cpu: CPU) {
            cpu.D = cpu.mmu.readByte(cpu.PC++);
            cpu.Count += 2;
        }

        // 0x26 LD H,d8
        LD_H_d8(cpu: CPU) {
            cpu.H = cpu.mmu.readByte(cpu.PC++);
            cpu.Count += 2;
        }

        // 0x36 LD (HL),d8
        LD_HLm_d8(cpu: CPU) {
            cpu.mmu.writeByte(cpu.HL, cpu.mmu.readByte(cpu.PC++));
            cpu.Count += 3;
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

        // 0x20: JR NC,r8  Relative jump to immediate value if Zero flag not set
        JR_NC_r8(cpu: CPU) {
            var value = cpu.mmu.readByte(cpu.PC++);

            if (cpu.FC) {
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

        // 0x08 LD (a16),SP
        LD_a16m_SP(cpu: CPU) {
            cpu.mmu.writeWord(((cpu.PC + 1) << 8) + cpu.PC, cpu.SP);
            cpu.PC += 2;
            cpu.Count += 5;
        }

        // 0x18: JR r8  Relative jump to immediate value if Zero flag not set
        JR_r8(cpu: CPU) {
            var value = cpu.mmu.readByte(cpu.PC++);

            // get the correct negative value
            if (value > 127) {
                value = -((~value + 1) & 0xFF);
            }

            cpu.PC += value;
            cpu.Count += 3;
        }

        // 0x28: JR Z,r8 
        JR_Z_r8(cpu: CPU) {
            var value = cpu.mmu.readByte(cpu.PC++);

            if (!cpu.FZ) {
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

        // 0x38: JR C,r8 
        JR_C_r8(cpu: CPU) {
            var value = cpu.mmu.readByte(cpu.PC++);

            if (!cpu.FC) {
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
            cpu.BC = cpu.mmu.readWord(cpu.PC);
            cpu.PC += 2;
            cpu.Count += 3;
        }

        // 0x11: LD DE,d16  Load a 16 bit immediate into DE
        // TODO: Verify This
        LD_DE_d16(cpu: CPU) {
            cpu.DE = cpu.mmu.readWord(cpu.PC);
            cpu.PC += 2;
            cpu.Count += 3;
        }

        // 0x21: LD HL,d16  Load a 16 bit immediate into  HL
        LD_HL_d16(cpu: CPU) {
            cpu.HL = cpu.mmu.readWord(cpu.PC);
            cpu.PC += 2;
            cpu.Count += 3;
        }        

        // 0x31: LD SP,d16  Load a 16 bit immediate into  SP
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

        // 0x02 LD (BC),A
        LD_BCm_A(cpu: CPU){
            cpu.mmu.writeWord(cpu.BC, cpu.A);
            cpu.Count += 2;
        }

        // 0x12 LD (DE),A
        LD_DEm_A(cpu: CPU){
            cpu.mmu.writeWord(cpu.DE, cpu.A);
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

        //0x0F RLCA Rotate Right
        RRCA(cpu: CPU) {
            var lowBit = ((cpu.A & 1) === 1) ? 0x80 : 0;
            cpu.FC = (lowBit === 0x80);
            cpu.A = ((cpu.A >> 1) | lowBit) & 0xFF;
            cpu.FZ = false;
            cpu.FN = false;
            cpu.FH = false;

            cpu.Count += 1;
        }

        //0x17 RLA  Rotate Left through carry
        RLA(cpu: CPU) {
            var highBit = cpu.FC ? 1 : 0;
            cpu.FC = (cpu.A & 0x80) === 0x80;
            cpu.A = ((cpu.A << 1) | highBit) & 0xFF;
            cpu.FZ = false;
            cpu.FN = false;
            cpu.FH = false;

            cpu.Count += 1;
        }

        //0x1F RLCA Rotate Right Through Carry
        RRA(cpu: CPU) {
            var lowBit = cpu.FC ? 0x80 : 0;
            cpu.FC = ((cpu.A & 1) === 1);
            cpu.A = ((cpu.A >> 1) | lowBit) & 0xFF;
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