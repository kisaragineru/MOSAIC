/**
 * Questions added with the 17-axis model (bank v2). Same rules as questions.ts: ids are stable and
 * a version's content is immutable once seeded.
 *
 * Writing guide (keeps answers honest and comparable):
 *  - Prefer concrete situations ("Your plans fall through at the last minute…") over self-ratings.
 *  - Prefer choices between two good things, so no option is the "right" one.
 *  - Neither pole of an axis is better; options say what people do, not what they should do.
 *  - Each option that informs an axis carries [axis, +1 | -1]; options without one inform nothing.
 *  - Agree scales ("…") use `agree: [axis, direction of agreeing]`.
 * Each axis has at least five questions so a tendency can stand on several different answers.
 */
import type { QuestionJa } from "./questions-ja";
import type { QuestionCategory, QuestionDef, Signal, TendencyKey } from "./questions";

type Tri = readonly [en: string, vi: string, ja: string];
type Opt = readonly [value: string, label: Tri, signal?: readonly [TendencyKey, 1 | -1]];
interface Spec {
  id: string;
  category: QuestionCategory;
  sensitivity?: "low" | "medium" | "high";
  format: "single" | "multi" | "scale" | "short" | "free";
  prompt: Tri;
  options?: Opt[];
  maxChoices?: number;
  agree?: readonly [TendencyKey, 1 | -1];
}

const AGREE_EN = { minLabel: { en: "1 = Not like me at all", vi: "1 = Hoàn toàn không giống tôi" }, maxLabel: { en: "5 = Very much like me", vi: "5 = Rất giống tôi" } };
const AGREE_JA: [string, string] = ["1 = まったく当てはまらない", "5 = とても当てはまる"];

function build(specs: Spec[]): { defs: Omit<QuestionDef, "comparable">[]; ja: Record<string, QuestionJa> } {
  const defs: Omit<QuestionDef, "comparable">[] = [];
  const ja: Record<string, QuestionJa> = {};
  for (const s of specs) {
    const signals: Signal[] = [];
    for (const [value, , sig] of s.options ?? []) if (sig) signals.push({ claimKey: sig[0], direction: sig[1], whenValue: value });
    if (s.agree) {
      const [claimKey, d] = s.agree;
      signals.push({ claimKey, direction: d, whenScaleAtLeast: 4 }, { claimKey, direction: d === 1 ? -1 : 1, whenScaleAtMost: 2 });
    }
    defs.push({
      id: s.id,
      version: 1,
      category: s.category,
      sensitivity: s.sensitivity ?? "low",
      format: s.format,
      prompt: { en: s.prompt[0], vi: s.prompt[1] },
      ...(s.options ? { options: s.options.map(([value, l]) => ({ value, label: { en: l[0], vi: l[1] } })) } : {}),
      ...(s.maxChoices ? { maxChoices: s.maxChoices } : {}),
      ...(s.format === "scale" ? { scale: { min: 1, max: 5, ...AGREE_EN } } : {}),
      ...(signals.length ? { signals } : {}),
    });
    ja[s.id] = {
      prompt: s.prompt[2],
      ...(s.options ? { options: Object.fromEntries(s.options.map(([value, l]) => [value, l[2]])) } : {}),
      ...(s.format === "scale" ? { scale: AGREE_JA } : {}),
    };
  }
  return { defs, ja };
}

const SPECS: Spec[] = [
  // ── self: planning ─────────────────────────────────────────────────────
  {
    id: "ax.plan_pack", category: "personality", format: "single",
    prompt: ["The night before a trip, your bag is usually…", "Đêm trước chuyến đi, hành lý của bạn thường…", "旅行の前の晩、あなたの荷物はたいてい…"],
    options: [
      ["packed_list", ["Packed, checked against a list", "Đã xếp xong, kiểm tra theo danh sách", "リストで確認して詰め終わっている"], ["planning", 1]],
      ["mostly", ["Mostly packed", "Xếp gần xong", "だいたい詰めてある"]],
      ["morning", ["Still empty — I'll pack in the morning", "Vẫn trống — sáng mai xếp", "まだ空っぽ。朝に詰める"], ["planning", -1]],
    ],
  },
  {
    id: "ax.plan_deadline", category: "money_work", format: "single",
    prompt: ["A deadline is two weeks away. You usually…", "Còn hai tuần nữa là đến hạn. Bạn thường…", "締め切りまであと2週間。あなたはたいてい…"],
    options: [
      ["early", ["Start right away and finish early", "Bắt đầu ngay và xong sớm", "すぐ始めて早めに終わらせる"], ["planning", 1]],
      ["steady", ["Do a little every day", "Mỗi ngày làm một ít", "毎日少しずつ進める"], ["planning", 1]],
      ["last", ["Get it done in the last few days", "Dồn vào mấy ngày cuối", "最後の数日で一気にやる"], ["planning", -1]],
    ],
  },
  // ── self: social energy ────────────────────────────────────────────────
  {
    id: "ax.social_lunch", category: "personality", format: "single",
    prompt: ["On a free lunch break, you'd rather…", "Giờ nghỉ trưa rảnh rỗi, bạn thích…", "自由な昼休み、どう過ごしたい？"],
    options: [
      ["group", ["Eat with a group", "Ăn cùng cả nhóm", "みんなで食べる"], ["social_energy", 1]],
      ["one", ["Eat with one friend", "Ăn với một người bạn", "一人の友だちと食べる"]],
      ["alone", ["Eat alone and recharge", "Ăn một mình cho thoải mái", "ひとりで食べてひと息つく"], ["social_energy", -1]],
    ],
  },
  {
    id: "ax.social_weekend", category: "personality", format: "scale",
    prompt: ["\"A weekend without seeing anyone feels like something is missing.\"", "\"Một cuối tuần không gặp ai khiến tôi thấy thiếu thiếu.\"", "「週末に誰とも会わないと、何か物足りない」"],
    agree: ["social_energy", 1],
  },
  // ── self: novelty ──────────────────────────────────────────────────────
  {
    id: "ax.novelty_routine", category: "personality", format: "scale",
    prompt: ["\"Days that follow the same routine soon bore me.\"", "\"Những ngày lặp lại một nếp quen làm tôi nhanh chán.\"", "「同じ流れの毎日が続くと、すぐ退屈してしまう」"],
    agree: ["novelty", 1],
  },
  // ── self: calm ─────────────────────────────────────────────────────────
  {
    id: "ax.calm_plans_break", category: "personality", format: "single",
    prompt: ["Your plans fall through at the last minute. You…", "Kế hoạch bị hủy vào phút chót. Bạn…", "楽しみにしていた予定が直前でなくなった。あなたは…"],
    options: [
      ["shrug", ["Shrug and find something else to do", "Nhún vai rồi tìm việc khác", "気持ちを切り替えて別のことをする"], ["calm", 1]],
      ["brief", ["Feel let down for a while", "Thấy hụt hẫng một lúc", "しばらくがっかりする"]],
      ["stays", ["Keep thinking about it for the rest of the day", "Cứ nghĩ mãi về chuyện đó cả ngày", "その日はずっと引きずる"], ["calm", -1]],
    ],
  },
  {
    id: "ax.calm_words", category: "personality", sensitivity: "medium", format: "scale",
    prompt: ["\"Something someone said can stay on my mind for days.\"", "\"Một câu nói của ai đó có thể khiến tôi nghĩ mãi mấy ngày liền.\"", "「人に言われた一言を、何日も考えてしまうことがある」"],
    agree: ["calm", -1],
  },
  {
    id: "ax.calm_waiting", category: "personality", format: "single",
    prompt: ["While waiting for an important result, you…", "Trong lúc chờ một kết quả quan trọng, bạn…", "大事な結果を待っているあいだ、あなたは…"],
    options: [
      ["as_usual", ["Carry on as usual", "Vẫn sinh hoạt như bình thường", "いつもどおり過ごせる"], ["calm", 1]],
      ["busy", ["Keep busy so you don't think about it", "Bận rộn để khỏi nghĩ đến", "考えないように予定を詰める"]],
      ["checking", ["Can't stop thinking about it", "Không thể ngừng nghĩ về nó", "ずっとそのことが頭から離れない"], ["calm", -1]],
    ],
  },
  {
    id: "ax.calm_moods", category: "personality", format: "scale",
    prompt: ["\"My moods don't swing very much.\"", "\"Tâm trạng của tôi ít khi lên xuống thất thường.\"", "「気分の浮き沈みは少ないほうだ」"],
    agree: ["calm", 1],
  },
  {
    id: "ax.calm_stress", category: "personality", format: "single",
    prompt: ["After a stressful day, how long does it stay with you?", "Sau một ngày căng thẳng, cảm giác đó ở lại với bạn bao lâu?", "ストレスの多い一日のあと、その気持ちはどのくらい残る？"],
    options: [
      ["night", ["Gone by bedtime", "Đến giờ ngủ là hết", "寝るころには消えている"], ["calm", 1]],
      ["next_day", ["Until the next day", "Đến ngày hôm sau", "次の日まで残る"]],
      ["days", ["Several days", "Vài ngày", "何日も残る"], ["calm", -1]],
    ],
  },
  // ── self: pace ─────────────────────────────────────────────────────────
  {
    id: "ax.pace_buy", category: "money_work", format: "single",
    prompt: ["Buying something you'd use every day, at a price that makes you think twice, you…", "Mua một món dùng hằng ngày nhưng giá khiến bạn phải cân nhắc, bạn…", "毎日使うけれど少し迷う値段のものを買うとき、あなたは…"],
    options: [
      ["quick", ["Decide on the spot if it feels right", "Thấy ổn là quyết ngay", "良さそうならその場で決める"], ["pace", 1]],
      ["days", ["Sleep on it for a few days", "Để vài ngày suy nghĩ", "数日寝かせてから決める"], ["pace", -1]],
      ["reviews", ["Read reviews first, then decide", "Đọc đánh giá trước rồi quyết", "まずレビューを読んでから決める"]],
    ],
  },
  {
    id: "ax.pace_reply", category: "personality", format: "single",
    prompt: ["A message needs your decision. You reply…", "Một tin nhắn cần bạn quyết định. Bạn trả lời…", "決めてほしいという連絡が来た。返事は…"],
    options: [
      ["now", ["Right away", "Ngay lập tức", "すぐ返す"], ["pace", 1]],
      ["later", ["After thinking it over", "Sau khi suy nghĩ kỹ", "よく考えてから返す"], ["pace", -1]],
    ],
  },
  {
    id: "ax.pace_act", category: "personality", format: "scale",
    prompt: ["\"I'm often already moving before I've finished thinking.\"", "\"Tôi thường đã bắt tay vào làm trước khi nghĩ xong.\"", "「考えるより先に体が動いていることが多い」"],
    agree: ["pace", 1],
  },
  {
    id: "ax.pace_new_task", category: "money_work", format: "single",
    prompt: ["You're given a new task with no clear steps. You…", "Bạn nhận một việc mới chưa rõ cách làm. Bạn…", "やり方が決まっていない新しい仕事を任された。あなたは…"],
    options: [
      ["start", ["Start and adjust as you go", "Bắt tay vào rồi điều chỉnh dần", "まず手をつけて、やりながら直す"], ["pace", 1]],
      ["map", ["Map it out before starting", "Vạch ra hết rồi mới bắt đầu", "全体を整理してから始める"], ["pace", -1]],
    ],
  },
  {
    id: "ax.pace_people_say", category: "personality", format: "single",
    prompt: ["People say you walk, talk and eat…", "Mọi người bảo bạn đi, nói và ăn…", "歩く・話す・食べる速さ、人からは…"],
    options: [
      ["fast", ["Fast", "Nhanh", "速いと言われる"], ["pace", 1]],
      ["own", ["At your own unhurried pace", "Thong thả theo nhịp riêng", "マイペースと言われる"], ["pace", -1]],
      ["depends", ["It depends", "Tùy lúc", "時と場合による"]],
    ],
  },
  // ── mind: decision style ───────────────────────────────────────────────
  {
    id: "ax.dec_home", category: "money_work", format: "single",
    prompt: ["Choosing a place to live, what decides it in the end?", "Khi chọn nơi ở, điều gì quyết định cuối cùng?", "住む場所を選ぶとき、最後の決め手は？"],
    options: [
      ["numbers", ["Rent, commute time, the numbers", "Giá thuê, thời gian đi lại, các con số", "家賃や通勤時間などの条件"], ["decision_style", 1]],
      ["feeling", ["How it felt when I walked in", "Cảm giác khi bước vào", "部屋に入ったときの感覚"], ["decision_style", -1]],
      ["people", ["Who lives nearby", "Ai sống gần đó", "近くに誰が住んでいるか"]],
    ],
  },
  {
    id: "ax.dec_gut", category: "personality", format: "scale",
    prompt: ["\"In the end, I usually go with my gut.\"", "\"Cuối cùng thì tôi thường làm theo trực giác.\"", "「最後は直感で決めることが多い」"],
    agree: ["decision_style", -1],
  },
  {
    id: "ax.dec_gift", category: "relationships", format: "single",
    prompt: ["Choosing a gift, you…", "Khi chọn quà, bạn…", "プレゼントを選ぶとき、あなたは…"],
    options: [
      ["research", ["Research and compare options", "Tìm hiểu và so sánh các lựa chọn", "調べて比べてから選ぶ"], ["decision_style", 1]],
      ["feel", ["Pick what feels right when you see it", "Thấy hợp là chọn", "見て「これだ」と思ったものにする"], ["decision_style", -1]],
    ],
  },
  {
    id: "ax.dec_lookback", category: "personality", format: "single",
    prompt: ["When a decision turns out badly, you look back at…", "Khi một quyết định không như ý, bạn nhìn lại…", "決めたことがうまくいかなかったとき、振り返るのは…"],
    options: [
      ["data", ["What information I was missing", "Mình đã thiếu thông tin gì", "どんな情報が足りなかったか"], ["decision_style", 1]],
      ["sense", ["What my gut was telling me", "Trực giác lúc đó đã mách gì", "あのとき直感が何と言っていたか"], ["decision_style", -1]],
      ["advice", ["Whose advice I followed", "Mình đã nghe lời khuyên của ai", "誰の助言に従ったか"]],
    ],
  },
  // ── mind: risk ─────────────────────────────────────────────────────────
  {
    id: "ax.risk_money", category: "money_work", sensitivity: "medium", format: "single",
    prompt: ["Money you won't need for five years — where would you put it?", "Khoản tiền năm năm nữa bạn mới cần — bạn sẽ để ở đâu?", "5年は使わないお金。どこに置く？"],
    options: [
      ["safe", ["Somewhere safe, even if it grows slowly", "Nơi an toàn, dù sinh lời chậm", "増えなくても安全なところ"], ["risk", -1]],
      ["mix", ["Half safe, half growth", "Nửa an toàn, nửa sinh lời", "半分は安全、半分は増やす"]],
      ["growth", ["Where it can grow, accepting ups and downs", "Nơi có thể sinh lời, chấp nhận lên xuống", "上下があっても増やせるところ"], ["risk", 1]],
    ],
  },
  {
    id: "ax.risk_challenge", category: "money_work", format: "scale",
    prompt: ["\"I'd choose an exciting new challenge over a secure position.\"", "\"Tôi sẽ chọn một thử thách mới thú vị hơn là một vị trí ổn định.\"", "「安定した立場より、ワクワクする新しい挑戦を選びたい」"],
    agree: ["risk", 1],
  },
  // ── mind: independence ─────────────────────────────────────────────────
  {
    id: "ax.ind_stuck", category: "money_work", format: "single",
    prompt: ["Stuck on a problem, you first…", "Khi bị mắc kẹt với một vấn đề, việc đầu tiên bạn làm là…", "問題に行き詰まったとき、まず…"],
    options: [
      ["alone", ["Try to figure it out yourself", "Tự mình tìm cách giải quyết", "自分でなんとか考える"], ["independence", 1]],
      ["ask", ["Ask someone", "Hỏi ai đó", "誰かに聞く"], ["independence", -1]],
    ],
  },
  {
    id: "ax.ind_best_work", category: "money_work", format: "single",
    prompt: ["You do your best work…", "Bạn làm việc hiệu quả nhất khi…", "いちばん力を発揮できるのは…"],
    options: [
      ["alone", ["Alone, with quiet", "Một mình, yên tĩnh", "ひとりで静かに"], ["independence", 1]],
      ["team", ["In a team, bouncing ideas", "Trong nhóm, cùng trao đổi ý tưởng", "チームで意見を出し合いながら"], ["independence", -1]],
      ["mix", ["A mix of both", "Kết hợp cả hai", "その両方"]],
    ],
  },
  {
    id: "ax.ind_consult", category: "personality", format: "scale",
    prompt: ["\"I like to talk important things over with someone before deciding.\"", "\"Tôi thích bàn với ai đó trước khi quyết định chuyện quan trọng.\"", "「大事なことは誰かに相談してから決めたい」"],
    agree: ["independence", -1],
  },
  {
    id: "ax.ind_solo_trip", category: "travel", format: "single",
    prompt: ["Travelling alone sounds…", "Đi du lịch một mình nghe có vẻ…", "ひとり旅と聞くと…"],
    options: [
      ["exciting", ["Exciting", "Thú vị", "ワクワクする"], ["independence", 1]],
      ["fine", ["Fine now and then", "Thỉnh thoảng cũng được", "たまにならいい"]],
      ["lonely", ["Lonely", "Cô đơn", "さみしそう"], ["independence", -1]],
    ],
  },
  {
    id: "ax.ind_help", category: "personality", format: "single",
    prompt: ["Asking for help is…", "Nhờ người khác giúp đỡ đối với bạn là…", "人に助けを求めるのは…"],
    options: [
      ["hard", ["Hard — I'd rather manage myself", "Khó — tôi thà tự lo", "苦手。自分でなんとかしたい"], ["independence", 1]],
      ["natural", ["Natural — that's what people are for", "Tự nhiên — ai cũng cần nhau", "自然なこと。お互いさま"], ["independence", -1]],
    ],
  },
  // ── mind: detail ───────────────────────────────────────────────────────
  {
    id: "ax.det_story", category: "personality", format: "single",
    prompt: ["Telling someone about your day, you…", "Khi kể cho ai đó về ngày của mình, bạn…", "その日の出来事を話すとき、あなたは…"],
    options: [
      ["details", ["Include the details", "Kể cả các chi tiết", "細かいところまで話す"], ["detail", 1]],
      ["headline", ["Give the headline", "Kể ý chính", "要点だけ話す"], ["detail", -1]],
    ],
  },
  {
    id: "ax.det_mistakes", category: "personality", format: "scale",
    prompt: ["\"I quickly notice small mistakes.\"", "\"Tôi nhận ra những lỗi nhỏ rất nhanh.\"", "「細かいミスにすぐ気づくほうだ」"],
    agree: ["detail", 1],
  },
  {
    id: "ax.det_gadget", category: "hobbies", format: "single",
    prompt: ["With a new gadget, you…", "Với một món đồ công nghệ mới, bạn…", "新しい家電やガジェットを手に入れたら…"],
    options: [
      ["manual", ["Read the manual first", "Đọc hướng dẫn trước", "まず説明書を読む"], ["detail", 1]],
      ["try", ["Just start using it", "Cứ dùng thử luôn", "とりあえず触ってみる"], ["detail", -1]],
    ],
  },
  {
    id: "ax.det_project", category: "money_work", format: "single",
    prompt: ["In a project, what draws you most?", "Trong một dự án, điều gì cuốn hút bạn nhất?", "プロジェクトでいちばん惹かれるのは？"],
    options: [
      ["details", ["Getting the details right", "Làm đúng từng chi tiết", "細部をきちんと仕上げること"], ["detail", 1]],
      ["vision", ["The overall vision", "Tầm nhìn tổng thể", "全体のビジョン"], ["detail", -1]],
      ["people", ["The people", "Con người", "一緒にやる人たち"]],
    ],
  },
  {
    id: "ax.det_typos", category: "personality", format: "scale",
    prompt: ["\"Typos and numbers that don't add up bother me a lot.\"", "\"Lỗi chính tả và những con số không khớp làm tôi rất khó chịu.\"", "「誤字や数字のずれが気になって仕方ない」"],
    agree: ["detail", 1],
  },
  // ── people: expressiveness ─────────────────────────────────────────────
  {
    id: "ax.exp_good_news", category: "relationships", format: "single",
    prompt: ["Something great happens to you. You…", "Có chuyện vui đến với bạn. Bạn…", "とてもうれしいことがあった。あなたは…"],
    options: [
      ["tell_all", ["Tell people right away", "Kể ngay cho mọi người", "すぐみんなに話す"], ["expressiveness", 1]],
      ["one", ["Tell one person", "Kể cho một người", "一人にだけ話す"]],
      ["keep", ["Keep it to yourself for now", "Giữ cho riêng mình trước đã", "しばらく胸にしまっておく"], ["expressiveness", -1]],
    ],
  },
  {
    id: "ax.exp_say_love", category: "relationships", sensitivity: "medium", format: "scale",
    prompt: ["\"I tell the people I love that I love them, in words.\"", "\"Tôi nói lời yêu thương với những người tôi thương.\"", "「大切な人には、好きだと言葉で伝える」"],
    agree: ["expressiveness", 1],
  },
  {
    id: "ax.exp_face", category: "personality", format: "scale",
    prompt: ["\"People say my feelings show on my face.\"", "\"Mọi người bảo cảm xúc của tôi hiện rõ trên mặt.\"", "「気持ちが顔に出やすいと言われる」"],
    agree: ["expressiveness", 1],
  },
  {
    id: "ax.exp_upset", category: "relationships", sensitivity: "medium", format: "single",
    prompt: ["When something upsets you, you…", "Khi có điều gì làm bạn buồn, bạn…", "嫌なことがあったとき、あなたは…"],
    options: [
      ["talk", ["Talk about it soon", "Sớm nói ra", "早めに人に話す"], ["expressiveness", 1]],
      ["wait", ["Talk once you've sorted it out", "Nói khi đã tự sắp xếp xong suy nghĩ", "自分の中で整理できてから話す"]],
      ["inside", ["Mostly keep it inside", "Phần lớn giữ trong lòng", "たいてい自分の中にしまう"], ["expressiveness", -1]],
    ],
  },
  // ── people: conflict ───────────────────────────────────────────────────
  {
    id: "ax.con_meeting", category: "money_work", format: "single",
    prompt: ["In a meeting you think a plan is wrong. You…", "Trong cuộc họp, bạn nghĩ kế hoạch có vấn đề. Bạn…", "会議で、その計画はおかしいと思った。あなたは…"],
    options: [
      ["now", ["Say so in the meeting", "Nói ngay trong cuộc họp", "その場で言う"], ["conflict", 1]],
      ["after", ["Talk to the person afterwards", "Nói riêng với người đó sau", "あとで個別に伝える"], ["conflict", -1]],
      ["quiet", ["Let it go", "Cho qua", "何も言わない"], ["conflict", -1]],
    ],
  },
  {
    id: "ax.con_clear", category: "relationships", format: "scale",
    prompt: ["\"I say difficult things clearly, even when it's awkward.\"", "\"Tôi nói rõ những điều khó nói, dù có ngại.\"", "「言いにくいことでも、はっきり伝えるほうだ」"],
    agree: ["conflict", 1],
  },
  {
    id: "ax.con_wrong_order", category: "food", format: "single",
    prompt: ["Your order arrives wrong. You…", "Món bạn gọi bị mang ra sai. Bạn…", "注文と違う料理が来た。あなたは…"],
    options: [
      ["tell", ["Tell the staff", "Báo nhân viên", "店員さんに伝える"], ["conflict", 1]],
      ["eat", ["Eat it anyway", "Cứ ăn luôn", "そのまま食べる"], ["conflict", -1]],
    ],
  },
  // ── people: closeness ──────────────────────────────────────────────────
  {
    id: "ax.clo_friends", category: "relationships", format: "single",
    prompt: ["Your friendships look more like…", "Tình bạn của bạn giống kiểu nào hơn?", "あなたの友人関係は、どちらに近い？"],
    options: [
      ["few", ["A few very close friends", "Một vài người bạn rất thân", "とても親しい数人"], ["closeness", 1]],
      ["many", ["Many friends from different places", "Nhiều bạn từ nhiều nơi", "いろいろな場所にたくさん"], ["closeness", -1]],
    ],
  },
  {
    id: "ax.clo_birthday", category: "relationships", format: "single",
    prompt: ["Your ideal birthday is…", "Sinh nhật lý tưởng của bạn là…", "理想の誕生日は…"],
    options: [
      ["small", ["Dinner with two or three people", "Ăn tối với hai, ba người", "2〜3人でゆっくり食事"], ["closeness", 1]],
      ["big", ["A big party with lots of friends", "Một bữa tiệc lớn với nhiều bạn bè", "大勢でにぎやかにパーティー"], ["closeness", -1]],
      ["quiet", ["A quiet day of my own", "Một ngày yên tĩnh của riêng mình", "ひとりで静かに過ごす"]],
    ],
  },
  {
    id: "ax.clo_deep", category: "relationships", format: "scale",
    prompt: ["\"A few people I can really talk to matter more than knowing lots of people.\"", "\"Có vài người để tâm sự thật lòng quan trọng hơn quen biết nhiều người.\"", "「知り合いが多いより、深く話せる人が数人いればいい」"],
    agree: ["closeness", 1],
  },
  {
    id: "ax.clo_worries", category: "relationships", sensitivity: "medium", format: "single",
    prompt: ["Who hears about your real worries?", "Ai được nghe những lo lắng thật sự của bạn?", "本当の悩みを話す相手は？"],
    options: [
      ["one_two", ["One or two people", "Một, hai người", "1〜2人"], ["closeness", 1]],
      ["several", ["Several different people", "Vài người khác nhau", "何人かの人"], ["closeness", -1]],
      ["nobody", ["Usually nobody", "Thường là không ai", "たいてい誰にも話さない"]],
    ],
  },
  {
    id: "ax.clo_chats", category: "relationships", format: "single",
    prompt: ["In your messaging apps you're mostly…", "Trên các ứng dụng nhắn tin, bạn chủ yếu…", "メッセージアプリでは、主に…"],
    options: [
      ["one_on_one", ["In one-on-one chats", "Nhắn riêng từng người", "1対1のやりとり"], ["closeness", 1]],
      ["groups", ["Active in group chats", "Sôi nổi trong các nhóm chat", "グループでにぎやかに"], ["closeness", -1]],
    ],
  },
  // ── people: care style ─────────────────────────────────────────────────
  {
    id: "ax.care_sick_friend", category: "relationships", format: "single",
    prompt: ["A friend is sick at home. You…", "Một người bạn bị ốm ở nhà. Bạn…", "友だちが体調を崩して家で寝ている。あなたは…"],
    options: [
      ["message", ["Send a warm message", "Gửi một tin nhắn ấm áp", "温かいメッセージを送る"], ["care_style", 1]],
      ["bring", ["Drop off food or medicine", "Mang đồ ăn hoặc thuốc đến", "食べものや薬を届ける"], ["care_style", -1]],
    ],
  },
  {
    id: "ax.care_thanks", category: "relationships", format: "single",
    prompt: ["To thank someone, you'd rather…", "Để cảm ơn ai đó, bạn thích…", "誰かにお礼をするなら…"],
    options: [
      ["words", ["Write or say exactly what it meant to you", "Viết hoặc nói rõ điều đó có ý nghĩa thế nào với bạn", "どれだけうれしかったか言葉で伝える"], ["care_style", 1]],
      ["do", ["Do something for them in return", "Làm gì đó cho họ", "何かしてお返しをする"], ["care_style", -1]],
      ["gift", ["Give a small gift", "Tặng một món quà nhỏ", "ちょっとした贈り物をする"], ["care_style", -1]],
    ],
  },
  {
    id: "ax.care_actions", category: "relationships", format: "scale",
    prompt: ["\"I'd rather show my feelings through actions than words.\"", "\"Tôi thích thể hiện tình cảm bằng hành động hơn là lời nói.\"", "「気持ちは言葉より行動で示したい」"],
    agree: ["care_style", -1],
  },
  {
    id: "ax.care_comfort", category: "relationships", format: "single",
    prompt: ["Comforting someone who's having a hard time, you mostly…", "Khi an ủi một người đang gặp khó khăn, bạn chủ yếu…", "つらそうな人を励ますとき、あなたは主に…"],
    options: [
      ["talk", ["Listen and talk it through", "Lắng nghe và trò chuyện", "話を聞いて言葉をかける"], ["care_style", 1]],
      ["help", ["Help in practical ways", "Giúp bằng những việc cụ thể", "具体的に手を貸す"], ["care_style", -1]],
    ],
  },
  {
    id: "ax.care_partner", category: "relationships", sensitivity: "medium", format: "single",
    prompt: ["With someone you love, you more often…", "Với người bạn thương, bạn thường…", "大切な人に対して、より多いのは…"],
    options: [
      ["say", ["Tell them how you feel", "Nói cho họ biết bạn cảm thấy thế nào", "気持ちを言葉にする"], ["care_style", 1]],
      ["show", ["Take care of things for them", "Lo liệu mọi việc cho họ", "その人のために動く"], ["care_style", -1]],
    ],
  },
  // ── people: giving ─────────────────────────────────────────────────────
  {
    id: "ax.give_day_off", category: "relationships", format: "single",
    prompt: ["A friend asks a favour on your only day off this week. You…", "Một người bạn nhờ việc đúng ngày nghỉ duy nhất trong tuần của bạn. Bạn…", "今週唯一の休みに、友だちから頼みごとをされた。あなたは…"],
    options: [
      ["yes", ["Say yes", "Đồng ý", "引き受ける"], ["giving", 1]],
      ["other_time", ["Offer another day", "Hẹn ngày khác", "別の日を提案する"]],
      ["no", ["Kindly say no this time", "Nhẹ nhàng từ chối lần này", "今回はやんわり断る"], ["giving", -1]],
    ],
  },
  {
    id: "ax.give_first", category: "relationships", format: "scale",
    prompt: ["\"I tend to put the people around me before myself.\"", "\"Tôi hay đặt những người xung quanh lên trước bản thân.\"", "「自分のことより、周りの人を優先してしまう」"],
    agree: ["giving", 1],
  },
  {
    id: "ax.give_last_piece", category: "food", format: "single",
    prompt: ["One piece of cake is left. You…", "Còn đúng một miếng bánh. Bạn…", "ケーキが最後のひと切れ。あなたは…"],
    options: [
      ["offer", ["Offer it to someone else", "Nhường cho người khác", "人にすすめる"], ["giving", 1]],
      ["split", ["Suggest sharing it", "Rủ chia đôi", "半分こを提案する"]],
      ["take", ["Take it, happily", "Vui vẻ lấy luôn", "うれしくいただく"], ["giving", -1]],
    ],
  },
  {
    id: "ax.give_no", category: "personality", format: "single",
    prompt: ["Saying no to people is…", "Từ chối người khác đối với bạn là…", "人に「ノー」と言うのは…"],
    options: [
      ["hard", ["Hard for me", "Khó với tôi", "苦手"], ["giving", 1]],
      ["fine", ["Fine when I need to", "Bình thường khi cần", "必要なら平気"], ["giving", -1]],
    ],
  },
  {
    id: "ax.give_tired", category: "personality", format: "scale",
    prompt: ["\"Even when I'm tired, I find it hard to turn down a request.\"", "\"Dù mệt, tôi vẫn khó từ chối khi được nhờ.\"", "「疲れていても、頼まれると断れない」"],
    agree: ["giving", 1],
  },
  // ── life: saving ───────────────────────────────────────────────────────
  {
    id: "ax.sav_sale", category: "money_work", format: "single",
    prompt: ["A big sale on something you hadn't planned to buy:", "Đang giảm giá mạnh một món bạn không định mua:", "買う予定のなかったものが大幅セール。あなたは…"],
    options: [
      ["skip", ["Skip it — not planned", "Bỏ qua — không có trong kế hoạch", "予定外なので買わない"], ["saving", 1]],
      ["buy", ["Buy it if it's a good deal", "Hời thì mua", "お得なら買う"], ["saving", -1]],
    ],
  },
  {
    id: "ax.sav_wait", category: "money_work", format: "scale",
    prompt: ["\"I can give up a treat now to have more later.\"", "\"Tôi có thể nhịn một thú vui bây giờ để sau này có nhiều hơn.\"", "「将来のために、いまの楽しみを我慢できる」"],
    agree: ["saving", 1],
  },
  {
    id: "ax.sav_track", category: "money_work", format: "single",
    prompt: ["Do you know roughly how much you spent last month?", "Bạn có biết đại khái tháng trước mình đã tiêu bao nhiêu không?", "先月いくら使ったか、だいたい分かる？"],
    options: [
      ["exact", ["Yes, quite exactly", "Có, khá chính xác", "かなり正確に分かる"], ["saving", 1]],
      ["roughly", ["Roughly", "Đại khái", "だいたい分かる"]],
      ["no_idea", ["No idea", "Không biết", "まったく分からない"], ["saving", -1]],
    ],
  },
  // ── life: ambition ─────────────────────────────────────────────────────
  {
    id: "ax.amb_promotion", category: "money_work", format: "single",
    prompt: ["A promotion: more responsibility and more pay, but longer hours. You…", "Một lời đề bạt: nhiều trách nhiệm và thu nhập hơn, nhưng làm việc lâu hơn. Bạn…", "責任も収入も増えるが、働く時間も長くなる昇進の話。あなたは…"],
    options: [
      ["take", ["Take it", "Nhận", "受ける"], ["ambition", 1]],
      ["depends", ["Depends on the timing", "Tùy thời điểm", "時期による"]],
      ["decline", ["Decline — my time matters more", "Từ chối — thời gian của tôi quan trọng hơn", "断る。自分の時間のほうが大事"], ["ambition", -1]],
    ],
  },
  {
    id: "ax.amb_restless", category: "values", format: "scale",
    prompt: ["\"If I'm not aiming higher, I feel restless.\"", "\"Nếu không hướng lên cao hơn, tôi thấy bứt rứt.\"", "「いまより上を目指していないと、落ち着かない」"],
    agree: ["ambition", 1],
  },
  {
    id: "ax.amb_sunday", category: "hobbies", format: "single",
    prompt: ["A perfect Sunday mostly involves…", "Một ngày Chủ nhật hoàn hảo chủ yếu là…", "理想の日曜日の中心にあるのは…"],
    options: [
      ["learn", ["Learning or working on something", "Học hoặc làm một việc gì đó", "何かを学んだり進めたりすること"], ["ambition", 1]],
      ["rest", ["Doing nothing in particular", "Chẳng làm gì đặc biệt", "特に何もしないこと"], ["ambition", -1]],
      ["people", ["Seeing people I like", "Gặp những người mình quý", "好きな人に会うこと"]],
    ],
  },
  {
    id: "ax.amb_goal", category: "values", format: "single",
    prompt: ["Right now, do you have a goal you're working toward?", "Hiện tại bạn có mục tiêu nào đang theo đuổi không?", "いま、目指している目標はある？"],
    options: [
      ["clear", ["Yes, a clear one", "Có, rất rõ ràng", "はっきりある"], ["ambition", 1]],
      ["loose", ["A loose one", "Có, nhưng chưa rõ", "なんとなくある"]],
      ["present", ["I'm enjoying the present", "Tôi đang tận hưởng hiện tại", "いまを楽しんでいる"], ["ambition", -1]],
    ],
  },
  {
    id: "ax.amb_enough", category: "values", format: "scale",
    prompt: ["\"I feel I already have enough.\"", "\"Tôi cảm thấy mình đã có đủ rồi.\"", "「いまの自分は、もう十分満たされていると感じる」"],
    agree: ["ambition", -1],
  },
  // ── life: tradition ────────────────────────────────────────────────────
  {
    id: "ax.tra_rule", category: "values", format: "single",
    prompt: ["A rule seems pointless to you. You…", "Một quy định có vẻ vô lý với bạn. Bạn…", "意味がないように思える決まりがある。あなたは…"],
    options: [
      ["follow", ["Follow it — there may be a reason", "Vẫn tuân theo — có thể có lý do", "何か理由があるのだろうと従う"], ["tradition", 1]],
      ["question", ["Ask why, or look for a better way", "Hỏi tại sao, hoặc tìm cách tốt hơn", "理由を聞くか、別のやり方を探す"], ["tradition", -1]],
    ],
  },
  {
    id: "ax.tra_holidays", category: "values", format: "single",
    prompt: ["Family traditions and holiday customs are…", "Truyền thống gia đình và phong tục ngày lễ đối với bạn là…", "家族の習わしや年中行事は…"],
    options: [
      ["keep", ["Important to keep", "Quan trọng, cần gìn giữ", "守っていきたい大切なもの"], ["tradition", 1]],
      ["flexible", ["Nice, but flexible", "Hay, nhưng linh hoạt", "いいものだけど、柔軟でいい"]],
      ["not_me", ["Not really for me", "Không hợp với tôi lắm", "あまり自分には合わない"], ["tradition", -1]],
    ],
  },
  {
    id: "ax.tra_reason", category: "values", format: "scale",
    prompt: ["\"The old ways of doing things usually exist for a reason.\"", "\"Những cách làm từ xưa thường có lý do của nó.\"", "「昔からのやり方には、それなりの理由がある」"],
    agree: ["tradition", 1],
  },
  {
    id: "ax.tra_wedding", category: "values", format: "single",
    prompt: ["A wedding should be…", "Một đám cưới nên…", "結婚式は…"],
    options: [
      ["traditional", ["Done properly, with the traditional customs", "Làm đầy đủ theo phong tục truyền thống", "しきたりにのっとって"], ["tradition", 1]],
      ["own_way", ["Done the couple's own way", "Theo cách riêng của hai người", "二人らしい形で"], ["tradition", -1]],
      ["none", ["Not necessary", "Không cần thiết", "しなくてもいい"], ["tradition", -1]],
    ],
  },
  {
    id: "ax.tra_elders", category: "values", format: "single",
    prompt: ["Advice from older people is…", "Lời khuyên của người lớn tuổi đối với bạn là…", "年上の人からの助言は…"],
    options: [
      ["value", ["Something I take seriously", "Điều tôi rất coi trọng", "大事に受け止める"], ["tradition", 1]],
      ["consider", ["One view to weigh among others", "Một ý kiến để cân nhắc", "参考のひとつにする"], ["tradition", -1]],
    ],
  },
  // ── likes (no axis) ────────────────────────────────────────────────────
  {
    id: "l.season", category: "hobbies", format: "single",
    prompt: ["Your favourite season?", "Mùa bạn thích nhất?", "いちばん好きな季節は？"],
    options: [["spring", ["Spring", "Mùa xuân", "春"]], ["summer", ["Summer", "Mùa hè", "夏"]], ["autumn", ["Autumn", "Mùa thu", "秋"]], ["winter", ["Winter", "Mùa đông", "冬"]]],
  },
  {
    id: "l.films", category: "hobbies", format: "multi", maxChoices: 3,
    prompt: ["Which kinds of films or series do you enjoy? (up to 3)", "Bạn thích thể loại phim nào? (tối đa 3)", "好きな映画やドラマのジャンルは？（3つまで）"],
    options: [
      ["drama", ["Drama", "Tâm lý", "ドラマ"]], ["comedy", ["Comedy", "Hài", "コメディ"]], ["action", ["Action", "Hành động", "アクション"]],
      ["romance", ["Romance", "Tình cảm", "恋愛"]], ["animation", ["Animation", "Hoạt hình", "アニメ"]], ["documentary", ["Documentary", "Tài liệu", "ドキュメンタリー"]],
      ["horror", ["Horror", "Kinh dị", "ホラー"]], ["scifi", ["Sci-fi & fantasy", "Khoa học viễn tưởng & giả tưởng", "SF・ファンタジー"]],
    ],
  },
  {
    id: "l.reading", category: "hobbies", format: "single",
    prompt: ["How often do you read books?", "Bạn đọc sách thường xuyên không?", "本はどのくらい読む？"],
    options: [["often", ["Every week", "Mỗi tuần", "毎週読む"]], ["sometimes", ["Now and then", "Thỉnh thoảng", "ときどき"]], ["rarely", ["Rarely", "Hiếm khi", "ほとんど読まない"]]],
  },
  {
    id: "l.move", category: "hobbies", format: "multi", maxChoices: 3,
    prompt: ["How do you like to move your body? (up to 3)", "Bạn thích vận động theo cách nào? (tối đa 3)", "好きな体の動かし方は？（3つまで）"],
    options: [
      ["walk", ["Walking", "Đi bộ", "散歩"]], ["run", ["Running", "Chạy bộ", "ランニング"]], ["gym", ["Gym", "Tập gym", "ジム"]],
      ["yoga", ["Yoga or stretching", "Yoga hoặc giãn cơ", "ヨガ・ストレッチ"]], ["team", ["Team sports", "Thể thao đồng đội", "チームスポーツ"]],
      ["swim", ["Swimming", "Bơi", "水泳"]], ["dance", ["Dancing", "Nhảy", "ダンス"]], ["none", ["Not really my thing", "Không mặn mà lắm", "あまりしない"]],
    ],
  },
  {
    id: "l.place_relax", category: "travel", format: "single",
    prompt: ["Where do you relax best?", "Bạn thư giãn tốt nhất ở đâu?", "いちばんくつろげる場所は？"],
    options: [
      ["sea", ["By the sea", "Bên biển", "海"]], ["mountains", ["In the mountains", "Trên núi", "山"]], ["cafe", ["In a café", "Trong quán cà phê", "カフェ"]],
      ["home", ["At home", "Ở nhà", "家"]], ["city", ["Out in the city", "Dạo phố", "街なか"]],
    ],
  },
  {
    id: "l.meals", category: "food", format: "single",
    prompt: ["On a normal evening, dinner is usually…", "Bữa tối ngày thường của bạn thường là…", "ふだんの夕食は、たいてい…"],
    options: [["cook", ["Cooked at home", "Tự nấu ở nhà", "家で作る"]], ["out", ["Eaten out", "Ăn ngoài", "外で食べる"]], ["delivery", ["Delivered", "Đặt giao tận nơi", "デリバリー"]], ["varies", ["Different every day", "Mỗi ngày một kiểu", "日によってばらばら"]]],
  },
  {
    id: "l.gift_receive", category: "relationships", format: "single",
    prompt: ["The gift that would make you happiest:", "Món quà khiến bạn vui nhất:", "いちばんうれしい贈り物は？"],
    options: [
      ["experience", ["An experience together", "Một trải nghiệm cùng nhau", "一緒に過ごす体験"]], ["handmade", ["Something handmade", "Đồ tự tay làm", "手づくりのもの"]],
      ["practical", ["Something practical", "Đồ thiết thực", "実用的なもの"]], ["letter", ["A heartfelt letter", "Một lá thư chân thành", "心のこもった手紙"]],
    ],
  },
  {
    id: "l.weekend_morning", category: "hobbies", format: "single",
    prompt: ["Your favourite way to start a weekend morning?", "Cách bạn thích bắt đầu buổi sáng cuối tuần?", "週末の朝、いちばん好きな始め方は？"],
    options: [
      ["sleep", ["Sleeping in", "Ngủ nướng", "ゆっくり寝坊"]], ["coffee", ["A slow coffee", "Nhâm nhi cà phê", "ゆっくりコーヒー"]],
      ["exercise", ["Exercise", "Tập thể dục", "運動"]], ["out", ["Heading out early", "Ra ngoài từ sớm", "早めに出かける"]],
    ],
  },
  // ── story (no axis) ────────────────────────────────────────────────────
  {
    id: "s.child_dream", category: "past", format: "short",
    prompt: ["What did you want to be when you were a child?", "Hồi nhỏ bạn muốn trở thành ai?", "子どものころ、何になりたかった？"],
  },
  {
    id: "s.proud_recent", category: "past", format: "short",
    prompt: ["Something from the past few years you're proud of?", "Một điều trong vài năm qua khiến bạn tự hào?", "ここ数年で誇らしく思うことは？"],
  },
  {
    id: "s.hard_time", category: "past", sensitivity: "medium", format: "free",
    prompt: ["A hard time you got through — what helped you?", "Một giai đoạn khó khăn bạn đã vượt qua — điều gì đã giúp bạn?", "乗り越えたつらい時期。何が支えになった？"],
  },
  {
    id: "s.shaped_by", category: "past", format: "short",
    prompt: ["Someone who shaped who you are?", "Một người đã góp phần tạo nên con người bạn?", "今の自分をつくってくれた人は？"],
  },
  {
    id: "s.ten_years", category: "future", format: "single",
    prompt: ["Ten years from now, what do you most want to have?", "Mười năm nữa, điều bạn muốn có nhất là gì?", "10年後、いちばん手にしていたいものは？"],
    options: [
      ["family", ["A warm family life", "Một gia đình ấm áp", "温かい家庭"]], ["career", ["A career I'm proud of", "Một sự nghiệp đáng tự hào", "誇れる仕事"]],
      ["health", ["Good health", "Sức khỏe tốt", "健康"]], ["freedom", ["Freedom with my time", "Tự do về thời gian", "時間の自由"]],
      ["contribution", ["Making a difference for others", "Tạo ra điều tốt cho người khác", "誰かの役に立つこと"]],
    ],
  },
  {
    id: "s.bucket", category: "future", format: "short",
    prompt: ["One thing on your bucket list?", "Một điều trong danh sách những việc muốn làm trong đời?", "人生でいつかやりたいことをひとつ"],
  },
  {
    id: "s.changed_year", category: "change", format: "short",
    prompt: ["How have you changed in the past year?", "Một năm qua bạn đã thay đổi thế nào?", "この1年で、自分はどう変わった？"],
  },
];

const built = build(SPECS);
export const AXIS_QUESTIONS = built.defs;
export const AXIS_QUESTIONS_JA = built.ja;
