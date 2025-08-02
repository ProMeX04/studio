import { NextRequest } from 'next/server';
import { withAuth, createSuccessResponse, createErrorResponse, type AuthenticatedRequest } from '@/lib/api-middleware';
import { getFirebaseAdmin } from '@/lib/firebase-admin';

async function handler(req: AuthenticatedRequest) {
  if (req.method !== 'POST') {
    return createErrorResponse('Method not allowed', 405);
  }

  try {
    const body = await req.json();
    const { publicTopicId } = body;

    if (!publicTopicId) {
      return createErrorResponse('Public topic ID is required', 400);
    }

    const userId = req.user!.uid;
    const { adminDb } = getFirebaseAdmin();

    // Get the public topic data
    // For now, we'll use sample data based on the ID
    const sampleTopicData = getSampleTopicData(publicTopicId);
    
    if (!sampleTopicData) {
      return createErrorResponse('Public topic not found', 404);
    }

    // Clone the topic to user's account
    await adminDb.collection('users').doc(userId).set({
      topic: sampleTopicData.topic,
      language: sampleTopicData.language,
      model: 'gemini-2.5-flash-lite',
      flashcards: sampleTopicData.flashcards,
      quiz: sampleTopicData.quiz,
      theory: sampleTopicData.theory,
      clonedFrom: publicTopicId,
      clonedAt: new Date(),
      updatedAt: new Date(),
    }, { merge: true });

    // Increment download count for the public topic
    // In production, this would update the actual public topic document
    console.log(`📊 Public topic ${publicTopicId} downloaded by user ${userId}`);

    return createSuccessResponse({
      success: true,
      message: 'Topic cloned successfully',
      topic: sampleTopicData.topic,
      language: sampleTopicData.language,
      contentStats: {
        flashcards: sampleTopicData.flashcards.length,
        quiz: sampleTopicData.quiz.length,
        theory: sampleTopicData.theory.length,
      }
    });

  } catch (error) {
    console.error('Clone public topic error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

function getSampleTopicData(topicId: string) {
  const topicData: Record<string, any> = {
    'topic_1': {
      topic: 'React Hooks',
      language: 'Vietnamese',
      flashcards: [
        {
          id: '1',
          question: 'useState là gì?',
          answer: 'useState là một Hook cho phép bạn thêm state vào functional components.',
          difficulty: 'beginner',
          tags: ['react', 'hooks', 'state']
        },
        {
          id: '2',
          question: 'useEffect được sử dụng để làm gì?',
          answer: 'useEffect cho phép bạn thực hiện side effects trong functional components, như gọi API, subscriptions, hoặc cleanup.',
          difficulty: 'intermediate',
          tags: ['react', 'hooks', 'effects']
        },
        {
          id: '3',
          question: 'useContext Hook hoạt động như thế nào?',
          answer: 'useContext cho phép bạn consume context values mà không cần Component wrapper, giúp tránh prop drilling.',
          difficulty: 'intermediate',
          tags: ['react', 'hooks', 'context']
        },
      ],
      quiz: [
        {
          id: '1',
          question: 'Hook nào được sử dụng để quản lý state trong functional component?',
          options: ['useState', 'setState', 'this.state', 'state'],
          correctAnswer: 'useState',
          explanation: 'useState là Hook chính thức để quản lý state trong functional components.',
          difficulty: 'beginner'
        },
        {
          id: '2',
          question: 'Khi nào useEffect sẽ được gọi mặc định?',
          options: ['Chỉ khi component mount', 'Sau mỗi render', 'Chỉ khi props thay đổi', 'Không bao giờ'],
          correctAnswer: 'Sau mỗi render',
          explanation: 'Mặc định useEffect chạy sau mỗi render nếu không có dependency array.',
          difficulty: 'intermediate'
        },
      ],
      theory: [
        {
          id: '1',
          title: 'Giới thiệu về React Hooks',
          content: `# React Hooks

React Hooks là các hàm đặc biệt cho phép bạn "hook into" các tính năng của React từ functional components.

## Tại sao sử dụng Hooks?

1. **Đơn giản hóa code**: Không cần class components
2. **Tái sử dụng logic**: Dễ dàng chia sẻ stateful logic
3. **Dễ test**: Functional components dễ test hơn

## Rules of Hooks

1. Chỉ gọi Hooks ở top level
2. Chỉ gọi Hooks từ React functions`,
          order: 1
        },
        {
          id: '2',
          title: 'useState Hook',
          content: `# useState Hook

useState là Hook cơ bản nhất để quản lý state.

\`\`\`javascript
import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);
  
  return (
    <div>
      <p>You clicked {count} times</p>
      <button onClick={() => setCount(count + 1)}>
        Click me
      </button>
    </div>
  );
}
\`\`\`

## Cách hoạt động

- Trả về một array với 2 elements: state value và setter function
- State được preserve giữa các re-renders
- Setter function trigger re-render`,
          order: 2
        }
      ]
    },
    'topic_2': {
      topic: 'Lịch sử La Mã',
      language: 'Vietnamese',
      flashcards: [
        {
          id: '1',
          question: 'Đế chế La Mã được thành lập vào năm nào?',
          answer: 'Đế chế La Mã được thành lập vào năm 27 TCN dưới thời Augustus.',
          difficulty: 'beginner',
          tags: ['la mã', 'lịch sử', 'đế chế']
        },
        {
          id: '2',
          question: 'Julius Caesar là ai?',
          answer: 'Julius Caesar là một tướng quân và chính trị gia La Mã nổi tiếng, đã chinh phục Gaul và trở thành độc tài.',
          difficulty: 'beginner',
          tags: ['caesar', 'la mã', 'chính trị']
        }
      ],
      quiz: [
        {
          id: '1',
          question: 'Thành phố La Mã được thành lập vào năm nào theo truyền thuyết?',
          options: ['753 TCN', '509 TCN', '27 TCN', '476 SCN'],
          correctAnswer: '753 TCN',
          explanation: 'Theo truyền thuyết, La Mã được thành lập năm 753 TCN bởi Romulus.',
          difficulty: 'beginner'
        }
      ],
      theory: [
        {
          id: '1',
          title: 'Khởi nguồn của La Mã',
          content: `# Khởi nguồn của La Mã

## Truyền thuyết thành lập

Theo truyền thuyết, thành phố La Mã được thành lập năm 753 TCN bởi Romulus và Remus.

## Thời kỳ Vương quốc (753-509 TCN)

La Mã ban đầu được cai trị bởi các vua, với 7 vua truyền thuyết.`,
          order: 1
        }
      ]
    }
  };

  return topicData[topicId] || null;
}

export const POST = withAuth(handler);
