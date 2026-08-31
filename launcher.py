"""
s1mple shooting 独立原生窗口启动器
内嵌 HTTP 服务器以兼容 Three.js ES Modules（不能用 file:// 协议）
"""
import sys
import os
import threading
import http.server
import socketserver

import webview


def base_dir():
    """PyInstaller onefile 打包后资源在 _MEIPASS，开发态在脚本所在目录"""
    if getattr(sys, '_MEIPASS', None):
        return sys._MEIPASS
    return os.path.dirname(os.path.abspath(__file__))


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=base_dir(), **kwargs)

    def log_message(self, *args, **kwargs):
        pass  # 静默 HTTP 日志


class Server:
    def __init__(self):
        self.httpd = socketserver.ThreadingTCPServer(('127.0.0.1', 0), Handler)
        self.port = self.httpd.server_address[1]
        self.thread = threading.Thread(target=self.httpd.serve_forever, daemon=True)

    def start(self):
        self.thread.start()

    def url(self):
        return f'http://127.0.0.1:{self.port}/index.html'


def main():
    server = Server()
    server.start()

    window = webview.create_window(
        's1mple shooting',
        server.url(),
        width=1280,
        height=800,
        min_size=(1024, 600),
        text_select=False,
        easy_drag=False,
    )

    # 关闭窗口时关闭 HTTP 服务器
    def on_closed():
        server.httpd.shutdown()

    window.events.closed += on_closed

    webview.start()


if __name__ == '__main__':
    main()
