var memory = [];
var canvas;
var ctx;
var imageData;
var imageDataData;
var keyStates = [];

var hasImageData;
var needDrawImage = (navigator.userAgent.indexOf('Firefox/2') != -1);

function spectrum_init() {
	for (var i = 0x0000; i < 0x4000; i++) {
		memory[i] = roms['48.rom'].charCodeAt(i);
	}
	for (var i = 0x4000; i < 0x10000; i++) {
		memory[i] = 0;
	}
	canvas = document.getElementById('screen');
	ctx = canvas.getContext('2d');
	ctx.fillStyle = 'black';
	ctx.fillRect(0,0,256,192); /* set alpha to opaque */
	if (ctx.getImageData) {
		hasImageData = true;
		imageData = ctx.getImageData(0,0,256,192);
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
		keyStates[row] = 0xff;
	}
}

var keyCodes = {
	49: {row: 3, mask: 0x01}, /* 1 */
	50: {row: 3, mask: 0x02}, /* 2 */
	51: {row: 3, mask: 0x04}, /* 3 */
	52: {row: 3, mask: 0x08}, /* 4 */
	53: {row: 3, mask: 0x10}, /* 5 */
	54: {row: 4, mask: 0x10}, /* 6 */
	55: {row: 4, mask: 0x08}, /* 7 */
	56: {row: 4, mask: 0x04}, /* 8 */
	57: {row: 4, mask: 0x02}, /* 9 */
	48: {row: 4, mask: 0x01}, /* 0 */

	81: {row: 2, mask: 0x01}, /* Q */
	87: {row: 2, mask: 0x02}, /* W */
	69: {row: 2, mask: 0x04}, /* E */
	82: {row: 2, mask: 0x08}, /* R */
	84: {row: 2, mask: 0x10}, /* T */
	89: {row: 5, mask: 0x10}, /* Y */
	85: {row: 5, mask: 0x08}, /* U */
	73: {row: 5, mask: 0x04}, /* I */
	79: {row: 5, mask: 0x02}, /* O */
	80: {row: 5, mask: 0x01}, /* P */

	65: {row: 1, mask: 0x01}, /* A */
	83: {row: 1, mask: 0x02}, /* S */
	68: {row: 1, mask: 0x04}, /* D */
	70: {row: 1, mask: 0x08}, /* F */
	71: {row: 1, mask: 0x10}, /* G */
	72: {row: 6, mask: 0x10}, /* H */
	74: {row: 6, mask: 0x08}, /* J */
	75: {row: 6, mask: 0x04}, /* K */
	76: {row: 6, mask: 0x02}, /* L */
	13: {row: 6, mask: 0x01}, /* enter */

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
	32: {row: 7, mask: 0x01}, /* space */
};

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
	var keyCode = keyCodes[evt.keyCode];
	if (keyCode == null) return;
	keyStates[keyCode.row] &= ~(keyCode.mask);
}
function keyUp(evt) {
	var keyCode = keyCodes[evt.keyCode];
	if (keyCode == null) return;
	keyStates[keyCode.row] |= keyCode.mask;
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
	return memory[addr];
}
function readport(addr) {
	if ((addr & 0x0001) == 0x0000) {
		/* read keyboard */
		var result = 0xff;
		for (var row = 0; row < 8; row++) {
			if (!(addr & (1 << (row+8)))) { /* bit held low, so scan this row */
				result &= keyStates[row];
			}
		}
		return result;
	} else if ((addr & 0x00e0) == 0x0000) {
		/* kempston joystick: treat this as attached but unused
		 (for the benefit of Manic Miner) */
		return 0x00;
	} else {
		return 0xff; /* unassigned port */
	}
}
function writeport(addr, val) {
	if ((addr & 0x0001) == 0) {
		var borderColour = palette[val & 0x07];
		var borderColourCss = 'rgb('+borderColour[0]+','+borderColour[1]+','+borderColour[2]+')';
		canvas.style.borderColor = borderColourCss;
	}
}
function writebyte(addr, val) {
	return writebyte_internal(addr, val)
}
function writebyte_internal(addr, val) {
	if (addr < 0x4000) return;
	memory[addr] = val;
	if (addr < 0x5800) {
		drawScreenByte(addr, val);
	} else if (addr < 0x5b00) {
		drawAttrByte(addr, val);
	}
}
function drawScreenByteWithoutImageData(addr, val) {
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
	if ((flashFrame & 0x0f) == 0) {
		/* need to redraw flashing attributes on this frame */
		for (var addr = 0x5800; addr < 0x5b00; addr++) {
			if (memory[addr] & 0x80) {
				drawAttrByte(addr, memory[addr]);
			}
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
