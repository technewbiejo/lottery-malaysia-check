export type OperatorId = 'magnum' | 'toto' | 'damacai';

export interface DrawResults {
  first: string;
  second: string;
  third: string;
  special: string[];
  consolation: string[];
  additional?: {
    toto5D?: string[];
    toto6D?: string;
    jackpot?: string[];
    power6_55?: string[];
    supreme6_58?: string[];
    star6_50?: string[];
    damacai3D?: string[];
  };
}

export interface DrawData {
  operator: OperatorId;
  drawNo: string;
  date: string; // YYYY-MM-DD
  results: DrawResults;
}

export interface SearchQuery {
  number: string;
  operator?: OperatorId | 'all';
  date?: string;
  drawNo?: string;
}

export interface PrizeMatch {
  number: string;
  operator: OperatorId;
  drawNo: string;
  date: string;
  prizeType: '1st Prize' | '2nd Prize' | '3rd Prize' | 'Special' | 'Consolation' | '5D' | '6D' | '3D' | 'Jackpot' | 'Lotto' | 'None';
  prizeAmount?: string;
}

export interface CheckResultResponse {
  searchedNumber: string;
  matches: PrizeMatch[];
  drawsSearched: {
    operator: OperatorId;
    drawNo: string;
    date: string;
  }[];
  isLiveGroundingUsed: boolean;
}
