import type { ColorTheme } from './types';

/** 월드 좌표 1 단위가 몇 픽셀인지 */
export const initialZoom = 30;
export const canvasWidth = 1600;
export const canvasHeight = 900;
/** 골인 지점에 이만큼 가까워지면 줌인 연출을 시작한다 */
export const zoomThreshold = 5;
/** 구슬이 이 시간(ms) 이상 멈춰 있으면 흔들어 준다 */
export const STUCK_DELAY = 5000;

export const Skills = {
  None: 0,
  Impact: 1,
} as const;
export type Skill = (typeof Skills)[keyof typeof Skills];

export const Themes: Record<'light' | 'dark', ColorTheme> = {
  light: {
    background: '#eeeeee',
    marbleLightness: 50,
    marbleWinningBorder: 'black',
    skillColor: '#6699cc',
    coolTimeIndicator: '#999999',
    entity: {
      box: { fill: '#226f92', outline: 'black', bloom: 'cyan', bloomRadius: 0 },
      circle: { fill: 'yellow', outline: '#ed7e11', bloom: 'yellow', bloomRadius: 0 },
      polyline: { fill: 'white', outline: 'black', bloom: 'cyan', bloomRadius: 0 },
    },
    rankStroke: 'black',
    minimapBackground: '#fefefe',
    minimapViewport: '#6699cc',
    winnerBackground: 'rgba(255, 255, 255, 0.5)',
    winnerOutline: 'black',
    winnerText: '#cccccc',
  },
  dark: {
    background: 'black',
    marbleLightness: 75,
    marbleWinningBorder: 'white',
    skillColor: 'white',
    coolTimeIndicator: 'red',
    entity: {
      box: { fill: 'cyan', outline: 'cyan', bloom: 'cyan', bloomRadius: 15 },
      circle: { fill: 'yellow', outline: 'yellow', bloom: 'yellow', bloomRadius: 15 },
      polyline: { fill: 'white', outline: 'white', bloom: 'cyan', bloomRadius: 15 },
    },
    rankStroke: '',
    minimapBackground: '#333333',
    minimapViewport: 'white',
    winnerBackground: 'rgba(0, 0, 0, 0.5)',
    winnerOutline: 'black',
    winnerText: 'white',
  },
};
