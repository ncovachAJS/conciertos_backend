import { parseIntParam } from './parse-int';

describe('parseIntParam', () => {
  it('devuelve el valor por defecto si falta o no es número', () => {
    expect(parseIntParam(undefined, 1)).toBe(1);
    expect(parseIntParam('abc', 1)).toBe(1);
    expect(parseIntParam('', 20)).toBe(20);
  });

  it('devuelve el valor por defecto si es menor que el mínimo', () => {
    expect(parseIntParam('0', 1)).toBe(1);
    expect(parseIntParam('-5', 1)).toBe(1);
  });

  it('acepta enteros válidos', () => {
    expect(parseIntParam('3', 1)).toBe(3);
  });

  it('limita al máximo', () => {
    expect(parseIntParam('5000', 50, { max: 200 })).toBe(200);
  });
});
