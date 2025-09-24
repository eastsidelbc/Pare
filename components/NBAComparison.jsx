import { useEffect, useState } from 'react';
import Papa from 'papaparse';
import StatComparisonRow from './StatComparisonRow';

const NBAComparison = () => {
    const [teamStats, setTeamStats] = useState([]);
    const [selectedTeamA, setSelectedTeamA] = useState('Boston Celtics');
    const [selectedTeamB, setSelectedTeamB] = useState('Denver Nuggets');

    useEffect(() => {
        fetch('/nba_team_stats_2023_24_with_rankings.csv')
            .then((res) => res.text())
            .then((csvText) => {
                Papa.parse(csvText, {
                    header: true,
                    dynamicTyping: true,
                    complete: (results) => {
                        console.log("📊 NBA CSV Parsed:", results.data);
                        console.log("✅ All NBA team names:", results.data.map(t => t.Team));
                        setTeamStats(results.data);
                    },
                    error: (err) => {
                        console.error("❌ PapaParse Error:", err);
                    }
                });
            })
            .catch((err) => {
                console.error("❌ Fetch Error:", err);
            });
    }, []);

    const teamA = teamStats.length > 0 ? teamStats.find((team) => team.Team === selectedTeamA) : null;
    const teamB = teamStats.length > 0 ? teamStats.find((team) => team.Team === selectedTeamB) : null;

    // Define the NBA-specific stats
    const stats = [
        { label: 'FG%', rankField: 'FG%_Rank' },
        { label: '3PT FG%', rankField: '3PT FG%_Rank' },
        { label: 'Pace', rankField: 'Pace_Rank' },
        { label: 'REB', rankField: 'REB_Rank' },
        { label: 'AST', rankField: 'AST_Rank' }
    ];

    // Build a lookup map: stat label → rank number → team name
    const statRankMap = {};
    stats.forEach(stat => {
        statRankMap[stat.label] = {};
        teamStats.forEach(team => {
            const rawRank = team[stat.rankField];
            const parsedRank = parseInt(String(rawRank || '0').replace(/\D/g, '')); // Handles "T14", "14th", etc.
            if (!isNaN(parsedRank)) {
                statRankMap[stat.label][parsedRank] = team.Team;
            }
        });
    });

    // Handle when user selects a rank from dropdown to change teams
    const handleTeamSelectByRank = (side, statLabel, newRank) => {
        const possibleTeam = statRankMap[statLabel]?.[newRank];

        if (!possibleTeam) {
            console.warn(`⚠️ No team found for ${statLabel} rank ${newRank}. Likely skipped due to tie.`);
            return;
        }

        const cleanTeam = possibleTeam.trim();
        console.log(`✅ Changing Team ${side} to "${cleanTeam}"`);

        if (side === "A") {
            if (selectedTeamA !== cleanTeam) {
                setSelectedTeamA(cleanTeam);
            }
        } else if (side === "B") {
            if (selectedTeamB !== cleanTeam) {
                setSelectedTeamB(cleanTeam);
            }
        }
    };

    return (
        <div className="bg-white/5 backdrop-blur-2xl border border-blue-400/20 rounded-3xl shadow-[0_15px_30px_rgba(0,0,0,0.4)] p-10">
            <div className="grid grid-cols-3 gap-6 text-xl font-semibold text-gray-200 font-sans mb-6">
                <div className="text-right pr-6">
                    <select
                        className="bg-slate-800 text-white px-2 py-1 rounded"
                        value={selectedTeamA}
                        onChange={(e) => setSelectedTeamA(e.target.value)}
                    >
                        {teamStats.map((team, index) => (
                            <option key={index} value={team.Team.trim()}>{team.Team}</option>
                        ))}
                    </select>
                </div>
                <div className="text-center text-blue-300">Stat</div>
                <div className="text-left pl-6">
                    <select
                        className="bg-slate-800 text-white px-2 py-1 rounded"
                        value={selectedTeamB}
                        onChange={(e) => setSelectedTeamB(e.target.value)}
                    >
                        {teamStats.map((team, index) => (
                            <option key={index} value={team.Team.trim()}>{team.Team}</option>
                        ))}
                    </select>
                </div>
            </div>

            {teamA && teamB && stats.map((stat) => (
                <StatComparisonRow
                    key={stat.label}
                    label={stat.label}
                    teamAValue={teamA[stat.label]}
                    teamBValue={teamB[stat.label]}
                    teamARank={teamA[stat.rankField]}
                    teamBRank={teamB[stat.rankField]}
                    onTeamSelectByRank={handleTeamSelectByRank}
                />
            ))}
        </div>
    );
};

export default NBAComparison;