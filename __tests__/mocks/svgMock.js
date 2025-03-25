/**
 * SVG Mock
 * 
 * This file mocks SVG imports for Jest tests.
 * This is NOT a test file - tests for this mock should be in svgMock.test.js
 */

// Create a mock object with both a string value and ReactComponent function
const svgMock = 'SvgMock';

// This is needed because the SVG imports in React Native expect a React component
svgMock.ReactComponent = function(props) {
  return {
    ...props,
    testID: props.testID || 'svg-mock'
  };
};

module.exports = svgMock; 