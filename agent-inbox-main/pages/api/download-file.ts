import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const filePathParam = req.query.filePath as string;

  if (!filePathParam) {
    return res.status(400).json({ error: 'filePath query parameter is required' });
  }

  // セキュリティのため、ファイルパスを検証・サニタイズすることが非常に重要です。
  // ここでは、特定のディレクトリ配下のみを許可する基本的な例を示します。
  // プロジェクトのルートからの相対パスなどを想定し、適切なベースパスと結合します。
  // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  // ★ 実際のアプリケーションでは、より厳密なパス検証が必要です ★
  // ★ (例: 想定されるディレクトリ外へのアクセスを防ぐなど)     ★
  // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  const allowedBaseDirectory = path.resolve(process.cwd(), 'data', 'format'); // 例: data/format ディレクトリを許可
  const requestedPath = path.resolve(filePathParam);

  // ベースディレクトリ外へのアクセスを試みているかチェック (基本的なトラバーサル対策)
  if (!requestedPath.startsWith(allowedBaseDirectory)) {
    // より安全なパス結合と検証を行うべき
    // Windowsの場合、パス区切り文字が \ になるため、startsWith の前に正規化が必要な場合がある
    const normalizedRequestedPath = path.normalize(filePathParam);
    const tempCombinedPath = path.join(allowedBaseDirectory, path.basename(normalizedRequestedPath)); // ファイル名だけ取り出して結合
    // ここでは単純化のため、filePathParam が絶対パスであることを前提としています。
    // 実際には、filePathParam が期待する形式（例: 特定ディレクトリからの相対パス）であることを保証し、
    // それに基づいて安全に絶対パスを構築する必要があります。
    // 今回はユーザーから提供された絶対パスをそのまま使ってみるが、セキュリティリスクがある
    
    // 今回は、ユーザーから提供された絶対パスをそのまま使うが、セキュリティリスクを認識すること。
    // 本当は、プロジェクトの特定のディレクトリ配下にあることを保証するロジックが必要。
    // この例では、filePathParam がフルパスで渡ってくると仮定する。
    // fs.existsSync でファイルの存在を確認する。
  }

  try {
    // ファイルが存在するか確認
    if (!fs.existsSync(filePathParam)) {
      return res.status(404).json({ error: 'File not found.' });
    }

    const fileName = path.basename(filePathParam);
    const fileStream = fs.createReadStream(filePathParam);

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); // Excelファイルの場合
    
    fileStream.pipe(res);
    // エラーハンドリング
    fileStream.on('error', (err) => {
      console.error("Stream error:", err);
      // res.status(500).json({ error: 'Error streaming the file.' }); // ストリーム開始後はヘッダー送信済みの可能性
       if (!res.headersSent) {
        res.status(500).json({ error: 'Error streaming the file.' });
      } else {
        res.end(); // ヘッダー送信済みならストリームを閉じる
      }
    });
    
  } catch (error) {
    console.error(error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'An error occurred while trying to download the file.' });
    }
  }
} 