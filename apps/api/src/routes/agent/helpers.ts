import type { Request, Response } from 'express';
import { ErrorCodes } from '@family-inventory/shared';
import { getAgentMapping } from '../../services/agent.service.js';
import { sendError } from '../../utils/response.js';

/**
 * エージェント Actor からファミリー/ユーザーを解決する。
 *
 * - `req.agentActor` は `authenticateAgent` ミドルウェアによってセットされている前提。
 * - actorId が `agentMappings` に存在しない場合は 403 を返し null を返す。
 * - 解決できた場合は `{ actorId, familyId, userId }` を返す。
 */
export async function requireAgentUser(
  req: Request,
  res: Response
): Promise<{ actorId: string; familyId: string; userId: string } | null> {
  const actorId = req.agentActor?.actorId;

  if (!actorId) {
    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      'エージェント認証情報が見つかりません',
      500
    );
    return null;
  }

  const mapping = await getAgentMapping(actorId);
  if (!mapping) {
    sendError(
      res,
      ErrorCodes.AGENT_ACTOR_NOT_MAPPED,
      'エージェントアクターがファミリーに紐付いていません',
      403
    );
    return null;
  }

  return {
    actorId: mapping.actorId,
    familyId: mapping.familyId,
    userId: mapping.userId,
  };
}
