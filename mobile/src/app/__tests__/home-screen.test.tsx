import { render } from '@testing-library/react-native';

import HomeScreen from '../index';

describe('HomeScreen', () => {
  it('shows the configured app name', async () => {
    const screen = await render(<HomeScreen />);

    expect(screen.getByText('zero-ji-ka-hukum')).toBeTruthy();
  });
});
