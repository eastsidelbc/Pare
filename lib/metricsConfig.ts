/**
 * Comprehensive NFL Metrics Configuration
 * 
 * This is the central registry for all available NFL metrics from Pro Football Reference.
 * Adding new metrics is as simple as adding entries to these objects.
 * 
 * SELF-HOSTING ADVANTAGE: Customize this file to focus on your specific needs!
 */

export interface MetricDefinition {
  /** Display name for the UI */
  name: string;
  
  /** Technical field name from PFR (shown in parentheses) */
  field: string;
  
  /** Category for grouping in UI */
  category: 'scoring' | 'passing' | 'rushing' | 'efficiency' | 'defense' | 'special' | 'advanced';
  
  /** Whether higher values are better (for ranking) */
  higherIsBetter: boolean;
  
  /** How to format the value for display */
  format: 'number' | 'decimal' | 'percentage' | 'time';
  
  /** Optional description for tooltips */
  description?: string;
  
  /** Whether this metric is available in offense stats */
  availableInOffense?: boolean;
  
  /** Whether this metric is available in defense stats */
  availableInDefense?: boolean;
}

/**
 * Complete registry of available NFL metrics
 * 
 * 🎯 CUSTOMIZATION TIP: Add your own metrics here!
 * Just match the field names from Pro Football Reference's data-stat attributes.
 */
export const AVAILABLE_METRICS: Record<string, MetricDefinition> = {
  // === BASIC STATS ===
  'g': {
    name: 'Games',
    field: 'g',
    category: 'efficiency',
    higherIsBetter: true,
    format: 'number',
    description: 'Games played',
    availableInOffense: true,
    availableInDefense: true,
  },
  
  // === SCORING ===
  'points': {
    name: 'Points For (PF)',
    field: 'points',
    category: 'scoring',
    higherIsBetter: true,
    format: 'decimal',
    description: 'Points scored per game',
    availableInOffense: true,
    availableInDefense: false,
  },

  'points_allowed': {
    name: 'Points Against (PA)',
    field: 'points',
    category: 'scoring',
    higherIsBetter: false,
    format: 'decimal',
    description: 'Points allowed per game',
    availableInOffense: false,
    availableInDefense: true,
  },

  // === TOTAL OFFENSE/DEFENSE ===
  'total_yards': {
    name: 'Total Yards (Yds)',
    field: 'total_yards',
    category: 'efficiency',
    higherIsBetter: true,
    format: 'decimal',
    description: 'Total offensive yards per game',
    availableInOffense: true,
    availableInDefense: false,
  },

  'total_yards_allowed': {
    name: 'Total Yards Allowed (Yds)',
    field: 'total_yards',
    category: 'efficiency',
    higherIsBetter: false,
    format: 'decimal',
    description: 'Total yards allowed per game',
    availableInOffense: false,
    availableInDefense: true,
  },

  'plays_offense': {
    name: 'Plays (Ply)',
    field: 'plays_offense',
    category: 'efficiency',
    higherIsBetter: true,
    format: 'decimal',
    description: 'Total offensive plays per game',
    availableInOffense: true,
    availableInDefense: false,
  },

  'yds_per_play_offense': {
    name: 'Yards per Play (Y/P)',
    field: 'yds_per_play_offense',
    category: 'efficiency',
    higherIsBetter: true,
    format: 'decimal',
    description: 'Average yards per offensive play',
    availableInOffense: true,
    availableInDefense: false,
  },

  'turnovers': {
    name: 'Turnovers (TO)',
    field: 'turnovers',
    category: 'efficiency',
    higherIsBetter: false,
    format: 'decimal',
    description: 'Turnovers per game',
    availableInOffense: true,
    availableInDefense: false,
  },

  'fumbles_lost': {
    name: 'Fumbles Lost (FL)',
    field: 'fumbles_lost',
    category: 'efficiency',
    higherIsBetter: false,
    format: 'decimal',
    description: 'Fumbles lost per game',
    availableInOffense: true,
    availableInDefense: false,
  },

  'first_down': {
    name: 'First Downs (1stD)',
    field: 'first_down',
    category: 'efficiency',
    higherIsBetter: true,
    format: 'number',
    description: 'Total first downs gained',
    availableInOffense: true,
    availableInDefense: true,
  },

  // === PASSING ===
  'pass_cmp': {
    name: 'Completions (Cmp)',
    field: 'pass_cmp',
    category: 'passing',
    higherIsBetter: true,
    format: 'decimal', 
    description: 'Pass completions per game',
    availableInOffense: true,
    availableInDefense: false,
  },

  'pass_att': {
    name: 'Attempts (Att)',
    field: 'pass_att',
    category: 'passing',
    higherIsBetter: true,
    format: 'decimal',
    description: 'Pass attempts per game',
    availableInOffense: true,
    availableInDefense: false,
  },

  'pass_yds': {
    name: 'Passing Yards (Yds)',
    field: 'pass_yds',
    category: 'passing',
    higherIsBetter: true,
    format: 'decimal',
    description: 'Passing yards per game',
    availableInOffense: true,
    availableInDefense: false,
  },

  'pass_td': {
    name: 'Passing TDs (TD)',
    field: 'pass_td',
    category: 'passing',
    higherIsBetter: true,
    format: 'decimal',
    description: 'Passing touchdowns per game',
    availableInOffense: true,
    availableInDefense: false,
  },

  'pass_int': {
    name: 'Interceptions (Int)',
    field: 'pass_int',
    category: 'passing',
    higherIsBetter: false,
    format: 'decimal',
    description: 'Interceptions thrown per game',
    availableInOffense: true,
    availableInDefense: false,
  },

  'pass_net_yds_per_att': {
    name: 'Net Yards/Attempt (NY/A)',
    field: 'pass_net_yds_per_att',
    category: 'passing',
    higherIsBetter: true,
    format: 'decimal',
    description: 'Net passing yards per attempt',
    availableInOffense: true,
    availableInDefense: false,
  },

  'pass_first_down': {
    name: 'Pass 1st Downs (1stD)',
    field: 'pass_first_down',
    category: 'passing',
    higherIsBetter: true,
    format: 'decimal',
    description: 'First downs via passing per game',
    availableInOffense: true,
    availableInDefense: false,
  },

  // === RUSHING ===
  'rush_att': {
    name: 'Rush Attempts (Att)',
    field: 'rush_att',
    category: 'rushing',
    higherIsBetter: true,
    format: 'decimal',
    description: 'Rushing attempts per game',
    availableInOffense: true,
    availableInDefense: false,
  },

  'rush_yds': {
    name: 'Rushing Yards (Yds)',
    field: 'rush_yds',
    category: 'rushing',
    higherIsBetter: true,
    format: 'decimal',
    description: 'Rushing yards per game',
    availableInOffense: true,
    availableInDefense: false,
  },

  'rush_td': {
    name: 'Rushing TDs (TD)',
    field: 'rush_td',
    category: 'rushing',
    higherIsBetter: true,
    format: 'decimal',
    description: 'Rushing touchdowns per game',
    availableInOffense: true,
    availableInDefense: false,
  },

  'rush_yds_per_att': {
    name: 'Yards/Attempt (Y/A)',
    field: 'rush_yds_per_att',
    category: 'rushing',
    higherIsBetter: true,
    format: 'decimal',
    description: 'Rushing yards per attempt',
    availableInOffense: true,
    availableInDefense: false,
  },

  'rush_fd': {
    name: 'Rush (1st)D',
    field: 'rush_fd',
    category: 'rushing', 
    higherIsBetter: true,
    format: 'decimal',
    description: 'First downs via rushing per game',
    availableInOffense: true,
    availableInDefense: false,
  },

  // === PENALTIES ===
  'penalties': {
    name: 'Penalties (Pen)',
    field: 'penalties',
    category: 'efficiency',
    higherIsBetter: false,
    format: 'decimal',
    description: 'Penalties per game',
    availableInOffense: true,
    availableInDefense: true,
  },

  'penalty_yds': {
    name: 'Penalty Yards (Yds)',
    field: 'penalty_yds',
    category: 'efficiency',
    higherIsBetter: false,
    format: 'decimal',
    description: 'Penalty yards per game',
    availableInOffense: true,
    availableInDefense: true,
  },
  'penalties_yds': {
    name: 'Penalty Yards',
    field: 'penalties_yds',
    category: 'special',
    higherIsBetter: false,
    format: 'number',
    description: 'Total penalty yards committed',
    availableInOffense: true,
    availableInDefense: true,
  },
  'pen_fd': {
    name: 'Penalty First Downs',
    field: 'pen_fd',
    category: 'special',
    higherIsBetter: false,
    format: 'number',
    description: 'First downs gained via penalty',
    availableInOffense: true,
    availableInDefense: true,
  },

  'penalty_first_down': {
    name: 'Penalty 1st Downs (1stPy)',
    field: 'penalty_first_down',
    category: 'efficiency',
    higherIsBetter: false,
    format: 'decimal',
    description: 'First downs via penalties per game',
    availableInOffense: true,
    availableInDefense: true,
  },

  // === EFFICIENCY METRICS ===
  'third_down_pct': {
    name: '3rd Down %',
    field: 'third_down_pct',
    category: 'efficiency',
    higherIsBetter: true,
    format: 'percentage',
    description: '3rd down conversion percentage',
    availableInOffense: true,
    availableInDefense: false,
  },

  'score_pct': {
    name: 'Scoring %',
    field: 'score_pct',
    category: 'efficiency',
    higherIsBetter: true,
    format: 'percentage',
    description: 'Percentage of drives that result in scores',
    availableInOffense: true,
    availableInDefense: false,
  },

  'turnover_pct': {
    name: 'Turnover %',
    field: 'turnover_pct',
    category: 'efficiency',
    higherIsBetter: false,
    format: 'percentage',
    description: 'Percentage of drives that end in turnovers',
    availableInOffense: true,
    availableInDefense: false,
  },

  'exp_pts_tot': {
    name: 'Expected Points (EXP)',
    field: 'exp_pts_tot',
    category: 'advanced',
    higherIsBetter: true,
    format: 'decimal',
    description: 'Expected points total',
    availableInOffense: true,
    availableInDefense: false,
  },
};

/**
 * Default metrics for offense comparison
 */
export const DEFAULT_OFFENSE_METRICS = [
  'points',
  'total_yards', 
  'pass_yds',
  'rush_yds',
  'score_pct'
];

/**
 * Default metrics for defense comparison  
 */
export const DEFAULT_DEFENSE_METRICS = [
  'points_allowed',
  'total_yards_allowed',
  'pass_yds',
  'rush_yds',
  'score_pct'
];

/**
 * Get all available metrics for a specific type (offense/defense)
 */
export const getAvailableMetrics = (type: 'offense' | 'defense'): Record<string, MetricDefinition> => {
  const filterKey = type === 'offense' ? 'availableInOffense' : 'availableInDefense';
  
  return Object.fromEntries(
    Object.entries(AVAILABLE_METRICS).filter(([, metric]) => metric[filterKey])
  );
};

/**
 * Get metric definition by field name
 */
export const getMetricDefinition = (field: string): MetricDefinition | undefined => {
  return AVAILABLE_METRICS[field];
};

/**
 * Get metrics grouped by category
 */
export function getMetricsByCategory(type: 'offense' | 'defense') {
  const availableMetrics = getAvailableMetrics(type);
  const grouped: Record<string, Record<string, MetricDefinition>> = {};
  
  Object.entries(availableMetrics).forEach(([key, metric]) => {
    if (!grouped[metric.category]) {
      grouped[metric.category] = {};
    }
    grouped[metric.category][key] = metric;
  });
  
  return grouped;
}

/**
 * Format a metric value for display
 */
export function formatMetricValue(value: string | number, format: MetricDefinition['format']): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) return '0';
  
  switch (format) {
    case 'number':
      return Math.round(numValue).toString();
    case 'decimal':
      return numValue.toFixed(1);
    case 'percentage':
      return `${numValue.toFixed(1)}%`;
    case 'time':
      // For time-based metrics like time of possession
      const minutes = Math.floor(numValue);
      const seconds = Math.round((numValue - minutes) * 60);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    default:
      return numValue.toString();
  }
}
