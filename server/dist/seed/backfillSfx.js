"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// One-off backfill: set Move.sfx for moves that have a dedicated SFX asset.
// Mirrors the assets in client/public/movesfx/moves/ (see moveSfx.ts) into the
// already-seeded DB without re-running the full PokeAPI seed.
// Run: npx tsx src/seed/backfillSfx.ts
const db_1 = require("../db");
const moveSfx_1 = require("./moveSfx");
async function main() {
    let matched = 0;
    for (const slug of moveSfx_1.MOVES_WITH_SFX) {
        const r = await db_1.db.move.updateMany({ where: { name: slug }, data: { sfx: slug } });
        matched += r.count;
    }
    // Clear sfx on any move that no longer has an asset (keeps DB in sync if assets shrink).
    const cleared = await db_1.db.move.updateMany({
        where: { sfx: { not: null }, name: { notIn: [...moveSfx_1.MOVES_WITH_SFX] } },
        data: { sfx: null },
    });
    const total = await db_1.db.move.count();
    const withSfx = await db_1.db.move.count({ where: { sfx: { not: null } } });
    console.log(`[backfill] matched ${matched}/${moveSfx_1.MOVES_WITH_SFX.size} slugs, cleared ${cleared.count}; ` +
        `DB now has ${withSfx}/${total} moves with sfx`);
    const sample = await db_1.db.move.findMany({
        where: { sfx: { not: null } },
        select: { name: true, sfx: true },
        take: 8,
        orderBy: { name: "asc" },
    });
    console.log("[backfill] sample:", sample);
    await db_1.db.$disconnect();
}
main().catch(async (e) => {
    console.error(e);
    await db_1.db.$disconnect();
    process.exit(1);
});
