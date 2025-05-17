import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const deploymentUrl = req.headers['x-deployment-url'] as string | undefined;
  if (!deploymentUrl) {
    return res.status(400).json({ error: 'Missing x-deployment-url header' });
  }
  try {
    const apiRes = await fetch(`${deploymentUrl.replace(/\/$/, '')}/list-folders/`);
    if (!apiRes.ok) {
      return res.status(apiRes.status).json({ error: 'Failed to fetch from FastAPI server' });
    }
    const data = await apiRes.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error', detail: String(error) });
  }
} 