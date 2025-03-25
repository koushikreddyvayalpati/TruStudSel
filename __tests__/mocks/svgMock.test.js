/**
 * Tests for SVG Mock
 */

const svgMock = require('./svgMock');
console.log('SVG Mock content:', svgMock);
console.log('Type of svgMock:', typeof svgMock);

describe('SVG Mock', () => {
  it('should export a string', () => {
    expect(typeof svgMock).toBe('string');
  });
});