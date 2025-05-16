import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useThreadsContext } from "../contexts/ThreadContext";
import { createClient } from "@/lib/client";
import { v4 as uuidv4 } from 'uuid';

export function RunGraphDialog() {
  const { agentInboxes } = useThreadsContext();
  const selectedInbox = agentInboxes.find((i) => i.selected);
  const [open, setOpen] = useState(false);
  const [graphId, setGraphId] = useState(selectedInbox?.graphId || "");
  const [inputJson, setInputJson] = useState("{\n  \"messages\": []\n}");
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    setGraphId(selectedInbox?.graphId || "");
  }, [selectedInbox]);

  const handleRun = async () => {
    setIsLoading(true);
    setResult(null);
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
      let inputObj;
      try {
        inputObj = JSON.parse(inputJson);
      } catch (_parseError: any) {
        toast({
          title: "入力エラー",
          description: "入力データは正しいJSON形式で入力してください。",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      const client = createClient({
        deploymentUrl: selectedInbox.deploymentUrl,
        langchainApiKey: undefined, // 必要に応じてAPIキー取得
      });

      const runThreadId = uuidv4();
      const response = await client.runs.create(runThreadId, graphId, {
        command: {
          ...(inputObj as any)
        },
      });
      setResult(response);
    } catch (runError: any) {
      toast({
        title: "実行エラー",
        description: runError?.message || "グラフ実行に失敗しました。",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full mt-4">グラフ実行</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>グラフ処理を実行</DialogTitle>
          <DialogDescription>
            graphIdと入力データ(JSON)を指定してLangGraphのグラフを実行します。
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <label className="text-sm font-medium">Graph ID</label>
          <Input
            value={graphId}
            onChange={(e) => setGraphId(e.target.value)}
            placeholder="my_graph"
          />
          <label className="text-sm font-medium">入力データ (JSON)</label>
          <Textarea
            value={inputJson}
            onChange={(e) => setInputJson(e.target.value)}
            rows={6}
            placeholder={`{\n  "messages": []\n}`}
          />
        </div>
        <DialogFooter>
          <Button onClick={handleRun} disabled={isLoading}>
            {isLoading ? "実行中..." : "実行"}
          </Button>
        </DialogFooter>
        {result && (
          <div className="mt-4">
            <div className="font-semibold mb-1">--- 実行結果 ---</div>
            <pre className="bg-gray-100 rounded p-2 text-xs overflow-x-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 