/**
 * SVG Mock
 * 
 * This file mocks SVG imports for Jest tests
 */

// Export a simple React component that renders nothing but has the props
// that are passed to it to ensure proper testing
module.exports = 'SvgMock';
module.exports.ReactComponent = props => Object.assign({}, props, { 
  testID: props.testID || 'svg-mock',
}); 