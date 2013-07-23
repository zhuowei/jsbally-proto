.PHONY: all
all: z80 roms.js snapshots.js

.PHONY: z80
z80:
	$(MAKE) -C z80

roms.js: bin2js.pl roms/*
	perl bin2js.pl roms > roms.js

snapshots.js: bin2js.pl snapshots/*
	perl bin2js.pl snapshots > snapshots.js

.PHONY: clean
clean:
	$(MAKE) -C z80 clean
	rm -f roms.js snapshots.js
