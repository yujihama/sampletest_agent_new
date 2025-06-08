import { toast } from "sonner"

export function useNotifications() {
  const notifyCompletion = (message = "実行が完了しました") => {
    toast.success(message, {
      duration: 4000,
    })
  }
  
  const notifyHITL = (message = "人的確認が必要です") => {
    toast.error(message, {
      duration: 0, // 手動で閉じるまで表示
    })
  }

  const notifyInfo = (message) => {
    toast.info(message, {
      duration: 3000,
    })
  }

  const notifyError = (message) => {
    toast.error(message, {
      duration: 5000,
    })
  }
  
  return { 
    notifyCompletion, 
    notifyHITL, 
    notifyInfo, 
    notifyError 
  }
}

