/**
 * Agent Mapping Seed Script
 *
 * Hermes Agent などの外部エージェントが利用する actorId → (familyId, userId)
 * マッピングを Firestore に投入する CLI スクリプト。
 *
 * 実行方法:
 *   cd apps/api && pnpm exec tsx src/scripts/seed-agent-mapping.ts \
 *     --actor <actorId> --family <familyId> --user <userId> [--description "..."]
 */

import { upsertAgentMapping } from '../services/agent.service.js';

interface CliArgs {
  actor: string;
  family: string;
  user: string;
  description?: string;
}

function printUsageAndExit(message?: string): never {
  if (message) {
    console.error(`Error: ${message}\n`);
  }
  console.error(
    'Usage: tsx src/scripts/seed-agent-mapping.ts --actor <actorId> --family <familyId> --user <userId> [--description "..."]'
  );
  process.exit(1);
}

function parseArgs(argv: string[]): CliArgs {
  const parsed: Partial<CliArgs> = {};

  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const value = argv[i + 1];

    switch (flag) {
      case '--actor':
        if (!value) printUsageAndExit('--actor requires a value');
        parsed.actor = value;
        i++;
        break;
      case '--family':
        if (!value) printUsageAndExit('--family requires a value');
        parsed.family = value;
        i++;
        break;
      case '--user':
        if (!value) printUsageAndExit('--user requires a value');
        parsed.user = value;
        i++;
        break;
      case '--description':
        if (!value) printUsageAndExit('--description requires a value');
        parsed.description = value;
        i++;
        break;
      default:
        printUsageAndExit(`Unknown argument: ${flag}`);
    }
  }

  if (!parsed.actor) printUsageAndExit('--actor is required');
  if (!parsed.family) printUsageAndExit('--family is required');
  if (!parsed.user) printUsageAndExit('--user is required');

  return parsed as CliArgs;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  console.log('=== Agent Mapping Seed Script ===');
  console.log(`Actor ID:    ${args.actor}`);
  console.log(`Family ID:   ${args.family}`);
  console.log(`User ID:     ${args.user}`);
  if (args.description) {
    console.log(`Description: ${args.description}`);
  }
  console.log('');

  const mapping = await upsertAgentMapping({
    actorId: args.actor,
    familyId: args.family,
    userId: args.user,
    description: args.description,
  });

  console.log('✅ Agent mapping upserted successfully');
  console.log(JSON.stringify(
    {
      actorId: mapping.actorId,
      familyId: mapping.familyId,
      userId: mapping.userId,
      description: mapping.description,
      createdAt: mapping.createdAt.toDate().toISOString(),
      updatedAt: mapping.updatedAt.toDate().toISOString(),
    },
    null,
    2
  ));
}

main().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
