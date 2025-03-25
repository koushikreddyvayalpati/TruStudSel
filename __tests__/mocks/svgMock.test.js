/**
 * Tests for SVG Mock
 */

const svgMock = require('./svgMock');

describe('SVG Mock', () => {
  it('should export a string and a component', () => {
    expect(typeof svgMock).toBe('string');
    expect(typeof svgMock.ReactComponent).toBe('function');
  });
});