import React from 'react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "./ui/dropdown-menu";


const StatComparisonRow = ({ label, teamAValue, teamBValue, teamARank, teamBRank, onTeamSelectByRank, sport = "NBA" }) => {
  const parsedRankA = parseInt(String(teamARank).replace(/\D/g, ''));
  const parsedRankB = parseInt(String(teamBRank).replace(/\D/g, ''));

  // Format the display value (number with appropriate precision)
  const formatValue = (value) => {
    if (value === undefined || value === null) return 'N/A';

    // If it's a percentage (like FG% or 3PT FG%)
    if (label.includes('%')) {
      return parseFloat(value).toFixed(1);
    }

    // For other values
    return parseFloat(value).toFixed(1);
  };

  // Format the rank display
  const formatRank = (rank) => {
    if (!rank) return '';
    return `(${rank})`;
  };

  // Enhanced bar width calculation with more subtle ranking emphasis
  const calculateBarWidths = () => {
    if (!teamAValue || !teamBValue) return { leftWidth: 50, rightWidth: 50 };

    // Convert string ranks to numbers (removing any "T" prefix)
    const rankA = parseInt(String(teamARank).replace(/\D/g, ''));
    const rankB = parseInt(String(teamBRank).replace(/\D/g, ''));

    // Use ranking position to determine dominance
    const totalTeams = 30;

    // Invert ranks so higher rank (lower number) gets higher value
    const scoreA = totalTeams - rankA + 1;
    const scoreB = totalTeams - rankB + 1;

    // Apply a more subtle exponential scaling to emphasize differences
    const expFactor = 1.3; // Reduced from 2.0 for less dramatic contrast
    const scaledScoreA = Math.pow(scoreA, expFactor);
    const scaledScoreB = Math.pow(scoreB, expFactor);

    const total = scaledScoreA + scaledScoreB;

    // Calculate proportions with enhanced scaling
    const leftWidth = Math.max(10, (scaledScoreA / total) * 100); // Increased minimum width for better visibility
    const rightWidth = Math.max(10, (scaledScoreB / total) * 100);

    return { leftWidth, rightWidth };
  };

  const { leftWidth, rightWidth } = calculateBarWidths();

  return (
    <div className="flex items-center mb-10">
      {/* Left Team Value */}
      <div className="w-1/4 text-right pr-4">
        <div className="flex flex-col items-end">
          <span className="text-3xl font-bold">{formatValue(teamAValue)}</span>
          {/*Left Rank Interactive Dropdown*/}
          <DropdownMenu>
            <DropdownMenuTrigger className="bg-slate-700 text-white text-sm rounded mt-1 px-2 py-1 w-fit shadow hover:bg-slate-600 transition">
              {parsedRankA}
            </DropdownMenuTrigger>


            <DropdownMenuContent className="w-24">
              {[...Array(30)].map((_, i) => (
                <DropdownMenuItem
                  key={i + 1}
                  onSelect={() => onTeamSelectByRank("A", label, i + 1)}
                >
                  {i + 1}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Center Stat Category */}
      <div className="w-1/2">
        <div className="text-center text-gray-400 mb-2">{label}</div>
        <div className="flex h-2 w-full">
          {/* Left bar */}
          <div
            className={`${sport === "NFL" ? "bg-purple-400" : "bg-emerald-500"} h-full rounded-l`}
            style={{ width: `${leftWidth}%` }}
          />


          {/* Right bar */}
          <div
            className={`${sport === "NFL" ? "bg-emerald-500" : "bg-purple-500"} h-full rounded-r`}
            style={{ width: `${rightWidth}%` }}
          />


        </div>

      </div>

      {/* Right Team Value */}
      <div className="w-1/4 pl-4">
        <div className="flex flex-col items-start">
          <span className="text-3xl font-bold">{formatValue(teamBValue)}</span>
          <DropdownMenu>
            <DropdownMenuTrigger className="bg-slate-700 text-white text-sm rounded mt-1 px-2 py-1 w-fit shadow hover:bg-slate-600 transition">
              {parsedRankB}
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-24">
              <div className="space-y-1">
                {[...Array(30)].map((_, i) => (
                  <DropdownMenuItem
                    key={i + 1}
                    onSelect={() => onTeamSelectByRank("B", label, i + 1)}
                  >
                    {i + 1}
                  </DropdownMenuItem>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>


        </div>
      </div>
    </div>
  );
};

export default StatComparisonRow;