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
    name: 'Points',
    field: 'points',
    category: 'scoring',
    higherIsBetter: true, // Context-dependent: offense=higher better, defense=lower better
    format: 'decimal',
    description: 'Points scored (offense) or allowed (defense) per game',
    availableInOffense: true,
    availableInDefense: true,
  },

  // === TOTAL OFFENSE/DEFENSE ===
  'total_yards': {
    name: 'Total Yards',
    field: 'total_yards',
    category: 'efficiency', 
    higherIsBetter: true, // For offense: higher is better, for defense: lower is better (context-dependent)
    format: 'decimal',
    description: 'Total yards gained (offense) or allowed (defense) per game',
    availableInOffense: true,
    availableInDefense: true,
  },

  'plays_offense': {
    name: 'Plays',
    field: 'plays_offense',
    category: 'efficiency',
    higherIsBetter: true, // Offense: more plays = better; Defense: fewer plays allowed = better (context-dependent)
    format: 'decimal',
    description: 'Total offensive plays per game (offense) or plays allowed per game (defense)',
    availableInOffense: true,
    availableInDefense: true,
  },

  'yds_per_play_offense': {
    name: 'Yards per Play',
    field: 'yds_per_play_offense',
    category: 'efficiency',
    higherIsBetter: true, // Offense: more Y/P = better; Defense: fewer Y/P allowed = better (context-dependent)
    format: 'decimal',
    description: 'Average yards per offensive play (offense) or yards per play allowed (defense)',
    availableInOffense: true,
    availableInDefense: true,
  },

  'turnovers': {
    name: 'Turnovers',
    field: 'turnovers',
    category: 'efficiency',
    higherIsBetter: false, // Offense: fewer turnovers = better; Defense: more turnovers forced = better (context-dependent)
    format: 'decimal',
    description: 'Turnovers per game (offense: committed, defense: forced)',
    availableInOffense: true,
    availableInDefense: true,
  },

  'fumbles_lost': {
    name: 'Fumbles Lost',
    field: 'fumbles_lost',
    category: 'efficiency',
    higherIsBetter: false, // Offense: fewer fumbles lost = better; Defense: more fumbles forced = better (context-dependent)
    format: 'decimal',
    description: 'Fumbles lost per game (offense: lost, defense: forced)',
    availableInOffense: true,
    availableInDefense: true,
  },

  'first_down': {
    name: 'First Downs',
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
    name: 'Completions',
    field: 'pass_cmp',
    category: 'passing',
    higherIsBetter: true, // Offense: more completions = better; Defense: fewer completions allowed = better (context-dependent)
    format: 'decimal', 
    description: 'Pass completions per game (offense: made, defense: allowed)',
    availableInOffense: true,
    availableInDefense: true,
  },

  'pass_att': {
    name: 'Attempts',
    field: 'pass_att',
    category: 'passing',
    higherIsBetter: true, // Offense: more attempts = more volume; Defense: fewer attempts faced = better (context-dependent)
    format: 'decimal',
    description: 'Pass attempts per game (offense: attempted, defense: faced)',
    availableInOffense: true,
    availableInDefense: true,
  },

  'pass_yds': {
    name: 'Passing Yards',
    field: 'pass_yds',
    category: 'passing',
    higherIsBetter: true,
    format: 'decimal',
    description: 'Passing yards per game',
    availableInOffense: true,
    availableInDefense: true,
  },

  'pass_td': {
    name: 'Passing TDs',
    field: 'pass_td',
    category: 'passing',
    higherIsBetter: true, // Offense: more passing TDs = better; Defense: fewer passing TDs allowed = better (context-dependent)
    format: 'decimal',
    description: 'Passing touchdowns per game (offense: scored, defense: allowed)',
    availableInOffense: true,
    availableInDefense: true,
  },

  'pass_int': {
    name: 'Interceptions',
    field: 'pass_int',
    category: 'passing',
    higherIsBetter: false, // Offense: fewer interceptions thrown = better; Defense: more interceptions made = better (context-dependent)
    format: 'decimal',
    description: 'Interceptions per game (offense: thrown, defense: made)',
    availableInOffense: true,
    availableInDefense: true,
  },

  'pass_net_yds_per_att': {
    name: 'Net Yards/Attempt',
    field: 'pass_net_yds_per_att',
    category: 'passing',
    higherIsBetter: true, // Offense: more net yards per attempt = better; Defense: fewer net yards per attempt allowed = better (context-dependent)
    format: 'decimal',
    description: 'Net passing yards per attempt (offense: gained, defense: allowed)',
    availableInOffense: true,
    availableInDefense: true,
  },

  'pass_fd': {
    name: 'Pass 1st Downs',
    field: 'pass_fd',
    category: 'passing',
    higherIsBetter: true, // Offense: more passing first downs = better; Defense: fewer passing first downs allowed = better (context-dependent)
    format: 'decimal',
    description: 'First downs via passing per game (offense: gained, defense: allowed)',
    availableInOffense: true,
    availableInDefense: true,
  },

  // === RUSHING ===
  'rush_att': {
    name: 'Rush Attempts',
    field: 'rush_att',
    category: 'rushing',
    higherIsBetter: true, // Offense: more rush attempts = better ground game; Defense: fewer rush attempts faced = better (context-dependent)
    format: 'decimal',
    description: 'Rushing attempts per game (offense: attempted, defense: faced)',
    availableInOffense: true,
    availableInDefense: true,
  },

  'rush_yds': {
    name: 'Rushing Yards',
    field: 'rush_yds',
    category: 'rushing',
    higherIsBetter: true,
    format: 'decimal',
    description: 'Rushing yards per game',
    availableInOffense: true,
    availableInDefense: true,
  },

  'rush_td': {
    name: 'Rushing TDs',
    field: 'rush_td',
    category: 'rushing',
    higherIsBetter: true, // Offense: more rushing TDs = better; Defense: fewer rushing TDs allowed = better (context-dependent)
    format: 'decimal',
    description: 'Rushing touchdowns per game (offense: scored, defense: allowed)',
    availableInOffense: true,
    availableInDefense: true,
  },

  'rush_yds_per_att': {
    name: 'Yards/Attempt',
    field: 'rush_yds_per_att',
    category: 'rushing',
    higherIsBetter: true, // Offense: more yards per rush = better; Defense: fewer yards per rush allowed = better (context-dependent)
    format: 'decimal',
    description: 'Rushing yards per attempt (offense: gained, defense: allowed)',
    availableInOffense: true,
    availableInDefense: true,
  },

  'rush_fd': {
    name: 'Rush (1st)D',
    field: 'rush_fd',
    category: 'rushing', 
    higherIsBetter: true, // Offense: more rushing first downs = better; Defense: fewer rushing first downs allowed = better (context-dependent)
    format: 'decimal',
    description: 'First downs via rushing per game (offense: gained, defense: allowed)',
    availableInOffense: true,
    availableInDefense: true,
  },

  // === PENALTIES ===
  'penalties': {
    name: 'Penalties',
    field: 'penalties',
    category: 'efficiency',
    higherIsBetter: false,
    format: 'decimal',
    description: 'Penalties per game',
    availableInOffense: true,
    availableInDefense: true,
  },

  'penalty_yds': {
    name: 'Penalty Yards',
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
    name: 'Penalties',
    field: 'penalties',
    category: 'efficiency',
    higherIsBetter: false,
    format: 'decimal',
    description: 'Penalties per game',
    availableInOffense: true,
    availableInDefense: true,
  },

  // === EFFICIENCY METRICS ===
  'third_down_pct': {
    name: '3rd Down %',
    field: 'third_down_pct',
    category: 'efficiency',
    higherIsBetter: true, // Offense: higher 3rd down % = better; Defense: lower 3rd down % allowed = better (context-dependent)
    format: 'percentage',
    description: '3rd down conversion percentage (offense: converted, defense: allowed)',
    availableInOffense: true,
    availableInDefense: true,
  },

  'score_pct': {
    name: 'Scoring %',
    field: 'score_pct',
    category: 'efficiency',
    higherIsBetter: true, // Offense: higher scoring % = better; Defense: lower scoring % allowed = better (context-dependent)
    format: 'percentage',
    description: 'Percentage of drives that result in scores (offense: scored, defense: allowed)',
    availableInOffense: true,
    availableInDefense: true,
  },

  'turnover_pct': {
    name: 'Turnover %',
    field: 'turnover_pct',
    category: 'efficiency',
    higherIsBetter: false, // Offense: lower turnover % = better; Defense: higher turnover % forced = better (context-dependent)
    format: 'percentage',
    description: 'Percentage of drives that end in turnovers (offense: committed, defense: forced)',
    availableInOffense: true,
    availableInDefense: true,
  },

  'exp_pts_tot': {
    name: 'Expected Points',
    field: 'exp_pts_tot',
    category: 'advanced',
    higherIsBetter: true, // Offense: more expected points = better; Defense: fewer expected points allowed = better (context-dependent)
    format: 'decimal',
    description: 'Expected points total (offense: generated, defense: allowed)',
    availableInOffense: true,
    availableInDefense: true,
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
  'points',
  'total_yards', 
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
