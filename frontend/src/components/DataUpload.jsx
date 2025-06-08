import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Upload, Folder, FileSpreadsheet, X } from "lucide-react"
import { useState } from "react"

export function DataUpload({ 
  onFolderUpload,
  onTemplateSelect,
  isExecuting 
}) {
  const [selectedFolder, setSelectedFolder] = useState(null)
  const [selectedTemplate, setSelectedTemplate] = useState(null)

  const handleFolderSelect = (event) => {
    const files = Array.from(event.target.files)
    setSelectedFolder(files)
    onFolderUpload && onFolderUpload(files)
  }

  const handleTemplateSelect = (event) => {
    const file = event.target.files[0]
    setSelectedTemplate(file)
    onTemplateSelect && onTemplateSelect(file)
  }

  const removeTemplate = () => {
    setSelectedTemplate(null)
    onTemplateSelect && onTemplateSelect(null)
  }

  const removeFolder = () => {
    setSelectedFolder(null)
    onFolderUpload && onFolderUpload(null)
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          データファイル
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* フォルダアップロード */}
        <div className="space-y-2">
          <Label htmlFor="folder">フォルダアップロード</Label>
          <Input 
            id="folder" 
            type="file" 
            webkitdirectory=""
            directory=""
            multiple
            onChange={handleFolderSelect}
            disabled={isExecuting}
            className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {selectedFolder && selectedFolder.length > 0 && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Folder className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-blue-800">
                    フォルダ: {selectedFolder[0].webkitRelativePath.split('/')[0]}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={removeFolder}
                  disabled={isExecuting}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <Badge variant="secondary">
                {selectedFolder.length} ファイル
              </Badge>
            </div>
          )}
        </div>

        {/* 調書フォーマットアップロード */}
        <div className="space-y-2">
          <Label htmlFor="template">調書フォーマット（Excel）</Label>
          <Input 
            id="template" 
            type="file" 
            accept=".xlsx,.xls"
            onChange={handleTemplateSelect}
            disabled={isExecuting}
            className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
          />
          {selectedTemplate && (
            <div className="flex items-center justify-between p-2 bg-green-50 rounded">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-800">{selectedTemplate.name}</span>
              </div>
                              <Button
                  variant="ghost"
                  size="sm"
                  onClick={removeTemplate}
                  disabled={isExecuting}
                >
                  <X className="w-4 h-4" />
                </Button>
            </div>
          )}
        </div>


      </CardContent>
    </Card>
  )
}

