declare module 'polyline' {
  function decode(encoded: string): [number, number][];
  function encode(coordinates: [number, number][]): string;
  export = polyline;
} 