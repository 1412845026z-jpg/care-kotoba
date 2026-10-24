// I18N-001: support languages. Japanese is the learning language and the base of the interface; the learner may
// add a support language for short explanations and glosses. Nothing is translated at runtime.
//
// Rules (do not weaken):
// - Default is Japanese only (やさしい日本語). Chinese is one option among others, never assumed.
// - A missing translation in vi / my / id falls back to English, shown with lang="en". Text in one language is
//   never shown under another language's label.
// - en/zh entries come from the existing app texts. vi/id/my entries are editorial drafts written for this
//   prototype (not reviewed by native speakers); Burmese is given for short interface words only, longer
//   explanations fall back to English until reviewed.

export const LOCALES = ['ja', 'en', 'zh', 'vi', 'my', 'id'] as const;
export type Locale = typeof LOCALES[number];
export const isLocale = (v: unknown): v is Locale => typeof v === 'string' && (LOCALES as readonly string[]).includes(v);

/** Names shown in the language selector, each wholly in its own language (draft: the word for "draft" in that language). */
export const LOCALE_INFO: Record<Locale, { native: string; short: string; tag: string; draft: string | null }> = {
  ja: { native: '日本語だけ（やさしい日本語）', short: '日本語', tag: 'ja', draft: null },
  en: { native: 'English', short: 'English', tag: 'en', draft: null },
  zh: { native: '简体中文', short: '中文', tag: 'zh-Hans', draft: null },
  vi: { native: 'Tiếng Việt', short: 'Tiếng Việt', tag: 'vi', draft: 'bản nháp' },
  my: { native: 'မြန်မာ', short: 'မြန်မာ', tag: 'my', draft: 'မူကြမ်း' },
  id: { native: 'Bahasa Indonesia', short: 'Indonesia', tag: 'id', draft: 'draf' },
};
export const langTag = (l: string) => (isLocale(l) ? LOCALE_INFO[l].tag : 'ja');

export type Texts = { ja?: string; en?: string; zh?: string; vi?: string; my?: string; id?: string };

/** The support-language text to show, or null (Japanese only, or nothing available). */
export function pick(locale: string, t: Texts): { text: string; lang: string } | null {
  if (locale === 'ja') return t.ja ? { text: t.ja, lang: 'ja' } : null;
  const own = isLocale(locale) ? t[locale] : undefined;
  if (own) return { text: own, lang: langTag(locale) };
  if ((locale === 'vi' || locale === 'my' || locale === 'id') && t.en) return { text: t.en, lang: 'en' };
  return null;
}

/** Short glosses for key interface words (Japanese label stays visible; the gloss is added under it). */
export const UI = {
  'nav.home': { en: 'Home', zh: '首页', vi: 'Trang chủ', my: 'ပင်မ', id: 'Beranda' },
  'nav.basic': { en: 'Basics', zh: '基础', vi: 'Cơ bản', my: 'အခြေခံ', id: 'Dasar' },
  'nav.scenes': { en: 'Scenes', zh: '场景', vi: 'Tình huống', my: 'အခြေအနေ', id: 'Situasi' },
  'nav.notes': { en: 'Notes', zh: '笔记', vi: 'Ghi chú', my: 'မှတ်စု', id: 'Catatan' },
  'nav.progress': { en: 'Progress', zh: '学习记录', vi: 'Tiến độ', my: 'တိုးတက်မှု', id: 'Kemajuan' },
  'settings.language': { en: 'Support language', zh: '辅助语言', vi: 'Ngôn ngữ hỗ trợ', my: 'အကူဘာသာစကား', id: 'Bahasa bantuan' },
  'practice.yourTurn': { en: 'Your turn', zh: '轮到你了', vi: 'Đến lượt bạn', my: 'သင့်အလှည့်', id: 'Giliran Anda' },
  'practice.showAnswer': { en: 'Show the answer', zh: '看答案', vi: 'Xem đáp án', my: 'အဖြေကြည့်ရန်', id: 'Lihat jawaban' },
  'practice.voice': { en: 'Talk with the AI by voice', zh: '用语音和AI对话', vi: 'Nói với AI bằng giọng nói', my: 'AI နှင့် အသံဖြင့် ပြောရန်', id: 'Bicara dengan AI pakai suara' },
  'practice.text': { en: 'Practise by typing', zh: '用文字练习', vi: 'Luyện bằng cách gõ chữ', my: 'စာရိုက်၍ လေ့ကျင့်ရန်', id: 'Latihan dengan mengetik' },
  'practice.finish': { en: 'Finish and review', zh: '结束并回顾', vi: 'Kết thúc và xem lại', my: 'ပြီးပြီ၊ ပြန်ကြည့်ရန်', id: 'Selesai dan tinjau' },
  'notes.save': { en: 'Save to notes', zh: '保存到笔记', vi: 'Lưu vào ghi chú', my: 'မှတ်စုတွင် သိမ်းရန်', id: 'Simpan ke catatan' },
  'review.start': { en: 'Start review', zh: '开始复习', vi: 'Bắt đầu ôn tập', my: 'ပြန်လေ့ကျင့်ရန်', id: 'Mulai mengulang' },
  'data.delete': { en: 'Delete learning data on this device', zh: '删除这台设备上的学习数据', vi: 'Xóa dữ liệu học trên máy này', my: 'ဤဖုန်းရှိ လေ့လာမှုဒေတာ ဖျက်ရန်', id: 'Hapus data belajar di perangkat ini' },
  'data.confirm': { en: 'Delete', zh: '删除', vi: 'Xóa', my: 'ဖျက်ရန်', id: 'Hapus' },
  'data.cancel': { en: 'Cancel', zh: '取消', vi: 'Hủy', my: 'မဖျက်တော့ပါ', id: 'Batal' },
  'basic.done': { en: 'I said it — mark as practised', zh: '说出来了，标为已练习', vi: 'Đã nói được — đánh dấu đã luyện', my: 'ပြောနိုင်ပြီ', id: 'Sudah bisa — tandai sudah latihan' },
  'basic.next': { en: 'Next scene', zh: '下一个场景', vi: 'Tình huống tiếp theo', my: 'နောက်တစ်ခု', id: 'Situasi berikutnya' },
  'voice.noJapanese': { en: 'This device has no Japanese voice', zh: '这台设备没有日语语音', vi: 'Máy này không có giọng tiếng Nhật', my: 'ဤဖုန်းတွင် ဂျပန်အသံ မရှိပါ', id: 'Perangkat ini tidak punya suara bahasa Jepang' },
  'voice.cannotSpeak': { en: 'This device cannot read text aloud', zh: '这台设备无法朗读', vi: 'Máy này không đọc to được', my: 'ဤဖုန်းက အသံထွက်မဖတ်နိုင်ပါ', id: 'Perangkat ini tidak bisa membacakan teks' },
  'toast.saved': { en: 'Saved to notes', zh: '已保存到笔记', vi: 'Đã lưu vào ghi chú', my: 'မှတ်စုတွင် သိမ်းပြီးပါပြီ', id: 'Tersimpan di catatan' },
  'toast.deleted': { en: 'Learning data on this device was deleted', zh: '已删除这台设备上的学习数据', vi: 'Đã xóa dữ liệu học trên máy này', my: 'ဤဖုန်းရှိ လေ့လာမှုဒေတာကို ဖျက်ပြီးပါပြီ', id: 'Data belajar di perangkat ini sudah dihapus' },
  'toast.basicLoadFailed': { en: 'The basic course could not be loaded', zh: '无法加载基础课程', vi: 'Không tải được khóa cơ bản', id: 'Kursus dasar tidak dapat dimuat' },
  'toast.nothingHeard': { en: 'Nothing was heard. Type your answer, or try speaking again.', zh: '没有听到你说的话。可以打字，或者再说一次。', vi: 'Không nghe được gì. Hãy gõ chữ hoặc nói lại một lần nữa.', id: 'Tidak ada suara yang terdengar. Ketik jawaban Anda atau coba bicara lagi.' },
  'voice.deviceVoice': { en: 'Reading aloud with the device voice', zh: '正在用设备语音朗读', vi: 'Đang đọc bằng giọng của máy', my: 'ဖုန်းအသံဖြင့် ဖတ်နေသည်', id: 'Dibacakan dengan suara perangkat' },
} satisfies Record<string, Texts>;
export type UiKey = keyof typeof UI;

/** Short messages (toasts) that get a gloss: the Japanese message stays as it is, the gloss is added under it. */
export const TOAST_GLOSS: Record<string, UiKey> = {
  'この端末では読み上げができません': 'voice.cannotSpeak',
  'この端末には日本語の音声がありません': 'voice.noJapanese',
  '端末の音声で読み上げています': 'voice.deviceVoice',
  'ことばノートに保存しました': 'toast.saved',
  'この端末の学習データを削除しました': 'toast.deleted',
  '基礎コースを読み込めませんでした': 'toast.basicLoadFailed',
  '聞き取れた発話がありません。文字で入力するか、もう一度話してみましょう。': 'toast.nothingHeard',
};

/** Explanations (shown as a support line next to the Japanese). Burmese falls back to English for now. */
export const SAY = {
  coreDraft: { zh: '（草稿：尚未经介护经验者和日语教师审稿，均为虚构场景。对方会根据你的问法和回答改变回应。）', en: '(Draft: not yet reviewed by care professionals or Japanese teachers; fictional scenes. The partner reacts to how you ask and answer.)', vi: '(Bản nháp: chưa được người có kinh nghiệm chăm sóc hay giáo viên tiếng Nhật kiểm tra; tình huống hư cấu. Người đối diện sẽ phản ứng theo cách bạn hỏi và trả lời.)', id: '(Draf: belum diperiksa oleh tenaga perawat atau guru bahasa Jepang; situasi fiksi. Lawan bicara bereaksi sesuai cara Anda bertanya dan menjawab.)' },
  deleteWarning: { zh: '（将从这台设备删除笔记、练习记录、设置和访问码记录，无法恢复。笔记可以先在「ことばノート」里点「書き出す」保存。）', en: '(Notes, practice history, settings and the access code are removed from this device. This cannot be undone. You can save your notes first with 書き出す on the notes page.)', vi: '(Ghi chú, lịch sử luyện tập, cài đặt và mã truy cập sẽ bị xóa khỏi máy này và không thể khôi phục. Bạn có thể lưu ghi chú trước bằng nút 書き出す ở trang ghi chú.)', id: '(Catatan, riwayat latihan, pengaturan, dan kode akses akan dihapus dari perangkat ini dan tidak bisa dikembalikan. Simpan catatan dulu dengan tombol 書き出す di halaman catatan.)' },
  drillHelp: { ja: '相手のことばを見て、もう一度だけ答えてみましょう。', zh: '只重练这一句：看对方的话，再回答一次。', en: 'Replay just this moment: read the partner’s line and answer again.', vi: 'Chỉ luyện lại câu này: đọc lời người kia rồi trả lời lại một lần.', id: 'Ulangi bagian ini saja: baca ucapan lawan bicara, lalu jawab sekali lagi.' },
  drillNothing: { zh: '（这次没有需要修改的地方。）', en: '(Nothing to correct this time.)', vi: '(Lần này không có gì cần sửa.)', id: '(Kali ini tidak ada yang perlu diperbaiki.)' },
  asrUnsureCard: { zh: '（这句话的语音识别不太确定。如果和你说的不一样，可以忽略这张卡。）', en: '(The recogniser was unsure about this line. If it is not what you said, you can ignore this card.)', vi: '(Máy nhận dạng giọng nói không chắc về câu này. Nếu không đúng với điều bạn nói, bạn có thể bỏ qua thẻ này.)', id: '(Pengenal suara tidak yakin dengan kalimat ini. Jika bukan yang Anda ucapkan, abaikan kartu ini.)' },
  asrCard: { zh: '（这是自动语音识别的结果。如果和你实际说的不一样，可以忽略这张卡。）', en: '(This is the automatic transcript. If it is not what you said, you can ignore this card.)', vi: '(Đây là kết quả nhận dạng giọng nói tự động. Nếu không đúng với điều bạn nói, bạn có thể bỏ qua thẻ này.)', id: '(Ini hasil pengenalan suara otomatis. Jika bukan yang Anda ucapkan, abaikan kartu ini.)' },
  pronRemoved: { zh: '（反馈根据文字生成，无法判断发音，相关评价已删除。）', en: '(Feedback is made from text, so comments on pronunciation were removed.)', vi: '(Phản hồi được tạo từ chữ viết nên không đánh giá phát âm; các nhận xét về phát âm đã bị bỏ.)', id: '(Umpan balik dibuat dari teks, jadi komentar tentang pelafalan dihapus.)' },
  feedbackLead: { ja: 'あなたが言ったひとことから、もう一度ためしてみましょう。', zh: '先看你说过的一句话，再试一次更好的说法。', en: 'Start with one thing you said, then try a better way once more.', vi: 'Bắt đầu từ một câu bạn đã nói, rồi thử lại cách nói tốt hơn.', id: 'Mulai dari satu kalimat yang Anda ucapkan, lalu coba cara yang lebih baik.' },
  demoSummary: { ja: 'これは操作体験用の会話です。AI評価は行っていません。', zh: '这是用于体验操作流程的演示对话，没有进行真实 AI 评价。AI 模式会根据你实际说过的话生成反馈。', en: 'This was a scripted demo, without an AI evaluation. AI sessions offer feedback based on your actual words.', vi: 'Đây là hội thoại mẫu để thử thao tác, không có đánh giá bằng AI. Khi luyện với AI, phản hồi dựa trên chính lời bạn nói.', id: 'Ini percakapan contoh untuk mencoba cara pakai, tanpa penilaian AI. Saat latihan dengan AI, umpan balik dibuat dari ucapan Anda sendiri.' },
  demoExample: { ja: '実際のAI練習では、あなたの発言を引用し、伝わりにくい点と言い換えの理由を示します。これは表示例であり、今回の会話の評価ではありません。', zh: '正式 AI 反馈会引用你的原话，指出哪里不够清楚，解释改写的理由。这里展示的是反馈样式，没有对本次对话进行评价。', en: 'Real AI feedback quotes your words, explains what was unclear, and offers an alternative. This is a display example, not an evaluation of this session.', vi: 'Phản hồi AI thật sẽ trích lời bạn nói, chỉ ra chỗ chưa rõ và giải thích cách nói khác. Đây chỉ là ví dụ hiển thị, không phải đánh giá buổi này.', id: 'Umpan balik AI sungguhan mengutip ucapan Anda, menjelaskan bagian yang kurang jelas, dan memberi alternatif. Ini hanya contoh tampilan, bukan penilaian sesi ini.' },
  asrUnsureTurn: { zh: '（语音识别不太确定，如果和你说的不一样，请修改。）', en: '(The recogniser was unsure. If this is not what you said, please correct it.)', vi: '(Máy nhận dạng không chắc. Nếu không đúng điều bạn nói, hãy sửa lại.)', id: '(Pengenal suara tidak yakin. Jika bukan yang Anda ucapkan, silakan perbaiki.)' },
  dictationConsent: { zh: '（用手机浏览器自带的语音识别把你说的日语变成文字，不收费。声音可能由浏览器提供商（Google、Apple 等）的服务器处理。Care Kotoba 只收到文字，不保存声音。发送前可以检查和修改。）', en: '(Uses the browser’s own speech recognition to turn your Japanese into text, free of charge. The audio may be processed on the browser vendor’s servers (Google, Apple, …). Care Kotoba only receives the text and stores no audio. You can check and correct the text before sending.)', vi: '(Dùng chức năng nhận dạng giọng nói có sẵn của trình duyệt để chuyển tiếng Nhật bạn nói thành chữ, miễn phí. Âm thanh có thể được xử lý trên máy chủ của nhà cung cấp trình duyệt (Google, Apple…). Care Kotoba chỉ nhận chữ và không lưu âm thanh. Bạn có thể kiểm tra và sửa trước khi gửi.)', id: '(Memakai pengenal suara bawaan peramban untuk mengubah ucapan bahasa Jepang Anda menjadi teks, gratis. Suara mungkin diproses di server penyedia peramban (Google, Apple, dll.). Care Kotoba hanya menerima teks dan tidak menyimpan suara. Anda bisa memeriksa dan memperbaiki teks sebelum mengirim.)' },
  composerHint: { ja: '言い直しても、聞き返しても大丈夫。', zh: '不用担心说错，听不懂时也可以练习追问。', en: 'It’s okay to pause, ask again, or try different words.', vi: 'Nói sai cũng không sao, nghe không hiểu thì hỏi lại cũng được.', my: 'မှားလည်း ရပါတယ်။ နားမလည်ရင် ပြန်မေးလို့ ရပါတယ်။', id: 'Tidak apa-apa salah bicara; kalau tidak paham, boleh bertanya lagi.' },
  reviewNote: { zh: '（只记录在这台设备上，不打分。）', en: '(Kept on this device only. No scores.)', vi: '(Chỉ lưu trên máy này. Không chấm điểm.)', my: '(ဤဖုန်းတွင်သာ သိမ်းသည်။ အမှတ်မပေးပါ။)', id: '(Hanya disimpan di perangkat ini. Tanpa nilai.)' },
  basicIntro: { zh: '（每天工作中会用到的简短对话。先读对方的话，自己说出来，再看参考答案。）', en: '(Short everyday exchanges at work. Read the other person’s line, say yours, then check.)', vi: '(Những đoạn hội thoại ngắn dùng hằng ngày trong công việc. Đọc lời người kia, tự nói câu của mình, rồi xem đáp án tham khảo.)', id: '(Percakapan singkat yang dipakai setiap hari di tempat kerja. Baca ucapan lawan bicara, ucapkan bagian Anda, lalu lihat jawaban contoh.)' },
  basicDraft: { zh: '（虚构场景；尚未经介护经验者和日语教师审稿。）', en: '(Fictional scenes; drafts not yet reviewed by care professionals or Japanese teachers.)', vi: '(Tình huống hư cấu; bản nháp chưa được người có kinh nghiệm chăm sóc hay giáo viên tiếng Nhật kiểm tra.)', id: '(Situasi fiksi; draf belum diperiksa oleh tenaga perawat atau guru bahasa Jepang.)' },
  basicTrDraft: { zh: '（这些说明是编辑草稿，尚未审稿。）', en: '(These explanations are drafts and have not been reviewed yet.)', vi: '(Phần giải thích này là bản nháp, chưa được kiểm tra.)', id: '(Penjelasan ini masih draf dan belum diperiksa.)' },
  basicNoSupport: { en: '(Explanations for this course are not yet available in your language. For now they are in Japanese only.)', vi: '(Khóa học này chưa có phần giải thích bằng tiếng Việt. Hiện tại chỉ có tiếng Nhật.)', id: '(Penjelasan kursus ini belum tersedia dalam bahasa Indonesia. Untuk sementara hanya dalam bahasa Jepang.)' },
  uiDraft: { en: '(Interface words in this language are drafts, not yet checked by native speakers.)', vi: '(Phần chữ giao diện bằng tiếng Việt là bản nháp, chưa được người bản ngữ kiểm tra.)', id: '(Teks antarmuka dalam bahasa Indonesia masih draf dan belum diperiksa penutur asli.)' },
  basicTurn: { zh: '（你会怎么说？先说出来，再看答案。）', en: '(What would you say? Say it aloud, then check.)', vi: '(Bạn sẽ nói thế nào? Hãy nói thành tiếng rồi xem đáp án.)', my: '(ဘယ်လိုပြောမလဲ။ အသံထွက်ပြောပြီးမှ အဖြေကြည့်ပါ။)', id: '(Apa yang akan Anda katakan? Ucapkan dulu, lalu lihat jawabannya.)' },
  screenError: { zh: '这个画面出错了。笔记和学习记录都还在。', en: 'This screen could not be shown. Your notes and history are safe.', vi: 'Không hiển thị được màn hình này. Ghi chú và lịch sử học vẫn còn nguyên.', id: 'Layar ini tidak bisa ditampilkan. Catatan dan riwayat belajar Anda tetap aman.' },
  voiceCheckIntro: { zh: '在和 AI 对话前，检查麦克风、扬声器和网络。不连接 AI，不产生费用。', en: 'Checks your microphone, speaker and connection before talking to the AI. No AI is called, so it costs nothing.', vi: 'Kiểm tra micro, loa và kết nối mạng trước khi nói chuyện với AI. Không kết nối AI nên không mất phí.', id: 'Memeriksa mikrofon, speaker, dan koneksi sebelum bicara dengan AI. AI tidak dipanggil, jadi tidak ada biaya.' },
  aboutIntro: { zh: '（说明本试作版的数据去向和使用的开源软件。正式的用户条款和隐私政策会在公开前制定，并请专业人士确认。）', en: '(Where data goes in this prototype, and the open-source software it uses. Formal terms and a privacy policy will be written and professionally reviewed before release.)', vi: '(Giải thích dữ liệu được gửi đi đâu trong bản thử nghiệm này và phần mềm nguồn mở được dùng. Điều khoản và chính sách quyền riêng tư chính thức sẽ được soạn và nhờ chuyên gia kiểm tra trước khi phát hành.)', id: '(Penjelasan ke mana data dikirim dalam versi uji coba ini dan perangkat lunak sumber terbuka yang dipakai. Ketentuan dan kebijakan privasi resmi akan dibuat dan diperiksa ahli sebelum rilis.)' },
} satisfies Record<string, Texts>;
export type SayKey = keyof typeof SAY;

/** AI explanations and translations are written in this language (server side). */
export const languageName = (locale: string) => ({ zh: '简体中文', en: 'English', vi: 'Tiếng Việt', my: 'မြန်မာဘာသာ (Burmese)', id: 'Bahasa Indonesia' } as Record<string, string>)[locale] || 'やさしい日本語';

/** A content status counts as reviewed only when it says so plainly (draft_unreviewed, *_pending_* are not). */
export const isReviewed = (status: string | undefined) => !!status && /reviewed|approved/.test(status) && !/unreviewed|pending|draft|not_/.test(status);
