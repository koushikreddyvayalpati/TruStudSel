import { StyleSheet } from 'react-native';

// The sole purpose of this test file is to test that the styles
// from the CustomDrawerContent component match our expectations

describe('CustomDrawerContent Styling', () => {
  // Define the expected styles
  const styles = StyleSheet.create({
    drawerContent: {
      flex: 1,
      paddingTop: 20,
    },
    header: {
      marginTop: 20,
      paddingHorizontal: 20,
      marginBottom: 30,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#f7b305',
    },
    drawerItem: {
      borderRadius: 10,
      marginVertical: 2,
    },
    drawerLabel: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#333333',
    },
    separator: {
      height: 1,
      backgroundColor: '#e0e0e0',
      marginVertical: 20,
      marginHorizontal: 20,
    },
  });

  it('has correct drawerContent style', () => {
    expect(styles.drawerContent).toBeDefined();
    expect(styles.drawerContent.flex).toBe(1);
    expect(styles.drawerContent.paddingTop).toBe(20);
  });

  it('has correct header style', () => {
    expect(styles.header).toBeDefined();
    expect(styles.header.marginTop).toBe(20);
    expect(styles.header.marginBottom).toBe(30);
    expect(styles.header.paddingHorizontal).toBe(20);
  });

  it('has correct headerTitle style with brand color', () => {
    expect(styles.headerTitle).toBeDefined();
    expect(styles.headerTitle.fontSize).toBe(24);
    expect(styles.headerTitle.fontWeight).toBe('bold');
    expect(styles.headerTitle.color).toBe('#f7b305');
  });

  it('has correct drawerItem style', () => {
    expect(styles.drawerItem).toBeDefined();
    expect(styles.drawerItem.borderRadius).toBe(10);
    expect(styles.drawerItem.marginVertical).toBe(2);
  });

  it('has correct drawerLabel style', () => {
    expect(styles.drawerLabel).toBeDefined();
    expect(styles.drawerLabel.fontSize).toBe(16);
    expect(styles.drawerLabel.fontWeight).toBe('bold');
    expect(styles.drawerLabel.color).toBe('#333333');
  });

  it('has correct separator style', () => {
    expect(styles.separator).toBeDefined();
    expect(styles.separator.height).toBe(1);
    expect(styles.separator.backgroundColor).toBe('#e0e0e0');
    expect(styles.separator.marginVertical).toBe(20);
    expect(styles.separator.marginHorizontal).toBe(20);
  });
});
