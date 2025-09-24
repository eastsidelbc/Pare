import { useState, useEffect } from 'react';
import StatComparisonRow from './StatComparisonRow';
import Papa from 'papaparse';

const NFLComparison = () => {
    const [teamStats, setTeamStats] = useState([]);
    const [selectedTeamA, setSelectedTeamA] = useState('');
    const [selectedTeamB, setSelectedTeamB] = useState('');

    useEffect(() => {
        fetch('/nfl_teams_ranking.csv')
            .then((res) => res.text())
            .then((csvText) => {
                Papa.parse(csvText, {
                    header: true,
                    dynamicTyping: true,
                    skipEmptyLines: true,
                    complete: (results) => {
                        console.log("📊 NFL CSV Parsed:", results.data);

                        // 🧹 Clean: Remove any invalid rows that don't have a Team name
                        const cleanedData = results.data.filter(row => row.Team && row.Team.trim() !== "");

                        setTeamStats(cleanedData);

                        if (cleanedData.length >= 2) {
                            setSelectedTeamA(cleanedData[0].Team);
                            setSelectedTeamB(cleanedData[1].Team);
                        }
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

    // Define NFL-specific stats based on your file
    const stats = [
        { label: 'PF', rankField: 'PF_Rank' },
        { label: 'Yards', rankField: 'Yards_Rank' },
        { label: 'Passing Yards', rankField: 'Passing Yards_Rank' },
        { label: 'Passing TD', rankField: 'Passing TD_Rank' },
        { label: 'Rushing Yards', rankField: 'Rushing Yards_Rank' },
        { label: 'Rushing TD', rankField: 'Rushing TD_Rank' }
    ];

    // Build a lookup map: stat label → rank number → team name
    const statRankMap = {};
    stats.forEach(stat => {
        statRankMap[stat.label] = {};
        teamStats.forEach(team => {
            const rawRank = team[stat.rankField];
            const parsedRank = parseInt(String(rawRank || '0').replace(/\D/g, '')); // Handles any possible format issues
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

    // Get alphabetically sorted teams for the dropdowns
    const sortedTeams = [...teamStats].sort((a, b) => a.Team.localeCompare(b.Team));

    return (
        <div className="bg-white/5 backdrop-blur-2xl border border-purple-400/20 rounded-3xl shadow-[0_15px_30px_rgba(0,0,0,0.4)] p-10">
            <div className="grid grid-cols-3 gap-6 text-xl font-semibold text-gray-200 font-sans mb-6">
                <div className="text-right pr-6">
                    <select
                        className="bg-slate-800 text-white px-2 py-1 rounded"
                        value={selectedTeamA}
                        onChange={(e) => setSelectedTeamA(e.target.value)}
                    >
                        {sortedTeams.map((team, index) => (
                            <option key={index} value={team.Team.trim()}>{team.Team}</option>
                        ))}
                    </select>
                </div>
                <div className="text-center text-purple-300">Stat</div>
                <div className="text-left pl-6">
                    <select
                        className="bg-slate-800 text-white px-2 py-1 rounded"
                        value={selectedTeamB}
                        onChange={(e) => setSelectedTeamB(e.target.value)}
                    >
                        {sortedTeams.map((team, index) => (
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
                    sport="NFL"
                />
            ))}
        </div>
    );
};

export default NFLComparison;
