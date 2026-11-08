import http from 'node:http';
import worker from '../worker/index.js';

const port = Number(process.env.PORT || 4173);
http.createServer(async (req, res) => {
  try {
    const response = await worker.fetch(new Request(`http://localhost:${port}${req.url}`));
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error(error.message);
    res.writeHead(500);
    res.end('Preview error');
  }
}).listen(port, '127.0.0.1', () => console.log(`WORLDWIRE: http://127.0.0.1:${port}`));
