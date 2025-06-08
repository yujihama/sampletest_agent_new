import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { AlertCircle, CheckCircle, XCircle, Edit3, MessageSquare } from "lucide-react"
import { useInterruptedActions } from '../hooks/useInterruptedActions'
import { useThreadContext } from '../contexts/ThreadContext'

export function HITLMessageEnhanced({ 
  isVisible = false,
  onClose 
}) {
  const { threadData, setThreadData } = useThreadContext();
  const [customInput, setCustomInput] = useState('');
  const [editValue, setEditValue] = useState('');

  // useInterruptedActionsフックを使用
  const {
    humanResponse,
    selectedSubmitType,
    submitting,
    error,
    handleAccept,
    handleReject,
    handleEdit,
    handleCustomInput,
    getCurrentInterrupt,
  } = useInterruptedActions({
    threadData,
    setThreadData,
    initialHumanInterruptEditValue: editValue
  });

  // 現在のinterrupt情報を取得
  const currentInterrupt = getCurrentInterrupt();

  // interruptが解消されたら自動的にクローズ
  useEffect(() => {
    if (threadData?.status !== 'interrupted' && isVisible) {
      setTimeout(() => {
        if (onClose) onClose();
      }, 1000); // 1秒後にクローズ
    }
  }, [threadData?.status, isVisible, onClose]);

  // interrupt情報からデフォルト値を設定
  useEffect(() => {
    if (currentInterrupt?.action_request?.args?.value) {
      setEditValue(currentInterrupt.action_request.args.value);
    }
  }, [currentInterrupt]);

  if (!isVisible || !threadData || threadData.status !== 'interrupted') {
    return null;
  }

  const getInterruptIcon = () => {
    if (threadData.invalidSchema) {
      return <XCircle className="w-5 h-5 text-red-500" />;
    }
    return <AlertCircle className="w-5 h-5 text-yellow-500" />;
  };

  const getInterruptMessage = () => {
    if (currentInterrupt?.message) {
      return currentInterrupt.message;
    }
    if (currentInterrupt?.action_request?.message) {
      return currentInterrupt.action_request.message;
    }
    return "実行が中断されました。ユーザーの入力をお待ちしています。";
  };

  const handleAcceptAction = async () => {
    const result = await handleAccept();
    if (result.success && onClose) {
      onClose();
    }
  };

  const handleRejectAction = async () => {
    const result = await handleReject();
    if (result.success && onClose) {
      onClose();
    }
  };

  const handleEditAction = async () => {
    const result = await handleEdit(editValue);
    if (result.success && onClose) {
      onClose();
    }
  };

  const handleCustomAction = async () => {
    const result = await handleCustomInput(customInput);
    if (result.success && onClose) {
      onClose();
    }
  };

  const getAvailableActions = () => {
    const actions = [];
    
    humanResponse.forEach((response) => {
      switch (response.type) {
        case 'accept':
          actions.push(
            <Button
              key="accept"
              onClick={handleAcceptAction}
              disabled={submitting}
              className="bg-green-500 hover:bg-green-600"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              承認
            </Button>
          );
          break;
          
        case 'reject':
          actions.push(
            <Button
              key="reject"
              onClick={handleRejectAction}
              disabled={submitting}
              variant="destructive"
            >
              <XCircle className="w-4 h-4 mr-2" />
              拒否
            </Button>
          );
          break;
          
        case 'edit':
          actions.push(
            <div key="edit" className="space-y-2">
              <Textarea
                placeholder="内容を編集してください..."
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="min-h-[100px]"
              />
              <Button
                onClick={handleEditAction}
                disabled={submitting || !editValue.trim()}
                variant="outline"
              >
                <Edit3 className="w-4 h-4 mr-2" />
                編集内容で継続
              </Button>
            </div>
          );
          break;
          
        case 'custom':
          actions.push(
            <div key="custom" className="space-y-2">
              <Input
                placeholder="カスタム入力..."
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
              />
              <Button
                onClick={handleCustomAction}
                disabled={submitting || !customInput.trim()}
                variant="outline"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                カスタム入力で継続
              </Button>
            </div>
          );
          break;
      }
    });
    
    return actions;
  };

  return (
    <Card className="border-yellow-200 bg-yellow-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getInterruptIcon()}
            <CardTitle className="text-lg">人的確認が必要です</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              Thread: {threadData.thread?.thread_id?.slice(0, 8)}...
            </Badge>
            {threadData.invalidSchema && (
              <Badge variant="destructive">
                Invalid Schema
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Interrupt Message */}
        <div className="p-3 bg-white rounded-md border">
          <p className="text-sm font-medium text-gray-900">
            {getInterruptMessage()}
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Available Actions */}
        {humanResponse.length > 0 && (
          <div className="space-y-3">
            <Separator />
            <h4 className="text-sm font-medium text-gray-700">利用可能なアクション:</h4>
            <div className="space-y-3">
              {getAvailableActions()}
            </div>
          </div>
        )}

        {/* Debug Information (開発時のみ) */}
        {import.meta.env.DEV && (
          <details className="mt-4">
            <summary className="text-xs text-gray-500 cursor-pointer">
              Debug Info (開発時のみ)
            </summary>
            <pre className="mt-2 p-2 bg-gray-100 text-xs rounded overflow-auto">
              {JSON.stringify({ 
                threadData: threadData,
                currentInterrupt: currentInterrupt,
                humanResponse: humanResponse,
                selectedSubmitType: selectedSubmitType
              }, null, 2)}
            </pre>
          </details>
        )}
      </CardContent>
    </Card>
  );
} 