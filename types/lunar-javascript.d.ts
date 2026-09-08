declare module "lunar-javascript" {
  export type LiuNian = {
    getYear(): number;
    getAge(): number;
    getGanZhi(): string;
  };

  export type DaYun = {
    getIndex(): number;
    getStartAge(): number;
    getEndAge(): number;
    getStartYear(): number;
    getEndYear(): number;
    getGanZhi(): string;
    getLiuNian(): LiuNian[];
  };

  export type Yun = {
    isForward(): boolean;
    getStartYear(): number;
    getStartMonth(): number;
    getStartDay(): number;
    getStartHour(): number;
    getDaYun(count?: number): DaYun[];
  };

  export type EightChar = {
    setSect(sect: number): void;
    getYear(): string;
    getMonth(): string;
    getDay(): string;
    getTime(): string;
    getYearGan(): string;
    getMonthGan(): string;
    getDayGan(): string;
    getTimeGan(): string;
    getYearZhi(): string;
    getMonthZhi(): string;
    getDayZhi(): string;
    getTimeZhi(): string;
    getYearWuXing(): string;
    getMonthWuXing(): string;
    getDayWuXing(): string;
    getTimeWuXing(): string;
    getYearShiShenGan(): string;
    getMonthShiShenGan(): string;
    getDayShiShenGan(): string;
    getTimeShiShenGan(): string;
    getYearShiShenZhi(): string[];
    getMonthShiShenZhi(): string[];
    getDayShiShenZhi(): string[];
    getTimeShiShenZhi(): string[];
    getYearHideGan(): string[];
    getMonthHideGan(): string[];
    getDayHideGan(): string[];
    getTimeHideGan(): string[];
    getYearNaYin(): string;
    getMonthNaYin(): string;
    getDayNaYin(): string;
    getTimeNaYin(): string;
    getYearDiShi(): string;
    getMonthDiShi(): string;
    getDayDiShi(): string;
    getTimeDiShi(): string;
    getYun(gender: number): Yun;
  };

  export type Lunar = {
    getEightChar(): EightChar;
  };

  export type SolarInstance = {
    getLunar(): Lunar;
  };

  export const Solar: {
    fromYmdHms(
      year: number,
      month: number,
      day: number,
      hour: number,
      minute: number,
      second: number,
    ): SolarInstance;
  };
}
