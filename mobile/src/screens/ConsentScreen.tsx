import React, { useState } from 'react';
import { View, Text, StyleSheet, Button, ScrollView, Alert } from 'react-native';

const ConsentScreen = ({ navigation, route }: any) => {
    const [agreed, setAgreed] = useState(false);
    const { callId } = route.params || {};

    const handleAgree = () => {
        setAgreed(true);
        Alert.alert('Consent Recorded', 'Your consent has been securely recorded.', [
            { text: 'OK', onPress: () => navigation.goBack() }
        ]);
        // Logic to send consent to backend would go here
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Call Recording Consent</Text>

            <View style={styles.card}>
                <Text style={styles.text}>
                    To comply with legal requirements in your jurisdiction, we require your consent to record this call.
                </Text>
                <Text style={styles.text}>
                    The recording will be securely stored and used only for quality assurance and compliance purposes.
                </Text>
                <Text style={styles.text}>
                    You have the right to access or request deletion of this recording at any time.
                </Text>
            </View>

            <View style={styles.buttonContainer}>
                <Button title="I Agree to be Recorded" onPress={handleAgree} disabled={agreed} />
                <View style={{ height: 10 }} />
                <Button title="Decline" color="red" onPress={() => navigation.goBack()} />
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        padding: 20,
        backgroundColor: '#f5f5f5',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    card: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 10,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    text: {
        fontSize: 16,
        marginBottom: 15,
        lineHeight: 24,
    },
    buttonContainer: {
        marginTop: 10,
    },
});

export default ConsentScreen;
