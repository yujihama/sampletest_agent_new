import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Download, FileText } from "lucide-react"

export function ResultsView({ result, onDownload, isVisible }) {
  if (!isVisible) return null

  // デバッグ情報（開発時のみ）
  if (import.meta.env.DEV) {
    console.log('📊 ResultsView received props:', { result, isVisible });
    console.log('📊 onDownload function:', onDownload);
  }

  const sampleData = [
    { sample_data: 1, result: "OK", reason: "サンプル検証：正常" },
    { sample_data: 2, result: "NG", reason: "サンプル検証：要確認" },
    { sample_data: 3, result: "OK", reason: "サンプル検証：正常" },
  ]

  // resultが配列でない場合の安全な処理
  const getDisplayData = () => {
    // デバッグ情報の詳細出力
    if (import.meta.env.DEV) {
      console.log('🔍 getDisplayData - result type:', typeof result);
      console.log('🔍 getDisplayData - result is array:', Array.isArray(result));
      console.log('🔍 getDisplayData - result content:', result);
    }

    if (Array.isArray(result)) {
      console.log('📋 Using result as array, length:', result.length);
      console.log('📋 First item structure:', result[0]);
      return result
    }
    if (result && typeof result === 'object') {
      // resultがオブジェクトの場合、適切な配列プロパティを探す（dfを最優先）
      if (Array.isArray(result.df)) {
        console.log('📋 Using result.df, length:', result.df.length);
        console.log('📋 df first item:', result.df[0]);
        return result.df
      }
      if (Array.isArray(result.preview_data)) {
        console.log('📋 Using result.preview_data, length:', result.preview_data.length);
        console.log('📋 preview_data first item:', result.preview_data[0]);
        return result.preview_data
      }
      if (Array.isArray(result.data)) {
        console.log('📋 Using result.data, length:', result.data.length);
        return result.data
      }
      if (Array.isArray(result.results)) {
        console.log('📋 Using result.results, length:', result.results.length);
        return result.results
      }
      if (Array.isArray(result.items)) {
        console.log('📋 Using result.items, length:', result.items.length);
        return result.items
      }
      
      // オブジェクト自体を配列形式に変換を試みる
      const entries = Object.entries(result)
      if (entries.length > 0) {
        console.log('📋 Converting object to array, entries:', entries.length);
        console.log('📋 Object keys:', Object.keys(result));
        const converted = entries.map(([key, value]) => ({
          invoiceNumber: key,
          shipDate: typeof value === 'object' ? JSON.stringify(value) : String(value),
          match: "📄"
        }));
        console.log('📋 Converted data:', converted);
        return converted
      }
    }
    // フォールバック：サンプルデータを使用
    console.log('Using fallback sample data');
    return sampleData
  }

  const displayData = getDisplayData()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Badge variant="default" className="bg-green-500">
            実行完了
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border rounded-lg p-3 bg-gray-50">
          <div className="text-sm font-medium mb-2">処理結果プレビュー</div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>サンプルデータ</TableHead>
                <TableHead>結果</TableHead>
                <TableHead>理由</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayData.map((row, index) => (
                <TableRow key={index}>
                  <TableCell>
                    {row.sample_data || row.sampleData || `項目-${index + 1}`}
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.result === 'OK' ? 'default' : row.result === 'NG' ? 'destructive' : 'secondary'}>
                      {row.result || '--'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {row.reason || row.description || row.note || '--'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        <Button 
          className="w-full" 
          onClick={() => {
            console.log('🖱️ Download button clicked');
            onDownload && onDownload();
          }}
        >
          <Download className="w-4 h-4 mr-2" />
          調書フォーマット.xlsx をダウンロード
        </Button>

      </CardContent>
    </Card>
  )
}

