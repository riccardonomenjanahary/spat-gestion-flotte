"""Capture the Windows hand cursor over light and dark backgrounds."""
import ctypes as ct
from ctypes import wintypes as wt
from pathlib import Path

import numpy as np
from PIL import Image

user = ct.WinDLL('user32')
gdi = ct.WinDLL('gdi32')


def api(library, name, result, *args):
    function = getattr(library, name)
    function.argtypes = args
    function.restype = result
    return function


handle, integer = wt.HANDLE, ct.c_int
load = api(user, 'LoadCursorW', handle, handle, ct.c_void_p)
create_dc = api(gdi, 'CreateCompatibleDC', handle, handle)
create_dib = api(gdi, 'CreateDIBSection', handle, handle, ct.c_void_p, wt.UINT,
                 ct.POINTER(ct.c_void_p), handle, wt.DWORD)
select = api(gdi, 'SelectObject', handle, handle, handle)
draw = api(user, 'DrawIconEx', wt.BOOL, handle, integer, integer, handle,
           integer, integer, wt.UINT, handle, wt.UINT)

dc = create_dc(None)
cursor = load(None, 32649)
size = 64
info = (ct.c_int32 * 10)(40, size, -size, (32 << 16) + 1, 0, 0, 0, 0, 0, 0)
pointer = ct.c_void_p()
bitmap = create_dib(dc, ct.byref(info), 0, ct.byref(pointer), None, 0)
select(dc, bitmap)
pixels = np.ctypeslib.as_array((ct.c_ubyte * (size * size * 4)).from_address(pointer.value))
for bg in (0, 255):
    pixels[:] = bg
    if not draw(dc, 0, 0, cursor, 0, 0, 0, None, 3):
        raise OSError('DrawIconEx failed')
    image = Image.fromarray(pixels.reshape(size, size, 4)[:, :, 0])
    image.save(Path(__file__).with_name(f'hand-{bg}.png'))
