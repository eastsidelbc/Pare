/**
 * Team Selector Component
 * 
 * Reusable dropdown for selecting NFL teams.
 * Handles sorting, filtering, and provides clean team selection interface.
 */

'use client';

import { TeamData } from '@/lib/useNflStats';

interface TeamSelectorProps {
  selectedTeam: string;
  onTeamChange: (teamName: string) => void;
  availableTeams: TeamData[];
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export default function TeamSelector({
  selectedTeam,
  onTeamChange,
  availableTeams,
  label,
  placeholder = 'Select a team...',
  disabled = false,
  className = ''
}: TeamSelectorProps) {
  
  // Sort teams alphabetically but keep special teams at bottom
  const sortedTeams = [...availableTeams].sort((a, b) => {
    const specialTeams = ['Avg Team', 'League Total', 'Avg Tm/G', 'Avg/TmG'];
    
    const aIsSpecial = specialTeams.includes(a.team);
    const bIsSpecial = specialTeams.includes(b.team);
    
    // Special teams go to bottom
    if (aIsSpecial && !bIsSpecial) return 1;
    if (!aIsSpecial && bIsSpecial) return -1;
    
    // Both special or both regular - alphabetical
    return a.team.localeCompare(b.team);
  });

  const baseClasses = `
    px-4 py-3
    bg-card/90 
    border border-border/50 
    rounded-lg 
    text-text 
    font-medium
    focus:outline-hidden 
    focus:ring-2 
    focus:ring-gold/50 
    focus:border-gold/50
    transition-all duration-200
    touch-optimized
    min-h-11
    ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-border/70'}
  `.trim().replace(/\s+/g, ' ');

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && (
        <label className="text-text text-sm font-medium">
          {label}
        </label>
      )}
      
      <select
        value={selectedTeam}
        onChange={(e) => onTeamChange(e.target.value)}
        disabled={disabled}
        className={baseClasses}
        style={{ fontSize: '16px' }}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        
        {sortedTeams.map((team) => (
          <option 
            key={team.team} 
            value={team.team}
            className="bg-card text-text"
          >
            {team.team}
          </option>
        ))}
      </select>
    </div>
  );
}
