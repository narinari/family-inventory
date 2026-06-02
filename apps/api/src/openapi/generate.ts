import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import yaml from 'yaml';
import { registry } from './registry.js';

/**
 * Family Inventory Agent API の OpenAPI 3.1 仕様を YAML として書き出す。
 *
 * - 入力: `apps/api/src/openapi/registry.ts` (`/agent/*` のみを登録)
 * - 出力: `apps/api/openapi.yaml`
 * - 冪等: 何度実行しても同じ内容になる (生成日時等は埋め込まない)。
 *
 * Hermes Agent / 他 LLM エージェントが Tool を動的登録する単一情報源。
 */
function main(): void {
  const generator = new OpenApiGeneratorV31(registry.definitions);

  const document = generator.generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'Family Inventory Agent API',
      version: '0.1.0',
      description:
        'Hermes Agent / 他 LLM エージェントから家族向け在庫管理を操作するための REST API。\n' +
        '\n' +
        '- 認証: `X-API-Key` (発行済みエージェント API キー) + `X-Agent-Actor` (Actor ID) の 2 ヘッダ必須。\n' +
        '- Actor ID はサーバ側 `agentMappings` で family / user に紐付けられる。\n' +
        '- レスポンスは `{ success: true, data: ... }` または `{ success: false, error: ... }` のエンベロープ形式。\n',
    },
    servers: [
      {
        url: '{baseUrl}',
        description: 'Family Inventory API base URL',
        variables: {
          baseUrl: {
            default: 'http://localhost:8080',
            description: 'API server base URL (e.g. https://api.example.com)',
          },
        },
      },
    ],
  });

  const banner =
    '# Auto-generated. Do not edit by hand. Run: pnpm openapi:generate\n';
  const yamlBody = yaml.stringify(document, {
    sortMapEntries: false,
    lineWidth: 0,
  });

  const here = dirname(fileURLToPath(import.meta.url));
  const outPath = resolve(here, '../../openapi.yaml');
  writeFileSync(outPath, banner + yamlBody, 'utf8');

  console.log(`[openapi] wrote ${outPath}`);
}

main();
