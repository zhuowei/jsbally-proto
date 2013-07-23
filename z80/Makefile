.PHONY: all
all: z80_ops_full.js z80_full.js

z80_ops_full.js: z80_ops.jscpp z80_macros.jscpp opcodes_base.jscpp z80_cb.jscpp z80_ddfd.jscpp z80_ddfdcb.jscpp z80_ed.jscpp
	cpp -P z80_ops.jscpp z80_ops_full.js

z80_full.js: z80.jscpp z80_macros.jscpp opcodes_base.jscpp z80_cb.jscpp z80_ddfd.jscpp z80_ddfdcb.jscpp z80_ed.jscpp
	cpp -P z80.jscpp z80_full.js

opcodes_base.jscpp: z80.pl opcodes_base.dat
	perl z80.pl opcodes_base.dat > opcodes_base.jscpp

z80_cb.jscpp: z80.pl opcodes_cb.dat
	perl z80.pl opcodes_cb.dat > z80_cb.jscpp

z80_ddfd.jscpp: z80.pl opcodes_ddfd.dat
	perl z80.pl opcodes_ddfd.dat > z80_ddfd.jscpp

z80_ddfdcb.jscpp: z80.pl opcodes_ddfd.dat
	perl z80.pl opcodes_ddfdcb.dat > z80_ddfdcb.jscpp

z80_ed.jscpp: z80.pl opcodes_ed.dat
	perl z80.pl opcodes_ed.dat > z80_ed.jscpp

.PHONY: clean
clean:
	rm -f z80_ops_full.js z80_full.js opcodes_base.jscpp z80_cb.jscpp z80_ddfd.jscpp z80_ddfdcb.jscpp z80_ed.jscpp
