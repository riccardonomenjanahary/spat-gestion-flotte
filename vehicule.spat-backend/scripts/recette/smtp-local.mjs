import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
const out = path.resolve('.recette/smtp.jsonl');
fs.mkdirSync(path.dirname(out), { recursive: true });
net.createServer(socket => {
  socket.setEncoding('utf8'); socket.write('220 recette.local ESMTP\r\n');
  let buffer = '', data = false, lines = [], recipients = [];
  socket.on('data', chunk => {
    buffer += chunk;
    while (buffer.includes('\n')) {
      const pos = buffer.indexOf('\n'); const line = buffer.slice(0, pos).replace(/\r$/, ''); buffer = buffer.slice(pos + 1);
      if (data) {
        if (line === '.') {
          fs.appendFileSync(out, JSON.stringify({ date: new Date().toISOString(), destinataires: recipients,
            sujet: lines.find(l => /^Subject:/i.test(l))?.slice(8) ?? '', octets: lines.join('\n').length }) + '\n');
          socket.write('250 Message captured locally\r\n'); data = false; lines = []; recipients = [];
        } else lines.push(line);
      } else if (/^(EHLO|HELO)/i.test(line)) socket.write('250-recette.local\r\n250 8BITMIME\r\n');
      else if (/^RCPT TO:/i.test(line)) { recipients.push(line.slice(8).trim()); socket.write('250 OK\r\n'); }
      else if (/^DATA$/i.test(line)) { data = true; socket.write('354 End with dot\r\n'); }
      else if (/^QUIT$/i.test(line)) { socket.end('221 Bye\r\n'); }
      else socket.write('250 OK\r\n');
    }
  });
  socket.on('error', () => {});
}).listen(2525, '127.0.0.1', () => console.log('SMTP de recette local prêt sur 127.0.0.1:2525'));
