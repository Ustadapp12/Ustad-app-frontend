/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('../src/navigation/RootNavigator', () => ({
  RootNavigator: () => null,
}));

jest.mock('../src/store/authStore', () => ({
  useAuthStore: Object.assign(jest.fn(() => null), {
    getState: () => ({ user: null, refreshLearning: jest.fn() }),
  }),
}));

jest.mock('../src/services/analytics', () => ({
  initAnalytics: jest.fn(),
}));

jest.mock('../src/services/lessonSession', () => ({
  abandonActiveLessonSessionSilent: jest.fn(),
}));

import App from '../App';

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
