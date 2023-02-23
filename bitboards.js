Bitboard = function(low, high) {
	/**
	 * Lower 32 bits of the 64 bit value
	 * @type {number}
	 */
	this.low = low >>> 0;

	/**
	 * Upper 32 bits of the 64 bit value
	 * @type {number}
	 */
	this.high = high >>> 0;
};

Bitboard.prototype.and = function(other) {
	this.low = (this.low & other.low) >>> 0;
	this.high = (this.high & other.high) >>> 0;

	return this;
};

Bitboard.prototype.shl = function(v) {
	v >>>= 0;

	if (v > 31) {
		this.high = (this.low << (v - 32)) >>> 0;
		this.low = 0 >>> 0;
	} else if (v > 0) {
		this.high = ((this.high << v) | (this.low >>> (32 - v))) >>> 0;
		this.low = (this.low << v) >>> 0;
	}

	return this;
};

Bitboard.prototype.shr = function(v) {
	v >>>= 0;

	if (v > 31) {
		this.low = this.high >>> (v - 32);
		this.high = 0 >>> 0;
	} else if (v > 0) {
		this.low = ((this.low >>> v) | (this.high << (32 - v))) >>> 0;
		this.high >>>= v;
	}

	return this;
};

Bitboard.prototype.xor = function(other) {
	this.low = (this.low ^ other.low) >>> 0;
	this.high = (this.high ^ other.high) >>> 0;

	return this;
};


console.log("Bitwise time: ");
console.time(testBitwise);
function testBitwise() {
    var longlong = new Bitboard(18446744073709551615 >> 32, 18446744073709551615);
    var random = 235234543;
    for(let i = 0; i < 10000000; i++) {
        longlong = longlong.and(random);
        longlong = longlong.shr(2);
        longlong = longlong.xor(1);         
        longlong = longlong.shl(132);   
    }
}
testBitwise();
console.timeEnd(testBitwise);