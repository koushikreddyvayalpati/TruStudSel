/**
 * Tests for AsyncStorageMock
 */

const asyncStorageMock = require('./asyncStorageMock');

describe('AsyncStorage Mock', () => {
  beforeEach(() => {
    asyncStorageMock.__resetMockState();
  });

  it('should store and retrieve data', async () => {
    await asyncStorageMock.setItem('testKey', 'testValue');
    const value = await asyncStorageMock.getItem('testKey');
    expect(value).toBe('testValue');
  });

  it('should remove data', async () => {
    await asyncStorageMock.setItem('testKey', 'testValue');
    await asyncStorageMock.removeItem('testKey');
    const value = await asyncStorageMock.getItem('testKey');
    expect(value).toBeNull();
  });

  it('should clear all data', async () => {
    await asyncStorageMock.setItem('key1', 'value1');
    await asyncStorageMock.setItem('key2', 'value2');
    await asyncStorageMock.clear();
    const value1 = await asyncStorageMock.getItem('key1');
    const value2 = await asyncStorageMock.getItem('key2');
    expect(value1).toBeNull();
    expect(value2).toBeNull();
  });
}); 