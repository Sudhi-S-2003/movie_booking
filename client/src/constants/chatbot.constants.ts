// ─────────────────────────────────────────────────────────────────────────────
// Chatbot template key constants
//
// These keys determine how a section row is rendered in the chat bubble.
// "custom" is a UI-only mode selector — the user types their own key, so the
// stored value in DB will be whatever they typed, never the literal "custom".
//
// Key taxonomy:
//   Header keys  — control top-section rendering (titles, media, announcements)
//   Body keys    — control the main content block rendering style
//   Footer keys  — control fine-print / legal text rendering
// ─────────────────────────────────────────────────────────────────────────────

// ── Header Keys ───────────────────────────────────────────────────────────────
// type field on header rows determines the media kind; key provides semantic role.
export const HEADER_KEY_OPTIONS = [
  { value: 'title',           label: 'Primary Title (title)' },
  { value: 'subtitle',        label: 'Sub-title / Tagline (subtitle)' },
  { value: 'branding',        label: 'Company Branding / Logo URL (branding)' },
  { value: 'announcement',    label: 'Special Announcement Banner (announcement)' },
  { value: 'media_image',     label: 'Inline Image Attachment (media_image)' },
  { value: 'media_video',     label: 'Inline Video Attachment (media_video)' },
  { value: 'media_document',  label: 'Document / File Link (media_document)' },
  { value: 'custom',          label: '✏️  Custom Key (write your own)...' },
] as const;

// ── Body Keys ─────────────────────────────────────────────────────────────────
export const BODY_KEY_OPTIONS = [
  { value: 'greeting',         label: 'Greeting / Welcome Line (greeting)' },
  { value: 'intro',            label: 'Introduction Block (intro)' },
  { value: 'main_content',     label: 'Main Message Content (main_content)' },
  { value: 'booking_details',  label: 'Booking / Ticket Details (booking_details)' },
  { value: 'otp_code',         label: 'OTP Verification Code (otp_code)' },
  { value: 'instructions',     label: 'User Instructions / Steps (instructions)' },
  { value: 'error_notice',     label: 'Error / Warning Notice (error_notice)' },
  { value: 'custom',           label: '✏️  Custom Key (write your own)...' },
] as const;

// ── Footer Keys ───────────────────────────────────────────────────────────────
export const FOOTER_KEY_OPTIONS = [
  { value: 'disclaimer',   label: 'Standard Disclaimer (disclaimer)' },
  { value: 'unsubscribe',  label: 'Unsubscribe Instructions (unsubscribe)' },
  { value: 'help_info',    label: 'Support & Help Contact (help_info)' },
  { value: 'terms_link',   label: 'Terms & Conditions Link (terms_link)' },
  { value: 'custom',       label: '✏️  Custom Key (write your own)...' },
] as const;

// ── Convenience sets for bubble renderer ──────────────────────────────────────
// Keys rendered WITHOUT a visible label (just their value content)
export const HEADER_PLAIN_KEYS  = new Set(['title', 'subtitle', 'branding', 'announcement']);
export const BODY_PLAIN_KEYS    = new Set(['greeting', 'intro', 'main_content']);
export const BODY_SPECIAL_KEYS  = new Set(['booking_details', 'otp_code', 'otp_message', 'error_notice', 'instructions']);
export const FOOTER_PLAIN_KEYS  = new Set(['disclaimer', 'unsubscribe', 'help_info', 'terms_link',
  // Legacy aliases kept for backward compatibility with stored messages
  'terms',
]);

// Legacy key aliases (old keys still in DB from before the migration)
export const LEGACY_BODY_ALIAS: Record<string, string> = {
  otp_message: 'otp_code', // renamed
};
export const LEGACY_HEADER_ALIAS: Record<string, string> = {
  welcome_media: 'media_image', // was ambiguous — default to image type rendering
};

export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi / हिन्दी' },
  { code: 'ta', name: 'Tamil / தமிழ்' },
  { code: 'te', name: 'Telugu / తెలుగు' },
  { code: 'ml', name: 'Malayalam / മലയാളം' },
  { code: 'kn', name: 'Kannada / ಕನ್ನಡ' },
  { code: 'es', name: 'Spanish / Español' },
  { code: 'fr', name: 'French / Français' },
  { code: 'de', name: 'German / Deutsch' },
  { code: 'ja', name: 'Japanese / 日本語' },
  { code: 'ko', name: 'Korean / 한국어' },
];
