/**
 * The privacy policy, in each language. It describes what MOSAIC actually does: keep these in step
 * with the code (what is stored, what leaves for which provider, and when). The contact address
 * comes from CONTACT_EMAIL at render time.
 */
import type { Locale } from "@/lib/i18n/locales";

export interface PolicySection {
  h: string;
  p?: string[];
  list?: string[];
}

export interface Policy {
  title: string;
  updated: string;
  intro: string;
  sections: PolicySection[];
  contact: (email: string | null) => string;
}

export const PRIVACY_UPDATED = "2026-10-27";

export const PRIVACY: Record<Locale, Policy> = {
  ja: {
    title: "プライバシーポリシー",
    updated: `最終更新日：${PRIVACY_UPDATED}`,
    intro:
      "MOSAIC（以下「本サービス」）は、あなたが残すことばや記録を、あなた自身のものとして大切に扱います。このページでは、本サービスが集める情報、その使いみち、外部に送る場面、あなたができることを説明します。本サービスは現在、限られた方に試していただいている段階です。",
    sections: [
      {
        h: "1. 集める情報",
        list: [
          "アカウントの情報：表示名、メールアドレス、パスワード（元に戻せない形に変換して保存し、そのままでは保存しません）、言語、タイムゾーン。",
          "Googleでログインした場合：Googleから受け取るのは、名前、メールアドレス、Googleのアカウント識別番号だけです。",
          "あなたが入力したもの：記録（文章・写真・動画・気分・タグなど）、質問への答え、好きなもの、生年月日と出生時刻（Tử Viの命盤のため）、自己紹介、プロフィール写真、大切な人の情報、物語や作品、未来への手紙。",
          "つながりとやりとり：つながった相手、メッセージ（文章・写真・リアクション）、記録への返信、物語を渡したリンク。",
          "自動で記録されるもの：ログイン状態、安全のための主な操作の記録（ログイン、設定の変更など）、不正防止のための回数の記録（IPアドレスは元に戻せない形に変換して使います）、サイトを配信する事業者のアクセスログ（IPアドレスやブラウザの種類を含みます）。",
          "通知をオンにした場合：通知を届けるために、お使いのブラウザが発行する宛先の情報。",
        ],
      },
      {
        h: "2. 使いみち",
        list: [
          "本サービスを提供するため（保存・表示・あなたが選んだ相手への共有、通知など）。",
          "安全のため（不正なログインや乱用を防ぐため）。",
          "改善のため：運営者が見るのは、登録数や利用回数などの集計した数字だけです。あなたの記録や回答の中身は見ません。",
          "広告には使いません。あなたの情報を売ることもありません。",
        ],
      },
      {
        h: "3. 誰に見えるか",
        list: [
          "記録は、最初はあなただけが見られます。公開範囲を選んだ記録だけが、選んだ相手に見えます。",
          "つながった相手には、あなたの名前と写真、「つながっている全員」に公開した記録が見えます。",
          "Tử Viや好みなどの分野は、つながりごとに、お二人とも「見せる」と選んだものだけが見えます。",
          "物語を渡すリンクを受け取った人は、そのリンクの有効期限まで、その作品を読めます。",
          "見える範囲は、いつでも変えられます。",
        ],
      },
      {
        h: "4. 外部のサービス",
        p: ["本サービスは、次の事業者のサービスを使っています。これらの事業者のサーバーは、日本以外（主にアメリカ）にある場合があります。"],
        list: [
          "Netlify：本サービスの配信と実行。",
          "Neon：データベース。あなたのデータはここに保存されます。",
          "Anthropic（AI）：次の場面でだけ、必要な文章を送ります。①あなたがAIを使う設定をオンにして、AIのボタンを押したとき（振り返り・紹介文・取扱説明書の書き直し・1年の物語など）。②あなたがメッセージの「翻訳」を押したとき（そのメッセージの文章）。③渡された物語を読む人が翻訳を求めたとき（その作品の文章。翻訳結果は保存されます）。Anthropicの規約では、APIで送られたデータはAIの学習に使われないとされています（本ページ作成時点）。",
          "Google：Googleでログインを選んだ場合のみ。",
          "通知の配信サービス（お使いのブラウザにより、Google・Apple・Mozillaなど）：通知の中身は暗号化して送り、配信サービスには読めない形で届きます。通知に表示されるのは、最初は送り主の名前だけです（文面を表示するかは設定で選べます）。",
          "リンクのプレビュー：メッセージにWebページのURLを書くと、本サービスのサーバーがそのページを読みに行き、タイトルや画像を表示します。そのサイトに伝わるのは本サービスのサーバーからのアクセスで、あなたの情報は伝わりません。",
        ],
      },
      {
        h: "5. クッキー",
        p: [
          "ログイン状態の維持、言語の設定、ログイン手続きの安全確認、登録前に試したタイプ（生年月日）を登録画面に引き継ぐために、クッキーを使います。広告や追跡のためのクッキーは使いません。",
        ],
      },
      {
        h: "6. 保存期間と、あなたができること",
        list: [
          "データは、アカウントがある間保存します。",
          "設定から、あなたのデータをまとめて書き出せます（JSON形式）。",
          "設定から、アカウントを削除できます。削除すると、記録・回答・写真・あなたが送ったメッセージなど、あなたのデータは削除されます。システムのバックアップには、一定期間残る場合があります。",
          "公開範囲、AIの利用、通知は、いつでも設定で変えられます。",
        ],
      },
      {
        h: "7. 安全のために",
        p: [
          "通信は暗号化（HTTPS）しています。パスワードは元に戻せない形で保存します。データベースでは、本人と、本人が見せると選んだ相手以外は読めない仕組み（行ごとのアクセス制御）を使っています。",
        ],
      },
      {
        h: "8. 年齢",
        p: ["13歳未満の方は、本サービスを利用できません。"],
      },
      {
        h: "9. このポリシーの変更",
        p: ["内容を変えるときは、このページでお知らせします。大事な変更は、アプリの中でもお知らせします。"],
      },
    ],
    contact: (email) => (email ? `お問い合わせ：${email}` : "お問い合わせ先は準備中です。"),
  },
  en: {
    title: "Privacy Policy",
    updated: `Last updated: ${PRIVACY_UPDATED}`,
    intro:
      "MOSAIC (“the service”) treats the words and records you leave as yours. This page explains what the service collects, what it is used for, when anything leaves for another company, and what you can do. The service is currently being tried by a limited group of people.",
    sections: [
      {
        h: "1. What we collect",
        list: [
          "Account details: display name, email address, password (stored only in a form that can't be turned back into it), language and time zone.",
          "If you sign in with Google: from Google we receive only your name, email address and Google account ID.",
          "What you enter: records (text, photos, videos, moods, tags and so on), answers to questions, likes, birth date and time (for your Tử Vi chart), your introduction, profile photo, people you add, stories and works, letters to your future self.",
          "Connections and conversations: who you're connected with, messages (text, photos, reactions), replies to records, links you've made to hand over your story.",
          "Recorded automatically: whether you're signed in, a log of key actions for safety (sign-in, settings changes and the like), counts to prevent abuse (IP addresses are used only in a form that can't be turned back), and the hosting provider's access logs (which include IP addresses and browser type).",
          "If you turn on notifications: the delivery address your browser issues for them.",
        ],
      },
      {
        h: "2. What it's used for",
        list: [
          "To provide the service (saving, showing, sharing with the people you choose, notifications).",
          "To keep it safe (preventing unauthorised sign-ins and abuse).",
          "To improve it: the people running MOSAIC see only totals such as sign-ups and usage counts, never what you wrote or answered.",
          "Not for advertising. We never sell your information.",
        ],
      },
      {
        h: "3. Who can see what",
        list: [
          "Records are visible only to you at first. Only records you choose to share are shown, to the people you choose.",
          "People you're connected with see your name and photo, and records you shared with everyone you're connected with.",
          "Areas like Tử Vi or likes are visible, per connection, only when you both choose to show them.",
          "Someone given a link to your story can read that work until the link expires.",
          "You can change any of this at any time.",
        ],
      },
      {
        h: "4. Other companies we use",
        p: ["The service uses the following providers. Their servers may be outside your country (mainly in the United States)."],
        list: [
          "Netlify: serving and running the service.",
          "Neon: the database, where your data is stored.",
          "Anthropic (AI): only the text needed, only when ① you have turned AI on and press an AI button (reflections, introductions, rewriting your manual, the story of your year, and so on); ② you tap “translate” on a message (that message's text); ③ someone reading a story handed to them asks for a translation (the text of that work; the translation is kept). Under Anthropic's terms, data sent through its API is not used to train its models (as of this writing).",
          "Google: only if you choose to sign in with Google.",
          "Push services (Google, Apple, Mozilla and others, depending on your browser): notifications are encrypted so the push service can't read them. By default a notification shows only who wrote (you can choose to show the text).",
          "Link previews: when a message contains a web address, the service's server fetches that page to show its title and image. The site sees a visit from the service's server, not from you.",
        ],
      },
      {
        h: "5. Cookies",
        p: [
          "We use cookies to keep you signed in, remember your language, check sign-in requests are genuine, and carry the type you tried before signing up (your birth date) into the sign-up form. We use no advertising or tracking cookies.",
        ],
      },
      {
        h: "6. How long we keep it, and what you can do",
        list: [
          "Your data is kept while you have an account.",
          "In Settings you can download all your data (JSON).",
          "In Settings you can delete your account. Your data, including records, answers, photos and messages you sent, is then deleted. It may remain in system backups for a limited time.",
          "Sharing, AI and notifications can be changed in Settings at any time.",
        ],
      },
      {
        h: "7. Keeping it safe",
        p: [
          "Connections are encrypted (HTTPS). Passwords are stored only in a form that can't be turned back. The database lets no one read your rows except you and the people you chose to show them to (row-level access control).",
        ],
      },
      {
        h: "8. Age",
        p: ["The service is not for people under 13."],
      },
      {
        h: "9. Changes to this policy",
        p: ["When this policy changes, we'll say so on this page, and in the app for important changes."],
      },
    ],
    contact: (email) => (email ? `Contact: ${email}` : "Contact details are coming soon."),
  },
  vi: {
    title: "Chính sách quyền riêng tư",
    updated: `Cập nhật lần cuối: ${PRIVACY_UPDATED}`,
    intro:
      "MOSAIC (“dịch vụ”) coi những lời và ghi chép bạn để lại là của riêng bạn. Trang này giải thích dịch vụ thu thập gì, dùng để làm gì, khi nào gửi ra bên ngoài và bạn có thể làm gì. Hiện dịch vụ đang được một nhóm nhỏ người dùng thử.",
    sections: [
      {
        h: "1. Thông tin chúng tôi thu thập",
        list: [
          "Thông tin tài khoản: tên hiển thị, email, mật khẩu (chỉ lưu ở dạng không thể khôi phục lại), ngôn ngữ và múi giờ.",
          "Nếu bạn đăng nhập bằng Google: chúng tôi chỉ nhận tên, email và mã tài khoản Google của bạn.",
          "Những gì bạn nhập: ghi chép (văn bản, ảnh, video, tâm trạng, thẻ…), câu trả lời, sở thích, ngày và giờ sinh (để lập lá số Tử Vi), lời giới thiệu, ảnh hồ sơ, thông tin người thân, câu chuyện và tác phẩm, thư gửi tương lai.",
          "Kết nối và trò chuyện: những người bạn kết nối, tin nhắn (văn bản, ảnh, cảm xúc), phản hồi dưới ghi chép, đường dẫn bạn tạo để trao câu chuyện.",
          "Tự động ghi nhận: trạng thái đăng nhập, nhật ký các thao tác chính để bảo đảm an toàn (đăng nhập, thay đổi cài đặt…), số lần truy cập để chống lạm dụng (địa chỉ IP chỉ được dùng ở dạng không thể khôi phục), và nhật ký truy cập của nhà cung cấp máy chủ (gồm địa chỉ IP và loại trình duyệt).",
          "Nếu bạn bật thông báo: địa chỉ nhận thông báo do trình duyệt của bạn cấp.",
        ],
      },
      {
        h: "2. Mục đích sử dụng",
        list: [
          "Để cung cấp dịch vụ (lưu, hiển thị, chia sẻ với người bạn chọn, gửi thông báo).",
          "Để bảo đảm an toàn (ngăn đăng nhập trái phép và lạm dụng).",
          "Để cải thiện dịch vụ: người vận hành chỉ xem các con số tổng hợp như số người đăng ký và số lượt dùng, không bao giờ xem nội dung bạn viết hay trả lời.",
          "Không dùng cho quảng cáo. Chúng tôi không bao giờ bán thông tin của bạn.",
        ],
      },
      {
        h: "3. Ai thấy được gì",
        list: [
          "Ban đầu, ghi chép chỉ mình bạn thấy. Chỉ những ghi chép bạn chọn chia sẻ mới hiện cho người bạn chọn.",
          "Người đã kết nối thấy tên, ảnh của bạn và các ghi chép bạn chia sẻ với mọi người đã kết nối.",
          "Các mục như Tử Vi hay sở thích chỉ hiện, theo từng kết nối, khi cả hai cùng chọn cho xem.",
          "Người nhận đường dẫn câu chuyện của bạn có thể đọc tác phẩm đó cho đến khi đường dẫn hết hạn.",
          "Bạn có thể thay đổi những điều này bất cứ lúc nào.",
        ],
      },
      {
        h: "4. Các dịch vụ bên ngoài",
        p: ["Dịch vụ sử dụng các nhà cung cấp sau. Máy chủ của họ có thể nằm ngoài quốc gia của bạn (chủ yếu ở Hoa Kỳ)."],
        list: [
          "Netlify: phân phối và vận hành dịch vụ.",
          "Neon: cơ sở dữ liệu, nơi lưu dữ liệu của bạn.",
          "Anthropic (AI): chỉ gửi đoạn văn bản cần thiết, chỉ khi ① bạn đã bật AI và nhấn nút AI (suy ngẫm, lời giới thiệu, viết lại cẩm nang, câu chuyện một năm…); ② bạn nhấn “dịch” ở một tin nhắn (văn bản của tin nhắn đó); ③ người đọc câu chuyện được trao yêu cầu bản dịch (văn bản của tác phẩm đó; bản dịch được lưu lại). Theo điều khoản của Anthropic, dữ liệu gửi qua API không được dùng để huấn luyện mô hình (tại thời điểm viết).",
          "Google: chỉ khi bạn chọn đăng nhập bằng Google.",
          "Dịch vụ gửi thông báo (Google, Apple, Mozilla… tùy trình duyệt): thông báo được mã hóa nên dịch vụ gửi không đọc được. Mặc định, thông báo chỉ cho biết ai đã nhắn (bạn có thể chọn hiện nội dung).",
          "Xem trước đường dẫn: khi tin nhắn có địa chỉ trang web, máy chủ của dịch vụ sẽ tải trang đó để hiện tiêu đề và hình ảnh. Trang web đó chỉ thấy truy cập từ máy chủ của dịch vụ, không phải từ bạn.",
        ],
      },
      {
        h: "5. Cookie",
        p: [
          "Chúng tôi dùng cookie để giữ trạng thái đăng nhập, ghi nhớ ngôn ngữ, kiểm tra yêu cầu đăng nhập hợp lệ, và chuyển kiểu người bạn đã thử trước khi đăng ký (ngày sinh) vào trang đăng ký. Chúng tôi không dùng cookie quảng cáo hay theo dõi.",
        ],
      },
      {
        h: "6. Thời gian lưu giữ và quyền của bạn",
        list: [
          "Dữ liệu được lưu khi bạn còn tài khoản.",
          "Trong Cài đặt, bạn có thể tải xuống toàn bộ dữ liệu (JSON).",
          "Trong Cài đặt, bạn có thể xóa tài khoản. Khi đó, dữ liệu của bạn, gồm ghi chép, câu trả lời, ảnh và tin nhắn bạn đã gửi, sẽ bị xóa. Dữ liệu có thể còn trong bản sao lưu hệ thống trong một thời gian nhất định.",
          "Bạn có thể thay đổi việc chia sẻ, AI và thông báo trong Cài đặt bất cứ lúc nào.",
        ],
      },
      {
        h: "7. Bảo đảm an toàn",
        p: [
          "Kết nối được mã hóa (HTTPS). Mật khẩu chỉ được lưu ở dạng không thể khôi phục. Cơ sở dữ liệu không cho ai đọc dữ liệu của bạn ngoài bạn và những người bạn chọn cho xem (kiểm soát truy cập theo từng dòng).",
        ],
      },
      {
        h: "8. Độ tuổi",
        p: ["Dịch vụ không dành cho người dưới 13 tuổi."],
      },
      {
        h: "9. Thay đổi chính sách",
        p: ["Khi chính sách thay đổi, chúng tôi sẽ thông báo trên trang này, và trong ứng dụng đối với những thay đổi quan trọng."],
      },
    ],
    contact: (email) => (email ? `Liên hệ: ${email}` : "Thông tin liên hệ sẽ sớm được cập nhật."),
  },
};
