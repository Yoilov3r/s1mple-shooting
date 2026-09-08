import urllib.request
import os

lib_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib')
os.makedirs(lib_dir, exist_ok=True)

urls = [
    'https://unpkg.com/three@0.160.0/build/three.module.js',
    'https://cdnjs.cloudflare.com/ajax/libs/three.js/r160/three.module.js',
    'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js',
    'https://fastly.jsdelivr.net/npm/three@0.160.0/build/three.module.js',
]

dest = os.path.join(lib_dir, 'three.module.js')
for url in urls:
    try:
        print(f'Trying {url}...')
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        data = urllib.request.urlopen(req, timeout=20).read()
        if len(data) > 100000:
            with open(dest, 'wb') as f:
                f.write(data)
            print(f'SUCCESS: {len(data)} bytes from {url}')
            break
        else:
            print(f'Too small: {len(data)} bytes')
    except Exception as e:
        print(f'Failed: {e}')
else:
    print('ALL FAILED')
