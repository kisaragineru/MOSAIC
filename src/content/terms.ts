/**
 * The terms of use, in each language: plain words, in step with what MOSAIC is and does. The
 * contact line comes from CONTACT_EMAIL at render time.
 */
import type { Locale } from "@/lib/i18n/locales";
import type { Policy } from "./privacy";

export const TERMS_UPDATED = "2026-10-27";

export const TERMS: Record<Locale, Policy> = {
  ja: {
    title: "利用規約",
    updated: `最終更新日：${TERMS_UPDATED}`,
    intro: "MOSAIC（以下「本サービス」）を使う前に、お読みください。登録した時点で、この規約とプライバシーポリシーに同意したものとします。",
    sections: [
      {
        h: "1. 本サービスについて",
        p: ["本サービスは、ことばや記録を残して自分を知り、大切な人とつながるためのサービスです。現在は試用の段階で、内容は予告なく変わることがあります。"],
      },
      {
        h: "2. アカウント",
        list: [
          "13歳以上の方が利用できます。",
          "登録する情報は、正しいものにしてください。",
          "パスワードは、ほかの人に教えないでください。アカウントで行われたことは、原則として本人が行ったものとします。",
        ],
      },
      {
        h: "3. あなたが残したもの",
        list: [
          "あなたが書いた記録・答え・写真などは、あなたのものです。",
          "本サービスは、それらを保存し、あなたが選んだ相手に表示するためにだけ使います。",
          "いつでも書き出したり、削除したりできます。",
        ],
      },
      {
        h: "4. してはいけないこと",
        list: [
          "法律に反すること、他人の権利（著作権・プライバシーなど）を傷つけること。",
          "ほかの人へのいやがらせ、なりすまし、だますこと。",
          "他人の情報を、本人の同意なく載せること。",
          "本サービスへの不正なアクセス、自動化された大量の登録や操作、仕組みを妨げること。",
        ],
      },
      {
        h: "5. Tử ViとAIについて",
        list: [
          "Tử Vi（紫微斗数）の読み解きは、自分をふり返るためのものです。医療・法律・お金などの専門的な判断の代わりにはなりません。",
          "AIが書いた文章は、まちがいを含むことがあります。大事なことは、ご自身で確かめてください。",
        ],
      },
      {
        h: "6. 利用の停止",
        p: ["この規約に反する使い方があった場合、運営者はそのアカウントの利用を止めたり、削除したりすることがあります。あなたも、いつでも設定からアカウントを削除できます。"],
      },
      {
        h: "7. 保証と責任",
        p: [
          "本サービスは、できるかぎり安全に、続けて使えるよう努めますが、止まったり、データが失われたりしないことまでは約束できません。大切な記録は、書き出しておくことをおすすめします。",
          "本サービスを使ったことで生じた損害について、運営者は、法律で認められる範囲で責任を負いません（運営者に故意または重大な過失がある場合を除きます）。",
        ],
      },
      {
        h: "8. この規約の変更",
        p: ["内容を変えるときは、このページでお知らせします。大事な変更は、アプリの中でもお知らせします。変更のあとも使い続けた場合は、変更に同意したものとします。"],
      },
    ],
    contact: (email) => (email ? `お問い合わせ：${email}` : "お問い合わせ先は準備中です。"),
  },
  en: {
    title: "Terms of Use",
    updated: `Last updated: ${TERMS_UPDATED}`,
    intro: "Please read these before using MOSAIC (“the service”). By signing up, you agree to these terms and to the Privacy Policy.",
    sections: [
      {
        h: "1. The service",
        p: ["MOSAIC is a place to leave words and records, get to know yourself, and connect with the people who matter to you. It is being tried out, and may change without notice."],
      },
      {
        h: "2. Your account",
        list: [
          "You must be 13 or older.",
          "Please give true information when you sign up.",
          "Keep your password to yourself. What is done with your account is taken as done by you.",
        ],
      },
      {
        h: "3. What you leave here",
        list: [
          "Your records, answers, photos and the like are yours.",
          "The service uses them only to keep them and to show them to the people you choose.",
          "You can download or delete them at any time.",
        ],
      },
      {
        h: "4. What not to do",
        list: [
          "Anything unlawful, or that harms other people's rights (copyright, privacy and so on).",
          "Harassing, impersonating or deceiving others.",
          "Posting other people's information without their consent.",
          "Breaking into the service, signing up or acting in bulk by automation, or getting in the way of how it works.",
        ],
      },
      {
        h: "5. Tử Vi and AI",
        list: [
          "Tử Vi readings are for reflecting on yourself. They are not a substitute for professional advice on health, law, money or anything else.",
          "Text written by AI can be wrong. Please check anything important for yourself.",
        ],
      },
      {
        h: "6. Suspension",
        p: ["If the service is used against these terms, the people running it may suspend or delete the account. You can delete your account in Settings at any time."],
      },
      {
        h: "7. Warranties and liability",
        p: [
          "We do our best to keep the service safe and running, but we can't promise it will never stop or lose data. We recommend downloading anything you treasure.",
          "To the extent the law allows, the people running MOSAIC are not liable for damage arising from its use, except in cases of intent or gross negligence on their part.",
        ],
      },
      {
        h: "8. Changes to these terms",
        p: ["When these terms change, we'll say so on this page, and in the app for important changes. Using the service after a change means you accept it."],
      },
    ],
    contact: (email) => (email ? `Contact: ${email}` : "Contact details are coming soon."),
  },
  vi: {
    title: "Điều khoản sử dụng",
    updated: `Cập nhật lần cuối: ${TERMS_UPDATED}`,
    intro: "Vui lòng đọc trước khi dùng MOSAIC (“dịch vụ”). Khi đăng ký, bạn đồng ý với các điều khoản này và với Chính sách quyền riêng tư.",
    sections: [
      {
        h: "1. Về dịch vụ",
        p: ["MOSAIC là nơi để lưu lại lời và ghi chép, hiểu bản thân hơn và kết nối với những người quan trọng với bạn. Dịch vụ đang trong giai đoạn dùng thử và có thể thay đổi mà không báo trước."],
      },
      {
        h: "2. Tài khoản",
        list: [
          "Bạn cần từ 13 tuổi trở lên.",
          "Vui lòng cung cấp thông tin đúng khi đăng ký.",
          "Đừng chia sẻ mật khẩu. Mọi việc làm bằng tài khoản của bạn được coi là do bạn làm.",
        ],
      },
      {
        h: "3. Những gì bạn để lại",
        list: [
          "Ghi chép, câu trả lời, ảnh… của bạn là của bạn.",
          "Dịch vụ chỉ dùng chúng để lưu giữ và hiển thị cho những người bạn chọn.",
          "Bạn có thể tải xuống hoặc xóa bất cứ lúc nào.",
        ],
      },
      {
        h: "4. Những điều không được làm",
        list: [
          "Vi phạm pháp luật, hoặc xâm phạm quyền của người khác (bản quyền, quyền riêng tư…).",
          "Quấy rối, mạo danh hoặc lừa dối người khác.",
          "Đăng thông tin của người khác khi chưa được họ đồng ý.",
          "Truy cập trái phép, đăng ký hay thao tác hàng loạt bằng công cụ tự động, hoặc cản trở hoạt động của dịch vụ.",
        ],
      },
      {
        h: "5. Về Tử Vi và AI",
        list: [
          "Luận giải Tử Vi là để suy ngẫm về bản thân, không thay thế lời khuyên chuyên môn về sức khỏe, pháp lý, tài chính hay bất cứ điều gì khác.",
          "Văn bản do AI viết có thể sai. Hãy tự kiểm tra những điều quan trọng.",
        ],
      },
      {
        h: "6. Tạm ngừng sử dụng",
        p: ["Nếu dịch vụ bị dùng trái với các điều khoản này, người vận hành có thể tạm ngừng hoặc xóa tài khoản đó. Bạn có thể xóa tài khoản trong Cài đặt bất cứ lúc nào."],
      },
      {
        h: "7. Bảo đảm và trách nhiệm",
        p: [
          "Chúng tôi cố gắng giữ dịch vụ an toàn và hoạt động liên tục, nhưng không thể cam kết dịch vụ sẽ không bao giờ ngừng hay mất dữ liệu. Hãy tải xuống những gì bạn trân trọng.",
          "Trong phạm vi pháp luật cho phép, người vận hành MOSAIC không chịu trách nhiệm về thiệt hại phát sinh từ việc sử dụng dịch vụ, trừ trường hợp cố ý hoặc sơ suất nghiêm trọng của họ.",
        ],
      },
      {
        h: "8. Thay đổi điều khoản",
        p: ["Khi điều khoản thay đổi, chúng tôi sẽ thông báo trên trang này, và trong ứng dụng đối với những thay đổi quan trọng. Tiếp tục sử dụng sau thay đổi nghĩa là bạn chấp nhận thay đổi đó."],
      },
    ],
    contact: (email) => (email ? `Liên hệ: ${email}` : "Thông tin liên hệ sẽ sớm được cập nhật."),
  },
};
