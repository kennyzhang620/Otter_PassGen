
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/*  SHA-256 implementation in JavaScript                (c) Chris Veness 2002-2014 / MIT Licence  */
/*                                                                                                */
/*  - see http://csrc.nist.gov/groups/ST/toolkit/secure_hashing.html                              */
/*        http://csrc.nist.gov/groups/ST/toolkit/examples.html                                    */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

/* jshint node:true *//* global define, escape, unescape */
'use strict';

// Extend String interface for TypeScript
declare global {
  interface String {
    utf8Encode(): string;
    utf8Decode(): string;
  }
  
  interface Window {
    Sha256: typeof Sha256;
  }
  
  const define: {
    (deps: string[], factory: () => typeof Sha256): void;
    amd?: boolean;
  };
}

/**
 * SHA-256 hash function reference implementation.
 *
 * @namespace
 */
const Sha256 = {
  hash: function (msg: string): string {
    // convert string to UTF-8, as SHA only deals with byte-streams
    msg = msg.utf8Encode();

    // constants [§4.2.2]
    const K: number[] = [
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
        0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
        0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
        0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
        0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
        0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
        0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
    // initial hash value [§5.3.1]
    const H: number[] = [
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];

    // PREPROCESSING 

    msg += String.fromCharCode(0x80);  // add trailing '1' bit (+ 0's padding) to string [§5.1.1]

    // convert string msg into 512-bit/16-integer blocks arrays of ints [§5.2.1]
    const l = msg.length / 4 + 2; // length (in 32-bit integers) of msg + '1' + appended length
    const N = Math.ceil(l / 16);  // number of 16-integer-blocks required to hold 'l' ints
    const M: number[][] = new Array(N);

    for (let i = 0; i < N; i++) {
        M[i] = new Array(16);
        for (let j = 0; j < 16; j++) {  // encode 4 chars per integer, big-endian encoding
            M[i][j] = (msg.charCodeAt(i * 64 + j * 4) << 24) | (msg.charCodeAt(i * 64 + j * 4 + 1) << 16) |
                (msg.charCodeAt(i * 64 + j * 4 + 2) << 8) | (msg.charCodeAt(i * 64 + j * 4 + 3));
        } // note running off the end of msg is ok 'cos bitwise ops on NaN return 0
    }
    // add length (in bits) into final pair of 32-bit integers (big-endian) [§5.1.1]
    // note: most significant word would be (len-1)*8 >>> 32, but since JS converts
    // bitwise-op args to 32 bits, we need to simulate this by arithmetic operators
    M[N - 1][14] = ((msg.length - 1) * 8) / Math.pow(2, 32); M[N - 1][14] = Math.floor(M[N - 1][14]);
    M[N - 1][15] = ((msg.length - 1) * 8) & 0xffffffff;


    // HASH COMPUTATION [§6.1.2]

    const W: number[] = new Array(64); let a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number;
    for (let i = 0; i < N; i++) {

        // 1 - prepare message schedule 'W'
        for (let t = 0; t < 16; t++) W[t] = M[i][t];
        for (let t = 16; t < 64; t++) W[t] = (Sha256.σ1(W[t - 2]) + W[t - 7] + Sha256.σ0(W[t - 15]) + W[t - 16]) & 0xffffffff;

        // 2 - initialise working variables a, b, c, d, e, f, g, h with previous hash value
        a = H[0]; b = H[1]; c = H[2]; d = H[3]; e = H[4]; f = H[5]; g = H[6]; h = H[7];

        // 3 - main loop (note 'addition modulo 2^32')
        for (let t = 0; t < 64; t++) {
            const T1 = h + Sha256.Σ1(e) + Sha256.Ch(e, f, g) + K[t] + W[t];
            const T2 = Sha256.Σ0(a) + Sha256.Maj(a, b, c);
            h = g;
            g = f;
            f = e;
            e = (d + T1) & 0xffffffff;
            d = c;
            c = b;
            b = a;
            a = (T1 + T2) & 0xffffffff;
        }
        // 4 - compute the new intermediate hash value (note 'addition modulo 2^32')
        H[0] = (H[0] + a) & 0xffffffff;
        H[1] = (H[1] + b) & 0xffffffff;
        H[2] = (H[2] + c) & 0xffffffff;
        H[3] = (H[3] + d) & 0xffffffff;
        H[4] = (H[4] + e) & 0xffffffff;
        H[5] = (H[5] + f) & 0xffffffff;
        H[6] = (H[6] + g) & 0xffffffff;
        H[7] = (H[7] + h) & 0xffffffff;
    }

    return Sha256.toHexStr(H[0]) + Sha256.toHexStr(H[1]) + Sha256.toHexStr(H[2]) + Sha256.toHexStr(H[3]) +
        Sha256.toHexStr(H[4]) + Sha256.toHexStr(H[5]) + Sha256.toHexStr(H[6]) + Sha256.toHexStr(H[7]);
  },

  /**
   * Rotates right (circular right shift) value x by n positions [§3.2.4].
   * @private
   */
  ROTR: function (n: number, x: number): number {
      return (x >>> n) | (x << (32 - n));
  },

  /**
   * Logical functions [§4.1.2].
   * @private
   */
  Σ0: function (x: number): number { return Sha256.ROTR(2, x) ^ Sha256.ROTR(13, x) ^ Sha256.ROTR(22, x); },
  Σ1: function (x: number): number { return Sha256.ROTR(6, x) ^ Sha256.ROTR(11, x) ^ Sha256.ROTR(25, x); },
  σ0: function (x: number): number { return Sha256.ROTR(7, x) ^ Sha256.ROTR(18, x) ^ (x >>> 3); },
  σ1: function (x: number): number { return Sha256.ROTR(17, x) ^ Sha256.ROTR(19, x) ^ (x >>> 10); },
  Ch: function (x: number, y: number, z: number): number { return (x & y) ^ (~x & z); },
  Maj: function (x: number, y: number, z: number): number { return (x & y) ^ (x & z) ^ (y & z); },

  /**
   * Hexadecimal representation of a number.
   * @private
   */
  toHexStr: function (n: number): string {
      // note can't use toString(16) as it is implementation-dependant,
      // and in IE returns signed numbers when used on full words
      let s = "", v: number;
      for (let i = 7; i >= 0; i--) { v = (n >>> (i * 4)) & 0xf; s += v.toString(16); }
      return s;
  }
};

/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */


/** Extend String object with method to encode multi-byte string to utf8
 *  - monsur.hossa.in/2012/07/20/utf-8-in-javascript.html */
if (typeof String.prototype.utf8Encode == 'undefined') {
    String.prototype.utf8Encode = function (): string {
        return unescape(encodeURIComponent(String(this)));
    };
}

/** Extend String object with method to decode utf8 string to multi-byte */
if (typeof String.prototype.utf8Decode == 'undefined') {
    String.prototype.utf8Decode = function (): string {
        try {
            return decodeURIComponent(escape(String(this)));
        } catch (e) {
            return e + String(this); // invalid UTF-8? return as-is
        }
    };
}


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
if (typeof module != 'undefined' && module.exports) module.exports = Sha256; // CommonJs export
if (typeof define == 'function' && define.amd) define([], function () { return Sha256; }); // AMD
if (typeof window !== 'undefined') window.Sha256 = Sha256;

export default Sha256;

/**
 * Takes two identically sized strings, applies a XOR operation at the bit level,
 * and outputs a string with the transformation applied.
 * The output is a string of the same length, with each character code being the XOR of the input character codes.
 * 
 * @param {string} str1 - First input string
 * @param {string} str2 - Second input string (must be same length as str1)
 * @returns {string} - XORed result as a string
 */
function xorStrings(str1: string, str2: string): string {
    if (str1.length !== str2.length) {
        throw new Error('Input strings must have the same length');
    }
    let result = '';
    for (let i = 0; i < str1.length; i++) {
        // XOR the char codes and convert back to a character
        result += String.fromCharCode(str1.charCodeAt(i) ^ str2.charCodeAt(i));
    }
    return result;
}

export { xorStrings };

