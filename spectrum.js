var memory = [];
var canvas;
var ctx;
var imageData;
var imageDataData;
var keyStates = [];

var hasImageData;
var needDrawImage = (navigator.userAgent.indexOf('Firefox/2') != -1);

var colorMap = [0, 0, 0, 0, 0, 0, 0, 0];

var magicChipRegister = 0;

var MAGIC_MODE_LSB = 1;
var MAGIC_MODE_RSB = 1 << 1;
var MAGIC_MODE_ROTATE = 1 << 2;
var MAGIC_MODE_EXPAND = 1 << 3;
var MAGIC_MODE_OR = 1 << 4;
var MAGIC_MODE_XOR = 1 << 5;
var MAGIC_MODE_FLOP = 1 << 6;

var magicChipExpandLowerHalf = false;

var magicExpandReg = 0;

var colorMapMassWritePointer = 0;

var vBlankLine = 255;

var SCREEN_NUM_LINES = 102;

var colorHorizontalBoundReg = 0;

var astrocadeInterruptLocation = 0;


function spectrum_init() {
	for (var i = 0x0000; i < 0x2000; i++) {
		memory[i] = roms['3159.bin'].charCodeAt(i);
	}
	for (var i = 0x2000; i < 0x10000; i++) {
		memory[i] = 0;
	}
	canvas = document.getElementById('screen');
	ctx = canvas.getContext('2d');
	ctx.fillStyle = 'black';
	ctx.fillRect(0,0,256,192); /* set alpha to opaque */
	if (ctx.getImageData) {
		hasImageData = true;
		imageData = ctx.getImageData(0,0,160,102);
		imageDataData = imageData.data;
	} else {
		/* this browser does not support getImageData / putImageData;
			use horribly slow fillRect method to plot pixels instead */
		hasImageData = false;
		drawScreenByte = drawScreenByteWithoutImageData;
		drawAttrByte = drawAttrByteWithoutImageData;
	}
	
	document.onkeydown = keyDown;
	document.onkeyup = keyUp;
	for (var row = 0; row < 8; row++) {
		keyStates[row] = 0x00;
	}
}

var keyCodes = {

	87: {row: 0, mask: 0x01}, /* W */
	65: {row: 0, mask: 0x04}, /* A */
	83: {row: 0, mask: 0x02}, /* S */
	68: {row: 0, mask: 0x08}, /* D */
	32: {row: 0, mask: 0x10}, /* space */

	51: {row: 5, mask: 0x10}, /* 3 */
	54: {row: 5, mask: 0x08}, /* 6 */
	57: {row: 5, mask: 0x04}, /* 9 */

	48: {row: 6, mask: 0x20}, /* 0 */
	50: {row: 6, mask: 0x10}, /* 2 */
	53: {row: 6, mask: 0x08}, /* 5 */
	56: {row: 6, mask: 0x04}, /* 8 */

	49: {row: 7, mask: 0x10}, /* 1 */
	52: {row: 7, mask: 0x08}, /* 4 */
	55: {row: 7, mask: 0x04}, /* 7 */

	13: {row: 4, mask: 0x20}, /* enter */

	107: {row: 4, mask: 0x10}, /* + */
	109: {row: 4, mask: 0x08}, /* - */
	106: {row: 4, mask: 0x04}, /* * */
	111: {row: 4, mask: 0x02}, /* / */

//numpad
	99: {row: 5, mask: 0x10}, /* 3 */
	102: {row: 5, mask: 0x08}, /* 6 */
	105: {row: 5, mask: 0x04}, /* 9 */

	96: {row: 6, mask: 0x20}, /* 0 */
	98: {row: 6, mask: 0x10}, /* 2 */
	101: {row: 6, mask: 0x08}, /* 5 */
	104: {row: 6, mask: 0x04}, /* 8 */

	97: {row: 7, mask: 0x10}, /* 1 */
	100: {row: 7, mask: 0x08}, /* 4 */
	103: {row: 7, mask: 0x04}, /* 7 */
//end numpad


};
void({
	81: {row: 2, mask: 0x01}, /* Q */

	69: {row: 2, mask: 0x04}, /* E */
	82: {row: 2, mask: 0x08}, /* R */
	84: {row: 2, mask: 0x10}, /* T */
	89: {row: 5, mask: 0x10}, /* Y */
	85: {row: 5, mask: 0x08}, /* U */
	73: {row: 5, mask: 0x04}, /* I */
	79: {row: 5, mask: 0x02}, /* O */
	80: {row: 5, mask: 0x01}, /* P */




	70: {row: 1, mask: 0x08}, /* F */
	71: {row: 1, mask: 0x10}, /* G */
	72: {row: 6, mask: 0x10}, /* H */
	74: {row: 6, mask: 0x08}, /* J */
	75: {row: 6, mask: 0x04}, /* K */
	76: {row: 6, mask: 0x02}, /* L */


	16: {row: 0, mask: 0x01}, /* caps */
	192: {row: 0, mask: 0x01}, /* backtick as caps - because firefox screws up a load of key codes when pressing shift */
	90: {row: 0, mask: 0x02}, /* Z */
	88: {row: 0, mask: 0x04}, /* X */
	67: {row: 0, mask: 0x08}, /* C */
	86: {row: 0, mask: 0x10}, /* V */
	66: {row: 7, mask: 0x10}, /* B */
	78: {row: 7, mask: 0x08}, /* N */
	77: {row: 7, mask: 0x04}, /* M */
	17: {row: 7, mask: 0x02}, /* sym - gah, firefox screws up ctrl+key too */

});

var palette = [
	[0,0,0],
	[0,0,192],
	[192,0,0],
	[192,0,192],
	[0,192,0],
	[0,192,192],
	[192,192,0],
	[192,192,192],
	[0,0,0],
	[0,0,255],
	[255,0,0],
	[255,0,255],
	[0,255,0],
	[0,255,255],
	[255,255,0],
	[255,255,255]
];

function keyDown(evt) {
	console.log(evt.keyCode);
	var keyCode = keyCodes[evt.keyCode];
	if (keyCode == null) return;
	keyStates[keyCode.row] |= keyCode.mask;
}
function keyUp(evt) {
	var keyCode = keyCodes[evt.keyCode];
	if (keyCode == null) return;
	keyStates[keyCode.row] &= ~(keyCode.mask);
}

function contend_memory(addr) {
	return 0; /* TODO: implement */
}
function contend_port(addr) {
	return 0; /* TODO: implement */
}
function readbyte(addr) {
	return readbyte_internal(addr);
}
function readbyte_internal(addr) {
	/*if (addr < 0x2010) {
		console.log(addr.toString(16));
	}*/
	return memory[addr];
}
function readport(addr) {
	//console.log("Read port: " + (addr & 0xff).toString(16) + ": PC=" + z80.pc.toString(16));
	//return 0x1;
	var a = addr & 0xff;
	if (a >= 0x10 && a <= 0x17) {
		var keystate = keyStates[a - 0x10];
		//if (keystate != 0) console.log(a.toString(16) + ":" +keystate.toString(2));
		return keystate;
	}
	return 0x0;
}
function writeport(addr, val) {
	//console.log("Write port: " + (addr & 0xff).toString(16) + ":" + val.toString(16) + ": PC= " + z80.pc.toString(16));
	var a = addr & 0xff;
	if (a < 8) {
		colorMap[a] = val;
		//console.log("Color map: " + a + ":" + val);
	} else if (a == 0x9) {
		colorHorizontalBoundReg = val;
	} else if (a == 0xa) {
		//console.log("Vblank line: " + (val >> 1));
		vBlankLine = val;
	} else if (a == 0xb) {
		//console.log("Color map mass write: " + val);
		colorMap[colorMapMassWritePointer++] = val;
		if (colorMapMassWritePointer > 7) colorMapMassWritePointer = 0;
	} else if (a == 0xc) {
		magicChipRegister = val;
		//console.log("Magic chip mode: " + val);
		magicChipExpandLowerHalf = false;
	} else if (a == 0xd) {
		if (val != 0x34) {
			console.log("Interrupt val: " + val.toString(16) + ":" + z80.pc.toString(16));
			console.log("Interrupt will be fetched from " + ((z80.i * 0x100) + val).toString(16));
		}
		
		astrocadeInterruptLocation = val;
	} else if (a == 0xe) {
		console.log("Interrupt:" + val + "timer: " + ((val & 0x8) != 0) + " pen:" + ((val & 0x2) != 0));
	} else if (a == 0x19) {
		magicExpandReg = val;
	} else if (a >= 0x10 && a <= 0x18) {
		//console.log("Sound: " + a.toString(16) + ":" + val.toString(16));
	}
}
function writebyte(addr, val) {
	return writebyte_internal(addr, val)
}
function writebyte_internal(addr, val) {
	//console.log("Write to ram: " + addr + ":" + val);
	if (addr < 0x1000) {
		//console.log("Write to magic 2d accelerator: " + addr + ":" + val);
		//TODO magic 2d accelerator
		drawScreenByteWithMagicChip(addr, val);
		return;
	};
	memory[addr] = val;
	if (addr >= 0x4000 && addr < 0x5000) {
		drawScreenByte(addr & 0xfff, val);
	}
	/*if (memory[addr] >= 0x4000 && memory[addr] <= 0x5000) {
		console.log("Write to framebuffer: " + addr + ":" + val);
	}*/
	/*if (addr < 0x5800) {
		drawScreenByte(addr, val);
	} else if (addr < 0x5b00) {
		drawAttrByte(addr, val);
	}*/
}

function drawScreenByteWithMagicChip(addr, val) {
	if (magicChipRegister & MAGIC_MODE_EXPAND) {
		//do the expansion
		var valToExpand = magicChipExpandLowerHalf? val & 0xf: ((val >> 4) & 0xf);
		var finalVal = 0;
		for (var p = 0; p < 4; ++p) {
			var isForeground = valToExpand & (1 << p);
			var newColorVal = isForeground? ((magicExpandReg >> 2) & 0x3) : magicExpandReg & 0x3;
			finalVal |= (newColorVal << (p << 1));
		}
		//console.log("Val: " + (val | 0x100).toString(2) + " finalVal: " + (finalVal | 0x100).toString(2));
		drawScreenByteWithMagicChipPostExpand(addr, finalVal);
	} else {
		drawScreenByteWithMagicChipPostExpand(addr, val);
	}
	magicChipExpandLowerHalf = !magicChipExpandLowerHalf;
		
}

function drawScreenByteWithMagicChipPostExpand(addr, val) {
	memory[0x4000 + addr] = val;
	drawScreenByte(addr, val);
}

function drawScreenByteWithoutImageDataa(addr, val) {
	/* 0 1 0 y7 y6 y2 y1 y0 / y5 y4 y3 x4 x3 x2 x1 x0 */
	var x = (addr & 0x001f); /* counted in characters */
	var y = ((addr & 0x0700) >> 8) | ((addr & 0x00e0) >> 2) | ((addr & 0x1800) >> 5); /* counted in pixels */
	var attributeByte = memory[0x5800 | ((y & 0xf8) << 2) | x];
	if ((attributeByte & 0x80) && (flashFrame & 0x10)) {
		/* invert flashing attributes */
		var ink = palette[(attributeByte & 0x78) >> 3];
		var paper = palette[((attributeByte & 0x40) >> 3) | (attributeByte & 0x07)];
	} else {
		var ink = palette[((attributeByte & 0x40) >> 3) | (attributeByte & 0x07)];
		var paper = palette[(attributeByte & 0x78) >> 3];
	}
	var inkRgb = 'rgb(' + ink[0] + ',' + ink[1] + ',' + ink[2] + ')';
	var paperRgb = 'rgb(' + paper[0] + ',' + paper[1] + ',' + paper[2] + ')';
	var xp = x << 3;
	var pixelAddress = (y << 10) | (x << 5);
	for (var p = 7; p >= 0; p--) {
		if (val & (1<<p)) {
			ctx.fillStyle = inkRgb;
			ctx.fillRect(xp, y, 1, 1);
			xp++;
		} else {
			ctx.fillStyle = paperRgb;
			ctx.fillRect(xp, y, 1, 1);
			xp++;
		}
	}
}

function drawScreenByte(addr, val) {
	var x = (addr % 40) * 4;
	var y = Math.floor(addr / 40);
	var pixelAddress = (y * 4 * 160) + (x * 4);
	for (var p = 3; p >= 0; p--) {
		var pAttrib = (val >> (p << 1)) & 0x3;
		var ink = [255, 255, 255];
		var intensity = colorMap[pAttrib] & 0x7;
		/*if (pAttrib > 0) {
			imageDataData[pixelAddress++] = ink[0];
			imageDataData[pixelAddress++] = ink[1];
			imageDataData[pixelAddress++] = ink[2];
			pixelAddress++;
		} else {
			imageDataData[pixelAddress++] = 0;
			imageDataData[pixelAddress++] = 0;
			imageDataData[pixelAddress++] = 0;
			pixelAddress++;
		}*/
		imageDataData[pixelAddress++] = intensity * 32;
		imageDataData[pixelAddress++] = intensity * 32;
		imageDataData[pixelAddress++] = intensity * 32;
		pixelAddress++;
	}
}


function drawScreenBytea(addr, val) {
	/* 0 1 0 y7 y6 y2 y1 y0 / y5 y4 y3 x4 x3 x2 x1 x0 */
	var x = (addr & 0x001f); /* counted in characters */
	var y = ((addr & 0x0700) >> 8) | ((addr & 0x00e0) >> 2) | ((addr & 0x1800) >> 5); /* counted in pixels */
	var attributeByte = memory[0x5800 | ((y & 0xf8) << 2) | x];
	if ((attributeByte & 0x80) && (flashFrame & 0x10)) {
		/* invert flashing attributes */
		var ink = palette[(attributeByte & 0x78) >> 3];
		var paper = palette[((attributeByte & 0x40) >> 3) | (attributeByte & 0x07)];
	} else {
		var ink = palette[((attributeByte & 0x40) >> 3) | (attributeByte & 0x07)];
		var paper = palette[(attributeByte & 0x78) >> 3];
	}
	var pixelAddress = (y << 10) | (x << 5);
	for (var p = 7; p >= 0; p--) {
		if (val & (1<<p)) {
			imageDataData[pixelAddress++] = ink[0];
			imageDataData[pixelAddress++] = ink[1];
			imageDataData[pixelAddress++] = ink[2];
			pixelAddress++;
		} else {
			imageDataData[pixelAddress++] = paper[0];
			imageDataData[pixelAddress++] = paper[1];
			imageDataData[pixelAddress++] = paper[2];
			pixelAddress++;
		}
	}
}

function drawAttrByteWithoutImageData(addr, val) {
	/* 0 1 0 1 1 0 y4 y3 / y2 y1 y0 x4 x3 x2 x1 x0 */
	var x0 = (addr & 0x001f); /* counted in characters */
	var y0 = (addr & 0x03e0) >> 2; /* counted in pixels */
	if ((val & 0x80) && (flashFrame & 0x10)) {
		/* invert flashing attributes */
		var ink = palette[(val & 0x78) >> 3];
		var paper = palette[((val & 0x40) >> 3) | (val & 0x07)];
	} else {
		var ink = palette[((val & 0x40) >> 3) | (val & 0x07)];
		var paper = palette[(val & 0x78) >> 3];
	}
	
	var inkRgb = 'rgb(' + ink[0] + ',' + ink[1] + ',' + ink[2] + ')';
	var paperRgb = 'rgb(' + paper[0] + ',' + paper[1] + ',' + paper[2] + ')';

	for (var y = 0; y < 8; y++) {
		var screenByte = memory[0x4000 | ((y0 & 0xc0) << 5) | (y << 8) | ((y0 & 0x38) << 2) | x0];
		var xp = x0 << 3;
		for (var p = 7; p >= 0; p--) {
			if (screenByte & (1<<p)) {
				ctx.fillStyle = inkRgb;
				ctx.fillRect(xp, y | y0, 1, 1);
				xp++;
			} else {
				ctx.fillStyle = paperRgb;
				ctx.fillRect(xp, y | y0, 1, 1);
				xp++;
			}
		}
	}
}

function drawAttrByte(addr, val) {
	/* 0 1 0 1 1 0 y4 y3 / y2 y1 y0 x4 x3 x2 x1 x0 */
	var x0 = (addr & 0x001f); /* counted in characters */
	var y0 = (addr & 0x03e0) >> 2; /* counted in pixels */
	if ((val & 0x80) && (flashFrame & 0x10)) {
		/* invert flashing attributes */
		var ink = palette[(val & 0x78) >> 3];
		var paper = palette[((val & 0x40) >> 3) | (val & 0x07)];
	} else {
		var ink = palette[((val & 0x40) >> 3) | (val & 0x07)];
		var paper = palette[(val & 0x78) >> 3];
	}
	
	for (var y = 0; y < 8; y++) {
		var pixelAddress = ((y0 | y) << 10) | (x0 << 5);
		var screenByte = memory[0x4000 | ((y0 & 0xc0) << 5) | (y << 8) | ((y0 & 0x38) << 2) | x0];
		for (var p = 7; p >= 0; p--) {
			if (screenByte & (1<<p)) {
				imageDataData[pixelAddress++] = ink[0];
				imageDataData[pixelAddress++] = ink[1];
				imageDataData[pixelAddress++] = ink[2];
				pixelAddress++;
			} else {
				imageDataData[pixelAddress++] = paper[0];
				imageDataData[pixelAddress++] = paper[1];
				imageDataData[pixelAddress++] = paper[2];
				pixelAddress++;
			}
		}
	}
}

function paintScreen() {
	//if ((flashFrame & 0x0f) == 0) {
	//	/* need to redraw flashing attributes on this frame */
	//	for (var addr = 0x5800; addr < 0x5b00; addr++) {
	//		if (memory[addr] & 0x80) {
	//			drawAttrByte(addr, memory[addr]);
	//		}
	//	}
	//}
	var intensity = colorMap[(colorHorizontalBoundReg >> 6) & 0x3] & 0x7;
	for (var y = (vBlankLine >> 1); y < SCREEN_NUM_LINES; ++y) {
		for (var x = 0; x < 160; ++x) {
			var pixelAddress = ((y * 160) + x) * 4;
			imageDataData[pixelAddress++] = intensity * 32;
			imageDataData[pixelAddress++] = intensity * 32;
			imageDataData[pixelAddress++] = intensity * 32;
			pixelAddress++;
		}
	}
	if (hasImageData) {
		ctx.putImageData(imageData, 0, 0);
		if (needDrawImage) ctx.drawImage(canvas, 0, 0); /* FF2 appears to need this */
	}
}

function paintFullScreen() {
	/* paint attribute bytes to force repaint of whole screen */
	for (var addr = 0x5800; addr < 0x5b00; addr++) {
		writebyte_internal(addr, memory[addr]);
	}
}
