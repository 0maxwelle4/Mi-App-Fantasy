export interface LeagueConfig {
  features: {
    buyoutClause: boolean;
  };

  premiumFeatures: {
    formations: boolean;
    captain: boolean;
    bench: boolean;
    coach: boolean;
    loan: boolean;
    ideal: boolean;
  };

  premiumConfigurations: {
    ideal: {
      reward: number;
    };

    loan: {
      duration: number;
      maxLoans: number;
      enableConclude: boolean;
      minPercentage: number;
    };
  };
}
