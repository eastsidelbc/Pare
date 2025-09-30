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
    bg-slate-800/90 
    border border-slate-600/50 
    rounded-lg 
    text-slate-200 
    font-medium
    focus:outline-none 
    focus:ring-2 
    focus:ring-purple-500/50 
    focus:border-purple-500/50
    transition-all duration-200
    touch-optimized
    min-h-[2.75rem]
    ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-slate-500/70'}
  `.trim().replace(/\s+/g, ' ');

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && (
        <label className="text-slate-300 text-sm font-medium">
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
            className="bg-slate-800 text-slate-200"
          >
            {team.team}
          </option>
        ))}
      </select>
    </div>
  );
}
