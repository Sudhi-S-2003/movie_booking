import mongoose from 'mongoose';

class ConversationService {
  buildAggregationPipeline({
    viewerId,
    q,
    typeFilter,
    sortBy,
    dir,
    skip,
    limit,
  }: {
    viewerId: mongoose.Types.ObjectId;
    q?: string;
    typeFilter?: string;
    sortBy?: 'activity' | 'created' | 'name';
    dir?: 1 | -1;
    skip: number;
    limit: number;
  }) {
    const pipeline: any[] = [];

    // 1. Match participant rows for the user
    pipeline.push({
      $match: {
        userId: viewerId,
      },
    });

    // 2. Join the conversation document
    pipeline.push(
      {
        $lookup: {
          from: 'conversations',
          localField: 'conversationId',
          foreignField: '_id',
          as: 'conversationDoc',
        },
      },
      {
        $unwind: '$conversationDoc',
      }
    );

    // 3. Filter by conversation criteria
    const convMatch: any = {
      'conversationDoc.isActive': true,
    };
    if (typeFilter) {
      convMatch['conversationDoc.type'] = typeFilter;
    }
    pipeline.push({ $match: convMatch });

    // 4. Promote conversation doc to root so all subsequent stages work on the conversation shape
    pipeline.push({
      $replaceRoot: { newRoot: '$conversationDoc' }
    });

    this.attachCommonFields(pipeline, viewerId);

    this.applySearch(pipeline, q);

    this.applySortAndPagination(pipeline, {
      sortBy,
      dir,
      skip,
      limit,
    });

    return pipeline;
  }

  /**
   * ✅ NEW: single conversation pipeline
   */
  buildSingleConversationPipeline({
    conversationId,
    viewerId,
  }: {
    conversationId: mongoose.Types.ObjectId;
    viewerId: mongoose.Types.ObjectId;
  }) {
    const pipeline: any[] = [];

    pipeline.push({
      $match: {
        _id: conversationId,
        isActive: true,
      },
    });

    this.attachCommonFields(pipeline, viewerId);

    return pipeline;
  }

  /**
   * shared logic
   */
  private attachCommonFields(
    pipeline: any[],
    viewerId: mongoose.Types.ObjectId,
  ) {
    pipeline.push(
      {
        $addFields: {
          conversationAssign: '$assignedTeam',
          isDirectParentUser: {
            $in: [
              viewerId,
              { $ifNull: ['$directParentParticipant.userId', []] }
            ]
          }
        }
      },
      {
        $addFields: {
          peer: {
            $arrayElemAt: [
              {
                $filter: {
                  input: '$directParentParticipant',
                  as: 'p',
                  cond: {
                    $ne: [
                      '$$p.userId',
                      viewerId,
                    ],
                  },
                },
              },
              0,
            ],
          },
        },
      },
      {
        $addFields: {
          conversation: {
            $switch: {
              branches: [
                {
                  case: {
                    $eq: ['$type', 'direct'],
                  },
                  then: {
                    userName: '$peer.name',
                    userEmail: '$peer.email',
                  },
                },
                {
                  case: {
                    $eq: ['$type', 'api'],
                  },
                  then: {
                    userName:
                      '$externalUser.name',
                    userEmail:
                      '$externalUser.email',
                  },
                },
                {
                  case: {
                    $eq: ['$type', 'group'],
                  },
                  then: {
                    userName: '$title',
                    userEmail: '$publicName',
                  },
                },
              ],
              default: {
                userName: '$title',
                userEmail: '',
              },
            },
          },
        },
      },
    );
  }

  private applySearch(pipeline: any[], q?: string) {
    if (!q) return;

    const safe = q.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&',
    );

    pipeline.push({
      $match: {
        $or: [
          {
            'conversation.userName': {
              $regex: safe,
              $options: 'i',
            },
          },
          {
            'conversation.userEmail': {
              $regex: safe,
              $options: 'i',
            },
          },
        ],
      },
    });
  }

  private applySortAndPagination(
    pipeline: any[],
    {
      sortBy,
      dir,
      skip,
      limit,
    }: {
      sortBy?: 'activity' | 'created' | 'name' | undefined;
      dir?: 1 | -1 | undefined;
      skip: number;
      limit: number;
    },
  ) {
    let sortStage: Record<string, 1 | -1>;

    switch (sortBy) {
      case 'name':
        sortStage = {
          'conversation.userName': dir || 1,
          _id: dir || 1,
        };
        break;

      case 'created':
        sortStage = {
          createdAt: dir || -1,
          _id: dir || -1,
        };
        break;

      default:
        sortStage = {
          lastMessageAt: dir || -1,
          updatedAt: dir || -1,
          _id: dir || -1,
        };
    }

    pipeline.push(
      { $sort: sortStage },
      {
        $facet: {
          rows: [
            { $skip: skip },
            { $limit: limit },
          ],
          total: [{ $count: 'count' }],
        },
      },
    );
  }
}

export default new ConversationService();