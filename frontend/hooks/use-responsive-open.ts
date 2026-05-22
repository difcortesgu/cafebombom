import { useRouter } from 'expo-router';
import { useWindowDimensions } from 'react-native';

type Route = string | { pathname: string; params?: Record<string, string | number | undefined> };

type UseResponsiveOpenResult = {
    isWide: boolean;
    openOrNavigate: (panelFn: () => void, route: Route) => void;
};

export function useResponsiveOpen(): UseResponsiveOpenResult {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isWide = width >= 768;

    function openOrNavigate(panelFn: () => void, route: Route) {
        if (isWide) {
            panelFn();
        } else {
            router.push(route as Parameters<typeof router.push>[0]);
        }
    }

    return { isWide, openOrNavigate };
}
