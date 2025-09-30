'use client';

import Image from 'next/image';

interface TeamLogoProps {
  teamName: string;
  size?: string;
}

// Map team names to logo file names
const teamLogoMap: Record<string, string> = {
  'Arizona Cardinals': 'arizona-cardinals.svg',
  'Atlanta Falcons': 'atlanta-falcons.svg', 
  'Baltimore Ravens': 'baltimore-ravens.svg',
  'Buffalo Bills': 'buffalo-bills.svg',
  'Carolina Panthers': 'carolina-panthers.svg',
  'Chicago Bears': 'chicago-bears.svg',
  'Cincinnati Bengals': 'cincinnati-bengals.svg',
  'Cleveland Browns': 'cleveland-browns.svg',
  'Dallas Cowboys': 'dallas-cowboys.svg',
  'Denver Broncos': 'denver-broncos.svg',
  'Detroit Lions': 'detroit-lions.svg',
  'Green Bay Packers': 'green-bay-packers.svg',
  'Houston Texans': 'houston-texans.svg',
  'Indianapolis Colts': 'indianapolis-colts.svg',
  'Jacksonville Jaguars': 'jacksonville-jaguars.svg',
  'Kansas City Chiefs': 'kansas-city-chiefs.svg',
  'Las Vegas Raiders': 'las-vegas-raiders.svg',
  'Los Angeles Chargers': 'los-angeles-chargers.svg',
  'Los Angeles Rams': 'los-angeles-rams.svg',
  'Miami Dolphins': 'miami-dolphins.svg',
  'Minnesota Vikings': 'minnesota-vikings.svg',
  'New England Patriots': 'new-england-patriots.svg',
  'New Orleans Saints': 'new-orleans-saints.svg',
  'New York Giants': 'new-york-giants.svg',
  'New York Jets': 'new-york-jets.svg',
  'Philadelphia Eagles': 'philadelphia-eagles.svg',
  'Pittsburgh Steelers': 'pittsburgh-steelers.svg',
  'San Francisco 49ers': 'san-francisco-49ers.svg',
  'Seattle Seahawks': 'seattle-seahawks.svg',
  'Tampa Bay Buccaneers': 'tampa-bay-buccaneers.svg',
  'Tennessee Titans': 'tennessee-titans.svg',
  'Washington Commanders': 'washington-commanders.svg',
};

export default function TeamLogo({ teamName, size = "40" }: TeamLogoProps) {
  const logoFile = teamLogoMap[teamName];
  const sizeNum = parseInt(size);
  
  // Don't render anything for special entries
  if (teamName === 'Avg Team' || teamName === 'League Total' || teamName === 'Avg/TmG') {
    return null;
  }

  if (logoFile) {
    // Render actual team logo
    return (
      <div 
        className="flex items-center justify-center rounded-lg bg-slate-900/90"
        style={{ width: `${sizeNum}px`, height: `${sizeNum}px` }}
      >
        <Image
          src={`/images/nfl-logos/${logoFile}`}
          alt={`${teamName} logo`}
          width={sizeNum - 4}
          height={sizeNum - 4}
          className="object-contain"
          sizes={`(max-width: 768px) ${Math.min(sizeNum, 60)}px, ${sizeNum}px`}
          priority={sizeNum >= 60}
          loading={sizeNum >= 60 ? "eager" : "lazy"}
        />
      </div>
    );
  } else {
    // Render placeholder for teams without logos
    return (
      <div 
        className="flex items-center justify-center rounded-lg bg-slate-900/90 text-slate-300"
        style={{ width: `${sizeNum}px`, height: `${sizeNum}px` }}
      >
        <div className="text-xs font-bold text-center leading-tight">
          {teamName.split(' ').map(word => word.charAt(0)).join('').slice(0, 3)}
        </div>
      </div>
    );
  }
}
