import { Request } from 'express';

export const extractDataFromRequest = (req: Request) => {
  const path = req.path;
  const method = req.method;
  const query = req.query;
  const params = path.substring(1, path.length).split('/');
  const token = req.headers.authorization.slice(7);
  const ip = req.headers['real-ip'];
  const data = req.body;
  const fileName = req.headers['content-disposition'] ?? '';

  return {
    path,
    method,
    params,
    token,
    ip,
    data,
    query,
    fileName,
  };
};
