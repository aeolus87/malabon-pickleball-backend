# Club Membership Fix Scripts

This directory contains scripts to diagnose and fix issues with club memberships in the database.

## Prerequisites

Before running these scripts, make sure you have:

1. Node.js and npm installed
2. All dependencies installed (`npm install` in the backend directory)
3. MongoDB connection string in your `.env` file

## Available Scripts

### 1. Test Club Counts

This script checks if club member counts are working correctly by comparing direct counts with the aggregation pipeline results.

```bash
# First compile the TypeScript
npx tsc --esModuleInterop scripts/test-club-counts.ts

# Then run the compiled JavaScript
node scripts/test-club-counts.js
```

### 2. Fix Club Memberships

This script fixes issues with club memberships by:

- Creating missing clubs that are referenced by users
- Removing invalid club references from users
- Ensuring all club references are valid ObjectIDs

```bash
# First compile the TypeScript
npx tsc --esModuleInterop scripts/fix-club-memberships.ts

# Then run the compiled JavaScript
node scripts/fix-club-memberships.js
```

## Customizing the Scripts

Before running the fix script, you should modify `fix-club-memberships.ts` to include your specific club IDs:

1. Open `fix-club-memberships.ts`
2. Find the line with `const mockClubId = "67f505f891ed047845eaf3d8";`
3. Replace it with your actual club ID from the mock data
4. Also update the club name in the `addMissingClub()` call

## Troubleshooting

If you encounter the error "Cannot use import statement outside a module", you may need to create a custom tsconfig for the scripts:

1. Create a file called `tsconfig.scripts.json` in the backend directory:

```json
{
  "compilerOptions": {
    "target": "ES2018",
    "module": "CommonJS",
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["./scripts/**/*"]
}
```

2. Then compile using this config:

```bash
npx tsc -p tsconfig.scripts.json
```

3. Run the compiled JavaScript from the dist folder:

```bash
node dist/scripts/fix-club-memberships.js
```
