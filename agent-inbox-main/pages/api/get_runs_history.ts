import type { NextApiRequest, NextApiResponse } from 'next';
// import { spawn } from 'child_process'; // 不要なので削除
// import path from 'path'; // 不要なので削除

// interface ExecutionHistoryEntry {  // ★ フロントエンドで管理するため、APIルート側では不要
//   runId: string;
//   threadId: string;
//   graphId: string;
//   input: any;
//   output: any;
//   status: string;
//   timestamp: string;
// }

// deploymentUrlからベースURLを抽出するヘルパー関数
const getBaseApiUrl = (deploymentUrl: string | undefined): string | null => {
  if (!deploymentUrl) return null;
  try {
    const url = new URL(deploymentUrl);
    return `${url.protocol}//${url.host}`;
  } catch (error) {
    console.error("[API Route] Invalid deployment URL:", error);
    return null;
  }
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any | { error: string }>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const deploymentUrl = req.headers['x-deployment-url'] as string;
  const graphId = req.headers['x-graph-id'] as string; // graphId をヘッダーから取得

  if (!deploymentUrl) {
    return res.status(400).json({ error: 'x-deployment-url header is required' });
  }
  // graphId も必須とする (空文字OKかはLangServe側の仕様による。通常は何かしら指定を期待)
  if (!graphId) { // graphIdが空文字やnull/undefinedの場合をチェック
    // フィルタなしで全件取得するわけではないので、エラーとするか、あるいは graphId なしの時の挙動を明確に定義
    // ここでは一旦エラーとします。
    // return res.status(400).json({ error: 'x-graph-id header is required for filtering' });
    // 注意: 一時的にフィルタを外していたので、ここをどうするかは要件次第。
    //       ひとまず、graphIdがなくてもエラーにせず、metadataに含めないことで全件検索を試みる
    console.warn("[API Route] x-graph-id header is missing or empty. Fetching threads without assistant_id filter.");
  }

  const apiBaseUrl = getBaseApiUrl(deploymentUrl);
  if (!apiBaseUrl) {
    return res.status(400).json({ error: 'Invalid deployment URL provided in x-deployment-url header' });
  }

  try {
    const threadsSearchUrl = `${apiBaseUrl}/threads/search`;
    
    const requestBody: any = { 
      metadata: {},
      values: {},   // サンプルに合わせて追加
      // status: "idle", // サンプルに合わせて追加 (必要に応じてコメントアウト/削除も検討)
      limit: 10,    // サンプルに合わせて変更 (フロントエンドの表示件数と合わせるか要検討)
      offset: 0,
      sort_by: "created_at", // サンプルに合わせて変更
      sort_order: "desc"     // サンプルに合わせて変更
    };

    if (graphId) {
      requestBody.metadata.graph_id = graphId; // ★ metadata に graph_id を設定
      // requestBody.metadata.assistant_id = "????"; // assistant_id は一旦含めない
      console.log("[API Route] Fetching threads from:", threadsSearchUrl, "using POST method with graph_id:", graphId, "and body:", JSON.stringify(requestBody));
    } else {
      // graphId がない場合は metadata を空のままにする (全件検索に近い挙動を期待)
      console.log("[API Route] Fetching threads from:", threadsSearchUrl, "using POST method (no specific graph_id filter) and body:", JSON.stringify(requestBody));
    }

    const response = await fetch(threadsSearchUrl, {
      method: 'POST', 
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody), 
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API Route] Error from /threads/search: ${response.status}`, errorText);
      return res.status(response.status).json({ error: `Failed to fetch threads: ${response.statusText} - ${errorText}` });
    }

    const threadsData = await response.json();
    // console.log("[API Route] Successfully fetched threads data:", threadsData); // ★ デバッグ用ログ

    return res.status(200).json(threadsData);

  } catch (error: any) {
    console.error('[API Route] Failed to fetch threads history:', error);
    return res.status(500).json({ error: error.message || 'An unknown error occurred while fetching thread history.' });
  }
}
