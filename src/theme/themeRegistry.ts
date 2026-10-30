import type { FlowTheme, FlowThemeName } from './flowTheme';
import { darkTheme, techBlueTheme } from './darkThemes';
import { classicTheme, lightTheme, macaronsTheme, whiteboardTheme } from './lightThemes';
import { auroraDarkTheme, auroraTheme } from './modernThemes';

export const FLOW_THEMES: Record<FlowThemeName, FlowTheme> = {
  light: lightTheme,
  dark: darkTheme,
  macarons: macaronsTheme,
  'tech-blue': techBlueTheme,
  whiteboard: whiteboardTheme,
  classic: classicTheme,
  aurora: auroraTheme,
  'aurora-dark': auroraDarkTheme,
};

export function resolveFlowTheme(theme: FlowTheme | FlowThemeName = 'light'): FlowTheme {
  return typeof theme === 'string' ? FLOW_THEMES[theme] : theme;
}
