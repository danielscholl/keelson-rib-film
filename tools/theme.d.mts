export interface Look {
  C: Record<string, string>;
  background: string;
  crops: boolean;
  font: string;
  mono: string;
}
export function rgba(hex: string, a: number | string): string;
export function resolveTheme(theme?: Record<string, unknown>, library?: string): Look;
export function themeVars(look: Look): string;
export function libraryRoot(start: string): string;
export function pieceTheme(
  dir: string,
  manifest?: Record<string, unknown>,
): { theme: Record<string, unknown>; library: string };
