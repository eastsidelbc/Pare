/**
 * Pro Football Reference CSV Parser - TypeScript Version
 * 
 * Parses NFL team stats from CSV files into normalized JSON format.
 * Much simpler and faster than HTML parsing!
 */

import { logger } from '@/utils/logger';

// Debug logging utility - now uses centralized logger with log levels
const debugLog = (context: string, message: string, data?: unknown) => {
  logger.debug({ context: `PFR-CSV-${context}` }, message, data);
};

export interface TeamStats {
  team: string;
  [key: string]: string;
}

export interface TeamStatsWithRanks {
  team: string;
  ranks: Record<string, number>;
  [key: string]: string | Record<string, number>;
}

export interface ParseResult {
  updatedAt: string;
  rows: TeamStats[];
}

export interface RankBasis {
  [key: string]: 'asc' | 'desc';
}

/**
 * CSV Column mapping for PFR data by POSITION (since column names repeat)
 * Maps column positions to our standardized field names
 * 
 * CSV Header: Rk,Tm,G,PF,Yds,Ply,Y/P,TO,FL,1stD,Cmp,Att,Yds,TD,Int,NY/A,1stD,Att,Yds,TD,Y/A,1stD,Pen,Yds,1stPy,Sc%,TO%,EXP
 * Positions:   0  1  2  3   4   5   6   7  8   9   10  11  12  13 14   15   16   17  18  19  20   21   22  23   24   25  26  27
 */
const CSV_COLUMN_MAPPING_BY_POSITION: Record<number, string> = {
  // MANUALLY VERIFIED POSITIONS from CSV header:
  // Rk,Tm,G,PF,Yds,Ply,Y/P,TO,FL,1stD,Cmp,Att,Yds,TD,Int,NY/A,1stD,Att,Yds,TD,Y/A,1stD,Pen,Yds,1stPy,Sc%,TO%,EXP
  // 0  1  2 3  4   5   6   7  8  9    10  11  12  13 14  15   16   17  18  19 20   21   22  23  24   25  26  27
  
  0: 'rk',               // Rk = Rank
  1: 'team',             // Tm = Team
  2: 'g',                // G = Games
  3: 'points',           // PF = Points For (Offense) / PA = Points Against (Defense)
  4: 'total_yards',      // Yds = TOTAL YARDS (position 4) - Offense/Defense
  5: 'plays_offense',    // Ply = Plays
  6: 'yds_per_play_offense', // Y/P = Yards per Play
  7: 'turnovers',        // TO = Turnovers
  8: 'fumbles_lost',     // FL = Fumbles Lost
  9: 'first_down',       // 1stD = First Downs
  
  // Passing stats
  10: 'pass_cmp',        // Cmp = Completions
  11: 'pass_att',        // Att = Attempts
  12: 'pass_yds',        // Yds = PASSING YARDS (position 12)
  13: 'pass_td',         // TD = Passing TDs
  14: 'pass_int',        // Int = Interceptions
  15: 'pass_net_yds_per_att', // NY/A = Net Yards per Attempt
  16: 'pass_fd',         // 1stD = Passing First Downs
  
  // Rushing stats  
  17: 'rush_att',        // Att = Rush Attempts
  18: 'rush_yds',        // Yds = RUSHING YARDS (position 18)
  19: 'rush_td',         // TD = Rushing TDs
  20: 'rush_yds_per_att', // Y/A = Yards per Attempt
  21: 'rush_fd',         // 1stD = Rushing First Downs
  
  // Penalties
  22: 'penalties',       // Pen = Penalties
  23: 'penalties_yds',   // Yds = Penalty Yards
  24: 'pen_fd',          // 1stPy = Penalty First Downs
  
  // Efficiency
  25: 'score_pct',       // Sc% = Score Percentage
  26: 'turnover_pct',    // TO% = Turnover Percentage
  27: 'exp_pts_tot'      // EXP = Expected Points
};

/**
 * Parses CSV content into team stats rows
 */
export async function parseCSV({ 
  csvContent,
  type = 'offense'
}: {
  csvContent: string;
  type?: 'offense' | 'defense';
}): Promise<ParseResult> {
  debugLog('PARSE', `Starting CSV parsing for ${type}`, { 
    contentLength: csvContent.length,
    lineCount: csvContent.split('\n').length 
  });
  
  try {
    const lines = csvContent.trim().split('\n');
    
    // Skip first row (category headers) and use second row as actual headers
    const headers = lines[1].split(',').map(h => h.trim().replace(/"/g, ''));
    
    debugLog('HEADERS', `Found ${headers.length} columns (skipped category row):`, headers);
    
    const rows: TeamStats[] = [];
    
    // Process each data row (start from line 2, skip both header rows)
    for (let i = 2; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const rowData: TeamStats = { team: '' };
      
      // Map CSV columns by POSITION to handle duplicate column names
      values.forEach((value, index) => {
        const mappedField = CSV_COLUMN_MAPPING_BY_POSITION[index];
        
        if (mappedField && value) {
          rowData[mappedField] = value;
        }
      });
      
      // Only include rows with team names
      if (rowData.team && rowData.team !== '') {
        rows.push(rowData);
        debugLog('PARSE', `Added team: ${rowData.team}`, {
          fieldsCount: Object.keys(rowData).length,
          sampleData: {
            points: rowData.points,
            total_yards: rowData.total_yards,
            pass_yds: rowData.pass_yds,
            rush_yds: rowData.rush_yds
          }
        });
      }
    }
    
    const updatedAt = new Date().toISOString();
    debugLog('SUCCESS', `Successfully parsed ${rows.length} teams from CSV`);
    
    return { updatedAt, rows };
    
  } catch (error) {
    debugLog('ERROR', 'Failed to parse CSV data', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

/**
 * Reads CSV file from local filesystem
 */
export async function fetchAndParseCSV({ 
  type = 'offense'
}: {
  type: 'offense' | 'defense';
}): Promise<ParseResult> {
  debugLog('FETCH', `Reading CSV file for ${type}`);
  
  try {
    const filePath = `data/pfr/${type}-2025.csv`;
    const csvContent = await readLocalFile(filePath);
    
    return parseCSV({ csvContent, type });
    
  } catch (error) {
    debugLog('ERROR', `Failed to read CSV file for ${type}`, {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

/**
 * Reads local file with dynamic import for Node.js compatibility
 */
const readLocalFile = (filePath: string): Promise<string> => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require('fs');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require('path');
  
  return new Promise((resolve, reject) => {
    const fullPath = path.join(process.cwd(), filePath);
    
    debugLog('LOCAL', `Reading CSV file: ${fullPath}`);
    
    fs.readFile(fullPath, 'utf8', (err: Error | null, data: string) => {
      if (err) {
        debugLog('ERROR', `Failed to read CSV file: ${err.message}`);
        reject(new Error(`CSV file read failed: ${err.message}. Please download the CSV file manually.`));
        return;
      }
      
      debugLog('LOCAL', `Successfully read CSV file (${data.length} characters)`);
      resolve(data);
    });
  });
};

/**
 * Computes ranking for each team based on specified metrics
 * (Same as HTML version - reusable!)
 */
export function computeRanks(rows: TeamStats[], basis: RankBasis): TeamStatsWithRanks[] {
  // Note: This function is deprecated in favor of client-side ranking
  debugLog('RANK', `Computing ranks for ${rows.length} teams`, { 
    rankingMetrics: Object.keys(basis).length,
    metrics: Object.keys(basis) 
  });

  const rowsWithRanks = rows.map(row => ({
    ...row,
    ranks: {} as Record<string, number>
  }));

  // Compute ranks for each specified metric
  Object.entries(basis).forEach(([key, direction]) => {
    debugLog('RANK', `Computing ranks for ${key} (${direction})`);
    
    // Filter rows that have valid numeric values for this metric
    const validRows = rowsWithRanks.filter(row => {
      const value = sanitizeNumeric((row as unknown as Record<string, string>)[key]);
      const isValid = value !== null && !isNaN(value);
      if (!isValid) {
        debugLog('RANK', `${key} - Invalid value for ${row.team}: "${(row as unknown as Record<string, string>)[key]}"`);
      }
      return isValid;
    });

    if (validRows.length === 0) {
      debugLog('RANK', `${key} - No valid values found`);
      return;
    }

    // Sort by the metric value
    validRows.sort((a, b) => {
      const aVal = sanitizeNumeric((a as unknown as Record<string, string>)[key])!;
      const bVal = sanitizeNumeric((b as unknown as Record<string, string>)[key])!;
      return direction === 'desc' ? bVal - aVal : aVal - bVal;
    });

    // Assign ranks with proper tie handling
    validRows.forEach((row, index) => {
      const currentValue = sanitizeNumeric((row as unknown as Record<string, string>)[key])!;
      
      // Count how many teams have a BETTER value than this team
      let betterTeamsCount = 0;
      for (let i = 0; i < validRows.length; i++) {
        const otherValue = sanitizeNumeric((validRows[i] as unknown as Record<string, string>)[key])!;
        
        // For descending order (higher is better), count teams with higher values
        // For ascending order (lower is better), count teams with lower values
        if (direction === 'desc' && otherValue > currentValue) {
          betterTeamsCount++;
        } else if (direction === 'asc' && otherValue < currentValue) {
          betterTeamsCount++;
        }
      }
      
      // Rank = number of better teams + 1
      const calculatedRank = betterTeamsCount + 1;
      row.ranks[key] = calculatedRank;
      
      // 🐛 EXTENSIVE DEBUGGING for Pittsburgh Steelers and Tampa Bay Buccaneers
      if (row.team === 'Pittsburgh Steelers' || row.team === 'Tampa Bay Buccaneers') {
        // Debugging removed - using client-side ranking instead
      }
    });

    debugLog('RANK', `${key} - Ranked ${validRows.length} teams. Top 3:`, 
      validRows.slice(0, 3).map(r => ({ 
        team: r.team, 
        value: (r as unknown as Record<string, string>)[key], 
        rank: r.ranks[key] 
      }))
    );
    
    // 🐛 SPECIAL DEBUGGING: Show all teams with value 72 for points metric
    if (key === 'points') {
      const teamsWithValue72 = validRows.filter(row => {
        const value = sanitizeNumeric((row as unknown as Record<string, string>)[key])!;
        return value === 72;
      });
      
      // Specific debugging removed - using client-side ranking instead
    }
  });

  return rowsWithRanks;
}

/**
 * Sanitizes a string value to extract numeric content for ranking
 */
function sanitizeNumeric(value: string | undefined): number | null {
  if (!value || typeof value !== 'string') return null;
  
  // Remove common formatting: commas, spaces, percentage signs
  const cleaned = value.replace(/[,%\s]/g, '');
  const num = parseFloat(cleaned);
  
  return isNaN(num) ? null : num;
}
