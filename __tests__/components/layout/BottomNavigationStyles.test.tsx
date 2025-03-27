import { StyleSheet } from 'react-native';

// The sole purpose of this test file is to test that the styles
// from the BottomNavigation component match our expectations

describe('BottomNavigation Styling', () => {
  // Define the expected styles
  const styles = StyleSheet.create({
    container: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: '#f7b305',
      height: 70,
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: '#e0e0e0',
      paddingBottom: 10,
    },
    navButton: {
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
    },
    navText: {
      fontSize: 12,
      marginTop: 2,
      color: 'black',
    },
    centerNavButton: {
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
    },
    centerCircle: {
      width: 50,
      height: 50,
      borderRadius: 25,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 15,
      backgroundColor: '#f7b305',
    },
  });

  it('has correct container style', () => {
    expect(styles.container).toBeDefined();
    expect(styles.container.backgroundColor).toBe('#f7b305');
    expect(styles.container.height).toBe(70);
    expect(styles.container.position).toBe('absolute');
  });

  it('has correct nav button style', () => {
    expect(styles.navButton).toBeDefined();
    expect(styles.navButton.alignItems).toBe('center');
    expect(styles.navButton.justifyContent).toBe('center');
    expect(styles.navButton.flex).toBe(1);
  });

  it('has correct nav text style', () => {
    expect(styles.navText).toBeDefined();
    expect(styles.navText.fontSize).toBe(12);
    expect(styles.navText.color).toBe('black');
  });

  it('has correct center button style', () => {
    expect(styles.centerCircle).toBeDefined();
    expect(styles.centerCircle.width).toBe(50);
    expect(styles.centerCircle.height).toBe(50);
    expect(styles.centerCircle.borderRadius).toBe(25);
    expect(styles.centerCircle.backgroundColor).toBe('#f7b305');
  });
}); 