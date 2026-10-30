/**
 * Topics MOSAIC offers for answering each other (a sender may also write their own). Each is
 * shown in the reader's language; the tag both answers carry is the sender's wording.
 */
import type { I18nText } from "./questions";

export const TOPICS = {
  embarrassing: { ja: "過去イチ恥ずかしかった話", en: "The most embarrassing thing that ever happened to you", vi: "Chuyện xấu hổ nhất từng trải qua" },
  childhood_dream: { ja: "子どものころの夢", en: "Your childhood dream", vi: "Ước mơ thời thơ ấu" },
  laughed: { ja: "最近いちばん笑ったこと", en: "What made you laugh the most lately", vi: "Điều khiến bạn cười nhiều nhất gần đây" },
  proud: { ja: "ひそかに誇りに思っていること", en: "Something you're quietly proud of", vi: "Điều bạn thầm tự hào" },
  comfort_food: { ja: "元気が出るごはん", en: "The food that cheers you up", vi: "Món ăn giúp bạn vui lên" },
  turning_point: { ja: "人生が変わった瞬間", en: "A moment that changed your life", vi: "Khoảnh khắc thay đổi cuộc đời bạn" },
  favorite_place: { ja: "いちばん好きな場所", en: "Your favourite place", vi: "Nơi bạn thích nhất" },
  first_memory: { ja: "いちばん古い記憶", en: "Your earliest memory", vi: "Ký ức xa nhất của bạn" },
  lesson: { ja: "失敗から学んだこと", en: "Something a mistake taught you", vi: "Bài học từ một lần thất bại" },
  grateful: { ja: "最近ありがたかったこと", en: "Something you were grateful for lately", vi: "Điều bạn biết ơn gần đây" },
  free_day: { ja: "何をしてもいい1日があったら", en: "If you had a day to do anything", vi: "Nếu có một ngày được làm bất cứ điều gì" },
  younger_self: { ja: "子どものころの自分に伝えたいこと", en: "What you'd tell your younger self", vi: "Điều muốn nói với bản thân lúc nhỏ" },
  song: { ja: "思い出の曲", en: "A song full of memories", vi: "Bài hát gắn với kỷ niệm" },
  trip: { ja: "忘れられない旅", en: "An unforgettable trip", vi: "Chuyến đi khó quên" },
  someday: { ja: "いつかやってみたいこと", en: "Something you'd like to try someday", vi: "Điều muốn thử một lần trong đời" },
  into_lately: { ja: "最近はまっていること", en: "What you're into lately", vi: "Điều bạn đang mê gần đây" },
  first_impression: { ja: "お互いの第一印象", en: "Your first impression of each other", vi: "Ấn tượng đầu tiên về nhau" },
  our_memory: { ja: "ふたりのいちばんの思い出", en: "Your favourite memory of the two of us", vi: "Kỷ niệm đẹp nhất của hai ta" },
  at_peace: { ja: "心が落ち着く瞬間", en: "When you feel at peace", vi: "Khoảnh khắc lòng bình yên" },
  nervous: { ja: "人生でいちばん緊張したこと", en: "The most nervous you've ever been", vi: "Lần hồi hộp nhất trong đời" },
  look_up_to: { ja: "憧れの人", en: "Someone you look up to", vi: "Người bạn ngưỡng mộ" },
  treasure: { ja: "宝物にしているもの", en: "Something you treasure", vi: "Món đồ bạn coi như báu vật" },
  own_rule: { ja: "自分だけのこだわり", en: "A little rule of your own", vi: "Một nguyên tắc nhỏ của riêng bạn" },
  school: { ja: "学生時代の忘れられない出来事", en: "An unforgettable moment from your school days", vi: "Kỷ niệm khó quên thời đi học" },
  surprised: { ja: "最近びっくりしたこと", en: "Something that surprised you lately", vi: "Điều khiến bạn bất ngờ gần đây" },
  bounce_back: { ja: "落ち込んだときの立ち直り方", en: "How you pick yourself up when you're down", vi: "Cách bạn vực dậy khi buồn" },
  ten_years: { ja: "10年後の自分", en: "You in ten years", vi: "Bản thân bạn 10 năm sau" },
  kindness: { ja: "忘れられない親切", en: "A kindness you can't forget", vi: "Một lòng tốt bạn không quên" },
  family_way: { ja: "家族の決まりごと", en: "A custom in your family", vi: "Một nếp nhà của gia đình bạn" },
  small_joy: { ja: "小さな幸せ", en: "A small happiness", vi: "Một niềm hạnh phúc nhỏ" },
} satisfies Record<string, I18nText>;

export type TopicKey = keyof typeof TOPICS;
export const isTopicKey = (v: unknown): v is TopicKey => typeof v === "string" && Object.hasOwn(TOPICS, v);
