import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { RefreshCw, TrendingUp } from "lucide-react"

export function HistoryList({ threads, onRefresh, onThreadSelect }) {
  const sampleThreads = [
    {
      thread_id: "thread_001",
      status: "idle",
      procedure: "売上確認",
      executionTime: "3分23秒",
      date: "01/15",
      // サンプルデータにもmetadataとタイムスタンプを追加
      metadata: { procedure: "売上確認" },
      created_at: "2024-01-15T10:00:00Z",
      updated_at: "2024-01-15T10:03:23Z"
    },
    {
      thread_id: "thread_002", 
      status: "error",
      procedure: "在庫照合",
      executionTime: "1分45秒",
      date: "01/14",
      metadata: { procedure: "在庫照合" },
      created_at: "2024-01-14T14:00:00Z",
      updated_at: "2024-01-14T14:01:45Z"
    },
    {
      thread_id: "thread_003",
      status: "idle",
      procedure: "支払確認",
      executionTime: "2分10秒", 
      date: "01/13",
      metadata: { procedure: "支払確認" },
      created_at: "2024-01-13T09:00:00Z",
      updated_at: "2024-01-13T09:02:10Z"
    }
  ]

  // APIレスポンスデータを表示形式に変換
  const transformThreadData = (thread) => {
    // 実行時間を計算（created_atとupdated_atから）
    const calculateExecutionTime = () => {
      if (thread.created_at && thread.updated_at) {
        const start = new Date(thread.created_at)
        const end = new Date(thread.updated_at)
        const diffMs = end.getTime() - start.getTime()
        const diffSeconds = Math.floor(diffMs / 1000)
        const minutes = Math.floor(diffSeconds / 60)
        const seconds = diffSeconds % 60
        return `${minutes}分${seconds}秒`
      }
      return "--"
    }

    // 日付を短縮形式にフォーマット（MM/DD形式）
    const formatDate = () => {
      if (thread.created_at) {
        const date = new Date(thread.created_at)
        const month = (date.getMonth() + 1).toString().padStart(2, '0')
        const day = date.getDate().toString().padStart(2, '0')
        return `${month}/${day}`
      }
      return "--"
    }

    return {
      thread_id: thread.thread_id,
      status: thread.status,
      procedure: thread.metadata?.procedure || "未設定",
      executionTime: calculateExecutionTime(),
      date: formatDate(),
      // 元のデータも保持（onThreadSelectで使用）
      originalData: thread
    }
  }

  // 実際のスレッドデータがある場合は変換、ない場合はサンプルデータを使用
  const displayThreads = threads && threads.length > 0 
    ? threads.map(transformThreadData)
    : sampleThreads

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            実行履歴
          </div>
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-48">
          <div className="space-y-2">
                        {displayThreads.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">実行履歴がありません</p>
              </div>
            ) : (
              displayThreads.map((thread) => (
                <div 
                  key={thread.thread_id} 
                  className="flex items-center justify-between p-2 border rounded cursor-pointer hover:bg-gray-50"
                  onClick={() => {
                    console.log('🖱️ Thread clicked:', thread);
                    onThreadSelect && onThreadSelect(thread.originalData || thread);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Badge variant={
                      thread.status === 'idle' ? 'default' : 
                      thread.status === 'error' ? 'destructive' : 
                      thread.status === 'running' ? 'secondary' :
                      thread.status === 'interrupted' ? 'outline' : 'default'
                    }>
                      {thread.status === 'idle' ? '✅' : 
                       thread.status === 'error' ? '❌' : 
                       thread.status === 'running' ? '🔄' :
                       thread.status === 'interrupted' ? '⏸️' : '❓'}
                    </Badge>
                    <span className="text-sm">{thread.procedure}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {thread.executionTime} {thread.date}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
      {/* デバッグ情報（開発時のみ表示） */}
      {import.meta.env.DEV && threads && (
        <div className="text-xs text-gray-400 p-2 border-t">
          データ件数: {threads.length}件 | 
          最新: {threads[0]?.created_at ? new Date(threads[0].created_at).toLocaleString() : 'なし'}
        </div>
      )}
    </Card>
  )
}

