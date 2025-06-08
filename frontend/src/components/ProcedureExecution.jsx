import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Folder, PlayCircle, Loader2 } from "lucide-react"

export function ProcedureExecution({ 
  sampleFolders,
  selectedSampleFolder,
  onSampleFolderSelect,
  onProcedureChange, 
  onExecute, 
  isExecuting 
}) {
  const handleSampleFolderChange = (event) => {
    const folderName = event.target.value
    onSampleFolderSelect && onSampleFolderSelect(folderName)
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PlayCircle className="w-5 h-5" />
          手続き実行
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* サンプルフォルダ選択 */}
        <div className="space-y-2">
          <Label htmlFor="sampleFolder">サンプルフォルダ選択</Label>
          <select
            id="sampleFolder"
            value={selectedSampleFolder}
            onChange={handleSampleFolderChange}
            disabled={isExecuting}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">サンプルフォルダを選択してください</option>
            {sampleFolders.map((folder) => (
              <option key={folder} value={folder}>
                {folder}
              </option>
            ))}
          </select>
          {selectedSampleFolder && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Folder className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-blue-800">
                  選択中: {selectedSampleFolder}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 手続き内容 */}
        <div>
          <Label htmlFor="procedure">手続き内容</Label>
          <Textarea 
            id="procedure"
            placeholder="売上請求書と出荷データの内容一致確認"
            className="min-h-20"
            onChange={onProcedureChange}
            disabled={isExecuting}
          />
        </div>

        {/* 実行ボタン */}
        <Button 
          className="w-full" 
          onClick={onExecute}
          disabled={isExecuting}
        >
          {isExecuting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              実行中...
            </>
          ) : (
            '🚀 実行開始'
          )}
        </Button>
      </CardContent>
    </Card>
  )
} 