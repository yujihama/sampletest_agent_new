import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs/promises';
import os from 'os';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const deploymentUrl = req.headers['x-deployment-url'] as string | undefined;
  if (!deploymentUrl) {
    return res.status(400).json({ error: 'Missing x-deployment-url header' });
  }
  try {
    const tmpDir = os.tmpdir();
    await fs.mkdir(tmpDir, { recursive: true });
    const form = formidable({ multiples: true, keepExtensions: true, uploadDir: tmpDir });
    const [, files] = await form.parse(req);
    const formData = new FormData();
    const fileList = Array.isArray(files.files) ? files.files : [files.files];
    for (const file of fileList) {
      if (!file) continue;
      const buffer = await fs.readFile(file.filepath);
      formData.append('files', new Blob([buffer]), file.originalFilename || file.newFilename);
    }
    const apiRes = await fetch(`${deploymentUrl.replace(/\/$/, '')}/upload-folder/`, {
      method: 'POST',
      body: formData,
    });
    const data = await apiRes.json().catch(() => ({}));
    return res.status(apiRes.status).json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error', detail: String(error) });
  }
} 