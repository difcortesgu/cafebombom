import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { ThemedInput } from '@/components/ui/themed-input';
import { THEME_OPTIONS } from '@/constants/theme';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { useAuthStore } from '@/stores/auth';
import { type ThemeModePreference, useSettingsStore } from '@/stores/settings';

export default function AppearanceScreen() {
    const palette = useAppColors();

    const {
        currentUser,
        updateCurrentUserProfile,
        loading: authLoading,
        logout,
    } = useAuthStore();

    const {
        selectedThemeId,
        themeModePreference,
        hydrateFromDb,
        setTheme,
        setThemeModePreference,
    } = useSettingsStore();

    const [profileName, setProfileName] = useState(currentUser?.name ?? '');
    const [profilePin, setProfilePin] = useState('');
    const [profileMessage, setProfileMessage] = useState<string | null>(null);

    const MODE_OPTIONS: { label: string; value: ThemeModePreference }[] = [
        { label: t('settings.mode.system'), value: 'system' },
        { label: t('settings.mode.light'), value: 'light' },
        { label: t('settings.mode.dark'), value: 'dark' },
    ];

    useEffect(() => {
        void hydrateFromDb();
    }, [hydrateFromDb]);

    useEffect(() => {
        setProfileName(currentUser?.name ?? '');
    }, [currentUser?.name]);

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <ThemedText type="title">{t('nav.tab.appearance')}</ThemedText>
            <ThemedText>{t('appearance.subtitle')}</ThemedText>

            <ThemedCard style={styles.card}>
                <ThemedText type="subtitle">{t('settings.currentUser.title')}</ThemedText>
                <ThemedInput
                    value={profileName}
                    placeholder={t('settings.currentUser.namePlaceholder')}
                    onChangeText={setProfileName}
                />
                <ThemedInput
                    value={profilePin}
                    secureTextEntry
                    keyboardType="number-pad"
                    maxLength={6}
                    placeholder={t('settings.currentUser.pinPlaceholder')}
                    onChangeText={setProfilePin}
                />
                <ThemedButton
                    disabled={authLoading || profileName.trim().length === 0}
                    label={authLoading ? t('settings.currentUser.savingProfile') : t('settings.currentUser.saveProfile')}
                    onPress={async () => {
                        setProfileMessage(null);
                        const ok = await updateCurrentUserProfile({
                            name: profileName,
                            pin: profilePin.trim().length > 0 ? profilePin : undefined,
                        });
                        if (ok) {
                            setProfilePin('');
                            setProfileMessage(t('settings.currentUser.updated'));
                        }
                    }}
                />
                {profileMessage ? <ThemedText style={styles.muted}>{profileMessage}</ThemedText> : null}
            </ThemedCard>

            <ThemedCard style={styles.card}>
                <ThemedText type="subtitle">{t('settings.theme.title')}</ThemedText>
                <ThemedText style={styles.muted}>{t('settings.theme.subtitle')}</ThemedText>

                <View style={styles.modeRow}>
                    {MODE_OPTIONS.map((opt) => {
                        const isActive = themeModePreference === opt.value;
                        return (
                            <Pressable
                                key={opt.value}
                                style={[
                                    styles.modeChip,
                                    {
                                        backgroundColor: isActive ? palette.tint : palette.inputBackground,
                                        borderColor: isActive ? palette.tint : palette.border,
                                    },
                                ]}
                                onPress={() => setThemeModePreference(opt.value)}>
                                <ThemedText style={{ color: isActive ? palette.card : palette.text, fontWeight: isActive ? '700' : '400' }}>
                                    {opt.label}
                                </ThemedText>
                            </Pressable>
                        );
                    })}
                </View>

                <View style={styles.themeList}>
                    {THEME_OPTIONS.map((theme) => {
                        const isActive = selectedThemeId === theme.id;
                        return (
                            <Pressable
                                key={theme.id}
                                style={[
                                    styles.themeOption,
                                    {
                                        borderColor: isActive ? palette.tint : palette.border,
                                        backgroundColor: isActive ? palette.card : 'transparent',
                                    },
                                ]}
                                onPress={() => setTheme(theme.id)}>
                                <View style={styles.themeHeader}>
                                    <ThemedText type="defaultSemiBold">{theme.name}</ThemedText>
                                    <ThemedText style={{ color: isActive ? palette.tint : palette.mutedText }}>
                                        {isActive ? t('settings.theme.active') : t('settings.theme.select')}
                                    </ThemedText>
                                </View>

                                <View style={styles.swatchRow}>
                                    {theme.preview.map((color) => (
                                        <View key={`${theme.id}-${color}`} style={[styles.swatch, { backgroundColor: color }]} />
                                    ))}
                                </View>

                                <ThemedText style={styles.muted}>{theme.description}</ThemedText>
                            </Pressable>
                        );
                    })}
                </View>
            </ThemedCard>

            <ThemedCard style={styles.card}>
                <ThemedText type="subtitle">{t('settings.session.title')}</ThemedText>
                <ThemedButton label={t('settings.session.logout')} onPress={logout} />
            </ThemedCard>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        gap: 12,
    },
    card: {
        gap: 10,
    },
    muted: {
        opacity: 0.9,
        fontSize: 13,
    },
    modeRow: {
        flexDirection: 'row',
        gap: 8,
    },
    modeChip: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
    },
    themeList: {
        gap: 8,
    },
    themeOption: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 10,
        gap: 8,
    },
    themeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    swatchRow: {
        flexDirection: 'row',
        gap: 6,
    },
    swatch: {
        flex: 1,
        height: 22,
        borderRadius: 6,
    },
});
