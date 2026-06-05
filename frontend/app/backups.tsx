import { ScrollView, StyleSheet } from 'react-native';

import { BackupsSection } from '@/components/operations/backups-section';
import { DiagnosticsSection } from '@/components/operations/diagnostics-section';

export default function BackupsScreen() {
    return (
        <ScrollView contentContainerStyle={styles.container}>
            <BackupsSection />
            <DiagnosticsSection />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        gap: 12,
    },
});
