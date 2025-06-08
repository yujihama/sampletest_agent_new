import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { client, handleLangGraphError } from '../lib/langGraphClient';

// ThreadContext作成
const ThreadContext = createContext();

// ThreadContextフック
export const useThreadContext = () => {
  const context = useContext(ThreadContext);
  if (!context) {
    throw new Error('useThreadContext must be used within a ThreadProvider');
  }
  return context;
};

// スレッド状態の型定義（JSDocコメント）
/**
 * @typedef {Object} ThreadData
 * @property {Object} thread - スレッドオブジェクト
 * @property {'idle'|'running'|'interrupted'|'error'} status - スレッド状態
 * @property {Array} [interrupts] - interrupt情報配列
 * @property {boolean} [invalidSchema] - 無効なスキーマフラグ
 */

// interrupt情報の抽出（agent-inbox-main方式）
const getInterruptFromThread = (thread) => {
  try {
    if (thread.interrupts && Object.values(thread.interrupts).length > 0) {
      const result = Object.values(thread.interrupts).flatMap((interrupt) => {
        try {
          if (Array.isArray(interrupt) && interrupt.length > 0) {
            // Case 1: Array with nested structure [0].value
            if (interrupt[0]?.value && Array.isArray(interrupt[0].value)) {
              return interrupt[0].value;
            }
            // Case 2: Array with direct structure [0][1].value  
            else if (Array.isArray(interrupt[0])) {
              const nestedInterrupt = interrupt[0];
              if (Array.isArray(nestedInterrupt) && nestedInterrupt.length > 1) {
                return nestedInterrupt[1]?.value || [];
              }
              return nestedInterrupt;
            }
            // Case 3: Direct object with .value
            else if (typeof interrupt[0] === 'object' && interrupt[0]?.value) {
              return interrupt[0].value;
            }
          } else if (typeof interrupt === 'object' && interrupt?.value) {
            // Case 4: Direct object with .value
            return interrupt.value;
          }
          return [];
        } catch (error) {
          console.error('Error processing individual interrupt:', error);
          return [];
        }
      });
      
      return result.length > 0 ? result : undefined;
    }
  } catch (error) {
    console.error('Error extracting interrupts from thread:', error);
  }
  return undefined;
};

// interrupted threadの処理
const processInterruptedThread = (thread) => {
  const interrupts = getInterruptFromThread(thread);
  if (interrupts) {
    const hasInvalidSchema = interrupts.some(
      (interrupt) => interrupt?.action_request?.action === 'IMPROPER_SCHEMA' || !interrupt?.action_request?.action
    );

    return {
      thread,
      interrupts,
      status: "interrupted",
      invalidSchema: hasInvalidSchema,
    };
  }
  return undefined;
};

// ThreadProvider コンポーネント
export const ThreadProvider = ({ children }) => {
  const [threads, setThreads] = useState([]);
  const [currentThread, setCurrentThread] = useState(null);
  const [threadData, setThreadData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // スレッド一覧を取得
  const fetchThreads = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const threadList = await client.threads.search();
      setThreads(threadList || []);
    } catch (err) {
      console.error('Failed to fetch threads:', err);
      setError('スレッドの取得に失敗しました（LangGraphサーバーに接続できません）');
      // エラーを投げずに空配列を設定してアプリケーションを継続
      setThreads([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // 単一スレッドの詳細を取得
  const fetchSingleThread = useCallback(async (threadId) => {
    try {
      setLoading(true);
      setError(null);
      
      const thread = await client.threads.get(threadId);
      
      if (thread.status === "interrupted") {
        // 高速処理を最初に試行
        const processedThreadData = processInterruptedThread(thread);
        if (processedThreadData && processedThreadData.interrupts?.length) {
          setThreadData(processedThreadData);
          return processedThreadData;
        }

        // 必要に応じてより詳細な状態を取得
        try {
          const threadInterrupts = getInterruptFromThread(thread);
          if (!threadInterrupts || threadInterrupts.length === 0) {
            const state = await client.threads.getState(thread.thread_id);
            const withoutInterrupts = {
              status: "interrupted",
              thread: thread,
              interrupts: undefined,
              thread_state: state,
            };
            setThreadData(withoutInterrupts);
            return withoutInterrupts;
          }

          const finalThreadData = {
            status: "interrupted",
            thread: thread,
            interrupts: threadInterrupts,
            invalidSchema: threadInterrupts.some(
              (interrupt) =>
                interrupt?.action_request?.action === 'IMPROPER_SCHEMA' ||
                !interrupt?.action_request?.action
            ),
          };
          
          setThreadData(finalThreadData);
          return finalThreadData;
        } catch (stateError) {
          console.error('Error fetching thread state:', stateError);
          // フォールバック: 基本的なinterrupt状態を返す
          const fallbackData = {
            status: "interrupted",
            thread: thread,
            interrupts: [],
            invalidSchema: false,
          };
          setThreadData(fallbackData);
          return fallbackData;
        }
      } else {
        // 通常のスレッド（非interrupt）
        const normalThreadData = {
          status: thread.status || "idle",
          thread: thread,
          interrupts: undefined,
        };
        setThreadData(normalThreadData);
        return normalThreadData;
      }
    } catch (err) {
      console.error('Failed to fetch single thread:', err);
      setError('スレッドの詳細取得に失敗しました');
      handleLangGraphError(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // スレッド選択
  const selectThread = useCallback((thread) => {
    setCurrentThread(thread);
    if (thread?.thread_id) {
      fetchSingleThread(thread.thread_id);
    }
  }, [fetchSingleThread]);

  // interrupt状態のチェック
  const checkForInterrupts = useCallback(async (threadId) => {
    try {
      const thread = await client.threads.get(threadId);
      return {
        hasInterrupt: thread.status === "interrupted",
        thread: thread,
        interrupts: getInterruptFromThread(thread)
      };
    } catch (err) {
      console.error('Failed to check for interrupts:', err);
      return { hasInterrupt: false, thread: null, interrupts: null };
    }
  }, []);

  // 初期化時にスレッド一覧を取得
  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  // Context値
  const contextValue = {
    // State
    threads,
    currentThread,
    threadData,
    loading,
    error,
    
    // Actions
    fetchThreads,
    fetchSingleThread,
    selectThread,
    checkForInterrupts,
    setThreadData,
  };

  return (
    <ThreadContext.Provider value={contextValue}>
      {children}
    </ThreadContext.Provider>
  );
}; 