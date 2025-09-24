/**
 * Pro Football Reference Table Parser - TypeScript Version
 * 
 * Fetches and parses NFL team stats tables from PFR into normalized JSON format.
 * Uses data-stat attributes for reliable parsing across seasons/changes.
 * 
 * WARNING: Do not rename data-stat keys without updating the UI accordingly.
 */

import { parse } from 'node-html-parser';
import https from 'https';
import { URL } from 'url';

// Debug logging utility
const debugLog = (context: string, message: string, data?: unknown) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [PFR-${context}] ${message}`);
  if (data) {
    console.log(`[${timestamp}] [PFR-${context}] Data:`, JSON.stringify(data, null, 2));
  }
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
 * Fetches HTML and parses a PFR table into rows of data-stat key-value pairs
 */
export async function fetchAndParse({ 
  url, 
  tableSelector = '#team_stats' 
}: {
  url: string;
  tableSelector?: string;
}): Promise<ParseResult> {
  debugLog('FETCH', `===== LOCAL FILE SCRAPING =====`);
  debugLog('FETCH', `Starting local file read from: ${url}`, { tableSelector });
  
  try {
    // 📁 LOCAL FILE STRATEGY: Map URLs to local files
    let localFilePath: string;
    
    if (url.includes('opp.htm')) {
      // Defense stats
      localFilePath = 'data/pfr/defense-2025.html';
      debugLog('LOCAL', 'Mapped to defense file');
    } else {
      // Offense stats  
      localFilePath = 'data/pfr/offense-2025.html';
      debugLog('LOCAL', 'Mapped to offense file');
    }
    
    debugLog('LOCAL', `Reading from local file: ${localFilePath}`, {
      originalUrl: url,
      timestamp: new Date().toISOString(),
      strategy: 'Local file bypass - zero network blocking'
    });
    
    const html = await readLocalFile(localFilePath);
    debugLog('FETCH', `Successfully fetched HTML (${html.length} characters)`);
    
    // ISSUE #2: Check if we got actual HTML vs error page
    if (html.includes('<title>') && html.includes('</title>')) {
      const titleMatch = html.match(/<title>(.*?)<\/title>/i);
      debugLog('FETCH', `HTML title found: ${titleMatch ? titleMatch[1] : 'Unknown'}`);
    } else {
      debugLog('ERROR', 'Response does not appear to be valid HTML');
    }
    
    // ISSUE #2b: Detailed HTML content analysis
    const hasTable = html.includes('<table');
    const hasTeamStats = html.includes('team_stats') || html.includes('Team Defense');
    const isBlocked = html.includes('blocked') || html.includes('bot') || html.includes('access denied') || html.includes('captcha');
    const isJSRequired = html.includes('JavaScript') || html.includes('js-required');
    
    debugLog('FETCH', `HTML content analysis:`, {
      length: html.length,
      hasTable,
      hasTeamStats,
      isBlocked,
      isJSRequired,
      firstChars: html.substring(0, 300),
      containsNFL: html.includes('NFL') || html.includes('football'),
      containsPFR: html.includes('pro-football-reference')
    });
    
    // ISSUE #3: HTML Parser debugging
    debugLog('PARSE', 'Parsing HTML with node-html-parser...');
    const root = parse(html);
    
    // Check if parsing worked
    if (!root) {
      debugLog('ERROR', 'node-html-parser failed to parse HTML');
      throw new Error('HTML parsing failed');
    }
    debugLog('PARSE', 'HTML parsing successful');
    
    // ISSUE #1: Table Selector debugging
    debugLog('PARSE', `Looking for table with selector: ${tableSelector}`);
    
    // Check multiple possible selectors based on actual PFR page structure
    const possibleSelectors = [
      '#team_stats',              // Original assumption
      '#stats_table',             // Common PFR pattern
      'table[id="team_stats"]',   // Explicit team_stats
      '.stats_table',             // Class-based selector
      'table.stats_table',        // Table with stats class
      'table',                    // Last resort - first table on page (most likely to work)
    ];
    let table = null;
    let foundSelector = '';
    
    for (const selector of possibleSelectors) {
      const testTable = root.querySelector(selector);
      if (testTable) {
        // Verify this table has data-stat attributes (PFR standard)
        const dataStatCells = testTable.querySelectorAll('[data-stat]');
        debugLog('PARSE', `Found table with selector: ${selector}, data-stat cells: ${dataStatCells.length}`);
        
        if (dataStatCells.length > 0 || selector === 'table') {
          table = testTable;
          foundSelector = selector;
          debugLog('PARSE', `✅ Selected table with selector: ${selector} (${dataStatCells.length} data-stat cells)`);
          break;
        } else {
          debugLog('PARSE', `❌ Table found but no data-stat cells: ${selector}`);
        }
      } else {
        debugLog('PARSE', `No table found with selector: ${selector}`);
      }
    }
    
    if (!table) {
      debugLog('ERROR', `No table found with any selector`);
      // Log all tables on the page for debugging
      const allTables = root.querySelectorAll('table');
      debugLog('ERROR', `Found ${allTables.length} total tables on page`);
      allTables.forEach((t, i) => {
        const hasDataStat = t.querySelectorAll('[data-stat]').length > 0;
        debugLog('ERROR', `Table ${i}: id="${t.getAttribute('id')}" class="${t.getAttribute('class')}" hasDataStat=${hasDataStat}`);
        
        // Log first few cells with data-stat attributes
        const dataCells = t.querySelectorAll('[data-stat]');
        if (dataCells.length > 0) {
          debugLog('ERROR', `Table ${i} data-stat examples:`, Array.from(dataCells.slice(0, 5)).map(cell => ({
            dataStat: cell.getAttribute('data-stat'),
            text: cell.textContent?.trim()
          })));
        }
      });
      throw new Error(`Table not found with selector: ${tableSelector}`);
    }
    debugLog('PARSE', `Successfully found table with selector: ${foundSelector}`);

    const rows: TeamStats[] = [];
    
    // Parse tbody rows (skip header)
    const tableBody = table.querySelector('tbody');
    if (!tableBody) {
      debugLog('ERROR', 'No tbody found in table');
      throw new Error('No tbody found in table');
    }
    
    const tableRows = tableBody.querySelectorAll('tr');
    debugLog('PARSE', `Found ${tableRows.length} rows in tbody`);
    
    if (tableRows.length === 0) {
      debugLog('ERROR', 'No rows found in tbody');
      throw new Error('No data rows found in table');
    }
    
    tableRows.forEach((row, rowIndex) => {
      const rowData: TeamStats = { team: '' };
      const cells = row.querySelectorAll('td, th');
      
      debugLog('PARSE', `Processing row ${rowIndex + 1} with ${cells.length} cells`);
      
      cells.forEach((cell, cellIndex) => {
        const dataStat = cell.getAttribute('data-stat');
        
        if (dataStat) {
          let value = cell.innerText?.trim() || '';
          
          // Clean team names: remove footnote markers (†, *, etc.)
          if (dataStat === 'team') {
            value = value.replace(/[†*+~^°].*$/, '').trim();
          }
          
          rowData[dataStat] = value;
          
          // Debug first few cells for verification
          if (rowIndex < 2 && cellIndex < 10) {
            debugLog('PARSE', `Cell ${cellIndex}: ${dataStat} = "${value}"`);
          }
        } else {
          // Log cells without data-stat for debugging
          if (rowIndex < 2) {
            debugLog('PARSE', `Cell ${cellIndex}: NO data-stat, content = "${cell.innerText?.trim()}"`);
          }
        }
      });
      
      // Only include rows that have a team name
      if (rowData.team && rowData.team !== '') {
        rows.push(rowData);
        debugLog('PARSE', `Added team: ${rowData.team}`, {
          allFields: Object.keys(rowData),
          sampleData: {
            points: rowData.points,
            pass_yds: rowData.pass_yds,
            rush_yds: rowData.rush_yds,
            g: rowData.g,
            points_for: rowData.points_for
          }
        });
      } else {
        debugLog('PARSE', `Skipped row ${rowIndex + 1} - no team name`, {
          allFields: Object.keys(rowData),
          teamValue: rowData.team
        });
      }
    });

    const updatedAt = new Date().toISOString();
    debugLog('SUCCESS', `Successfully parsed ${rows.length} teams from PFR table`);
    
    // Log sample team data for verification
    if (rows.length > 0) {
      debugLog('SAMPLE', 'First team data sample:', rows[0]);
    }
    
    return { updatedAt, rows };
    
  } catch (error) {
    debugLog('ERROR', 'Failed to fetch/parse PFR data', {
      error: error instanceof Error ? error.message : String(error),
      url,
      tableSelector
    });
    throw error;
  }
}

/**
 * Computes ranking for each team based on specified metrics
 */
export function computeRanks(rows: TeamStats[], basis: RankBasis): TeamStatsWithRanks[] {
  debugLog('RANK', `Computing ranks for ${Object.keys(basis).length} metrics`, {
    metricsCount: Object.keys(basis).length,
    teamsCount: rows.length,
    metrics: Object.keys(basis)
  });
  
  // Create a copy of rows to avoid mutation
  const rowsWithRanks: TeamStatsWithRanks[] = rows.map(row => ({
    ...row,
    ranks: {}
  }));

  // For each metric in the ranking basis
  Object.entries(basis).forEach(([key, direction]) => {
    debugLog('RANK', `Processing metric: ${key} (${direction})`);
    
    // Extract and sanitize numeric values
    const teamsWithValues = rowsWithRanks
      .map((row, index) => ({
        index,
        team: row.team,
        rawValue: typeof row[key] === 'string' ? row[key] : '',
        value: sanitizeNumeric(typeof row[key] === 'string' ? row[key] : '')
      }))
      .filter(item => !isNaN(item.value)); // Filter out non-numeric values

    debugLog('RANK', `Metric ${key}: Found ${teamsWithValues.length} valid values`, {
      sampleValues: teamsWithValues.slice(0, 3).map(t => ({ 
        team: t.team, 
        raw: t.rawValue, 
        numeric: t.value 
      }))
    });

    if (teamsWithValues.length === 0) {
      debugLog('WARN', `No valid numeric values found for metric: ${key}`);
      return;
    }

    // Sort based on direction (desc = higher is better, asc = lower is better)
    teamsWithValues.sort((a, b) => {
      return direction === 'desc' ? b.value - a.value : a.value - b.value;
    });

    // Log top 3 teams for this metric
    debugLog('RANK', `Top 3 teams for ${key}:`, 
      teamsWithValues.slice(0, 3).map((t, i) => ({
        rank: i + 1,
        team: t.team,
        value: t.value
      }))
    );

    // Assign ranks (1 = best)
    teamsWithValues.forEach((item, rank) => {
      rowsWithRanks[item.index].ranks[key] = rank + 1;
    });
  });

  debugLog('SUCCESS', `Ranking complete for ${rowsWithRanks.length} teams`);
  return rowsWithRanks;
}

/**
 * Fetches HTML content using Node.js https module
 */
// 📁 LOCAL FILE READING (bypasses all network blocking)
const readLocalFile = (filePath: string): Promise<string> => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require('fs');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require('path');
  
  return new Promise((resolve, reject) => {
    const fullPath = path.join(process.cwd(), filePath);
    
    debugLog('LOCAL', `Reading local file: ${fullPath}`);
    
    fs.readFile(fullPath, 'utf8', (err: Error | null, data: string) => {
      if (err) {
        debugLog('ERROR', `Failed to read local file: ${err.message}`);
        reject(new Error(`Local file read failed: ${err.message}. Please download the HTML file manually. See data/pfr/README.md for instructions.`));
        return;
      }
      
      debugLog('LOCAL', `Successfully read local file (${data.length} characters)`);
      resolve(data);
    });
  });
};

function fetchWithHttps(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        // 🎭 HUMAN-LIKE BROWSER HEADERS
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate', 
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'Connection': 'keep-alive',
        'DNT': '1'
      }
    };

    const req = https.request(options, (res) => {
      if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        return;
      }

      // 🗜️ Handle gzip/deflate compression properly
      let stream = res;
      const encoding = res.headers['content-encoding'];
      
      debugLog('FETCH', `Response encoding: ${encoding}`);
      
      if (encoding === 'gzip') {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const zlib = require('zlib');
        stream = res.pipe(zlib.createGunzip());
        debugLog('FETCH', 'Decompressing gzip content...');
      } else if (encoding === 'deflate') {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const zlib = require('zlib');
        stream = res.pipe(zlib.createInflate());
        debugLog('FETCH', 'Decompressing deflate content...');
      }

      let data = '';
      stream.setEncoding('utf8');
      stream.on('data', (chunk) => {
        data += chunk;
      });
      
      stream.on('end', () => {
        debugLog('FETCH', `Decompression complete. Final data length: ${data.length}`);
        resolve(data);
      });
      
      stream.on('error', (err) => {
        debugLog('ERROR', `Stream error: ${err.message}`);
        reject(err);
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

/**
 * Sanitizes a string value to extract numeric content for ranking
 * Removes commas, percent signs, and other formatting
 */
function sanitizeNumeric(value: string | undefined): number {
  if (typeof value !== 'string') return NaN;
  
  // Remove commas, percent signs, and other common formatting
  const cleaned = value.replace(/[,%\s]/g, '');
  const numeric = parseFloat(cleaned);
  
  return isNaN(numeric) ? NaN : numeric;
}
