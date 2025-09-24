# 📁 Local Pro Football Reference Data

## How to Update Data

### **Step 1: Download Offense Data**
1. Go to: https://www.pro-football-reference.com/years/2025/#team_stats
2. Right-click → "Save Page As" → Save as `offense-2025.html`
3. Place in this directory: `data/pfr/offense-2025.html`

### **Step 2: Download Defense Data**  
1. Go to: https://www.pro-football-reference.com/years/2025/opp.htm#team_stats
2. Right-click → "Save Page As" → Save as `defense-2025.html`
3. Place in this directory: `data/pfr/defense-2025.html`

### **Step 3: Restart Your Server**
```bash
npm run dev
```

## Files in this Directory
- `offense-2025.html` - Current season offense stats from PFR
- `defense-2025.html` - Current season defense stats from PFR
- `README.md` - This instruction file

## Update Frequency
**Recommended**: Update 1-2 times per week during season, or after big games

## Backup Strategy
Keep previous versions:
- `offense-2025-backup.html`
- `defense-2025-backup.html`
