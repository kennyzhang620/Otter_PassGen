/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'cose-to-jwk' {
  function coseToJwk(coseKey: Buffer): any;
  export = coseToJwk;
} 