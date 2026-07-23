export interface GameOptions {
  useSkills: boolean;
  /** 0-based 우승 순위 (0 = 1등) */
  winningRank: number;
  autoRecording: boolean;
  darkMode: boolean;
}

const options: GameOptions = {
  useSkills: true,
  winningRank: 0,
  autoRecording: false,
  darkMode: true,
};

export default options;
