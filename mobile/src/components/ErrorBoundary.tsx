import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';
import { captureError } from '../services/crashReporter';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

// Sentry.wrap(App) (see index.js) reports uncaught render errors but doesn't
// catch them — without a real error boundary, a throw during e.g. MapScreen's
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
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.body}>Sorry about that — please try again.</Text>
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
  title: { fontFamily: 'Nunito_700Bold', fontSize: 20, color: 'white', marginBottom: 8, textAlign: 'center' },
  body: { fontFamily: 'Nunito_400Regular', fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 24, textAlign: 'center' },
  button: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28 },
  buttonText: { fontFamily: 'Nunito_700Bold', fontSize: 15, color: 'white' },
});
