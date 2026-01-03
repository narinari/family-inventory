import { geminiClient } from './gemini.js';

export type IntentType =
  | 'search_location'       // 「○○どこ？」
  | 'add_item'              // 「○○買った」
  | 'add_wishlist'          // 「○○欲しい」
  | 'purchase_complete'     // 「○○届いた」
  | 'consume_item'          // 「○○使い切った」
  | 'give_item'             // 「○○あげた」
  | 'sell_item'             // 「○○売った」
  | 'list_items'            // 「○○の一覧見せて」
  | 'move_item'             // 「○○を△△に入れた」
  | 'unknown';

export interface ParsedIntent {
  intent: IntentType;
  params: {
    itemName?: string;
    targetName?: string;
    recipientName?: string;
    price?: number;
    boxName?: string;
    locationName?: string;
  };
  confidence: number;
  rawResponse?: string;
}

const SYSTEM_PROMPT = `あなたは家族の持ち物管理アプリのアシスタントです。
ユーザーの自然言語メッセージを解析し、以下のJSON形式で意図を抽出してください。

対応する意図（intent）:
- search_location: 物の場所を聞いている（「○○どこ？」「○○どこにある？」）
- add_item: 物を購入・入手した（「○○買った」「○○もらった」「○○ゲットした」）
- add_wishlist: 物が欲しい（「○○欲しい」「○○買いたい」）
- purchase_complete: 購入予定品が届いた（「○○届いた」「○○来た」）
- consume_item: 物を使い切った・消費した（「○○使い切った」「○○なくなった」「○○食べた」）
- give_item: 物を誰かにあげた（「○○あげた」「○○渡した」）
- sell_item: 物を売った（「○○売った」「○○売却した」）
- list_items: 一覧表示（「○○の一覧」「○○を見せて」「○○リスト」）
- move_item: 物を箱や場所に入れた（「○○を△△に入れた」「○○を△△にしまった」）
- unknown: 上記に該当しない

回答は以下のJSON形式のみで返してください:
{
  "intent": "意図の種類",
  "params": {
    "itemName": "対象の物の名前",
    "targetName": "移動先や検索対象の名前（該当する場合）",
    "recipientName": "譲渡先や売却先の名前（該当する場合）",
    "price": 売却価格（数値、該当する場合）,
    "boxName": "箱の名前（該当する場合）",
    "locationName": "場所の名前（該当する場合）"
  },
  "confidence": 0.0-1.0の確信度
}

注意:
- 該当しないパラメータは含めないでください
- JSON以外の文字は出力しないでください`;

export async function parseNaturalLanguage(message: string): Promise<ParsedIntent> {
  if (!geminiClient) {
    return {
      intent: 'unknown',
      params: {},
      confidence: 0,
    };
  }

  try {
    const response = await geminiClient.generateContent(message, SYSTEM_PROMPT);

    // JSONを抽出
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        intent: 'unknown',
        params: {},
        confidence: 0,
        rawResponse: response,
      };
    }

    const parsed = JSON.parse(jsonMatch[0]) as ParsedIntent;

    // バリデーション
    const validIntents: IntentType[] = [
      'search_location',
      'add_item',
      'add_wishlist',
      'purchase_complete',
      'consume_item',
      'give_item',
      'sell_item',
      'list_items',
      'move_item',
      'unknown',
    ];

    if (!validIntents.includes(parsed.intent)) {
      parsed.intent = 'unknown';
    }

    return {
      ...parsed,
      rawResponse: response,
    };
  } catch (error) {
    console.error('Failed to parse natural language:', error);
    return {
      intent: 'unknown',
      params: {},
      confidence: 0,
    };
  }
}

export function isNlpEnabled(): boolean {
  return geminiClient !== null;
}
