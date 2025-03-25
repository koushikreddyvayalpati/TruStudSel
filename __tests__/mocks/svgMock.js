/**
 * SVG Mock
 * 
 * This file mocks SVG imports for Jest tests
 */

// Export a simple React component that renders nothing but has the props
// that are passed to it to ensure proper testing
const SvgMock = 'SvgMock';
SvgMock.ReactComponent = props => Object.assign({}, props, { 
  testID: props.testID || 'svg-mock',
});

module.exports = SvgMock; 