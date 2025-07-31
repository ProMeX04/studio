
import type { CardSet, QuizSet, TheorySet } from "@/ai/schemas";

export const MOCK_TOPIC = "Lịch sử La Mã Cổ đại";

export const MOCK_THEORY_SET: TheorySet = {
  id: "mock-theory-1",
  topic: MOCK_TOPIC,
  outline: [
    "Sự thành lập Cộng hòa La Mã",
    "Các cuộc chiến tranh Punic",
    "Julius Caesar và sự sụp đổ của Cộng hòa",
    "Augustus và sự khởi đầu của Đế chế",
  ],
  chapters: [
    {
      title: "Sự thành lập Cộng hòa La Mã",
      content: `
Cộng hòa La Mã là giai đoạn của nền văn minh La Mã cổ đại, được đặc trưng bởi hình thức chính phủ cộng hòa. Nó bắt đầu với việc lật đổ chế độ quân chủ La Mã, theo truyền thống được cho là vào năm 509 TCN, và kết thúc vào năm 27 TCN với việc thành lập Đế chế La Mã.

### Các đặc điểm chính:
- **Thượng viện (Senate):** Một hội đồng gồm các trưởng lão (patres) có quyền lực lớn, cố vấn cho các quan chức.
- **Các hội đồng (Assemblies):** Các công dân La Mã bỏ phiếu về luật pháp và bầu các quan chức.
- **Các quan tòa (Magistrates):** Các quan chức được bầu hàng năm như Chấp chính quan (Consul), Pháp quan (Praetor), và Quan coi quốc khố (Quaestor).

Giai đoạn đầu của Cộng hòa được đánh dấu bởi cuộc đấu tranh giữa hai tầng lớp xã hội: **patrician** (quý tộc) và **plebeian** (bình dân). Trải qua nhiều thế kỷ, người plebeian đã giành được các quyền chính trị bình đẳng, đỉnh cao là việc ban hành **Luật Mười hai Bảng**, bộ luật đầu tiên của La Mã.
`,
      podcastScript: null,
      audioDataUri: null,
    },
    {
      title: "Các cuộc chiến tranh Punic",
      content: `
Các cuộc chiến tranh Punic là một loạt ba cuộc chiến giữa La Mã và Carthage từ năm 264 đến 146 TCN. Đây là một trong những cuộc xung đột lớn nhất của thế giới cổ đại.

- **Chiến tranh Punic lần thứ nhất (264–241 TCN):** Chủ yếu là cuộc chiến hải quân để giành quyền kiểm soát Sicily. La Mã đã chiến thắng và giành được Sicily.
- **Chiến tranh Punic lần thứ hai (218–201 TCN):** Nổi tiếng với việc Hannibal vượt qua dãy Alps. Mặc dù Hannibal đã gây ra nhiều thất bại nặng nề cho La Mã, nhưng cuối cùng La Mã đã chiến thắng dưới sự lãnh đạo của Scipio Africanus trong trận Zama.
- **Chiến tranh Punic lần thứ ba (149–146 TCN):** Kết thúc với việc La Mã phá hủy hoàn toàn Carthage.

Sau các cuộc chiến này, La Mã trở thành cường quốc thống trị ở Địa Trung Hải.
`,
      podcastScript: null,
      audioDataUri: null,
    },
    {
      title: "Julius Caesar và sự sụp đổ của Cộng hòa",
      content: `
Julius Caesar (100–44 TCN) là một nhà chính trị và tướng lĩnh quân sự La Mã, người đóng vai trò quan trọng trong các sự kiện dẫn đến sự sụp đổ của Cộng hòa La Mã và sự trỗi dậy của Đế chế La Mã.

### Các sự kiện chính:
1.  **Chinh phục xứ Gaul (58–50 TCN):** Mang lại cho Caesar sự giàu có, lòng trung thành của quân đội và danh tiếng lớn.
2.  **Vượt qua sông Rubicon (49 TCN):** Hành động này đã bắt đầu cuộc nội chiến chống lại Thượng viện và đối thủ của ông, Pompey.
3.  **Trở thành Độc tài (Dictator):** Sau khi đánh bại Pompey, Caesar trở thành nhà lãnh đạo không thể tranh cãi của La Mã. Ông đã thực hiện nhiều cải cách xã hội và chính phủ.
4.  **Vụ ám sát (44 TCN):** Lo sợ quyền lực ngày càng tăng của ông, một nhóm thượng nghị sĩ đã ám sát Caesar, dẫn đến một loạt các cuộc nội chiến mới.

Cái chết của Caesar không cứu được Cộng hòa. Thay vào đó, nó mở đường cho người thừa kế của ông, Octavian, lên nắm quyền.
`,
      podcastScript: null,
      audioDataUri: null,
    },
    {
      title: "Augustus và sự khởi đầu của Đế chế",
      content: null, // Để trống để thể hiện trạng thái đang tải
      podcastScript: null,
      audioDataUri: null,
    },
  ],
};

export const MOCK_CARD_SET: CardSet = {
  id: "mock-cards-1",
  topic: MOCK_TOPIC,
  cards: [
    {
      front: "Cộng hòa La Mã được thành lập vào năm nào?",
      back: "Năm 509 TCN, sau khi vị vua cuối cùng, Lucius Tarquinius Superbus, bị lật đổ.",
      source: "Sự thành lập Cộng hòa La Mã",
    },
    {
      front: "Luật Mười hai Bảng là gì?",
      back: "Đây là bộ luật thành văn đầu tiên của La Mã, thiết lập các quyền và nghĩa vụ cơ bản cho công dân.",
      source: "Sự thành lập Cộng hòa La Mã",
    },
    {
      front: "Ai là vị tướng Carthage nổi tiếng đã vượt qua dãy Alps trong Chiến tranh Punic lần thứ hai?",
      back: "Hannibal Barca.",
      source: "Các cuộc chiến tranh Punic",
    },
    {
      front: "Hành động nào của Julius Caesar đã bắt đầu cuộc nội chiến La Mã?",
      back: "Vượt qua sông Rubicon với đội quân của mình vào năm 49 TCN.",
      source: "Julius Caesar và sự sụp đổ của Cộng hòa",
    },
    {
      front: "Ai là hoàng đế La Mã đầu tiên?",
      back: "Augustus (trước đây gọi là Octavian), người lên nắm quyền sau cái chết của Caesar.",
      source: "Augustus và sự khởi đầu của Đế chế",
    },
  ],
};

export const MOCK_QUIZ_SET: QuizSet = {
  id: "mock-quiz-1",
  topic: MOCK_TOPIC,
  questions: [
    {
      question: "Ai là đối thủ chính của La Mã trong các cuộc chiến tranh Punic?",
      options: ["Hy Lạp", "Carthage", "Ai Cập", "Ba Tư"],
      answer: "Carthage",
      explanation: "Carthage, một thành bang hùng mạnh ở Bắc Phi, là đối thủ chính của La Mã trong ba cuộc chiến tranh Punic để giành quyền kiểm soát Địa Trung Hải.",
      source: "Các cuộc chiến tranh Punic",
    },
    {
      question: "Hai tầng lớp xã hội chính trong giai đoạn đầu của Cộng hòa La Mã là gì?",
      options: [
        "Quý tộc và Nô lệ",
        "Thượng nghị sĩ và Kỵ sĩ",
        "Patrician và Plebeian",
        "Công dân và Người ngoại quốc",
      ],
      answer: "Patrician và Plebeian",
      explanation: "Patrician là tầng lớp quý tộc có địa vị, trong khi Plebeian là tầng lớp bình dân. Cuộc đấu tranh giữa họ đã định hình nền chính trị ban đầu của Cộng hòa.",
      source: "Sự thành lập Cộng hòa La Mã",
    },
    {
      question: "Julius Caesar bị ám sát vào năm nào?",
      options: ["100 TCN", "49 TCN", "44 TCN", "27 TCN"],
      answer: "44 TCN",
      explanation: "Caesar bị một nhóm thượng nghị sĩ do Brutus và Cassius cầm đầu ám sát vào ngày 15 tháng 3 năm 44 TCN (Ides of March).",
      source: "Julius Caesar và sự sụp đổ của Cộng hòa",
    },
  ],
};
