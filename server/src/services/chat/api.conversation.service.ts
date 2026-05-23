import mongoose from 'mongoose';

class ApiConversationService {
  buildGuestConversationPipeline(conversationId: mongoose.Types.ObjectId) {
    return [
      {
        $match: {
          _id: conversationId,
          isActive: true,
        },
      },

      /**
       * ownerParticipant = directParentParticipant[0]
       */
      {
        $addFields: {
          ownerParticipant: {
            $arrayElemAt: [
              '$directParentParticipant',
              0,
            ],
          },
        },
      },

      /**
       * normalize response
       */
      {
        $addFields: {
          conversationAssign: '$assignedTeam',
          conversation: {
            userName: '$ownerParticipant.name',
            userEmail: '$ownerParticipant.email',
          },
        },
      },

      /**
       * cleanup
       */
      {
        $project: {
          directParentParticipant: 0,
          ownerParticipant: 0,
        },
      },
    ];
  }
}

export default new ApiConversationService();