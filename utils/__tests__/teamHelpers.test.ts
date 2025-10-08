/**
 * Console-friendly test file for teamHelpers
 * 
 * Run in browser console:
 * 1. Import the functions
 * 2. Copy/paste the test cases below
 * 3. Check console output
 */

import {
  isAverageTeam,
  isNonSelectableSpecialTeam,
  shouldExcludeFromRanking,
  getTeamDisplayLabel,
  getTeamEmoji
} from '../teamHelpers';

console.log('🧪 Testing teamHelpers utility functions...\n');

// Test 1: isAverageTeam
console.log('Test 1: isAverageTeam()');
console.log('  "Avg Tm/G":', isAverageTeam('Avg Tm/G'), '(expected: true)');
console.log('  "Avg/TmG":', isAverageTeam('Avg/TmG'), '(expected: true)');
console.log('  "Average team/G":', isAverageTeam('Average team/G'), '(expected: true)');
console.log('  "Buffalo Bills":', isAverageTeam('Buffalo Bills'), '(expected: false)');
console.log('  "Avg Team":', isAverageTeam('Avg Team'), '(expected: false)');
console.log('  undefined:', isAverageTeam(undefined), '(expected: false)');
console.log('');

// Test 2: isNonSelectableSpecialTeam
console.log('Test 2: isNonSelectableSpecialTeam()');
console.log('  "Avg Team":', isNonSelectableSpecialTeam('Avg Team'), '(expected: true)');
console.log('  "League Total":', isNonSelectableSpecialTeam('League Total'), '(expected: true)');
console.log('  "Avg Tm/G":', isNonSelectableSpecialTeam('Avg Tm/G'), '(expected: false - average IS selectable)');
console.log('  "Buffalo Bills":', isNonSelectableSpecialTeam('Buffalo Bills'), '(expected: false)');
console.log('');

// Test 3: shouldExcludeFromRanking
console.log('Test 3: shouldExcludeFromRanking()');
console.log('  "Avg Tm/G":', shouldExcludeFromRanking('Avg Tm/G'), '(expected: true)');
console.log('  "Avg Team":', shouldExcludeFromRanking('Avg Team'), '(expected: true)');
console.log('  "League Total":', shouldExcludeFromRanking('League Total'), '(expected: true)');
console.log('  "Buffalo Bills":', shouldExcludeFromRanking('Buffalo Bills'), '(expected: false)');
console.log('');

// Test 4: getTeamDisplayLabel
console.log('Test 4: getTeamDisplayLabel()');
console.log('  "Avg Tm/G":', getTeamDisplayLabel('Avg Tm/G'), '(expected: "Avg (per game)")');
console.log('  "Buffalo Bills":', getTeamDisplayLabel('Buffalo Bills'), '(expected: "Buffalo Bills")');
console.log('');

// Test 5: getTeamEmoji
console.log('Test 5: getTeamEmoji()');
console.log('  "Avg Tm/G":', getTeamEmoji('Avg Tm/G'), '(expected: "📊")');
console.log('  "Buffalo Bills":', getTeamEmoji('Buffalo Bills'), '(expected: null)');
console.log('');

console.log('✅ All tests complete! Check results above.');

