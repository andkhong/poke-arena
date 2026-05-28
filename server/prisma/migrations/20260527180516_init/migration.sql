-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pokemon" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "types" TEXT[],
    "hp" INTEGER NOT NULL,
    "attack" INTEGER NOT NULL,
    "defense" INTEGER NOT NULL,
    "specialAtk" INTEGER NOT NULL,
    "specialDef" INTEGER NOT NULL,
    "speed" INTEGER NOT NULL,
    "generation" INTEGER NOT NULL,
    "spriteUrl" TEXT NOT NULL,
    "backSpriteUrl" TEXT NOT NULL,
    "seededAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pokemon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Move" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "damageClass" TEXT NOT NULL,
    "power" INTEGER,
    "accuracy" INTEGER,
    "pp" INTEGER NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "rangeType" TEXT NOT NULL DEFAULT 'ranged',
    "ailment" TEXT,
    "ailmentChance" INTEGER NOT NULL DEFAULT 0,
    "drain" INTEGER NOT NULL DEFAULT 0,
    "healing" INTEGER NOT NULL DEFAULT 0,
    "critRate" INTEGER NOT NULL DEFAULT 0,
    "statChanges" JSONB NOT NULL DEFAULT '[]',
    "statChance" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Move_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PokemonMove" (
    "pokemonId" INTEGER NOT NULL,
    "moveId" INTEGER NOT NULL,

    CONSTRAINT "PokemonMove_pkey" PRIMARY KEY ("pokemonId","moveId")
);

-- CreateTable
CREATE TABLE "Battle" (
    "id" TEXT NOT NULL,
    "winnerId" TEXT,
    "mode" TEXT NOT NULL,
    "playerCount" INTEGER NOT NULL,
    "participants" JSONB NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "Battle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Pokemon_name_key" ON "Pokemon"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Move_name_key" ON "Move"("name");

-- AddForeignKey
ALTER TABLE "PokemonMove" ADD CONSTRAINT "PokemonMove_pokemonId_fkey" FOREIGN KEY ("pokemonId") REFERENCES "Pokemon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PokemonMove" ADD CONSTRAINT "PokemonMove_moveId_fkey" FOREIGN KEY ("moveId") REFERENCES "Move"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Battle" ADD CONSTRAINT "Battle_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
