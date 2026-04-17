import { Issue, IssueMessage } from '../../models/issue.model.js';
import { issuesSeedData } from '../seedData/issues.data.js';
import { log } from './helpers.js';
import type { UserDoc } from './users.js';

export const seedIssues = async (users: UserDoc[]) => {
  log('🛠️', 'Seeding support issues...');

  const byUsername = new Map(users.map((u) => [u.username, u]));
  let issueCount = 0;
  let messageCount = 0;

  for (const row of issuesSeedData) {
    const reporter = byUsername.get(row.reporter);
    if (!reporter) continue;

    const issue = await Issue.create({
      userId:      reporter._id,
      role:        row.role,
      category:    row.category,
      title:       row.title,
      description: row.description,
      status:      row.status,
      priority:    row.priority,
    });
    issueCount += 1;

    const messageRows = row.messages.flatMap((m) => {
      const sender = byUsername.get(m.sender);
      if (!sender) return [];
      return [{
        issueId:    issue._id,
        senderId:   sender._id,
        senderName: sender.name,
        senderRole: m.senderRole,
        text:       m.text,
      }];
    });

    if (messageRows.length) {
      await IssueMessage.insertMany(messageRows);
      messageCount += messageRows.length;
    }
  }

  log('✅', `${issueCount} issues + ${messageCount} messages seeded`);
};
