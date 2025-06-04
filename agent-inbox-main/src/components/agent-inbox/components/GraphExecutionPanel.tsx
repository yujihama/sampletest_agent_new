import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useThreadsContext } from "../contexts/ThreadContext";
import { createClient } from "@/lib/client";

// DataFrame表示用の簡易テーブルコンポーネント
interface DataFrameTableProps {
  data: Record<string, any>[]; // オブジェクトの配列を想定
}

const DataFrameTable: React.FC<DataFrameTableProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return <p className="text-sm text-muted-foreground">DataFrame is empty or not available.</p>;
  }
  const headers = Object.keys(data[0]);

  return (
    <div className="w-full overflow-x-auto max-w-full">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            {headers.map((header) => (
              <th key={header} scope="col" className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {headers.map((header) => (
                <td key={header} className="px-3 py-2 whitespace-pre-line break-all overflow-hidden text-ellipsis min-w-[150px]">
                  {typeof row[header] === 'object' ? JSON.stringify(row[header]) : String(row[header])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ★ 実行履歴の型定義 (コメントアウトを解除)
interface ExecutionHistoryEntry {
  runId: string;
  threadId: string; // fetchHistory のマッピングで thread_id を runId にしているので、実質 threadId と同義
  graphId: string;
  input: any; // APIのvaluesをそのまま入れる想定
  output: any; // 選択時に別途取得、または新規実行時の最終状態
  status: string;
  timestamp: string;
}

export function GraphExecutionPanel() {
  const { agentInboxes } = useThreadsContext();
  const selectedInbox = agentInboxes.find((i) => i.selected);
  const [graphId, setGraphId] = useState(selectedInbox?.graphId || "");
  const [procedureInput, setProcedureInput] = useState<string>("2025年のデータか確認してください。");
  const [rawResult, setRawResult] = useState<any>(null);
  const [dataFrameResult, setDataFrameResult] = useState<Record<string, any>[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [executionHistory, setExecutionHistory] = useState<ExecutionHistoryEntry[]>([]); 
  const [selectedHistoryRunId, setSelectedHistoryRunId] = useState<string | null>(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [folders, setFolders] = useState<string[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFileNames, setSelectedFileNames] = useState<string[]>([]);
  const [isRawJsonCollapsed, setIsRawJsonCollapsed] = useState(true);

  const client = React.useMemo(() => {
    if (!selectedInbox?.deploymentUrl) return null;
    return createClient({
      deploymentUrl: selectedInbox.deploymentUrl,
      langchainApiKey: undefined, 
    });
  }, [selectedInbox]);

  const getBaseApiUrl = (deploymentUrl: string | undefined): string | null => {
    if (!deploymentUrl) return null;
    try {
      const url = new URL(deploymentUrl);
      return `${url.protocol}//${url.host}`;
    } catch (error) {
      console.error("Invalid deployment URL:", error);
      return null;
    }
  };

  useEffect(() => {
    setGraphId(selectedInbox?.graphId || "");
    const fetchHistory = async () => {
      if (!selectedInbox || !selectedInbox.deploymentUrl) {
        return;
      }
      const baseApiUrl = getBaseApiUrl(selectedInbox.deploymentUrl);
      if (!baseApiUrl) {
        toast({
          title: "設定エラー",
          description: "履歴取得APIのベースURLを解決できませんでした。",
          variant: "destructive",
        });
        return;
      }

      setIsHistoryLoading(true);
      try {
        const historyApiUrl = `/api/get_runs_history`;
        console.log("Fetching history from:", historyApiUrl, "with deploymentUrl:", selectedInbox.deploymentUrl, "and graphId:", selectedInbox.graphId);
        
        const response = await fetch(historyApiUrl, {
          method: 'GET',
          headers: {
            'x-deployment-url': selectedInbox.deploymentUrl, 
            'x-graph-id': selectedInbox.graphId || '' // ★ graphIdをヘッダーに追加
          }
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: `History API request failed with status ${response.status}` }));
          throw new Error(errorData.error || `History API request failed with status ${response.status}`);
        }
        
        const rawData = await response.json();
        // console.log("Raw data from /api/get_runs_history:", rawData); // ★ デバッグ用ログはコメントアウトまたは削除検討

        if (Array.isArray(rawData)) {
          const mappedHistory: ExecutionHistoryEntry[] = rawData.map(item => ({ // ★ 型適用
            runId: item.thread_id, 
            threadId: item.thread_id, // threadId も保持しておく
            graphId: item.metadata?.graph_id || item.metadata?.assistant_id || "unknown_graph", 
            timestamp: item.updated_at, 
            input: item.values || null, 
            output: null, 
            status: item.status || "unknown",
          }));

          const attemptSort = (data: ExecutionHistoryEntry[]): ExecutionHistoryEntry[] => { // ★ 型適用
            try {
              return data.sort((a, b) => {
                const dateA = new Date(a.timestamp).getTime();
                const dateB = new Date(b.timestamp).getTime();
                if (isNaN(dateA) || isNaN(dateB)) return 0; 
                return dateB - dateA;
              });
            } catch (e) {
              console.warn("Failed to sort history data, returning unsorted:", e);
              return data; 
            }
          };
          setExecutionHistory(attemptSort(mappedHistory));
        } else {
          // console.warn("/api/get_runs_history did not return an array. Setting empty history.", rawData); // ★ デバッグ用ログ
          setExecutionHistory([]);
        }
        
      } catch (error: any) {
        console.error("Failed to fetch execution history:", error);
        toast({
          title: "履歴取得エラー",
          description: error?.message || "実行履歴の取得に失敗しました。",
          variant: "destructive",
        });
        setExecutionHistory([]); // エラー時も空配列をセット
      } finally {
        setIsHistoryLoading(false);
      }
    };

    fetchHistory();
  }, [selectedInbox, toast]);

  // フォルダ一覧取得用fetchFoldersを関数化
  const fetchFolders = async () => {
    try {
      if (!selectedInbox?.deploymentUrl) {
        setFolders([]);
        return;
      }
      const res = await fetch("/api/list-folders", {
        headers: {
          'x-deployment-url': selectedInbox.deploymentUrl
        }
      });
      const data = await res.json();
      setFolders(data.folders || []);
      if (data.folders && data.folders.length > 0) {
        setSelectedFolder(data.folders[0]);
      }
    } catch (_) {
      setFolders([]);
    }
  };

  useEffect(() => {
    fetchFolders();
  }, [selectedInbox]);

  // フォルダアップロード処理
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    setUploadError(null);
    try {
      if (!selectedInbox?.deploymentUrl) {
        setUploadError("デプロイメントURLが未設定です");
        setUploading(false);
        return;
      }
      const files = fileInputRef.current?.files;
      if (!files || files.length === 0) {
        setUploadError("ファイルが選択されていません");
        setUploading(false);
        return;
      }
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append("files", file, file.webkitRelativePath || file.name);
      });
      const res = await fetch("/api/upload-folder", {
        method: "POST",
        headers: {
          'x-deployment-url': selectedInbox.deploymentUrl
        },
        body: formData
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setUploadError(err.error || "アップロードに失敗しました");
      } else {
        setUploadError(null);
        await fetchFolders(); // 成功時は一覧リロード
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    } catch (err: any) {
      setUploadError(err?.message || "アップロード中にエラーが発生しました");
    } finally {
      setUploading(false);
    }
  };

  // ★ resetToNewExecutionState 関数の定義
  const resetToNewExecutionState = () => {
    setSelectedHistoryRunId(null);
    setGraphId(selectedInbox?.graphId || "");
    setProcedureInput("2025年のデータか確認してください。");
    setRawResult(null);
    setDataFrameResult(null);
  };

  const handleRun = async () => {
    console.log("Selected Inbox Deployment URL:", selectedInbox?.deploymentUrl);
    console.log("Graph ID being used:", graphId);
    setIsLoading(true);
    setRawResult(null);
    setDataFrameResult(null);
    if (!client) { 
      toast({ title: "クライアントエラー", description: "LangServeクライアントが初期化されていません。", variant: "destructive" });
      setIsLoading(false);
      return;
    }
    try {
      if (!selectedInbox) {
        toast({
          title: "エラー",
          description: "選択中のInboxがありません。",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // procedureInput と selectedFolder から inputObj を構築
      const inputObj: Record<string, any> = {
        procedure: procedureInput,
        sample_data_path: selectedFolder || ""
      };
      // EXCLUDE_KEYS をここで適用する場合 (もしサーバーサイドで期待されるなら)
      // EXCLUDE_KEYS.forEach(k => { delete inputObj[k]; });

      let newThreadResponse: { thread_id: string; [key: string]: any };
      try {
        newThreadResponse = await client.threads.create();
        if (!newThreadResponse || !newThreadResponse.thread_id) {
          throw new Error("Failed to create a new thread or thread ID is missing.");
        }
      } catch (threadCreateError: any) {
        toast({
          title: "スレッド作成エラー",
          description: threadCreateError?.message || "新しいスレッドの作成に失敗しました。",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      
      const runThreadId = newThreadResponse.thread_id;
      // console.log("Newly created thread ID:", runThreadId); // ★ デバッグ用ログ

      const initialRunResponse = await client.runs.create(runThreadId, graphId, { input: inputObj } as any);
      setRawResult(initialRunResponse);

      if (initialRunResponse && initialRunResponse.run_id && (initialRunResponse.status === "pending" || initialRunResponse.status === "running")) {
        const runId = initialRunResponse.run_id;
        const pollInterval = 3000;
        const maxAttempts = 100;
        let attempts = 0;

        const intervalId = setInterval(async () => {
          attempts++;
          if (attempts > maxAttempts) {
            clearInterval(intervalId);
            toast({ title: "タイムアウト", description: "グラフ実行結果の取得がタイムアウトしました。", variant: "destructive" });
            setIsLoading(false);
            return;
          }

          try {
            // const runStatusResponse = await client.runs.get(runThreadId, runId);
            const runStatusResponse = await client.threads.get(runThreadId);
            setRawResult(runStatusResponse);

            if (runStatusResponse && (runStatusResponse.status === "idle" || runStatusResponse.status === "error" || runStatusResponse.status === "interrupted")) {
              // idle, error, interrupted の場合のみ終了
              clearInterval(intervalId);
              setIsLoading(false);
              let finalStateForHistory: any = null;
              if (runStatusResponse.status === "idle") {
                try {
                  const threadState = await client.threads.getState(runThreadId);
                  finalStateForHistory = threadState?.values || threadState; 
                  setRawResult(finalStateForHistory);
                  toast({ title: "成功", description: "グラフが正常に実行されました。" });
                } catch (getStateError: any) {
                  console.error("Error fetching thread state after run completion:", getStateError);
                  toast({ title: "状態取得エラー", description: "実行は成功しましたが、最終状態の取得に失敗しました。" });
                }
              } else if (runStatusResponse.status === "interrupted") {
                toast({
                  title: "問い合わせがあります",
                  description: "グラフ実行中に問い合わせが発生しました。",
                  variant: null,
                  className: "bg-yellow-100 text-yellow-800 border-yellow-300"
                });
                finalStateForHistory = runStatusResponse;
              } else {
                toast({ title: "実行失敗", description: `グラフ実行がステータス ${runStatusResponse.status} で失敗しました。`, variant: "destructive" });
                finalStateForHistory = runStatusResponse;
              }

              const newHistoryEntry: ExecutionHistoryEntry = {
                runId: runId,
                threadId: runThreadId,
                graphId: graphId,
                input: inputObj,
                output: finalStateForHistory, 
                status: runStatusResponse.status,
                timestamp: new Date().toISOString(),
              };
              setExecutionHistory(prevHistory => [newHistoryEntry, ...prevHistory]);

              if (finalStateForHistory && typeof finalStateForHistory === 'object' && finalStateForHistory.df) {
                let dfToShow: Record<string, any>[] | null = null;
                if (Array.isArray(finalStateForHistory.df) && finalStateForHistory.df.length > 0 && typeof finalStateForHistory.df[0] === 'object') {
                  dfToShow = finalStateForHistory.df;
                } else if (typeof finalStateForHistory.df === 'string') {
                  try {
                    const parsedDf = JSON.parse(finalStateForHistory.df);
                    if (Array.isArray(parsedDf) && parsedDf.length > 0 && typeof parsedDf[0] === 'object') {
                      dfToShow = parsedDf;
                    }
                  } catch (_) {
                    // パース失敗時はdfToShowはnullのまま
                  }
                }
                setDataFrameResult(dfToShow);
              } else {
                setDataFrameResult(null);
              }
            }
          } catch (_pollError: any) {
            // console.error("Polling error:", _pollError); // ★ デバッグ用ログ
          }
        }, pollInterval);
      } else if (initialRunResponse && initialRunResponse.status !== "pending" && initialRunResponse.status !== "running") {
          setIsLoading(false);
          let finalOutputForHistory: any = null;
          if (initialRunResponse.status === "success") {
            try {
              const threadState = await client.threads.getState(runThreadId);
              finalOutputForHistory = threadState?.values || threadState;
            } catch (getStateError) {
                console.error("Error fetching thread state for immediately completed run:", getStateError);
                finalOutputForHistory = initialRunResponse; 
            }
          } else {
            finalOutputForHistory = initialRunResponse; 
          }

          const newHistoryEntry: ExecutionHistoryEntry = { // ★ 型適用
            runId: initialRunResponse.run_id!,
            threadId: runThreadId, 
            graphId: graphId,
            input: inputObj,
            output: finalOutputForHistory,
            status: initialRunResponse.status,
            timestamp: new Date().toISOString(),
          };
          setExecutionHistory(prevHistory => [newHistoryEntry, ...prevHistory]);

          if (initialRunResponse.status === "success" && finalOutputForHistory && typeof finalOutputForHistory === 'object') {
              let dfToShow: Record<string, any>[] | null = null;
              if (finalOutputForHistory.df) {
                if (Array.isArray(finalOutputForHistory.df) && finalOutputForHistory.df.length > 0 && typeof finalOutputForHistory.df[0] === 'object') {
                  dfToShow = finalOutputForHistory.df;
                } else if (typeof finalOutputForHistory.df === 'string') {
                  try {
                    const parsedDf = JSON.parse(finalOutputForHistory.df);
                    if (Array.isArray(parsedDf) && parsedDf.length > 0 && typeof parsedDf[0] === 'object') {
                      dfToShow = parsedDf;
                    } else if (Array.isArray(parsedDf)) {
                      dfToShow = parsedDf.length > 0 ? parsedDf : null;
                    }
                  } catch (_e) { /* ignore parse error */ }
                }
              }
              if (!dfToShow) {
                const dfKey = Object.keys(finalOutputForHistory).find(key => 
                    key !== 'df' &&
                    Array.isArray((finalOutputForHistory as any)[key]) && 
                    (finalOutputForHistory as any)[key].length > 0 && 
                    typeof (finalOutputForHistory as any)[key][0] === 'object'
                );
                if (dfKey) dfToShow = (finalOutputForHistory as any)[dfKey];
                else if (Array.isArray(finalOutputForHistory)) dfToShow = finalOutputForHistory as Record<string, any>[];
              }
              setDataFrameResult(dfToShow);
          }
      } else {
        setIsLoading(false);
        if (initialRunResponse) { 
            toast({ title: "実行開始エラー", description: "グラフ実行の開始に失敗しました。サーバーからの応答が不正です。", variant: "destructive" });
        } else { 
            toast({ title: "実行開始エラー", description: "グラフ実行の開始に失敗しました。サーバーからの応答がありません。", variant: "destructive" });
        }
      }

    } catch (runError: any) {
      toast({
        title: "実行エラー",
        description: runError?.message || "グラフ実行に失敗しました。",
        variant: "destructive",
      });
      setIsLoading(false);
    } 
  };

  const handleSelectHistory = async (selectedRunId: string) => {
    setSelectedHistoryRunId(selectedRunId);
    const historyEntry = executionHistory.find(entry => entry.runId === selectedRunId);

    if (historyEntry && client) {
      setGraphId(historyEntry.graphId);
      // setInputJson(JSON.stringify(historyEntry.input, null, 2));
      // historyEntry.input はオブジェクトのはずなので、そこから procedure と sample_data_path を取得
      if (historyEntry.input && typeof historyEntry.input === 'object') {
        setProcedureInput(historyEntry.input.procedure || "");
        setSelectedFolder(historyEntry.input.sample_data_path || "");
      } else {
        // もし input が文字列や予期せぬ形式なら、デフォルト値を設定するかエラー処理
        setProcedureInput("");
        setSelectedFolder("");
        console.warn("History entry input is not an object or is missing:", historyEntry.input);
      }
      setIsLoading(true);
      setRawResult(null);    
      setDataFrameResult(null);

      try {
        const threadState = await client.threads.getState(historyEntry.threadId);
        let finalStateForDisplay;
        if (threadState?.values && Object.keys(threadState.values).length > 0) {
          finalStateForDisplay = threadState.values;
        } else {
          finalStateForDisplay = threadState;
        }
        setRawResult(finalStateForDisplay);

        // executionHistory の output を更新 (任意だが、再選択時のAPI負荷軽減)
        setExecutionHistory(prevHistory => 
          prevHistory.map(h => 
            h.runId === selectedRunId ? { ...h, output: finalStateForDisplay } : h
          )
        );

        if (finalStateForDisplay && typeof finalStateForDisplay === 'object' && (finalStateForDisplay as any).df) {
          let dfToShow: Record<string, any>[] | null = null;
          const dfData = (finalStateForDisplay as any).df;
          if (Array.isArray(dfData) && dfData.length > 0 && typeof dfData[0] === 'object') {
            dfToShow = dfData;
          } else if (typeof dfData === 'string') {
            try {
              const parsedDf = JSON.parse(dfData);
              if (Array.isArray(parsedDf) && parsedDf.length > 0 && typeof parsedDf[0] === 'object') {
                dfToShow = parsedDf;
              }
            } catch (_) {
              // パース失敗時はdfToShowはnullのまま
            }
          }
          setDataFrameResult(dfToShow);
        } else {
          setDataFrameResult(null);
        }
      } catch (error: any) {
        console.error("Failed to fetch thread state for selected history:", error);
        toast({
          title: "状態取得エラー",
          description: "選択された履歴の状態取得に失敗しました。",
          variant: "destructive",
        });
        setRawResult(historyEntry.input); 
      } finally {
        setIsLoading(false); 
      }
    } else {
      resetToNewExecutionState(); // 履歴が見つからない場合など
    }
  };

  return (
    <div className="p-4 border-l h-full flex flex-col gap-4 overflow-auto">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">手続実行・結果参照</h2>
        {selectedHistoryRunId && (
          <Button onClick={resetToNewExecutionState} variant="outline" size="sm">
            新規実行モードに戻る
          </Button>
        )}
      </div>
      
      {isHistoryLoading && (
        <p className="text-sm text-muted-foreground">実行履歴を読み込み中...</p>
      )}
      {executionHistory.length > 0 && !isHistoryLoading && (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">実行履歴 (Run ID)</label>
          <select 
            value={selectedHistoryRunId || ""} 
            onChange={(e) => handleSelectHistory(e.target.value)}
            className="p-2 border rounded-md bg-background text-foreground text-sm"
          >
            <option value="" disabled>過去の実行を選択...</option>
            {executionHistory.map(entry => (
              <option key={entry.runId} value={entry.runId}>
                {`${entry.graphId} - ${new Date(entry.timestamp).toLocaleString()} (Run: ${entry.runId.substring(0,8)})`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* データフォルダアップロード欄 */}
      <form className="mb-2 flex flex-col gap-2" onSubmit={handleUpload}>
        <label className="text-sm font-medium">サンプルデータフォルダアップロード</label>
        <div className="flex items-center gap-2">
          <input
            type="file"
            name="files"
            ref={fileInputRef}
            multiple
            className="hidden"
            id="custom-file-input"
            // @ts-expect-error: webkitdirectoryは型定義にないが、ディレクトリアップロードのために必要
            webkitdirectory="true"
            onChange={() => {
              // 選択ファイル名の表示用にstateを更新
              const files = fileInputRef.current?.files;
              setSelectedFileNames(files ? Array.from(files).map(f => f.name) : []);
            }}
          />
          <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
            サンプルフォルダを選択
          </Button>
          <span className="text-xs text-muted-foreground">
            {selectedFileNames && selectedFileNames.length > 0
              ? selectedFileNames.length === 1
                ? selectedFileNames[0]
                : `${selectedFileNames[0]} 他${selectedFileNames.length - 1}件`
              : "選択されていません"}
          </span>
        </div>
        <Button type="submit" disabled={uploading} className="w-fit">
          {uploading ? "アップロード中..." : "アップロード"}
        </Button>
        {uploadError && <p className="text-sm text-red-500">{uploadError}</p>}
      </form>

      {/* データフォルダ選択欄 */}
      <div>
        <label className="text-sm font-medium">サンプルデータフォルダ選択</label>
        <select
          value={selectedFolder}
          onChange={e => setSelectedFolder(e.target.value)}
          className="p-2 border rounded-md bg-background text-foreground text-sm w-full"
        >
          {folders.map(folder => (
            <option key={folder} value={folder}>{folder}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-sm font-medium">手続入力データ</label>
        <Input
          type="text"
          value={procedureInput}
          onChange={(e) => setProcedureInput(e.target.value)}
          placeholder="例: 2025年のデータか確認してください。"
          className="mt-1"
          disabled={!!selectedHistoryRunId}
        />
      </div>
      <Button onClick={handleRun} disabled={isLoading || !!selectedHistoryRunId} className="w-full">
        {isLoading ? "実行中..." : (selectedHistoryRunId ? "実行 (履歴参照中)" : "実行")}
      </Button>
      
      {(rawResult || selectedHistoryRunId) && (
        <div className="mt-4 flex-grow flex flex-col min-h-0">
          <h3 className="text-md font-semibold mb-1">手続結果</h3>
          <div className="flex-grow overflow-auto border rounded-md p-2 bg-gray-50 max-w-full overflow-x-auto">
            {dataFrameResult ? (
                <DataFrameTable data={dataFrameResult} />
            ) : (
                <p className="text-sm text-muted-foreground">表示できる結果がありません。</p>
            )}
          </div>
          
          {/* ★ 出力ファイルセクションを先に表示 */}
          {rawResult && rawResult.output_excel_path && typeof rawResult.output_excel_path === 'string' && (
            <div className="mt-4 p-4 border rounded-md bg-gray-50">
              <h3 className="text-lg font-semibold mb-2">出力ファイル</h3>
              <a
                href={`/api/download-file?filePath=${encodeURIComponent(rawResult.output_excel_path)}`}
                download={rawResult.output_excel_path.split('/').pop() || rawResult.output_excel_path.split('\\').pop() || 'download.xlsx'}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                target="_blank" 
                rel="noopener noreferrer"
              >
                ダウンロード
              </a>
            </div>
          )}

          {/* ★ Raw JSON 結果セクションを下に移動し、折りたたみ機能を追加 */}
          <div className="mt-4 p-4 border rounded-md bg-gray-50">
            <h3 
              className="text-lg font-semibold mb-2 cursor-pointer flex items-center"
              onClick={() => setIsRawJsonCollapsed(!isRawJsonCollapsed)}
            >
              Raw JSON 結果
              <span className="ml-2 text-sm">{isRawJsonCollapsed ? '▼ 開く' : '▲ 閉じる'}</span>
            </h3>
            {!isRawJsonCollapsed && (
              <div className="flex-grow overflow-auto border rounded-md p-2 bg-white max-w-full overflow-x-auto">
                 {/* bg-whiteを追加してpreとの区別を明確に */}
                <pre className="text-xs whitespace-pre-wrap break-all max-w-full overflow-x-auto">
                  {rawResult ? JSON.stringify(rawResult, null, 2) : "結果がありません"}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 