import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { colors } from '../theme';
import { captureError } from '../services/crashReporter';
import { DEFAULT_BAR_STYLE } from '../hooks/useStatusBarStyle';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

// Crashlytics' global JS-error handler (see initCrashReporting in index.js)
// reports uncaught errors but doesn't catch them — without a real error
// boundary, a throw during e.g. MapScreen's first mount
// first mount unmounts the whole tree and leaves whatever was last painted
// (the navigator's dark contentStyle background) frozen on screen with
// nothing the user can do but force-close. This gives that failure a visible,
// recoverable screen instead.
export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    captureError(error, { componentStack: info.componentStack });
    // Dark error screen, outside the navigator, so no hook: set it directly.
    StatusBar.setBarStyle('light-content', true);
  }

  handleReset = () => {
    StatusBar.setBarStyle(DEFAULT_BAR_STYLE, true);
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.body}>Sorry about that, please try again.</Text>
          <TouchableOpacity style={styles.button} onPress={this.handleReset}>
            <Text style={styles.buttonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0D1B2A', paddingHorizontal: 32 },
  title: { fontFamily: 'Nunito-Bold', fontSize: 20, color: '#F5F7FA', marginBottom: 8, textAlign: 'center' },
  body: { fontFamily: 'Nunito-Regular', fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 24, textAlign: 'center' },
  button: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28 },
  buttonText: { fontFamily: 'Nunito-Bold', fontSize: 15, color: '#F5F7FA' },
});
