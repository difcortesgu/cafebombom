import { Image } from 'expo-image';
import { Platform, StyleSheet } from 'react-native';

import { ExternalLink } from '@/components/external-link';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Collapsible } from '@/components/ui/collapsible';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Fonts, getThemeColors } from '@/constants/theme';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { useSettingsStore } from '@/stores/settings';

export default function TabTwoScreen() {
  const palette = useAppColors();
  const selectedThemeId = useSettingsStore((state) => state.selectedThemeId);
  const lightPalette = getThemeColors(selectedThemeId, 'light');
  const darkPalette = getThemeColors(selectedThemeId, 'dark');

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: lightPalette.card, dark: darkPalette.card }}
      headerImage={
        <IconSymbol
          size={310}
          color={palette.mutedText}
          name="chevron.left.forwardslash.chevron.right"
          style={styles.headerImage}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText
          type="title"
          style={{
            fontFamily: Fonts.rounded,
          }}>
          {t('explore.title')}
        </ThemedText>
      </ThemedView>
      <ThemedText>{t('explore.subtitle')}</ThemedText>
      <Collapsible title={t('explore.section.fileRouting')}>
        <ThemedText>
          {t('explore.fileRouting.screenInfo')}{' '}
          <ThemedText type="defaultSemiBold">app/(tabs)/index.tsx</ThemedText> {t('common.and')}{' '}
          <ThemedText type="defaultSemiBold">app/(tabs)/explore.tsx</ThemedText>
        </ThemedText>
        <ThemedText>
          {t('explore.fileRouting.layoutInfo')}{' '}
          <ThemedText type="defaultSemiBold">app/(tabs)/_layout.tsx</ThemedText>{' '}
          {t('explore.fileRouting.layoutInfoSuffix')}
        </ThemedText>
        <ExternalLink href="https://docs.expo.dev/router/introduction">
          <ThemedText type="link">{t('explore.learnMore')}</ThemedText>
        </ExternalLink>
      </Collapsible>
      <Collapsible title={t('explore.section.platform')}>
        <ThemedText>
          {t('explore.platformInfoPrefix')}{' '}
          <ThemedText type="defaultSemiBold">w</ThemedText> {t('explore.platformInfoSuffix')}
        </ThemedText>
      </Collapsible>
      <Collapsible title={t('explore.section.images')}>
        <ThemedText>
          {t('explore.imagesInfoPrefix')} <ThemedText type="defaultSemiBold">@2x</ThemedText> {t('explore.imagesInfoMiddle')}{' '}
          <ThemedText type="defaultSemiBold">@3x</ThemedText> {t('explore.imagesInfoSuffix')}
        </ThemedText>
        <Image
          source={require('@/assets/images/react-logo.png')}
          style={{ width: 100, height: 100, alignSelf: 'center' }}
        />
        <ExternalLink href="https://reactnative.dev/docs/images">
          <ThemedText type="link">{t('explore.learnMore')}</ThemedText>
        </ExternalLink>
      </Collapsible>
      <Collapsible title={t('explore.section.lightDark')}>
        <ThemedText>
          {t('explore.lightDarkInfoPrefix')}{' '}
          <ThemedText type="defaultSemiBold">useColorScheme()</ThemedText> {t('explore.lightDarkInfoSuffix')}
        </ThemedText>
        <ExternalLink href="https://docs.expo.dev/develop/user-interface/color-themes/">
          <ThemedText type="link">{t('explore.learnMore')}</ThemedText>
        </ExternalLink>
      </Collapsible>
      <Collapsible title={t('explore.section.animations')}>
        <ThemedText>
          {t('explore.animationsInfoPrefix')}{' '}
          <ThemedText type="defaultSemiBold" style={{ fontFamily: Fonts.mono }}>
            react-native-reanimated
          </ThemedText>{' '}
          {t('explore.animationsInfoMiddle')}{' '}
          <ThemedText type="defaultSemiBold">components/ParallaxScrollView.tsx</ThemedText>
          {t('explore.animationsInfoSuffix')}
        </ThemedText>
        {Platform.select({
          ios: (
            <ThemedText>
              {t('explore.iosParallaxPrefix')} <ThemedText type="defaultSemiBold">components/ParallaxScrollView.tsx</ThemedText>{' '}
              {t('explore.iosParallaxSuffix')}
            </ThemedText>
          ),
        })}
      </Collapsible>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    bottom: -90,
    left: -35,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
});
