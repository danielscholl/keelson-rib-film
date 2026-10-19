#!/usr/bin/env python3
"""Serve one directory on 127.0.0.1 so an approval page can show its images, then exit.

Usage: sheet-server.py <dir> <port> [seconds]   (default 3600; detaches itself)
The approval canvas renders markdown but blocks data: images, so the review links its sheet here.
"""
import functools, http.server, os, sys, threading

d, port = sys.argv[1], int(sys.argv[2])
life = float(sys.argv[3]) if len(sys.argv) > 3 else 3600
if os.fork():
    sys.exit(0)
os.setsid()
for fd in (0, 1, 2):
    os.dup2(os.open(os.devnull, os.O_RDWR), fd)
handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=d)
srv = http.server.ThreadingHTTPServer(("127.0.0.1", port), handler)
threading.Timer(life, srv.shutdown).start()
srv.serve_forever()
