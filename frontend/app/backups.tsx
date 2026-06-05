import { ScrollView, StyleSheet } from 'react-native';

import { BackupsSection } from '@/components/operations/backups-section';

export default function BackupsScreen() {
    return (
        <ScrollView contentContainerStyle={styles.container}>
            <BackupsSection />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        gap: 12,
    },
});
