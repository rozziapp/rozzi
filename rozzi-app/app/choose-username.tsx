import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCustomFonts } from '@/hooks/fonts';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function ChooseUsernameScreen() {
    const [fontsLoaded] = useCustomFonts();
    const { setUsername } = useAuth();
    const params = useLocalSearchParams();
    const initialName = params.name ? String(params.name) : '';

    const [username, setUsernameInput] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    if (!fontsLoaded) return null;

    const handleContinue = async () => {
        const trimmedUsername = username.trim();

        if (!trimmedUsername) {
            setError('Username is required');
            return;
        }

        if (trimmedUsername.length < 4) {
            setError('Username must be at least 4 characters long');
            return;
        }

        if (trimmedUsername.length > 15) {
            setError('Username must be at most 15 characters long');
            return;
        }

        const validUsernameRegex = /^[a-zA-Z0-9_]+$/;
        if (!validUsernameRegex.test(trimmedUsername)) {
            setError('Username can only contain letters, numbers, and underscores');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const success = await setUsername(username);
            if (success) {
                router.replace('/(tabs)');
            } else {
                setError('Failed to set username. Please try again.');
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <View style={styles.logoContainer}>
                        <Ionicons name="person" size={48} color="#6b46c1" />
                    </View>
                    <Text style={styles.title}>
                        {initialName ? `Hi ${initialName}, choose your username` : 'Choose your username'}
                    </Text>
                </View>

                <View style={styles.formContainer}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Username</Text>
                        <View style={[styles.inputContainer, error ? styles.inputError : null]}>
                            <Ionicons name="at-outline" size={20} color={error ? "#ef4444" : "#9ca3af"} />
                            <TextInput
                                style={styles.textInput}
                                placeholder="Choose a username"
                                value={username}
                                onChangeText={(text) => {
                                    setUsernameInput(text);
                                    setError(''); // Clear error on typing
                                }}
                                autoCapitalize="none"
                                autoCorrect={false}
                                maxLength={15}
                            />
                            {username.length > 0 && (
                                <View style={styles.validationIcon}>
                                    {username.length >= 4 && username.length <= 15 && /^[a-zA-Z0-9_]+$/.test(username) ? (
                                        <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                                    ) : (
                                        null // Don't show X icon, just keep clean until submit or explicit error
                                    )}
                                </View>
                            )}
                        </View>

                        {/* Validation Requirements Note */}
                        <Text style={styles.helperText}>
                            4-15 characters, letters & numbers only
                        </Text>

                        {/* Error Message */}
                        {error ? (
                            <View style={styles.errorContainer}>
                                <Ionicons name="alert-circle" size={16} color="#ef4444" />
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        ) : null}
                    </View>

                    <TouchableOpacity
                        style={[
                            styles.button,
                            (username.length < 4 || isLoading) && styles.buttonDisabled
                        ]}
                        onPress={handleContinue}
                        disabled={isLoading || username.length < 4}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>Continue</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#B0AAD9' },
    scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
    header: { alignItems: 'center', marginBottom: 48 },
    logoContainer: { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 24, padding: 20, marginBottom: 24 },
    title: { fontSize: 24, fontWeight: '700', color: '#111827', textAlign: 'center' },
    formContainer: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 20, padding: 24 },
    inputGroup: { marginBottom: 24 },
    inputLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.8)',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: 'rgba(107,114,128,0.2)'
    },
    inputError: {
        borderColor: '#ef4444',
        borderWidth: 1,
        backgroundColor: '#fef2f2'
    },
    textInput: { flex: 1, marginLeft: 12, fontSize: 16 },
    validationIcon: { marginLeft: 8 },
    helperText: { fontSize: 12, color: '#6b7280', marginTop: 6, marginLeft: 4 },
    errorContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 8, marginLeft: 4 },
    errorText: { color: '#ef4444', fontSize: 12, marginLeft: 4, fontWeight: '500' },
    button: { backgroundColor: '#6b46c1', borderRadius: 12, padding: 16, alignItems: 'center' },
    buttonDisabled: { backgroundColor: '#c4b5fd', opacity: 0.8 },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
