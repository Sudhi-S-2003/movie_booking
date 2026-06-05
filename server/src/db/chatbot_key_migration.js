/**
 * chatbot_key_migration.js
 *
 * MongoDB migration script — run once with:
 *   mongosh <connection-string> --file chatbot_key_migration.js
 *
 * What it does:
 *   1. In ChatbotTemplate.headers  — renames 'welcome_media' key → 'media_image'
 *   2. In ChatbotTemplate.bodies   — renames 'otp_message' key → 'otp_code'
 *   3. In ChatMessage.chatbotTemplate.headers — same header rename
 *   4. In ChatMessage.chatbotTemplate.bodies  — same body rename
 *   5. In ChatbotTemplate.footers  — renames 'terms' key → 'terms_link'
 *   6. In ChatMessage.chatbotTemplate.footers — same footer rename
 *
 * Safe to run multiple times (idempotent — only updates docs that match).
 */

'use strict';

const DB_NAME = 'move-booking'; // ← change if your DB name differs

use(DB_NAME);

// ─── 1. ChatbotTemplate — Header key: welcome_media → media_image ────────────
print('=== Migrating ChatbotTemplate header: welcome_media → media_image ===');
const tplHeaderResult = db.chatbottemplates.updateMany(
  { 'headers.key': 'welcome_media' },
  { $set: { 'headers.$[elem].key': 'media_image' } },
  { arrayFilters: [{ 'elem.key': 'welcome_media' }] }
);
print(`  Matched: ${tplHeaderResult.matchedCount}, Modified: ${tplHeaderResult.modifiedCount}`);

// ─── 2. ChatbotTemplate — Body key: otp_message → otp_code ──────────────────
print('=== Migrating ChatbotTemplate body: otp_message → otp_code ===');
const tplBodyResult = db.chatbottemplates.updateMany(
  { 'bodies.key': 'otp_message' },
  { $set: { 'bodies.$[elem].key': 'otp_code' } },
  { arrayFilters: [{ 'elem.key': 'otp_message' }] }
);
print(`  Matched: ${tplBodyResult.matchedCount}, Modified: ${tplBodyResult.modifiedCount}`);

// ─── 3. ChatbotTemplate — Footer key: terms → terms_link ────────────────────
print('=== Migrating ChatbotTemplate footer: terms → terms_link ===');
const tplFooterResult = db.chatbottemplates.updateMany(
  { 'footers.key': 'terms' },
  { $set: { 'footers.$[elem].key': 'terms_link' } },
  { arrayFilters: [{ 'elem.key': 'terms' }] }
);
print(`  Matched: ${tplFooterResult.matchedCount}, Modified: ${tplFooterResult.modifiedCount}`);

// ─── 4. ChatMessage — chatbotTemplate.headers key: welcome_media → media_image
print('=== Migrating ChatMessage chatbotTemplate header: welcome_media → media_image ===');
const msgHeaderResult = db.chatmessages.updateMany(
  { 'chatbotTemplate.headers.key': 'welcome_media' },
  { $set: { 'chatbotTemplate.headers.$[elem].key': 'media_image' } },
  { arrayFilters: [{ 'elem.key': 'welcome_media' }] }
);
print(`  Matched: ${msgHeaderResult.matchedCount}, Modified: ${msgHeaderResult.modifiedCount}`);

// ─── 5. ChatMessage — chatbotTemplate.bodies key: otp_message → otp_code ────
print('=== Migrating ChatMessage chatbotTemplate body: otp_message → otp_code ===');
const msgBodyResult = db.chatmessages.updateMany(
  { 'chatbotTemplate.bodies.key': 'otp_message' },
  { $set: { 'chatbotTemplate.bodies.$[elem].key': 'otp_code' } },
  { arrayFilters: [{ 'elem.key': 'otp_message' }] }
);
print(`  Matched: ${msgBodyResult.matchedCount}, Modified: ${msgBodyResult.modifiedCount}`);

// ─── 6. ChatMessage — chatbotTemplate.footers key: terms → terms_link ────────
print('=== Migrating ChatMessage chatbotTemplate footer: terms → terms_link ===');
const msgFooterResult = db.chatmessages.updateMany(
  { 'chatbotTemplate.footers.key': 'terms' },
  { $set: { 'chatbotTemplate.footers.$[elem].key': 'terms_link' } },
  { arrayFilters: [{ 'elem.key': 'terms' }] }
);
print(`  Matched: ${msgFooterResult.matchedCount}, Modified: ${msgFooterResult.modifiedCount}`);

print('\n✅ Migration complete.');
