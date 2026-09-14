# 📊 How to Export CSV Data from Pro Football Reference

## 🎯 Much Better Than HTML!
- **90% smaller files** (5KB vs 80KB)
- **Faster processing** (no HTML parsing)
- **More reliable** (no DOM structure changes)
- **Easier to edit** (open in Excel)

## 📝 Step-by-Step Instructions:

### **1. For Offense Data:**
```bash
# Go to: https://www.pro-football-reference.com/years/2025/#team_stats
# Look for this button: "Get table as CSV (for Excel)"
# Click it and copy the CSV text
# Save as: data/pfr/offense-2025.csv
```

### **2. For Defense Data:**
```bash
# Go to: https://www.pro-football-reference.com/years/2025/opp.htm#team_stats  
# Look for this button: "Get table as CSV (for Excel)"
# Click it and copy the CSV text
# Save as: data/pfr/defense-2025.csv
```

## 🔍 What to Look For:

**CSV Header should look like:**
```csv
Team,G,Pts,Tot Yds,Ply,Y/P,TO,FL,1stD,Cmp,Att,Yds,TD,Int,NY/A,1stD,Att,Yds,TD,Y/A,1stD,Pen,Yds,1stPy,Sc%,TO%,EXP
```

**First few data rows:**
```csv
Baltimore Ravens,3,111,992,157,6.3,2,2,54,54,76,624,9,0,7.1,32,69,368,2,5.3,19,15,110,3,80.0,14.3,+11.8
Buffalo Bills,3,102,1041,180,5.8,4,3,65,67,91,619,11,1,6.6,41,80,422,3,5.3,21,23,135,3,78.3,21.7,-0.7
```

## 🛠️ File Size Comparison:
- **HTML**: ~80KB (complex parsing needed)
- **CSV**: ~5KB (simple split by commas)

## ⚡ Performance Benefits:
- **10x faster parsing**
- **No HTML complexity** 
- **Easier debugging**
- **Manual editing possible**

## 🔧 Implementation:
Once you have the CSV files, update the API routes to use:
```typescript
import { fetchAndParseCSV, computeRanks } from '@/lib/pfrCsv';

// In API route:
const { rows } = await fetchAndParseCSV({ type: 'offense' });
const rankedRows = computeRanks(rows, OFFENSE_RANK_BASIS);
```

**Result:** Same JSON output, much better performance! 🚀
