import type { HydratedDocument } from 'mongoose';
import type { IMovie } from '../../interfaces/models.interface.js';

type MovieDoc = HydratedDocument<IMovie>;
type Template = (m: MovieDoc) => { title: string; content: string };

/**
 * Post templates parameterized by a movie. Each one produces a realistic
 * first-person review or reaction that makes good use of #hashtag and
 * @mention syntax so the Linkify UI has real content to demo.
 */
export const postTemplates: Template[] = [
  (m) => ({
    title: `${m.title} — a quiet masterpiece`,
    content: `Just came back from ${m.title}. The cinematography, the sound design, the performances — every frame feels intentional. If you love ${m.genres[0]?.toLowerCase() ?? 'good cinema'}, do NOT miss this on the big screen. #cinema #reviews`,
  }),
  (m) => ({
    title: `Why ${m.title} deserves your IMAX ticket`,
    content: `IMAX isn't just bigger — it's a different movie. ${m.title} uses every inch of that frame. The climax alone is worth the upgrade. Dolby + #IMAX = unreal. cc @john_movie_fan`,
  }),
  (m) => ({
    title: `Unpopular opinion on ${m.title}`,
    content: `Everyone's raving about ${m.title}, and yes it's good — but the middle act drags. Strong opening, strong ending, shaky in between. Still worth watching, just setting expectations. #reviews`,
  }),
  (m) => ({
    title: `${m.title} soundtrack is on repeat`,
    content: `The score from ${m.title} has been living rent-free in my head for 3 days now. Composer absolutely cooked. Perfect background music for a rainy night drive. #behindthescenes`,
  }),
  (m) => ({
    title: `Spoiler-free review: ${m.title}`,
    content: `No spoilers, promise. ${m.title} is the kind of film that trusts its audience. It doesn't over-explain. It lets silences breathe. Rating: 4.5/5. #cinema @jane_critic what did you think?`,
  }),
];

export const reviewComments = [
  'Absolutely cinematic masterpiece!',
  'Great visuals, but the plot was a bit weak.',
  'One of the best movies I\'ve seen this year.',
  'Loved the background score. Highly recommended!',
  'Stunning performances by the lead cast.',
  'Worth every penny. The 4DX experience was insane.',
  'A bit long, but kept me engaged throughout.',
  'Classic storytelling at its best.',
  'Not what I expected, but pleasantly surprised.',
  'A visual treat for sci-fi fans!',
];
