import { fireEvent, render } from '@testing-library/react-native';

import { JoinRoomForm } from './JoinRoomForm';

describe('JoinRoomForm', () => {
  it('trims and submits a guest display name', async () => {
    const onJoin = jest.fn();
    const screen = await render(<JoinRoomForm onJoin={onJoin} isJoining={false} />);

    await fireEvent.changeText(screen.getByLabelText('Your name'), '  Ace  ');
    await fireEvent.press(screen.getByRole('button', { name: 'Join squad' }));

    expect(onJoin).toHaveBeenCalledWith('Ace');
  });

  it('does not submit a blank display name', async () => {
    const onJoin = jest.fn();
    const screen = await render(<JoinRoomForm onJoin={onJoin} isJoining={false} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Join squad' }));

    expect(onJoin).not.toHaveBeenCalled();
  });

  it('shows join errors and disables the control while joining', async () => {
    const screen = await render(
      <JoinRoomForm
        onJoin={jest.fn()}
        isJoining={true}
        errorMessage="This room already has four players."
      />,
    );

    expect(screen.getByText('This room already has four players.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Joining…' }).props.accessibilityState).toMatchObject({
      disabled: true,
    });
  });
});
